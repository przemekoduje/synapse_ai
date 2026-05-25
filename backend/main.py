from fastapi import FastAPI, Request, BackgroundTasks, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uuid
import time
import logging
import os
import shutil

# Załadowanie zmiennych środowiskowych przed importami modułów zależnych od .env
load_dotenv()

from models import MeetingPayload
import llm_service
import media_processor


# Konfiguracja logowania
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("synapse_ai")

app = FastAPI(title="Synapse AI Backend")

# Konfiguracja CORS - kluczowa dla komunikacji z aplikacją mobilną/webową
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # W produkcji warto to ograniczyć
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Obsługa błędów walidacji (422) dla lepszego debugowania
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"BŁĄD WALIDACJI (422): {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"status": "error", "message": "Błąd walidacji danych", "details": exc.errors()}
    )

# Middleware dla Trace ID
@app.middleware("http")
async def add_trace_id_middleware(request: Request, call_next):
    trace_id = str(uuid.uuid4())
    request.state.trace_id = trace_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers["X-Trace-ID"] = trace_id
    response.headers["X-Process-Time"] = str(process_time)
    
    return response

@app.get("/health")
async def health_check(request: Request):
    return {
        "status": "ok",
        "timestamp": time.time(),
        "trace_id": request.state.trace_id,
        "version": "0.1.0"
    }

@app.post("/transcribe")
async def transcribe_audio_endpoint(request: Request, file: UploadFile = File(...)):
    """
    Przyjmuje plik audio, dokonuje transkrypcji i zwraca tekst.
    """
    trace_id = request.state.trace_id
    logger.info(f"[Trace ID: {trace_id}] Otrzymano plik do transkrypcji: {file.filename}")
    
    temp_file_path = f"temp_{trace_id}_{file.filename}"
    
    try:
        # Zapis tymczasowy pliku na dysku
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Wywołanie serwisu transkrypcji (z obsługą chunkingu)
        transcription_text = await llm_service.transcribe_audio(temp_file_path, trace_id)
        
        return {
            "status": "ok",
            "transcription": transcription_text,
            "trace_id": trace_id
        }

    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] Błąd podczas endpointu /transcribe: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Błąd transkrypcji", "trace_id": trace_id}
        )
    finally:
        # Sprzątanie pliku tymczasowego
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/inspect")
async def inspect_video_endpoint(request: Request, background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Przyjmuje plik wideo, ekstrahuje klatki i audio, a następnie analizuje multimodalnie.
    """
    trace_id = request.state.trace_id
    logger.info(f"[Trace ID: {trace_id}] Otrzymano wideo do inspekcji: {file.filename}")
    
    video_path = f"video_{trace_id}_{file.filename}"
    audio_path = None
    
    try:
        # 1. Zapis wideo
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Przetwarzanie mediów (Klatki + Audio)
        frames_base64, audio_path = media_processor.extract_multimodal_data(video_path, trace_id)
        
        # 3. Transkrypcja dźwięku z wideo
        transcription = await llm_service.transcribe_audio(audio_path, trace_id)
        
        # 4. Analiza Multimodalna (LLM Vision + Text)
        analysis_result = await llm_service.analyze_inspection_video(frames_base64, transcription, trace_id)
        
        # 5. Wysyłka do n8n została USUNIĘTA z tego miejsca (wymóg pętli decyzyjnej)
        # Dane są teraz zwracane do aplikacji, która po zatwierdzeniu wyśle je do /execute
        
        return {
            "status": "ok",
            "analysis": analysis_result,
            "transcription": transcription, # Dodajemy transkrypcję dźwięku z wideo
            "trace_id": trace_id
        }

    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] Błąd podczas endpointu /inspect: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "trace_id": trace_id}
        )
    finally:
        # Sprzątanie wszystkich plików tymczasowych
        for path in [video_path, audio_path]:
            if path and os.path.exists(path):
                os.remove(path)
                logger.info(f"[Trace ID: {trace_id}] Usunięto plik tymczasowy: {path}")

@app.post("/analyze")
async def analyze_meeting(payload: MeetingPayload, request: Request, background_tasks: BackgroundTasks):
    """
    Analizuje transkrypcję spotkania i przesyła wynik do n8n.
    """
    trace_id = request.state.trace_id
    logger.info(f"[Trace ID: {trace_id}] Otrzymano żądanie analizy spotkania.")
    
    try:
        # 1. Analiza LLM (OpenAI)
        analysis_result = await llm_service.analyze_meeting_transcription(payload.transcription, trace_id)
        
        # 2. Asynchroniczna wysyłka do n8n została USUNIĘTA (wymóg pętli decyzyjnej)
        # Zwracamy wynik analizy do UI, aby użytkownik mógł go zatwierdzić.
        
        return {
            "status": "ok",
            "message": "Analiza rozpoczęta. Wynik zostanie przesłany do orkiestratora.",
            "trace_id": trace_id,
            "analysis": analysis_result
        }
        
    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] Błąd endpointu /analyze: {str(e)}")
        return JSONResponse(
            status_code=500, 
            content={"status": "error", "message": str(e), "trace_id": trace_id}
        )

