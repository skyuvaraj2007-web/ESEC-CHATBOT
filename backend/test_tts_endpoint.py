import asyncio
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_tts_voices():
    response = client.get("/api/tts/voices")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    print("[PASS] /api/tts/voices returned supported voices.")

def test_tts_synthesis():
    test_cases = [
        ("en", "VISIONAI visual intelligence analysis complete."),
        ("ta", "விஷன் ஏஐ பகுப்பாய்வு முடிந்தது."),
        ("ml", "വിഷൻ എഐ വിശകലനം പൂർത്തിയായി."),
        ("hi", "विज़न एआई विश्लेषण पूरा हुआ।"),
        ("tanglish", "Indha image la visual details analysis complete aachu.")
    ]

    for lang, text in test_cases:
        payload = {
            "text": text,
            "language": lang,
            "gender": "female"
        }
        res = client.post("/api/tts/synthesize", json=payload)
        assert res.status_code == 200, f"Failed for {lang}: {res.text}"
        assert res.headers["content-type"] == "audio/mpeg"
        audio_len = len(res.content)
        assert audio_len > 1000, f"Audio too short for {lang}"
        print(f"[PASS] Synthesize {lang.upper()}: {audio_len} bytes received (Voice: {res.headers.get('X-Voice-Id')})")

if __name__ == "__main__":
    test_tts_voices()
    test_tts_synthesis()
    print("ALL TTS BACKEND TESTS PASSED!")
