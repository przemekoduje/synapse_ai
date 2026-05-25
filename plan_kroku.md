# Plan Kroku: Zadanie 13 - Zastąpienie n8n natywną wysyłką (expo-mail-composer)

## 1. Cel Kroku
Całkowita eliminacja orkiestratora n8n na rzecz natywnego klienta pocztowego w urządzeniu. Aplikacja mobilna wygeneruje e-mail z podsumowaniem spotkania bez udziału serwera do dystrybucji danych. Backend FastAPI pozostaje nienaruszony pod kątem integracji z AI, ale traci endpoint `/execute`.

## 2. Planowane modyfikacje

### Frontend (React Native / Expo)
1. **Instalacja pakietu:** 
   *(Pakiet `expo-mail-composer` został już uprzednio zainstalowany, ale w razie potrzeby upewnimy się, że jest w `package.json`).*
2. **Kopia zapasowa:** 
   Utworzenie pliku `AnalysisResultScreen.tsx.bak`.
3. **Modyfikacja `AnalysisResultScreen.tsx`:**
   - Usunięcie importu funkcji API (np. `executeAction`).
   - Implementacja `MailComposer.composeAsync()` z odpowiednio sformatowanym tekstem (`short_summary` + zatwierdzone `action_items`).
   - Podpięcie nowej funkcji pod przycisk "Zatwierdź i Wykonaj".

### Backend (FastAPI)
1. **Kopia zapasowa:** 
   Utworzenie pliku `main.py.bak`.
2. **Czyszczenie `main.py`:**
   - Usunięcie endpointu `POST /execute`.
   - Usunięcie modelu DTO powiązanego z `/execute` (jeśli istnieje, np. `ExecuteRequest`).
3. **Czyszczenie plików:**
   - Usunięcie pliku `backend/n8n_client.py` - nie jest już potrzebny w systemie.

## 3. Kolejność działań
1. Tworzenie kopii bezpieczeństwa plików (`.bak`).
2. Implementacja logiki wysyłki i formatowania maila w aplikacji (`AnalysisResultScreen.tsx`).
3. Sprzątanie nieużywanego kodu z backendu (`main.py` i `n8n_client.py`).

Oczekuję na komendę **"Dalej"**, aby przystąpić do modyfikacji plików.
