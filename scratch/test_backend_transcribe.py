import os
import asyncio
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def main():
    import sys
    sys.path.append(os.path.abspath("backend"))
    import llm_service
    
    trace_id = "test-123"
    try:
        print("Testing transcription...")
        result = await llm_service.transcribe_audio("scratch/test_tone.wav", trace_id)
        print("Result:", result)
    except Exception as e:
        print("Exception caught:", e)

if __name__ == "__main__":
    asyncio.run(main())
