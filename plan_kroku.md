# Plan Kroku: Zadanie 29 - Edycja Raportu w Hubie Webowym i Konfiguracja Linków Lokacji

## 1. Cel Kroku
Wprowadzenie możliwości pełnej edycji i zarządzania podsumowaniem oraz zadaniami bezpośrednio z poziomu panelu webowego (Hub Raportowy) w celu umożliwienia korekty wyników analizy AI. Dodatkowo, konfiguracja dynamicznego adresu URL dla Magic Linku w aplikacji mobilnej w zależności od środowiska pracy (lokalne deweloperskie / produkcja).

## 2. Pliki do modyfikacji i kopie zapasowe
Przed rozpoczęciem prac zostaną wykonane kopie zapasowe:
- `frontend/src/screens/AnalysisResultScreen.tsx` -> `frontend/src/screens/AnalysisResultScreen.tsx.bak`
- `frontend/.env` -> `frontend/.env.bak`
- `webapp/src/pages/ReportPage.tsx` -> `webapp/src/pages/ReportPage.tsx.bak`

## 3. Planowane modyfikacje kodu

### A. Dynamiczny URL dla Magic Link w Aplikacji Mobilnej
- W [frontend/.env](file:///c:/Users/Admin/Desktop/przemokoduje/kodowanie/Synapse_AI/frontend/.env) dodamy zmienną:
  `EXPO_PUBLIC_WEBAPP_URL=http://localhost:5173`
- W [frontend/src/screens/AnalysisResultScreen.tsx](file:///c:/Users/Admin/Desktop/przemokoduje/kodowanie/Synapse_AI/frontend/src/screens/AnalysisResultScreen.tsx) zmienimy generowanie Magic Linku na:
  `const webappUrl = process.env.EXPO_PUBLIC_WEBAPP_URL || 'https://app.synapse-ai.com';`
  `emailBody += '...' + webappUrl + '/raport/' + session_id;`

### B. Panel Webowy: Edycja Spotkania (`webapp/src/pages/ReportPage.tsx`)
Zaimplementujemy kompletny interfejs edycyjny zapisujący dane w Supabase:
1. **Edycja Nagłówka i Podsumowania:**
   - Przycisk "Edytuj dane spotkania" przełączający pola Tytuł, Podsumowanie AI i Opis w tryb input/textarea.
   - Walidacja zmian i przyciski "Zapisz" / "Anuluj" wykonujące operację `UPDATE` w tabeli `meetings`.
2. **Zarządzanie Zadaniami (Action Items):**
   - Dodanie interaktywnych kontrolek do każdego zadania:
     - Możliwość edycji tekstu zadania (`task_description`).
     - Możliwość edycji przypisanej osoby (`assignee`).
     - Przełącznik statusu ("otwarte" / "zakończone" / "w toku").
     - Przycisk "Usuń" usuwający zadanie z bazy (`DELETE` w `action_items`).
   - Dodanie formularza "Dodaj nowe zadanie" na dole listy zadań pozwalającego na dynamiczne dopisywanie nowych punktów do bieżącego spotkania (`INSERT` w `action_items`).

## 4. Weryfikacja
1. Sprawdzenie poprawności budowania webappu za pomocą `npm run build` w katalogu `webapp`.
2. Manualne przetestowanie edycji tytułu, podsumowania i zadań w przeglądarce pod adresem `http://localhost:5173/raport/{meeting_id}`.
3. Potwierdzenie zapisu zmian w bazie Supabase.

---
**TWARDY STOP.** Oczekuję na weryfikację planu przez Architekta i komendę **"Dalej"**.
