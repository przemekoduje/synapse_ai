import os
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv('backend/.env')

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
client = DeepgramClient(api_key=DEEPGRAM_API_KEY)

options = {
    "model": "nova-2",
    "language": "pl",
    "diarize": True,
}

data = b"RIFF\\x24\\x00\\x00\\x00WAVEfmt \\x10\\x00\\x00\\x00\\x01\\x00\\x01\\x00D\\xac\\x00\\x00\\x88X\\x01\\x00\\x02\\x00\\x10\\x00data\\x00\\x00\\x00\\x00"

try:
    print("Testing with raw bytes...")
    response = client.listen.v1.media.transcribe_file(
        request=data,
        **options
    )
    print("Success with raw bytes!")
except Exception as e:
    print(f"Failed with raw bytes: {e}")

try:
    print("Testing with {'buffer': data}...")
    response = client.listen.v1.media.transcribe_file(
        request={"buffer": data},
        **options
    )
    print("Success with dict!")
except Exception as e:
    print(f"Failed with dict: {e}")
