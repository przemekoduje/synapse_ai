-- 0. Włączenie rozszerzenia pgvector dla wyszukiwania semantycznego
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Tabela Spotkań
CREATE TABLE IF NOT EXISTS meetings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    transcription text,
    short_summary text,
    detailed_description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela Zadań (Action Items)
CREATE TABLE IF NOT EXISTS action_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
    task_description text NOT NULL,
    assignee text,
    status text DEFAULT 'Otwarty'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela Fragmentów Transkrypcji (dla RAG)
CREATE TABLE IF NOT EXISTS transcript_chunks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
    chunk_text text NOT NULL,
    embedding vector(1536),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Funkcja wyszukiwania podobieństwa cosinusowego (RPC dla RAG)
CREATE OR REPLACE FUNCTION match_transcript_chunks(
  query_embedding vector(1536),
  match_meeting_id uuid,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  meeting_id uuid,
  chunk_text text,
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
