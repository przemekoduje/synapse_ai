import os
import json
import logging
from openai import OpenAI
from typing import Dict, Any, List
from deepgram import DeepgramClient

logger = logging.getLogger("synapse_ai")

# Konfiguracja API OpenAI (do analizy)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    logger.warning("BRAK OPENAI_API_KEY w zmiennych środowiskowych!")

# Konfiguracja API Deepgram (do transkrypcji i diaryzacji)
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
if not DEEPGRAM_API_KEY:
    logger.warning("BRAK DEEPGRAM_API_KEY w zmiennych środowiskowych!")

# Inicjalizacja klientów
client = OpenAI(api_key=OPENAI_API_KEY)
dg_client = DeepgramClient(api_key=DEEPGRAM_API_KEY)

SYSTEM_PROMPT_MEETING = """
Jesteś ekspertem ds. analizy spotkań biznesowych. Twoim zadaniem jest przetworzenie transkrypcji rozmowy (często z podziałem na mówców) i zwrócenie ustrukturyzowanych informacji.

WYMOGI DOTYCZĄCE FORMATU:
MUSISZ zwrócić poprawny obiekt JSON. Nie dodawaj żadnego tekstu poza obiektem JSON.

STRUKTURA JSON:
{
  "short_summary": "Krótkie streszczenie spotkania (maks. 2 zdania)",
  "detailed_description": "Szczegółowy opis ustaleń, kluczowych punktów i kontekstu. Uwzględnij kto co powiedział jeśli to istotne.",
  "action_items": [
    {
      "task_description": "Dokładny opis zadania do wykonania",
      "assignee": "Imię/nazwisko osoby przypisanej lub null jeśli nie określono osoby w transkrypcji"
    }
  ]
}
"""

SYSTEM_PROMPT_VIDEO = """
Jesteś uniwersalnym analitykiem multimodalnym. Twoim zadaniem jest analiza nagrania wideo na podstawie dostarczonych klatek obrazu oraz transkrypcji ścieżki dźwiękowej.

Działaj jako obiektywny obserwator:
1. Przeanalizuj to, co widnieje na zdjęciach.
2. Połącz to z tym, o czym mówi użytkownik w transkrypcji.
3. Wygeneruj ustrukturyzowany raport JSON.

STRUKTURA JSON:
{
  "short_summary": "Zwięzłe podsumowanie tego, co było przedmiotem nagrania i o czym mowa",
  "key_findings": ["Obserwacja 1", "Anomalia 2", "Detal wskazany przez użytkownika 3"],
  "action_items": ["Zadanie wynikające z nagrania 1", "Dalszy krok 2"]
}

Zwróć WYŁĄCZNIE obiekt JSON. Pisz w języku polskim.
"""

async def analyze_meeting_transcription(transcription: str, trace_id: str) -> Dict[str, Any]:
    """
    Analiza transkrypcji tekstu za pomocą GPT-4o-mini.
    """
    logger.info(f"[Trace ID: {trace_id}] Rozpoczęto analizę tekstu GPT-4o-mini...")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_MEETING},
                {"role": "user", "content": f"Oto transkrypcja do analizy:\n\n{transcription}"}
            ],
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        logger.info(f"[Trace ID: {trace_id}] Analiza tekstu zakończona sukcesem.")
        return result
    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] BŁĄD ANALIZY SPOTKANIA: {str(e)}")
        raise e

async def analyze_inspection_video(frames_base64: List[str], transcription: str, trace_id: str) -> Dict[str, Any]:
    """
    Analiza multimodalna (Wizja + Audio) nagrania wideo.
    """
    logger.info(f"[Trace ID: {trace_id}] Rozpoczęto analizę multimodalną GPT-4o-mini...")
    
    try:
        content = [
            {"type": "text", "text": f"Oto transkrypcja dźwięku z nagrania: {transcription}"},
            {"type": "text", "text": "Poniżej znajdują się kluczowe klatki z tego nagrania wideo:"}
        ]
        
        logger.info(f"[Trace ID: {trace_id}] Przetwarzanie {min(len(frames_base64), 15)} klatek wideo.")
        for frame in frames_base64[:15]:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{frame}"}
            })
            
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_VIDEO},
                {"role": "user", "content": content}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        logger.info(f"[Trace ID: {trace_id}] Analiza multimodalna zakończona sukcesem.")
        return result

    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] BŁĄD ANALIZY WIDEO: {str(e)}")
        raise e

async def transcribe_audio(file_path: str, trace_id: str) -> str:
    """
    Dokonuje transkrypcji pliku audio za pomocą Deepgram (Nova-2) z diaryzacją.
    """
    logger.info(f"[Trace ID: {trace_id}] Rozpoczęto transkrypcję (Deepgram Nova-2): {file_path}")
    
    try:
        with open(file_path, "rb") as file:
            buffer_data = file.read()
        
        # W SDK v7+ najbezpieczniej używać słownika dla opcji
        options = {
            "model": "nova-2",
            "language": "pl",
            "diarize": True,
            "smart_format": True,
            "punctuate": True,
            "utterances": True,
            "filler_words": True
        }

        # Wywołanie Deepgram SDK v7+
        # W tej wersji wszystkie argumenty muszą być nazwane (keyword-only)
        response = dg_client.listen.v1.media.transcribe_file(
            request=buffer_data,
            **options
        )
        
        # Parsowanie wyników
        # Preferujemy sekcję 'utterances' dla lepszego podziału na role
        formatted_transcript = ""
        speaker_count = 0
        
        results = response.results
        utterances = getattr(results, "utterances", None)
        
        if utterances:
            logger.info(f"[Trace ID: {trace_id}] Używam sekcji 'utterances' do podziału na role.")
            current_speaker = None
            for utt in utterances:
                speaker = getattr(utt, "speaker", 0)
                text = getattr(utt, "transcript", "")
                
                if speaker != current_speaker:
                    current_speaker = speaker
                    speaker_count += 1
                    prefix = "\n\n" if formatted_transcript else ""
                    formatted_transcript += f"{prefix}Mówca {speaker}: "
                
                formatted_transcript += text + " "
        else:
            # Fallback do analizy słowo po słowie (jeśli utterances puste)
            logger.info(f"[Trace ID: {trace_id}] Sekcja 'utterances' pusta, używam 'words'.")
            alt = results.channels[0].alternatives[0]
            words = getattr(alt, "words", [])
            
            current_speaker = None
            for word in words:
                text = getattr(word, "punctuated_word", None) or getattr(word, "word", "")
                speaker = getattr(word, "speaker", 0)
                
                if speaker != current_speaker:
                    current_speaker = speaker
                    speaker_count += 1
                    prefix = "\n\n" if formatted_transcript else ""
                    formatted_transcript += f"{prefix}Mówca {speaker}: "
                
                formatted_transcript += text + " "

        # Jeśli mimo diarize=True nie wykryto zmian, upewnij się że jest chociaż jeden etykietowany blok
        if speaker_count == 0 and formatted_transcript:
            formatted_transcript = f"Mówca 0: {formatted_transcript}"
            speaker_count = 1

        logger.info(f"[Trace ID: {trace_id}] Transkrypcja zakończona. Wykryto {speaker_count} bloków mówców.")
        return formatted_transcript.strip()

    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] BŁĄD DEEPGRAM: {str(e)}")
        raise e

SYSTEM_PROMPT_CONVERSATIONAL = """
Jesteś pomocnym asystentem AI analizującym spotkanie biznesowe. Odpowiadasz na pytania użytkownika WYŁĄCZNIE na podstawie dostarczonego kontekstu z narady.

REGUŁY ODPOWIEDZI:
1. Odpowiadaj WYŁĄCZNIE na podstawie poniższego kontekstu (wypowiedzi uczestników).
2. Jeśli odpowiedzi nie ma w kontekście, poinformuj o tym wprost i grzecznie (np. "Niestety, nie ma informacji na ten temat w dostarczonym kontekście spotkania"). Nie zmyślaj ani nie dodawaj żadnych informacji z zewnątrz.
3. Zachowaj obiektywny, profesjonalny ton. Pisz w języku polskim.
"""

async def answer_question_with_context(question: str, context: str, trace_id: str) -> str:
    """
    Generuje odpowiedź na pytanie użytkownika na podstawie dostarczonego kontekstu przy użyciu GPT-4o-mini.
    Wymusza temperature=0.0 w celu eliminacji halucynacji.
    """
    logger.info(f"[Trace ID: {trace_id}] Uruchomienie GPT-4o-mini do wygenerowania odpowiedzi na pytanie...")
    try:
        user_content = f"KONTEKST SPOTKANIA:\n{context}\n\nPYTANIE: {question}"
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_CONVERSATIONAL},
                {"role": "user", "content": user_content}
            ],
            temperature=0.0
        )
        answer = response.choices[0].message.content.strip()
        logger.info(f"[Trace ID: {trace_id}] Pomyślnie wygenerowano odpowiedź na bazie kontekstu.")
        return answer
    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] Błąd podczas generowania odpowiedzi LLM: {str(e)}")
        raise e
