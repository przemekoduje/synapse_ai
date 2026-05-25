import cv2
import os
import base64
import logging
from pydub import AudioSegment

logger = logging.getLogger("synapse_ai")

def extract_multimodal_data(video_path: str, trace_id: str):
    """
    Ekstrahuje klatki (Base64) oraz ścieżkę dźwiękową (MP3) z pliku wideo.
    """
    logger.info(f"[Trace ID: {trace_id}] Rozpoczęto przetwarzanie wideo: {video_path}")
    
    frames_base64 = []
    audio_path = f"temp_audio_{trace_id}.mp3"
    
    try:
        # 1. Ekstrakcja Audio (pydub automatycznie używa ffmpeg)
        logger.info(f"[Trace ID: {trace_id}] Ekstrakcja ścieżki dźwiękowej...")
        video_audio = AudioSegment.from_file(video_path)
        video_audio.export(audio_path, format="mp3")
        
        # 2. Ekstrakcja Klatek (OpenCV)
        logger.info(f"[Trace ID: {trace_id}] Ekstrakcja klatek wideo...")
        vidcap = cv2.VideoCapture(video_path)
        fps = vidcap.get(cv2.CAP_PROP_FPS)
        
        # Wyciągamy klatkę co 3 sekundy
        interval_frames = int(fps * 3) if fps > 0 else 90
        
        count = 0
        success, image = vidcap.read()
        while success:
            if count % interval_frames == 0:
                # Kodowanie klatki do Base64
                _, buffer = cv2.imencode('.jpg', image, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                frames_base64.append(jpg_as_text)
                
            success, image = vidcap.read()
            count += 1
            
        vidcap.release()
        logger.info(f"[Trace ID: {trace_id}] Wyekstrahowano {len(frames_base64)} klatek.")
        
        return frames_base64, audio_path

    except Exception as e:
        logger.error(f"[Trace ID: {trace_id}] Błąd media_processor: {str(e)}")
        # Sprzątanie w przypadku błędu
        if os.path.exists(audio_path):
            os.remove(audio_path)
        raise e
