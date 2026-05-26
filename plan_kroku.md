# Plan Kroku: Zadanie 22 - Endpoint Konwersacyjny RAG (Retrieval)

## 1. Cel Kroku
Implementacja mechanizmu wyszukiwania semantycznego (Retrieval) w transkrypcjach spotkań na backendzie (FastAPI) i wdrożenie nowego endpointu `POST /ask`, pozwalającego użytkownikowi zadawać pytania na temat spotkań i otrzymywać odpowiedzi oparte wyłącznie na kontekście (bez halucynacji).

## 2. Procedura Supabase RPC (do uruchomienia w panelu Supabase)
```sql
CREATE OR REPLACE FUNCTION match_transcript_chunks(
  query_embedding vector(1536),
  match_meeting_id UUID,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  meeting_id UUID,
  chunk_text TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    transcript_chunks.id,
    transcript_chunks.meeting_id,
    transcript_chunks.chunk_text,
    1 - (transcript_chunks.embedding <=> query_embedding) AS similarity
  FROM transcript_chunks
  WHERE transcript_chunks.meeting_id = match_meeting_id
    AND 1 - (transcript_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY transcript_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## 3. Pliki do modyfikacji i kopie zapasowe
Przed wprowadzaniem zmian zostaną utworzone kopie zapasowe:
- [main.py](file:///Users/przemyslawrakotny/Documents/przemokoduje/n8n_testy/synapse_ai/backend/main.py) -> `main.py.bak`
- [vector_service.py](file:///Users/przemyslawrakotny/Documents/przemokoduje/n8n_testy/synapse_ai/backend/vector_service.py) -> `vector_service.py.bak`
- [llm_service.py](file:///Users/przemyslawrakotny/Documents/przemokoduje/n8n_testy/synapse_ai/backend/llm_service.py) -> `llm_service.py.bak`

## 4. Planowane modyfikacje kodu

### A. Rozbudowa Serwisu Wektorowego (`backend/vector_service.py`)
- Implementacja funkcji `retrieve_context(question, meeting_id, supabase_client, match_threshold=0.3, match_count=4)`:
  - Wektoryzacja pytania za pomocą OpenAI Embeddings.
  - Wywołanie procedury Supabase RPC `match_transcript_chunks`.
  - Złączenie odnalezionych fragmentów transkrypcji w spójny tekst kontekstowy.

### B. Rozszerzenie Usług LLM (`backend/llm_service.py`)
- Definicja rygorystycznego promptu systemowego `SYSTEM_PROMPT_CONVERSATIONAL` blokującego halucynacje.
- Zaimplementowanie funkcji `answer_question_with_context(question, context, trace_id)` generującej odpowiedź GPT-4o-mini o niskiej temperaturze (0.0).

### C. Nowy Endpoint API (`backend/main.py`)
- Dodanie modelu Pydantic `AskRequest` (klucze `meeting_id` oraz `question`).
- Dodanie endpointu `POST /ask`:
  - Pobranie kontekstu poprzez `vector_service.retrieve_context`.
  - Jeśli kontekst jest pusty, natychmiastowe zwrócenie grzecznej informacji o braku powiązanych danych.
  - W przeciwnym razie wywołanie `llm_service.answer_question_with_context`.
  - Zwrócenie odpowiedzi: `{"status": "success", "answer": answer, "trace_id": trace_id}`.

---

Oczekuję na weryfikację planu i komendę **"Dalej"** (TWARDY STOP).
