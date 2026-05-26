import os
import logging
from openai import OpenAI

logger = logging.getLogger("synapse_ai")

# Inicjalizacja leniwa klienta OpenAI
client = None

def get_openai_client():
    global client
    if client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("[Vector] BRAK OPENAI_API_KEY w zmiennych środowiskowych!")
        client = OpenAI(api_key=api_key)
    return client

def chunk_text(text: str, chunk_size: int = 800, overlap_paragraphs: int = 1) -> list[str]:
    """
    Dzieli tekst transkrypcji na bloki (chunks).
    Podział następuje na poziomie wypowiedzi mówców (akapity rozdzielone '\n\n').
    Zapewnia to zachowanie pełnego kontekstu (każdy fragment zawiera informację 'Mówca X: ...').
    """
    if not text:
        return []

    # Rozdzielenie na wypowiedzi mówców
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        # Fallback dla tekstu bez podwójnych nowych linii
        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]

    chunks = []
    current_chunk = []
    current_length = 0

    for p in paragraphs:
        current_chunk.append(p)
        current_length += len(p) + 2  # uwzględnia '\n\n' jako łącznik

        if current_length >= chunk_size:
            chunks.append("\n\n".join(current_chunk))
            # Zapewnienie nakładania się kontekstu wypowiedzi
            if overlap_paragraphs > 0 and len(current_chunk) > overlap_paragraphs:
                current_chunk = current_chunk[-overlap_paragraphs:]
                current_length = sum(len(x) + 2 for x in current_chunk)
            else:
                current_chunk = []
                current_length = 0

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    # Logowanie statystyk
    logger.info(f"[Vector] Podzielono transkrypcję na {len(chunks)} fragmentów (chunks).")
    return chunks

def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    """
    Generuje wektory (Embeddings) dla listy fragmentów tekstu przy użyciu modelu OpenAI text-embedding-3-small (1536 wymiarów).
    Metoda wysyła zapytanie w jednej paczce (bulk) dla optymalizacji sieciowej.
    """
    openai_client = get_openai_client()
    if not openai_client or not os.getenv("OPENAI_API_KEY"):
        logger.error("[Vector] Klient OpenAI nie jest gotowy. Pomijam generowanie wektorów.")
        return []

    try:
        logger.info(f"[Vector] Generowanie embeddings dla {len(chunks)} fragmentów przez text-embedding-3-small...")
        response = openai_client.embeddings.create(
            input=chunks,
            model="text-embedding-3-small"
        )
        
        # Wyciągamy wektory (zachowując oryginalną kolejność)
        embeddings = [data.embedding for data in response.data]
        logger.info(f"[Vector] Pomyślnie wygenerowano {len(embeddings)} wektorów o wymiarze {len(embeddings[0]) if embeddings else 0}.")
        return embeddings
    except Exception as e:
        logger.error(f"[Vector] Błąd OpenAI Embeddings API: {str(e)}")
        raise e

def retrieve_context(question: str, meeting_id: str, supabase_client, match_threshold: float = 0.3, match_count: int = 4) -> str:
    """
    Wektoryzuje zapytanie użytkownika, wywołuje funkcję RPC w Supabase i zwraca złączony kontekst tekstowy.
    """
    try:
        # 1. Wektoryzacja zapytania
        query_embeddings = generate_embeddings([question])
        if not query_embeddings:
            logger.warning("[Vector] Nie udało się wygenerować wektora dla zapytania.")
            return ""
        
        query_vector = query_embeddings[0]
        
        # 2. Wywołanie funkcji RPC w Supabase
        rpc_params = {
            "query_embedding": query_vector,
            "match_meeting_id": meeting_id,
            "match_threshold": match_threshold,
            "match_count": match_count
        }
        
        logger.info(f"[Vector] Wywoływanie RPC match_transcript_chunks dla meeting_id={meeting_id}...")
        response = supabase_client.rpc("match_transcript_chunks", rpc_params).execute()
        
        if not response.data:
            logger.info(f"[Vector] Brak dopasowanych fragmentów dla zapytania: '{question}'")
            return ""
            
        # 3. Złączenie fragmentów w jeden kontekst
        logger.info(f"[Vector] Odnaleziono {len(response.data)} pasujących fragmentów transkrypcji.")
        matched_texts = []
        for row in response.data:
            matched_texts.append(row.get("chunk_text", ""))
            
        return "\n\n---\n\n".join(matched_texts)
        
    except Exception as e:
        logger.error(f"[Vector] Błąd w retrieve_context: {str(e)}")
        return ""
