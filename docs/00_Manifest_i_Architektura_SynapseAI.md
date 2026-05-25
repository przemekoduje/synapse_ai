# Manifest i Architektura Synapse AI

## 1. Wizja Projektu
**Synapse AI** to inteligentny system asystujący podczas spotkań biznesowych oraz inspekcji terenowych (np. na budowie). System integruje rejestrację multimediów, zaawansowaną analizę LLM oraz automatyzację procesów biznesowych.

## 2. Architektura Systemu

### 2.1. Frontend (Aplikacja Mobilna)
- **Technologia:** React Native (Expo).
- **Rola:** 
  - Interfejs użytkownika do nagrywania audio (spotkania) i wideo (inspekcje).
  - Wstępna optymalizacja mediów: ekstrakcja klatek z wideo, kompresja danych.
  - Wyświetlanie wyników analizy i przycisków akcji ("Zatwierdź i wykonaj").

### 2.2. Backend (Logika i LLM)
- **Technologia:** Python (FastAPI).
- **Rola:**
  - Odbieranie paczek danych z aplikacji mobilnej.
  - Komunikacja z API Gemini 1.5 Pro (analiza multimodalna).
  - Generowanie ustrukturyzowanego formatu JSON (podsumowania, zadania, opisy).
  - Bezstanowość: backend nie przechowuje trwale ciężkich mediów.

### 2.3. Orkiestracja i Wykonanie (n8n)
- **Technologia:** n8n (Webhooks).
- **Rola:**
  - Odbieranie zatwierdzonych danych JSON.
  - Realizacja akcji: wysyłka e-maili, wpisy do Kalendarza Google, zapisywanie notatek w systemach zewnętrznych.

---

## 3. Uniwersalny Manifest Architektury i Podziału Ról

### 3.1. Trójpodział Ról
1.  **Baza Wiedzy (Dokumentacja):** Single Source of Truth zawarty w folderze `/docs`. Każda zmiana architektury musi zostać tu odnotowana.
2.  **Architekt (Gemini):** Nadzorca procesu, weryfikuje plany kroków, dba o spójność systemu i standardy bezpieczeństwa.
3.  **Programista (Antigravity):** Wykonawca zadań, odpowiedzialny za pisanie kodu, testowanie i raportowanie postępów zgodnie z planem.

### 3.2. Sześcioetapowy Obieg Pracy (Workflow)
Praca nad każdym zadaniem musi przebiegać według schematu:
1.  **Zadanie:** Przyjęcie instrukcji od Architekta/Użytkownika.
2.  **Plan:** Wygenerowanie pliku `plan_kroku.md` (Cel, Pliki, Logika, Koszty).
3.  **TWARDY STOP:** Zatrzymanie pracy i oczekiwanie na weryfikację.
4.  **Walidacja Architekta:** Sprawdzenie planu pod kątem zgodności z Manifestem.
5.  **Komenda "Dalej":** Sygnał do rozpoczęcia implementacji.
6.  **Wdrożenie i Raport:** Realizacja kodu oraz stworzenie `diff_ostatni_krok.md` (lub aktualizacja walkthrough) podsumowującego zmiany.

---

## 4. Zasady Bezpieczeństwa i Higieny Pracy

- **Trace ID:** Każda operacja backendowa i request muszą posiadać identyfikator śledzenia w logach.
- **Kopie Bezpieczeństwa:** Przed każdą istotną modyfikacją istniejącego pliku, należy stworzyć jego kopię `.bak`.
- **Izolacja Sekretów:** Zakaz wpisywania kluczy API bezpośrednio w kodzie. Wszystkie sekrety muszą znajdować się w `.env`.
- **Weryfikacja .env:** Przygotowanie pliku `.env.example` dla każdego modułu.
- **Zakaz Halucynacji:** Jeśli Programista nie jest pewien działania biblioteki lub fragmentu kodu, ma obowiązek przerwać pracę i zadać pytanie Architektowi.
- **Minimalizm:** Nie dodajemy niepotrzebnych zależności. Każda biblioteka musi być uzasadniona w planie kroku.

---
*Dokument ten jest "Biblią" projektu i musi być konsultowany przed każdym etapem prac.*
