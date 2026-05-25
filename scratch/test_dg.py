import os
from deepgram import DeepgramClient, PrerecordedOptions
from dotenv import load_dotenv

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
print(f"Key: {DEEPGRAM_API_KEY[:5]}...")

client = DeepgramClient(api_key=DEEPGRAM_API_KEY)

# Mock some binary data
data = b"test data"

try:
    options = {
        "model": "nova-2",
        "language": "pl",
        "diarize": True,
    }
    # Test call structure
    print("Testing transcribe_file call...")
    # Using the structure from the search result
    # response = client.listen.v1.media.transcribe_file({"buffer": data}, options)
    # OR
    # response = client.listen.v1.media.transcribe_file(data, options)
    
    # Let's see what methods are available
    print(dir(client.listen.v1))
except Exception as e:
    print(f"Error: {e}")
