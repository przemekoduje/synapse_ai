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
    
    print("Listing users using supabase.auth.admin.list_users()...")
    res = supabase.auth.admin.list_users()
    
    print("Type of result:", type(res))
    print("Attributes/keys of result:", dir(res))
    
    # In newer supabase-py versions, auth.admin.list_users() returns a model or a list. Let's see what is inside.
    if hasattr(res, 'users'):
        print(f"Found {len(res.users)} users using .users attribute.")
        for u in res.users:
            print(f" - ID: {u.id}, Email: {u.email}")
    else:
        print("Result does not have '.users'. Printing string representation:")
        print(res)
            
except Exception as e:
    print("Error listing users:", e)
