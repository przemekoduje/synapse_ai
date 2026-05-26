from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime

class MeetingPayload(BaseModel):
    """
    Model danych dla spotkania biznesowego przesyłanego z aplikacji mobilnej.
    """
    session_id: str
    transcription: str
    timestamp: str
    user_action_flags: Dict[str, Any]

class AskRequest(BaseModel):
    """
    Model danych dla zapytania konwersacyjnego RAG.
    """
    meeting_id: str
    question: str

