import os
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv('backend/.env')

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
client = DeepgramClient(api_key=DEEPGRAM_API_KEY)

print("\nIntrospecting client.listen.v1.media...")
print(dir(client.listen.v1.media))
