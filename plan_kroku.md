# Plan Kroku: Zadanie 17 - Wybór Kalendarza (UI / UX)

## 1. Cel Kroku
1. Dodanie mechanizmu wczytywania i wyboru kalendarza systemowego w ekranie `AnalysisResultScreen.tsx`.
2. Dodanie dedykowanej karty UI z listą dostępnych, zapisywalnych kalendarzy (wraz z ich źródłami np. Google, iCloud) i przyciskami wyboru (Radio Buttons).
3. Zapis wydarzenia do wybranego przez użytkownika kalendarza.

## 2. Pliki do modyfikacji i kopie zapasowe
Kopie zapasowe zostały już uprzednio utworzone, jednak w razie potrzeby zostaną zaktualizowane:
- `src/screens/AnalysisResultScreen.tsx.bak`

## 3. Planowane modyfikacje kodu

### Ekran Weryfikacji Wyników (`src/screens/AnalysisResultScreen.tsx`)
- **Stany komponentu:**
  - `calendars`: tablica wczytanych kalendarzy (`allowsModifications === true`).
  - `selectedCalendarId`: ID wybranego kalendarza.
- **Hook `useEffect`:**
  - Wczytywanie kalendarzy po wejściu na ekran (jeśli `shouldAddToCalendar` jest aktywne).
  - Domyślny wybór kalendarza `isPrimary` lub pierwszego z listy.
- **Karta wyboru kalendarza w UI:**
  - Dodanie sekcji "Wybór Kalendarza" z listą opcji przed przyciskiem akcji.
  - Wykorzystanie stylizowanych przycisków radiowych (okrąg z kropką w środku).
- **Zapis wydarzenia:**
  - Wykorzystanie `selectedCalendarId` przekazanego bezpośrednio z UI do funkcji `createCalendarEventAsync`.

---

Oczekuję na weryfikację planu i komendę **"Dalej"** (TWARDY STOP).
