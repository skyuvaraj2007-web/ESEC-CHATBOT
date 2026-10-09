import base64
from fastapi import APIRouter, HTTPException, Depends, status, Response, Request
from pydantic import BaseModel, Field
from typing import Optional

from app.services.tts_service import TTSService, VOICE_MAP
from app.utils.security import get_current_user_optional

router = APIRouter(prefix="/api/tts", tags=["Text-to-Speech"])

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000, description="Response text to synthesize into neural speech")
    language: Optional[str] = Field("auto", description="Target language: en, ta, ml, hi, tanglish, auto")
    gender: Optional[str] = Field("female", description="Voice gender: female, male")
    rate: Optional[str] = Field("+0%", description="Speech speed adjustment e.g. +0%, +10%, -10%")
    pitch: Optional[str] = Field("+0Hz", description="Speech pitch adjustment")

class TTSResponse(BaseModel):
    success: bool = True
    audio_base64: str
    content_type: str = "audio/mpeg"
    language: str
    voice_id: str
    audio_size_bytes: int

@router.get("/voices")
async def get_available_voices():
    """
    Returns verified neural voice profiles and supported language codes.
    """
    return {
        "success": True,
        "voices": VOICE_MAP,
        "supported_languages": [
            {"code": "en", "name": "English", "voice": "en-IN-NeerjaNeural"},
            {"code": "ta", "name": "Tamil (தமிழ்)", "voice": "ta-IN-PallaviNeural"},
            {"code": "ml", "name": "Malayalam (മലയാളം)", "voice": "ml-IN-SobhanaNeural"},
            {"code": "hi", "name": "Hindi (हिन्दी)", "voice": "hi-IN-SwaraNeural"},
            {"code": "tanglish", "name": "Tanglish", "voice": "ta-IN-PallaviNeural"},
            {"code": "auto", "name": "Auto Detect", "voice": "Automatic Neural Selection"}
        ]
    }

@router.post("/synthesize")
async def synthesize_audio_stream(
    payload: TTSRequest,
    current_user = Depends(get_current_user_optional)
):
    """
    Synthesizes neural speech and returns an MP3 audio binary stream.
    Directly playable by browser and native mobile audio elements.
    """
    try:
        audio_bytes, detected_lang, voice_id = await TTSService.synthesize_speech(
            text=payload.text,
            language=payload.language,
            gender=payload.gender or "female",
            rate=payload.rate or "+0%",
            pitch=payload.pitch or "+0Hz"
        )

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="visionai_speech.mp3"',
                "X-Detected-Language": detected_lang,
                "X-Voice-Id": voice_id,
                "Cache-Control": "public, max-age=3600",
            }
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Neural speech synthesis error: {str(e)}"
        )

@router.post("/generate", response_model=TTSResponse)
async def generate_audio_json(
    payload: TTSRequest,
    current_user = Depends(get_current_user_optional)
):
    """
    Synthesizes neural speech and returns Base64 encoded audio payload with metadata.
    """
    try:
        audio_bytes, detected_lang, voice_id = await TTSService.synthesize_speech(
            text=payload.text,
            language=payload.language,
            gender=payload.gender or "female",
            rate=payload.rate or "+0%",
            pitch=payload.pitch or "+0Hz"
        )

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        return TTSResponse(
            success=True,
            audio_base64=audio_b64,
            content_type="audio/mpeg",
            language=detected_lang,
            voice_id=voice_id,
            audio_size_bytes=len(audio_bytes)
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Neural speech generation error: {str(e)}"
        )
