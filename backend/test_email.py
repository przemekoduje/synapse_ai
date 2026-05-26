import os
import sys
from dotenv import load_dotenv

# Załaduj zmienne środowiskowe z .env
load_dotenv()

# Dodaj bieżący folder do path, aby poprawnie zaimportować email_service
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import email_service

print("--- Test Serwisu SMTP ---")
print("Zmienne środowiskowe:")
print("SMTP_HOST:", os.getenv("SMTP_HOST"))
print("SMTP_PORT:", os.getenv("SMTP_PORT"))
print("SMTP_USER:", os.getenv("SMTP_USER"))
print("SENDER_EMAIL:", os.getenv("SENDER_EMAIL"))
print("NOTIFICATION_EMAIL:", os.getenv("NOTIFICATION_EMAIL"))
print("--------------------------")

mock_title = "Spotkanie Budowlane: Fundamenty - Sekcja B"
mock_summary = "Omówiono opóźnienia w wylewaniu betonu na sekcji B. Wyznaczono nowy harmonogram i przydzielono odpowiedzialność za dostawy cementu."
mock_action_items = [
    {
        "task_description": "Skontaktować się z dostawcą betonu w sprawie nowego terminu",
        "assignee": "Jan Kowalski"
    },
    {
        "task_description": "Przygotować raport z kontroli jakości zbrojenia",
        "assignee": "Tomasz Nowak"
    },
    {
        "task_description": "Zamówić dodatkowe szalunki",
        "assignee": None
    }
]
mock_meeting_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"

print("Rozpoczynam testową wysyłkę e-mail...")
success = email_service.send_meeting_summary_email(
    meeting_title=mock_title,
    short_summary=mock_summary,
    action_items=mock_action_items,
    meeting_id=mock_meeting_id
)

if success:
    print("Sukces! Testowy e-mail został wysłany.")
else:
    print("Wysyłka e-maila nie powiodła się lub została pominięta z powodu braku konfiguracji w pliku .env.")
