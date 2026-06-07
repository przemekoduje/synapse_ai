from fastapi import FastAPI, Request, BackgroundTasks, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uuid
import time
import logging
import os
import shutil
from supabase import create_client, Client

# Załadowanie zmiennych środowiskowych przed importami modułów zależnych od .env
load_dotenv()

from models import MeetingPayload, AskRequest
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
# Pozwalamy na wszystkie domeny HTTP/HTTPS za pomocą regexa, aby obsłużyć dynamiczne adresy Vercel/Expo
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
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

# Inicjalizacja klienta Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase_client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Pomyślnie zainicjalizowano klienta Supabase.")
    except Exception as e:
        logger.error(f"Błąd inicjalizacji klienta Supabase: {str(e)}")
else:
    logger.warning("Brak SUPABASE_URL lub SUPABASE_KEY w pliku .env! Zapis do bazy danych będzie pominięty.")


@app.post("/upload-audio")
async def upload_audio_endpoint(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Form(None),
    user_email: str = Form(None)
):
    trace_id = request.state.trace_id
    logger.info(f"[Trace ID: {trace_id}] Nowy upload audio (synchroniczny): {file.filename}, user_id: {user_id}, user_email: {user_email}")
    
    temp_file_path = f"temp_{trace_id}_{file.filename}"
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 1. Transkrypcja Deepgram
        transcription_text = await llm_service.transcribe_audio(temp_file_path, trace_id)
        
        # 2. Analiza LLM
        analysis_result = await llm_service.analyze_meeting_transcription(transcription_text, trace_id)
        
        short_summary = analysis_result.get("short_summary", "")
        detailed_description = analysis_result.get("detailed_description", "")
        action_items = analysis_result.get("action_items", [])
        
        # Generowanie tytułu spotkania na bazie czasu
        title = f"Spotkanie {time.strftime('%Y-%m-%d %H:%M')}"
        if short_summary:
            title += f" - {short_summary[:50]}..."
            
        logger.info(f"[Trace ID: {trace_id}] Wyniki analizy uzyskane. Zapis do Supabase...")
        
        # 3. Zapis do Supabase
        meeting_id = None
        if supabase_client:
            try:
                meeting_payload = {
                    "title": title,
                    "transcription": transcription_text,
                    "short_summary": short_summary,
                    "detailed_description": detailed_description
                }
                
                resolved_user_id = user_id
                if not resolved_user_id and user_email:
                    try:
                        logger.info(f"[Trace ID: {trace_id}] Szukam użytkownika o e-mailu {user_email} w auth.users...")
                        users = supabase_client.auth.admin.list_users()
                        for u in users:
                            if u.email and u.email.lower() == user_email.strip().lower():
                                resolved_user_id = u.id
                                logger.info(f"[Trace ID: {trace_id}] Dopasowano użytkownika: {resolved_user_id}")
                                break
                    except Exception as auth_err:
                        logger.error(f"[Trace ID: {trace_id}] Błąd szukania w auth.users: {str(auth_err)}")
                
                if resolved_user_id:
                    meeting_payload["user_id"] = resolved_user_id
                
                # Zapisujemy e-mail gościa lub 'anonymous' dla nowych spotkań bez powiązanego user_id,
                # aby nie były traktowane jako legacy public (gdzie user_id IS NULL i user_email IS NULL)
                if user_email:
                    meeting_payload["user_email"] = user_email.strip().lower()
                elif not resolved_user_id:
                    meeting_payload["user_email"] = "anonymous"
                    
                meeting_res = supabase_client.table("meetings").insert(meeting_payload).execute()
                
                if meeting_res.data and len(meeting_res.data) > 0:
                    meeting_id = meeting_res.data[0]["id"]
                    logger.info(f"[Trace ID: {trace_id}] Zapisano spotkanie w Supabase. ID: {meeting_id}")
                    
                    # Zapis action items
                    if action_items:
                        items_payload = []
                        for item in action_items:
                            if isinstance(item, dict):
                                task_description = item.get("task_description", "")
                                assignee = item.get("assignee")
                            else:
                                task_description = str(item)
                                assignee = None
                                
                            if task_description:
                                items_payload.append({
                                    "meeting_id": meeting_id,
                                    "task_description": task_description,
                                    "assignee": assignee,
                                    "status": "Otwarty"
                                })
                        
                        if items_payload:
                            supabase_client.table("action_items").insert(items_payload).execute()
                            logger.info(f"[Trace ID: {trace_id}] Zapisano {len(items_payload)} zadań w Supabase.")
                else:
                    logger.error(f"[Trace ID: {trace_id}] Supabase nie zwrócił danych po zapisie spotkania.")
            except Exception as db_err:
                logger.error(f"[Trace ID: {trace_id}] BŁĄD BAZY SUPABASE: {str(db_err)}")
        else:
            logger.warning(f"[Trace ID: {trace_id}] Zapis pominięty - brak klienta Supabase.")
 
        # 4. Wektoryzacja transkrypcji (RAG pgvector)
        if meeting_id and transcription_text:
            try:
                import vector_service
                logger.info(f"[Trace ID: {trace_id}] Rozpoczynam wektoryzację transkrypcji...")
                chunks = vector_service.chunk_text(transcription_text)
                if chunks:
                    embeddings = vector_service.generate_embeddings(chunks)
                    if len(chunks) == len(embeddings) and supabase_client:
                        chunks_payload = [
                            {
                                "meeting_id": meeting_id,
                                "chunk_text": txt,
                                "embedding": emb
                            }
                            for txt, emb in zip(chunks, embeddings)
                        ]
                        supabase_client.table("transcript_chunks").insert(chunks_payload).execute()
                        logger.info(f"[Trace ID: {trace_id}] Zapisano {len(chunks_payload)} wektorów fragmentów transkrypcji w Supabase.")
                    else:
                        logger.error(f"[Trace ID: {trace_id}] Niezgodność liczby fragmentów ({len(chunks)}) i wektorów ({len(embeddings)}).")
            except Exception as vec_err:
                logger.error(f"[Trace ID: {trace_id}] BŁĄD PODCZAS WEKTORYZACJI: {str(vec_err)}")
 
        return {
            "status": "success",
            "meeting_id": str(meeting_id) if meeting_id else None,
            "short_summary": short_summary,
            "transcription": transcription_text,
            "analysis": {
                "short_summary": short_summary,
                "detailed_description": detailed_description,
                "action_items": action_items
            },
            "trace_id": trace_id
        }
    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] Błąd podczas synchronicznego /upload-audio: {str(e)}")
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Nie udało się przetworzyć pliku: {str(e)}", "trace_id": trace_id}
        )

@app.post("/ask")
async def ask_question_endpoint(payload: AskRequest, request: Request):
    trace_id = request.state.trace_id
    logger.info(f"[Trace ID: {trace_id}] Odebrano pytanie dla spotkania {payload.meeting_id}: '{payload.question}'")
    
    if not supabase_client:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Klient Supabase nie jest zainicjalizowany", "trace_id": trace_id}
        )
        
    try:
        import vector_service
        # 1. Wyszukanie odpowiedniego kontekstu
        context = vector_service.retrieve_context(
            question=payload.question,
            meeting_id=payload.meeting_id,
            supabase_client=supabase_client
        )
        
        # Jeśli brak powiązanych fragmentów, kończymy bez uruchamiania LLM
        if not context:
            logger.info(f"[Trace ID: {trace_id}] Brak powiązanego kontekstu dla pytania.")
            return {
                "status": "success",
                "answer": "Niestety, nie odnaleziono powiązanych informacji w transkrypcji tego spotkania, które mogłyby odpowiedzieć na to pytanie.",
                "trace_id": trace_id
            }
            
        # 2. Generowanie odpowiedzi na podstawie kontekstu
        answer = await llm_service.answer_question_with_context(
            question=payload.question,
            context=context,
            trace_id=trace_id
        )
        
        return {
            "status": "success",
            "answer": answer,
            "trace_id": trace_id
        }
    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] Błąd podczas obsługi /ask: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Wystąpił błąd podczas generowania odpowiedzi: {str(e)}", "trace_id": trace_id}
        )

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

