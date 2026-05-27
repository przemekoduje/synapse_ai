import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path="backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Missing URL or Key in .env!")
    exit(1)

supabase = create_client(url, key)

target_id = "473ce271-eef4-4462-a9a5-b7b7956371a9"
m_res = supabase.table("meetings").select("*").eq("id", target_id).execute()
if m_res.data:
    m = m_res.data[0]
    print(f"Title: {m.get('title')}")
    print(f"Summary: {m.get('short_summary')}")
    print(f"Description: {m.get('detailed_description')}")
    print(f"Transcription: {m.get('transcription')}")
    
    chunks_res = supabase.table("transcript_chunks").select("*").eq("meeting_id", target_id).execute()
    print("Chunks:")
    for c in chunks_res.data or []:
        print(f"  - Text: {c.get('chunk_text')}")
        # Embedding length can be counted if it is a list
        emb = c.get('embedding')
        if emb:
            if isinstance(emb, list):
                print(f"  - Embedding type: list, len: {len(emb)}")
            elif isinstance(emb, str):
                print(f"  - Embedding type: str, len: {len(emb)}")
            else:
                print(f"  - Embedding type: {type(emb)}")
        else:
            print("  - Embedding is None")
else:
    print("Meeting not found!")
