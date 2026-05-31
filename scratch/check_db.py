import os
from dotenv import load_dotenv
from supabase import create_client

# Explicit path to .env file in backend directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env')
print(f"Loading .env from: {dotenv_path}")
print(f"Exists: {os.path.exists(dotenv_path)}")

load_dotenv(dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"SUPABASE_KEY exists: {bool(SUPABASE_KEY)}")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_KEY in .env")
    exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Try fetching a single meeting to see if user_id column exists in the response
    res = supabase.table("meetings").select("*").limit(1).execute()
    print("Connection successful!")
    if res.data:
        meeting = res.data[0]
        print("Columns in meetings table:")
        for key in meeting.keys():
            print(f" - {key}")
        if "user_id" in meeting:
            print("\nSuccess: 'user_id' column exists!")
        else:
            print("\nWarning: 'user_id' column DOES NOT exist in 'meetings'!")
    else:
        print("No meetings found in table 'meetings' to check column names. Trying to select specific columns...")
        try:
            res_id = supabase.table("meetings").select("user_id").limit(1).execute()
            print("Success: 'user_id' column exists (querying 'select(user_id)' succeeded)!")
        except Exception as e:
            print("Error querying 'user_id' column:", e)
            print("Warning: 'user_id' column probably does NOT exist!")
            
except Exception as e:
    print("Error communicating with Supabase:", e)
