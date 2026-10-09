import os
import sys
import asyncio
import httpx
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.language_service import LanguageService
from app.services.gemini_service import GeminiService
from app.services.tts_service import TTSService
from app.main import app

async def run_all_tests():
    print("=======================================================", flush=True)
    print("  VISIONAI MULTILINGUAL & NEURAL TTS VERIFICATION", flush=True)
    print("=======================================================", flush=True)

    # 1. Test Language Directives
    print("\n--- 1. Testing Language Directives & Prompts ---", flush=True)
    for lang, name in [("en", "English"), ("ta", "Tamil"), ("ml", "Malayalam"), ("hi", "Hindi"), ("tanglish", "Tanglish")]:
        det = LanguageService.detect_language_and_style("Describe this image", user_preference=lang)
        print(f"✓ [{name}] Target: {det['response_language']} | Script: {det['script']}", flush=True)

    # 2. Test Neural Voice Mappings
    print("\n--- 2. Testing Voice Mapping Resolution ---", flush=True)
    for lang, expected_voice in [
        ("en", "en-IN-NeerjaNeural"),
        ("ta", "ta-IN-PallaviNeural"),
        ("ml", "ml-IN-SobhanaNeural"),
        ("hi", "hi-IN-SwaraNeural")
    ]:
        _, voice_id = TTSService.resolve_voice(lang)
        assert voice_id == expected_voice, f"Expected {expected_voice}, got {voice_id}"
        print(f"✓ [{lang.upper()}] Neural Voice Verified -> {voice_id}", flush=True)

    # 3. Test Live Multilingual Response Generation & Audio
    print("\n--- 3. Testing Real Gemini Multilingual Generation & Voice ---", flush=True)
    visual_context = "Scene: Modern office workspace with a silver laptop, white coffee mug, and black notebook on a clean wooden table."

    # Test EN
    print("\n[A] Testing ENGLISH...", flush=True)
    en_prompt = LanguageService.detect_language_and_style("Describe the image.", user_preference="en")
    en_reply = await GeminiService.chat_with_vision(
        user_message="Describe the image.",
        conversation_history=[],
        visual_context=visual_context,
        language_hint="en",
        language_directive=en_prompt["prompt_directive"]
    )
    print(f"  AI Output: {en_reply[:100]}...", flush=True)
    en_audio, _, en_v = await TTSService.synthesize_speech(en_reply, language="en")
    print(f"✓ English Audio: {len(en_audio)} bytes generated via {en_v}", flush=True)

    # Test TA
    print("\n[B] Testing TAMIL (தமிழ்)...", flush=True)
    ta_prompt = LanguageService.detect_language_and_style("இந்த படத்தை விளக்குங்கள்.", user_preference="ta")
    ta_reply = await GeminiService.chat_with_vision(
        user_message="இந்த படத்தில் என்னென்ன உள்ளது? தெளிவாக விளக்குங்கள்.",
        conversation_history=[],
        visual_context=visual_context,
        language_hint="ta",
        language_directive=ta_prompt["prompt_directive"]
    )
    print(f"  AI Output: {ta_reply[:100]}...", flush=True)
    assert any('\u0B80' <= c <= '\u0BFF' for c in ta_reply), "Error: No Tamil characters found in Tamil response!"
    ta_audio, _, ta_v = await TTSService.synthesize_speech(ta_reply, language="ta")
    print(f"✓ Tamil Audio: {len(ta_audio)} bytes generated via {ta_v}", flush=True)

    # Test ML
    print("\n[C] Testing MALAYALAM (മലയാളം)...", flush=True)
    ml_prompt = LanguageService.detect_language_and_style("ഈ ചിത്രം വിശദീകരിക്കുക.", user_preference="ml")
    ml_reply = await GeminiService.chat_with_vision(
        user_message="ഈ ചിത്രത്തിലുള്ള പ്രധാന കാര്യങ്ങൾ എന്തൊക്കെയാണ്?",
        conversation_history=[],
        visual_context=visual_context,
        language_hint="ml",
        language_directive=ml_prompt["prompt_directive"]
    )
    print(f"  AI Output: {ml_reply[:100]}...", flush=True)
    assert any('\u0D00' <= c <= '\u0D7F' for c in ml_reply), "Error: No Malayalam characters found in Malayalam response!"
    ml_audio, _, ml_v = await TTSService.synthesize_speech(ml_reply, language="ml")
    print(f"✓ Malayalam Audio: {len(ml_audio)} bytes generated via {ml_v}", flush=True)

    # Test HI
    print("\n[D] Testing HINDI (हिन्दी)...", flush=True)
    hi_prompt = LanguageService.detect_language_and_style("इस चित्र का विवरण दें।", user_preference="hi")
    hi_reply = await GeminiService.chat_with_vision(
        user_message="इस चित्र में कौन-कौन सी वस्तुएं हैं? स्पष्ट रूप से बताएं।",
        conversation_history=[],
        visual_context=visual_context,
        language_hint="hi",
        language_directive=hi_prompt["prompt_directive"]
    )
    print(f"  AI Output: {hi_reply[:100]}...", flush=True)
    assert any('\u0900' <= c <= '\u097F' for c in hi_reply), "Error: No Hindi characters found in Hindi response!"
    hi_audio, _, hi_voice = await TTSService.synthesize_speech(hi_reply, language="hi")
    print(f"✓ Hindi Audio: {len(hi_audio)} bytes generated via {hi_voice}", flush=True)

    # 4. Test Translation Endpoint
    print("\n--- 4. Testing Translation & Voice Mapping API ---")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        sample_text = "The table contains a modern silver laptop, a white ceramic coffee mug, and a black notebook."
        
        # Translate to Tamil
        res = await client.post("/api/chat/translate", json={"text": sample_text, "target_language": "ta"})
        assert res.status_code == 200
        ta_data = res.json()["data"]
        print(f"✓ Translation to Tamil: {ta_data['translated_text'][:60]}... (Voice: {ta_data['voice_id']})")
        assert any('\u0B80' <= c <= '\u0BFF' for c in ta_data['translated_text'])

        # Translate to Malayalam
        res = await client.post("/api/chat/translate", json={"text": sample_text, "target_language": "ml"})
        assert res.status_code == 200
        ml_data = res.json()["data"]
        print(f"✓ Translation to Malayalam: {ml_data['translated_text'][:60]}... (Voice: {ml_data['voice_id']})")
        assert any('\u0D00' <= c <= '\u0D7F' for c in ml_data['translated_text'])

        # Translate to Hindi
        res = await client.post("/api/chat/translate", json={"text": sample_text, "target_language": "hi"})
        assert res.status_code == 200
        hi_data = res.json()["data"]
        print(f"✓ Translation to Hindi: {hi_data['translated_text'][:60]}... (Voice: {hi_data['voice_id']})")
        assert any('\u0900' <= c <= '\u097F' for c in hi_data['translated_text'])

    print("\n=======================================================")
    print("🎉 ALL 4 LANGUAGES (EN, TA, ML, HI) VERIFIED & WORKING!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
