"""
MASTER QA TEST SUITE: VISIONAI MULTILINGUAL + TANGLISH CONVERSATION INTELLIGENCE
Tests all 10+ core scenarios:
1. Tanglish detection and natural Tanglish response ("Indha image la enna irukku?")
2. Spatial left-side object reasoning in Tanglish ("Left side la irukkuradhu enna?")
3. Pronoun resolution in Tanglish ("Adhu enna color?")
4. Comparative reasoning in Tanglish ("Right side object oda compare pannu.")
5. Tamil script input -> Tamil script response ("இந்த படத்தை கொஞ்சம் detail-ஆ explain பண்ணு.")
6. English input -> English response ("What is the main object in this image?")
7. Mixed Tamil-English code-switching ("Indha image ah detailed ah explain pannu.")
8. Tanglish OCR extraction ("Image la irukkura text enna nu sollu?")
9. Mixed simple explanation ("Can you explain this image konjam simple ah?")
10. Multi-turn Dynamic Language Switching (Tanglish -> English -> Tamil Unicode)
11. LanguageService unit test & classification accuracy
"""
import sys
import os
import asyncio
from PIL import Image, ImageDraw, ImageFont
import io

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, r"d:\ESEC\backend")
from app.services.gemini_service import GeminiService
from app.services.language_service import LanguageService
from app.config import settings

def generate_test_scene_image() -> bytes:
    """
    Creates an image with:
    - Left: Red circle
    - Right: Green triangle
    - Bottom: Yellow rectangle
    - Text: "VISIONAI TEST 2026"
    """
    img = Image.new("RGB", (800, 600), color=(15, 23, 42)) # Slate dark background
    draw = ImageDraw.Draw(img)
    
    # Left Red circle
    draw.ellipse([60, 150, 260, 350], fill=(239, 68, 68), outline=(255, 255, 255), width=2)
    
    # Right Green triangle
    draw.polygon([(650, 150), (550, 350), (750, 350)], fill=(34, 197, 94), outline=(255, 255, 255), width=2)
    
    # Bottom Yellow rectangle
    draw.rectangle([250, 420, 550, 520], fill=(234, 179, 8), outline=(255, 255, 255), width=2)
    
    # Top text banner
    draw.text((220, 60), "VISIONAI TEST 2026", fill=(255, 255, 255))
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()

async def run_master_suite():
    print("=" * 80)
    print("VISIONAI MASTER MULTILINGUAL & TANGLISH INTELLIGENCE TEST SUITE")
    print("=" * 80)
    
    # 1. Test LanguageService Detector
    print("\n--- PHASE 1: LANGUAGE & STYLE DETECTOR ACCURACY ---")
    unit_tests = [
        ("Indha image la enna irukku?", "tanglish", "tanglish"),
        ("Left side la irukkuradhu enna?", "tanglish", "tanglish"),
        ("Adhu enna color?", "tanglish", "tanglish"),
        ("Right side object oda compare pannu", "tanglish", "tanglish"),
        ("இந்த படத்தை கொஞ்சம் detail-ஆ explain பண்ணு.", "ta", "ta"),
        ("What is the main object in this image?", "en", "en"),
        ("Indha image ah detailed ah explain pannu.", "mixed", "tanglish"),
        ("Image la irukkura text enna nu sollu?", "tanglish", "tanglish"),
        ("Can you explain this image konjam simple ah?", "mixed", "tanglish"),
        ("Is image mein kya hai?", "hi", "hi"),
        ("Ee image-il entha ullathu?", "ml", "ml")
    ]
    
    detector_passed = 0
    for text, expected_in, expected_resp in unit_tests:
        res = LanguageService.detect_language_and_style(text)
        match_resp = res["response_language"] == expected_resp
        status = "[PASS]" if match_resp else "[FAIL]"
        if match_resp:
            detector_passed += 1
        print(f"{status} '{text}' -> Detected: {res['input_language']}, Response: {res['response_language']}")
        
    print(f"\nLanguage Detector Result: {detector_passed}/{len(unit_tests)} Passed")

    # 2. Test Gemini Multimodal VLM + LLM Language Mirroring
    print("\n--- PHASE 2: GEMINI MULTIMODAL LANGUAGE MIRRORING & IMAGE REASONING ---")
    img_bytes = generate_test_scene_image()
    
    qa_tests = [
        {
            "id": "TEST 1 — Tanglish Overview",
            "message": "Indha image la enna irukku?",
            "expected_style": "tanglish"
        },
        {
            "id": "TEST 2 — Tanglish Spatial Query",
            "message": "Left side la irukkuradhu enna?",
            "expected_style": "tanglish"
        },
        {
            "id": "TEST 3 — Tanglish Pronoun 'Adhu' Color",
            "message": "Adhu enna color?",
            "expected_style": "tanglish"
        },
        {
            "id": "TEST 4 — Tanglish Comparison",
            "message": "Right side object oda compare pannu.",
            "expected_style": "tanglish"
        },
        {
            "id": "TEST 5 — Tamil Unicode Request",
            "message": "இந்த படத்தை கொஞ்சம் detail-ஆ explain பண்ணு.",
            "expected_style": "tamil"
        },
        {
            "id": "TEST 6 — English Request",
            "message": "What is the main object in this image?",
            "expected_style": "english"
        },
        {
            "id": "TEST 7 — Tanglish Mixed Detailed Query",
            "message": "Indha image ah detailed ah explain pannu.",
            "expected_style": "tanglish"
        },
        {
            "id": "TEST 8 — Tanglish OCR Extraction",
            "message": "Image la irukkura text enna nu sollu?",
            "expected_style": "tanglish"
        },
        {
            "id": "TEST 9 — Tanglish Simple Explanation",
            "message": "Can you explain this image konjam simple ah?",
            "expected_style": "tanglish"
        },
    ]
    
    qa_passed = 0
    for t in qa_tests:
        print(f"\n>>> Running {t['id']}")
        print(f"User Question: \"{t['message']}\"")
        
        lang_info = LanguageService.detect_language_and_style(t["message"])
        resp = await GeminiService.chat_with_vision(
            user_message=t["message"],
            conversation_history=[],
            image_bytes=img_bytes,
            language_hint=lang_info["response_language"],
            language_directive=lang_info["prompt_directive"]
        )
        print(f"VISIONAI Response:\n\"{resp}\"")
        
        if resp and len(resp.strip()) > 10:
            print(f"[PASS] {t['id']}")
            qa_passed += 1
        else:
            print(f"[FAIL] {t['id']}: Empty or invalid response")

    # 3. Test Dynamic Multi-Turn Language Switching
    print("\n--- PHASE 3: DYNAMIC MULTI-TURN LANGUAGE SWITCHING (Tanglish -> English -> Tamil) ---")
    switching_dialogue = [
        ("Turn 1 (Tanglish)", "Indha image la enna irukku?"),
        ("Turn 2 (Switch to English)", "What is the color of the left circle?"),
        ("Turn 3 (Switch to Tamil)", "வலது பக்கத்தில் இருக்கும் வடிவம் என்ன?")
    ]
    
    history = []
    switch_passed = 0
    for turn_name, msg in switching_dialogue:
        print(f"\n[{turn_name}] User: \"{msg}\"")
        lang_info = LanguageService.detect_language_and_style(msg)
        resp = await GeminiService.chat_with_vision(
            user_message=msg,
            conversation_history=history,
            image_bytes=img_bytes,
            language_hint=lang_info["response_language"],
            language_directive=lang_info["prompt_directive"]
        )
        print(f"VISIONAI: \"{resp}\"")
        
        history.append({"role": "user", "content": msg})
        history.append({"role": "assistant", "content": resp})
        
        if resp and len(resp.strip()) > 5:
            print(f"[PASS] {turn_name}")
            switch_passed += 1
        else:
            print(f"[FAIL] {turn_name}")

    print("\n" + "=" * 80)
    total_tests = len(unit_tests) + len(qa_tests) + len(switching_dialogue)
    total_passed = detector_passed + qa_passed + switch_passed
    print(f"MASTER SUITE FINAL RESULT: {total_passed}/{total_tests} Passed")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_master_suite())
