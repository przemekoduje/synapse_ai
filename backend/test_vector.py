import os
import sys
from dotenv import load_dotenv

# Załadowanie zmiennych środowiskowych z .env
load_dotenv()

# Dodanie bieżącego folderu do ścieżki
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import vector_service

# Przykładowy tekst transkrypcji z diaryzacją (podziałem na mówców)
mock_transcript = (
    "Mówca 1: Dzień dobry wszystkim. Chciałbym rozpocząć omawianie statusu projektu Synapse AI. "
    "Czy możemy przejść przez kluczowe kamienie milowe?\n\n"
    "Mówca 2: Cześć. Tak, wdrożyliśmy już rejestrator audio w aplikacji mobilnej. "
    "Teraz pracujemy nad integracją z Supabase i wektoryzacją transkrypcji.\n\n"
    "Mówca 1: Świetnie. Kto zajmuje się bazą danych?\n\n"
    "Mówca 2: Ja się tym zajmuję. Planuję wdrożyć rozszerzenie pgvector w Supabase, "
    "aby zapisywać embeddings o długości 1536 wymiarów. Użyjemy do tego modelu OpenAI.\n\n"
    "Mówca 3: Ja dołączę do testowania API na backendzie. Przygotuję skrypty testujące "
    "dla endpointu /upload-audio, aby sprawdzić czy zadania w tle wykonują się bezbłędnie.\n\n"
    "Mówca 1: Doskonale. Zróbmy tak. Do końca tygodnia powinniśmy mieć działające RAG."
)

print("--- Test Serwisu Wektorowego ---")
print("1. Test podziału na fragmenty (chunk_text)...")
chunks = vector_service.chunk_text(mock_transcript, chunk_size=300)
for idx, chunk in enumerate(chunks, 1):
    print(f"\n[Fragment {idx}]:")
    print(chunk)
    print("-" * 30)

print("\n2. Test generowania embeddings (generate_embeddings)...")
# Testujemy tylko jeśli jest klucz OpenAI w .env
if os.getenv("OPENAI_API_KEY"):
    try:
        embeddings = vector_service.generate_embeddings(chunks)
        print(f"Sukces! Wygenerowano {len(embeddings)} wektorów.")
        if embeddings:
            print(f"Wymiar pierwszego wektora: {len(embeddings[0])}")
            print(f"Przykładowe pierwsze 5 wartości wektora: {embeddings[0][:5]}")
    except Exception as e:
        print("Błąd podczas generowania wektorów:", str(e))
else:
    print("Pominięto generowanie embeddings - brak klienta/klucza OpenAI w .env.")
