import os
from dotenv import load_dotenv
from supabase import create_client

# Explicit path to .env file in backend directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env')
load_dotenv(dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_KEY in .env")
    exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Fetch all meetings where user_id is null
    res = supabase.table("meetings").select("id, title, created_at").is_("user_id", "null").execute()
    
    legacy_meetings = res.data or []
    print(f"Found {len(legacy_meetings)} legacy meetings (where user_id is NULL):")
    for m in legacy_meetings:
        print(f" - ID: {m['id']}, Title: '{m['title']}', Created: {m['created_at']}")
        
    if len(legacy_meetings) > 0:
        print("\nDeleting legacy meetings...")
        # Since cascading delete is set up on the foreign keys, deleting the meetings will also delete their action items and transcript chunks.
        delete_ids = [m['id'] for m in legacy_meetings]
        
        # Perform deletion
        del_res = supabase.table("meetings").delete().in_("id", delete_ids).execute()
        print(f"Successfully deleted {len(del_res.data or [])} legacy meetings from the database.")
    else:
        print("\nNo legacy meetings (user_id IS NULL) found to delete.")
            
except Exception as e:
    print("Error communicating with Supabase:", e)
