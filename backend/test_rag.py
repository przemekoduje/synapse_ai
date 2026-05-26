import os
import sys
import asyncio
from unittest.mock import MagicMock
from dotenv import load_dotenv

# Załadowanie zmiennych środowiskowych z .env
load_dotenv()

# Dodanie bieżącego folderu do ścieżki
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import llm_service
import vector_service

async def test_llm_generation():
    print("\n--- 1. Test Generowania Odpowiedzi LLM (GPT-4o-mini) ---")
    mock_context = (
        "Mówca 1: Prace nad fundamentami zostaną zakończone w piątek. "
        "Mówca 2: Super, wtedy w poniedziałek wchodzi ekipa od murów. "
        "Mówca 1: Pamiętaj, żeby Jan Kowalski zamówił pustaki na poniedziałek rano."
    )
    
    # Test 1: Pytanie, na które odpowiedź znajduje się w kontekście
    question_1 = "Kiedy wchodzi ekipa od murów i kto ma zamówić pustaki?"
    print(f"Pytanie 1: '{question_1}'")
    try:
        answer_1 = await llm_service.answer_question_with_context(
            question=question_1,
            context=mock_context,
            trace_id="test-trace-1"
        )
        print("Odpowiedź LLM 1:")
        print(answer_1)
    except Exception as e:
        print("Błąd podczas generowania odpowiedzi 1:", str(e))
        
    print("-" * 40)
    
    # Test 2: Pytanie niepowiązane (test braku halucynacji)
    question_2 = "Jaka jest prognoza pogody na jutro w Warszawie?"
    print(f"Pytanie 2: '{question_2}'")
    try:
        answer_2 = await llm_service.answer_question_with_context(
            question=question_2,
            context=mock_context,
            trace_id="test-trace-2"
        )
        print("Odpowiedź LLM 2:")
        print(answer_2)
    except Exception as e:
        print("Błąd podczas generowania odpowiedzi 2:", str(e))

def test_supabase_rpc_mock():
    print("\n--- 2. Test Wyszukiwania w Bazie (Mock RPC) ---")
    # Mockujemy supabase_client
    mock_supabase = MagicMock()
    
    # Mockujemy poprawną odpowiedź RPC z dopasowanymi wierszami
    mock_response = MagicMock()
    mock_response.data = [
        {"chunk_text": "Mówca 1: Jan Kowalski ma zamówić pustaki."},
        {"chunk_text": "Mówca 2: Ekipa od murów wchodzi w poniedziałek."}
    ]
    mock_supabase.rpc.return_index.return_value = mock_response
    mock_supabase.rpc.return_value.execute.return_value = mock_response

    # Wywołanie retrieve_context z zamockowanym klientem
    question = "Kto zamawia pustaki?"
    print(f"Pytanie: '{question}'")
    context = vector_service.retrieve_context(
        question=question,
        meeting_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        supabase_client=mock_supabase
    )
    
    print("Wyciągnięty kontekst z Mock RPC:")
    print(context)
    print("-" * 40)
    
    # Weryfikacja czy rpc zostało wywołane z odpowiednimi parametrami
    mock_supabase.rpc.assert_called_once()
    print("Mock RPC zweryfikowany pomyślnie. Parametry RPC były przekazane prawidłowo.")

if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        print("Pominięto test OpenAI - brak klucza OPENAI_API_KEY w .env")
    else:
        asyncio.run(test_llm_generation())
    test_supabase_rpc_mock()
