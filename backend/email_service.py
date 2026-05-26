import smtplib
import os
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("synapse_ai")

def send_meeting_summary_email(meeting_title: str, short_summary: str, action_items: list, meeting_id: str):
    """
    Wysyła e-mail z podsumowaniem spotkania i zadaniami (action items) do odbiorcy.
    Wiadomość zawiera Magic Link w stylu Material Design 3.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SENDER_EMAIL")
    recipient_email = os.getenv("NOTIFICATION_EMAIL")

    if not all([smtp_host, smtp_port, smtp_user, smtp_password, sender_email, recipient_email]):
        logger.warning("[SMTP] Konfiguracja SMTP w pliku .env jest niekompletna. Pomijam wysyłanie e-maila.")
        return False

    # Generowanie wierszy tabeli zadań
    action_items_rows = ""
    if action_items:
        for idx, item in enumerate(action_items, 1):
            if isinstance(item, dict):
                desc = item.get("task_description", "")
                assignee = item.get("assignee") or "Nieprzypisane"
            else:
                desc = str(item)
                assignee = "Nieprzypisane"
            
            action_items_rows += f"""
            <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px; font-size: 14px; color: #1E293B; text-align: left;">{idx}</td>
                <td style="padding: 12px; font-size: 14px; color: #1E293B; text-align: left;">{desc}</td>
                <td style="padding: 12px; font-size: 14px; color: #475569; font-weight: 500; text-align: left;">{assignee}</td>
            </tr>
            """
    else:
        action_items_rows = """
        <tr>
            <td colspan="3" style="padding: 16px; font-size: 14px; color: #64748B; text-align: center;">
                Brak zidentyfikowanych zadań do wykonania.
            </td>
        </tr>
        """

    # Magic Link kierujący na platformę webową z podanym UUID spotkania
    magic_link = f"https://app.twojadomena.pl/raport/{meeting_id}"

    # Szablon HTML Material Design 3 (Jasne tło, wysoki kontrast, błękitny przycisk CTA)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{meeting_title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #E2E8F0;">
            <!-- Nagłówek -->
            <div style="background-color: #0EA5E9; padding: 24px; text-align: center;">
                <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Synapse AI</h1>
            </div>
            
            <!-- Główna zawartość -->
            <div style="padding: 32px;">
                <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #0F172A;">Podsumowanie Spotkania</h2>
                <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 15px; font-weight: 600; color: #475569; border-left: 4px solid #0EA5E9; padding-left: 12px;">{meeting_title}</h3>
                
                <p style="margin-bottom: 28px; font-size: 15px; line-height: 1.6; color: #334155; background-color: #F0F9FF; padding: 16px; border-radius: 12px; border: 1px solid #E0F2FE;">
                    <strong>Streszczenie:</strong><br>
                    {short_summary}
                </p>
                
                <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Przypisane zadania (Action Items)</h3>
                <div style="overflow-x: auto; margin-bottom: 32px;">
                    <table style="width: 100%; border-collapse: collapse; min-width: 400px;">
                        <thead>
                            <tr style="background-color: #F1F5F9; border-bottom: 2px solid #E2E8F0;">
                                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; width: 40px;">#</th>
                                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Zadanie</th>
                                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; width: 120px;">Odpowiedzialny</th>
                            </tr>
                        </thead>
                        <tbody>
                            {action_items_rows}
                        </tbody>
                    </table>
                </div>
                
                <!-- Interaktywny Magic Link (Material Design 3 CTA) -->
                <div style="text-align: center; margin-top: 32px; margin-bottom: 8px;">
                    <a href="{magic_link}" style="display: inline-block; padding: 14px 28px; background-color: #0EA5E9; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 100px; box-shadow: 0 4px 6px rgba(14, 165, 233, 0.2); text-align: center; transition: background-color 0.2s;">
                        Przejdź do analizy i zadawaj pytania
                    </a>
                </div>
            </div>
            
            <!-- Stopka -->
            <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">Ta wiadomość została wysłana automatycznie przez system Synapse AI.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Tworzenie maila
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Synapse AI] Podsumowanie: {meeting_title}"
    msg["From"] = f"Synapse AI <{sender_email}>"
    msg["To"] = recipient_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        port = int(smtp_port)
        logger.info(f"[SMTP] Łączenie z serwerem pocztowym {smtp_host}:{port}...")
        
        if port == 465:
            server = smtplib.SMTP_SSL(smtp_host, port, timeout=10.0)
        else:
            server = smtplib.SMTP(smtp_host, port, timeout=10.0)
            server.starttls()
            
        server.login(smtp_user, smtp_password)
        server.sendmail(sender_email, [recipient_email], msg.as_string())
        server.quit()
        
        logger.info(f"[SMTP] E-mail z podsumowaniem został pomyślnie wysłany do {recipient_email} (ID spotkania: {meeting_id})")
        return True
    except Exception as e:
        logger.error(f"[SMTP] Błąd podczas wysyłania e-maila: {str(e)}")
        return False
