import os
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
client = DeepgramClient(api_key=DEEPGRAM_API_KEY)

print(f"Listen: {client.listen}")
if hasattr(client.listen, 'v1'):
    print(f"Listen.v1: {client.listen.v1}")
    if hasattr(client.listen.v1, 'media'):
        print(f"Listen.v1.media: {client.listen.v1.media}")
        print(f"Methods: {dir(client.listen.v1.media)}")
    else:
        print("Listen.v1 has no 'media'")
else:
    print("Listen has no 'v1'")

# Check for 'rest'
if hasattr(client.listen, 'rest'):
    print(f"Listen.rest: {client.listen.rest}")
