import os
from supabase import create_client

SUPABASE_URL = "https://tbvdxevawuwnsirfiyrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmR4ZXZhd3V3bnNpcmZpeXJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg1NDUzOSwiZXhwIjoyMDk1NDMwNTM5fQ.Ery6e-6zRrc1U2HO2sQcZ3SK97fSFuFPdNs8OWxNSHg"

client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Query pg_policies to list the policies on the meetings table
res = client.rpc("get_policies", {}).execute()
# Since we might not have a get_policies RPC, let's execute SQL using a trick or select from information_schema/pg_catalog if allowed,
# or we can just try to run query to pg_catalog.pg_policies. But wait, Rpc isn't direct SQL.
# Let's try select from pg_policies via supabase? Wait, supabase REST api doesn't expose pg_catalog unless specifically exposed.
# But we can try querying it:
try:
    policies = client.table("pg_policies").select("*").execute()
    print("pg_policies:", policies.data)
except Exception as e:
    print("Failed to query pg_policies directly via postgrest:", str(e))
