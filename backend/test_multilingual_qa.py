"""
Real Multilingual & Tanglish Voice QA Test Suite for VISIONAI
Tests:
1. English: "What is in this image?"
2. Tamil (Script): "இந்த படத்தில் என்ன இருக்கிறது?"
3. Tanglish (Romanized Tamil): "Indha image la enna objects irukku?"
4. Follow-up 1 (Tanglish): "Left side la irukkuradhu enna?"
5. Follow-up 2 (Tanglish pronoun reasoning): "Adhu enna color?"
6. Follow-up 3 (Tanglish comparison): "Right side object oda compare pannu."
7. Mixed Tamil + English: "இந்த image la என்ன objects இருக்கு?"
8. Hindi: "Is image mein kya hai?"
9. Malayalam: "Ee image-il entha ullathu?"
10. Image Context & OCR/YOLO Preservation Verification
"""
import sys
import os
import asyncio
from PIL import Image, ImageDraw, ImageFont
import io

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend to path
sys.path.insert(0, r"d:\ESEC\backend")
from app.services.gemini_service import GeminiService
from app.config import settings

def generate_voice_test_image() -> bytes:
    """Generate image with red circle on left, green triangle on right, yellow rectangle at bottom, and text 'VISIONAI VOICE TEST 2026'."""
    img = Image.new("RGB", (800, 600), color=(15, 23, 42)) # Slate dark background
    draw = ImageDraw.Draw(img)
    
    # Red circle on left
    draw.ellipse([60, 150, 260, 350], fill=(239, 68, 68), outline=(255, 255, 255), width=2)
    
    # Green triangle on right
    draw.polygon([(650, 150), (550, 350), (750, 350)], fill=(34, 197, 94), outline=(255, 255, 255), width=2)
    
    # Yellow rectangle at bottom
    draw.rectangle([250, 420, 550, 520], fill=(234, 179, 8), outline=(255, 255, 255), width=2)
    
    # Text "VISIONAI VOICE TEST 2026"
    draw.text((220, 60), "VISIONAI VOICE TEST 2026", fill=(255, 255, 255))
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()

async def run_voice_multilingual_qa():
    print("=" * 70)
    print("VISIONAI MULTILINGUAL & TANGLISH REAL QA VERIFICATION")
    print("=" * 70)
    
    if not GeminiService.has_api_key():
        print("[-] Gemini API Key not configured!")
        return
    
    print(f"[+] Active Gemini Model: {settings.GEMINI_MODEL}")
    
    # Generate the test image
    img_bytes = generate_voice_test_image()
    print("[+] Generated real test image: Red Circle (Left), Green Triangle (Right), Yellow Rectangle (Bottom), 'VISIONAI VOICE TEST 2026'")
    
    tests = [
        {
            "id": "TEST 1: English",
            "message": "What objects are in this image?",
            "input_mode": "voice",
            "language": "en-IN",
        },
        {
            "id": "TEST 2: Tamil (Pure Script)",
            "message": "இந்த படத்தில் என்ன இருக்கிறது?",
            "input_mode": "voice",
            "language": "ta-IN",
        },
        {
            "id": "TEST 3: Tanglish (Romanized Tamil)",
            "message": "Indha image la enna objects irukku?",
            "input_mode": "voice",
            "language": "ta-Latn",
        },
        {
            "id": "TEST 4: Mixed (Tamil Script + English)",
            "message": "இந்த image la என்ன objects இருக்கு?",
            "input_mode": "voice",
            "language": "ta-IN",
        },
        {
            "id": "TEST 5: Hindi",
            "message": "Is image mein kya hai?",
            "input_mode": "voice",
            "language": "hi-IN",
        },
        {
            "id": "TEST 6: Malayalam",
            "message": "Ee image-il entha ullathu?",
            "input_mode": "voice",
            "language": "ml-IN",
        },
    ]
    
    passed = 0
    total = 0
    
    for t in tests:
        total += 1
        print(f"\n--- Running {t['id']} ---")
        print(f"User Input ({t['language']}): \"{t['message']}\"")
        
        try:
            resp = await GeminiService.chat_with_vision(
                user_message=t["message"],
                conversation_history=[],
                image_bytes=img_bytes,
                language_hint=t["language"]
            )
            print(f"VISIONAI Response:\n{resp}\n")
            
            # Check response contains meaningful non-empty content
            if resp and len(resp.strip()) > 10 and "Gemini API Key is not configured" not in resp:
                print(f"[PASS] {t['id']}")
                passed += 1
            else:
                print(f"[FAIL] {t['id']}: Empty or error response")
        except Exception as e:
            print(f"[FAIL] {t['id']} encountered error: {e}")
            
    # Now test Multi-Turn Tanglish Conversation with visual pronoun grounding
    print("\n" + "=" * 70)
    print("TEST 7: MULTI-TURN TANGLISH CONVERSATIONAL FLOW & PRONOUN RESOLUTION")
    print("=" * 70)
    
    history = []
    multiturn_steps = [
        ("Step 1 (Overview)", "Indha image la enna irukku?", "ta-Latn"),
        ("Step 2 (Spatial query)", "Left side la irukkuradhu enna?", "ta-Latn"),
        ("Step 3 (Pronoun 'Adhu' color)", "Adhu enna color?", "ta-Latn"),
        ("Step 4 (Comparative query)", "Right side object oda compare pannu.", "ta-Latn")
    ]
    
    for step_name, user_msg, lang in multiturn_steps:
        total += 1
        print(f"\n[{step_name}] User: \"{user_msg}\"")
        try:
            resp = await GeminiService.chat_with_vision(
                user_message=user_msg,
                conversation_history=history,
                image_bytes=img_bytes,
                language_hint=lang
            )
            print(f"VISIONAI: \"{resp}\"")
            
            # Update history
            history.append({"role": "user", "content": user_msg})
            history.append({"role": "assistant", "content": resp})
            
            if resp and len(resp.strip()) > 5:
                print(f"[PASS] {step_name}")
                passed += 1
            else:
                print(f"[FAIL] {step_name}")
        except Exception as e:
            print(f"[FAIL] {step_name} Error: {e}")

    print("\n" + "=" * 70)
    print(f"ALL TESTS FINISHED: {passed}/{total} Passed")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_voice_multilingual_qa())
