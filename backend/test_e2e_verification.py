import os
import sys
import io
import asyncio
import httpx
from PIL import Image

# Add current dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


from app.main import app
from app.config import settings
from app.services.gemini_service import GeminiService
from app.services.tts_service import TTSService, detect_script_language, clean_text_for_speech, chunk_text
from app.services.language_service import LanguageService
from app.services.task_router import TaskRouter

def generate_sample_image_bytes(width=200, height=200, color="blue") -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

async def run_end_to_end_verification():
    print("\n=======================================================")
    print("  VISIONAI — END-TO-END REPAIR & RESILIENCE VERIFICATION")
    print("=======================================================\n")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        
        # 1. Health Check
        print("--- 1. Testing System Health & Services ---")
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        health_data = res.json()
        print(f"✓ Health Check Status: {health_data['status']}")
        print(f"✓ Services: {health_data['services']}")
        assert health_data["status"] == "healthy"
        assert health_data["services"]["gemini_vlm"] is True

        # 2. CORS Verification
        print("\n--- 2. Testing CORS & Preflight Headers ---")
        res_cors = await client.options(
            "/api/tts/synthesize",
            headers={
                "Origin": "https://esec-chatbot.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        assert res_cors.status_code == 200
        print(f"✓ CORS preflight allowed for Vercel production origin")

        # 3. Multilingual Detection & Prompt Directives
        print("\n--- 3. Testing Language Service Script & Style Detection ---")
        tamil_detect = LanguageService.detect_language_and_style("இந்த படம் என்ன?", "ta")
        assert tamil_detect["response_language"] == "ta"
        assert "தமிழ்" in tamil_detect["prompt_directive"]
        print(f"✓ Tamil preference mapped to script: {tamil_detect['script']}")

        malayalam_detect = LanguageService.detect_language_and_style("ഈ ചിത്രത്തിൽ എന്താണ്?", "ml")
        assert malayalam_detect["response_language"] == "ml"
        assert "മലയാളം" in malayalam_detect["prompt_directive"]
        print(f"✓ Malayalam preference mapped to script: {malayalam_detect['script']}")

        hindi_detect = LanguageService.detect_language_and_style("यह क्या है?", "hi")
        assert hindi_detect["response_language"] == "hi"
        assert "हिन्दी" in hindi_detect["prompt_directive"]
        print(f"✓ Hindi preference mapped to script: {hindi_detect['script']}")

        # 4. Translation Endpoint Verification
        print("\n--- 4. Testing /api/chat/translate Endpoint ---")
        base_text = "The image depicts a modern office workstation with a laptop and a coffee cup on the desk."
        for lang, expected_char_check in [
            ("ta", lambda t: any('\u0B80' <= c <= '\u0BFF' for c in t)),
            ("ml", lambda t: any('\u0D00' <= c <= '\u0D7F' for c in t)),
            ("hi", lambda t: any('\u0900' <= c <= '\u097F' for c in t)),
            ("tanglish", lambda t: len(t) > 5)
        ]:
            res_tr = await client.post("/api/chat/translate", json={"text": base_text, "target_language": lang})
            assert res_tr.status_code == 200, f"Translation to {lang} failed: {res_tr.text}"
            data = res_tr.json()["data"]
            print(f"✓ [{lang.upper()}] Translated: {data['translated_text'][:55]}... (Voice: {data['voice_id']})")
            assert expected_char_check(data["translated_text"])

        # 5. Neural TTS Synthesize & Generate
        print("\n--- 5. Testing Neural TTS Synthesize & Generate Endpoints ---")
        tts_res = await client.post("/api/tts/synthesize", json={
            "text": "வணக்கம், இது VISIONAI குரல் உதவி.",
            "language": "ta"
        })
        assert tts_res.status_code == 200
        assert tts_res.headers["content-type"] == "audio/mpeg"
        assert int(len(tts_res.content)) > 5000
        print(f"✓ Tamil audio synthesized: {len(tts_res.content)} bytes (Voice: {tts_res.headers.get('X-Voice-Id')})")

        tts_gen = await client.post("/api/tts/generate", json={
            "text": "നമസ്കാരം, ഇത് VISIONAI വോയ്‌സ് ആണ്.",
            "language": "ml"
        })
        assert tts_gen.status_code == 200
        gen_data = tts_gen.json()
        assert gen_data["success"] is True
        assert gen_data["voice_id"] == "ml-IN-SobhanaNeural"
        print(f"✓ Malayalam audio generated as base64: {gen_data['audio_size_bytes']} bytes")

        # 6. Edge Case: Empty & Invalid TTS
        print("\n--- 6. Testing Edge Cases & Failure Resiliency ---")
        empty_tts = await client.post("/api/tts/synthesize", json={"text": "   ", "language": "en"})
        assert empty_tts.status_code in [400, 422]
        print(f"✓ Empty TTS request rejected gracefully with HTTP {empty_tts.status_code}")

        # Edge Case: Oversized text chunking
        long_text = "This is a comprehensive test of speech chunking. " * 30
        chunks = chunk_text(long_text, max_chars=300)
        assert len(chunks) > 1
        print(f"✓ Long text ({len(long_text)} chars) chunked safely into {len(chunks)} sub-segments")

        # Edge Case: Markdown stripping for TTS
        raw_md = "### Header\n**Bold Text** with `code` and [link](http://test.com) and - bullet"
        cleaned_md = clean_text_for_speech(raw_md)
        assert "###" not in cleaned_md and "**" not in cleaned_md and "`" not in cleaned_md
        print(f"✓ Markdown sanitization for TTS verified: '{cleaned_md}'")

        # 7. Task Router Logic
        print("\n--- 7. Testing Task Router Dispatch Logic ---")
        r1 = TaskRouter.route("Count all the chairs and people in this room")
        assert r1.use_yolo is True
        print(f"✓ Spatial/count prompt correctly routed to YOLO: {r1.mode}")

        r2 = TaskRouter.route("Read the text on the receipt and list the totals")
        assert r2.use_ocr is True
        print(f"✓ OCR prompt correctly routed to OCR: {r2.mode}")

        r3 = TaskRouter.route("", is_new_upload=True)
        assert r3.mode == "gemini_auto_description"
        print(f"✓ New image upload correctly routed to Auto-Description: {r3.mode}")

        # 8. Live Gemini Multimodal Reasoning with Sample Image
        print("\n--- 8. Testing Live Gemini Multimodal Visual QA ---")
        sample_img = generate_sample_image_bytes(200, 200, "green")
        vlm_resp = await GeminiService.chat_with_vision(
            user_message="What is the primary background color of this image?",
            conversation_history=[],
            image_bytes=sample_img
        )
        print(f"✓ Live Gemini Multimodal Response: {vlm_resp.strip()[:100]}...")
        assert "green" in vlm_resp.lower() or "color" in vlm_resp.lower()

    print("\n=======================================================")
    print("🎉 ALL END-TO-END TESTS COMPLETED SUCCESSFULLY (100% PASS)")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_end_to_end_verification())
