-- 1. Włączenie Row Level Security (RLS) dla tabel
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;

-- 2. Polityka dla tabeli 'meetings' - anonimowy odczyt (SELECT)
CREATE POLICY "Allow public read access to meetings" 
ON meetings 
FOR SELECT 
TO anon 
USING (true);

-- 3. Polityka dla tabeli 'action_items' - anonimowy odczyt (SELECT)
CREATE POLICY "Allow public read access to action_items" 
ON action_items 
FOR SELECT 
TO anon 
USING (true);

-- 4. Polityka dla tabeli 'transcript_chunks' - anonimowy odczyt (SELECT)
CREATE POLICY "Allow public read access to transcript_chunks" 
ON transcript_chunks 
FOR SELECT 
TO anon 
USING (true);
