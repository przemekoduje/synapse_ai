import os
import asyncio
from gtts import gTTS

def create_audio():
    tts = gTTS('Cześć, to jest testowy plik audio do sprawdzenia diaryzacji. Mówi pierwszy mówca.', lang='pl')
    tts.save('test_audio.mp3')

if __name__ == "__main__":
    create_audio()
    print("test_audio.mp3 created.")
