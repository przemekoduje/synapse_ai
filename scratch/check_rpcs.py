import requests

SUPABASE_URL = "https://tbvdxevawuwnsirfiyrc.supabase.co"
# The service role key bypassed RLS and allows checking schema
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidmR4ZXZhd3V3bnNpcmZpeXJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg1NDUzOSwiZXhwIjoyMDk1NDMwNTM5fQ.Ery6e-6zRrc1U2HO2sQcZ3SK97fSFuFPdNs8OWxNSHg"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

try:
    # PostgREST exposes the schema description at the root URL
    res = requests.get(SUPABASE_URL + "/rest/v1/", headers=headers)
    if res.status_code == 200:
        spec = res.json()
        paths = spec.get("paths", {})
        rpcs = [p for p in paths.keys() if p.startswith("/rpc/")]
        print("Available RPCs:")
        for rpc in rpcs:
            print("  ", rpc)
    else:
        print("Failed to fetch schema. Status:", res.status_code, res.text)
except Exception as e:
    print("Error:", str(e))
