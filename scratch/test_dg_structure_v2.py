import os
from deepgram import DeepgramClient
from dotenv import load_dotenv

# Use the correct path to .env
load_dotenv('backend/.env')

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
print(f"Key found: {bool(DEEPGRAM_API_KEY)}")

try:
    client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
    print("Client initialized")
    
    # Introspect
    print("\nIntrospecting client.listen...")
    print(dir(client.listen))
    
    # Check for v1
    if hasattr(client.listen, 'v1'):
        print("\nIntrospecting client.listen.v1...")
        print(dir(client.listen.v1))
        
        # Check for rest
        if hasattr(client.listen.v1, 'rest'):
            print("\nIntrospecting client.listen.v1.rest...")
            print(dir(client.listen.v1.rest))
except Exception as e:
    print(f"Error: {e}")
