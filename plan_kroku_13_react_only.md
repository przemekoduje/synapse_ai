# Plan przebudowy: Architektura "Only React" (Serverless)

Zgodnie z decyzją, całkowicie eliminujemy n8n oraz backend w Pythonie. Aplikacja w React Native (Expo) przejmie 100% logiki.

## 1. Co zniknie?
- Cały folder `backend` (Python, FastAPI, OpenCV).
- Zależność od n8n i webhooków.

## 2. Co się zmieni we frontendzie (React Native)?
- **Bezpośrednie calle do API**: Aplikacja będzie bezpośrednio wysyłać zapytania (fetch) do **Deepgram** (transkrypcje) oraz **OpenAI** (analiza LLM).
- **Inspekcja Wideo**: Ponieważ nie mamy OpenCV, użyjemy `expo-video-thumbnails` do wyciągnięcia klatek z nagranego wideo, a następnie samo wideo wyślemy do Deepgrama (obsługuje pliki MP4 bezpośrednio), a klatki do OpenAI Vision.
- **Wysyłka Emaila**: 
  - Dodamy bibliotekę `expo-mail-composer`, która po wygenerowaniu podsumowania otworzy na telefonie domyślną aplikację pocztową (Gmail/Apple Mail) z gotowym do wysłania tekstem i adresem.
  - (Opcjonalnie, jeśli e-mail ma lecieć w pełni "w tle" bez klikania "Wyślij", zintegrujemy darmowe API np. `EmailJS` lub dodamy prosty skrypt Google Apps Script do wysyłki Gmaila).
- **Zmienne środowiskowe**: Klucze `OPENAI_API_KEY` oraz `DEEPGRAM_API_KEY` przeniesiemy do pliku `.env` w folderze frontend.

## 3. Kolejne kroki do akceptacji:
1. Zainstalowanie nowych pakietów w React Native (`expo-mail-composer`, `expo-video-thumbnails`).
2. Przepisanie pliku `src/services/api.ts` na bezpośrednią komunikację z zewnętrznymi API.
3. Podpięcie wysyłki e-mail w komponencie podsumowania.

Czy startujemy z taką implementacją (wysyłka przez `expo-mail-composer` z podglądem maila przed wysłaniem)? 
