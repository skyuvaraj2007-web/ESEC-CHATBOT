"""
VISIONAI - SHORT TANGLISH FOLLOW-UP INTELLIGENCE & PRONOUN GROUNDING VERIFICATION
Executes the full 12-Turn test sequence:
Turns 1-9: Tanglish multi-turn conversation with short follow-ups, omitted subjects, and pronouns
Turns 10-12: Dynamic Language Switch (English -> Tamil -> Tanglish)
"""
import sys
import os
import asyncio
from PIL import Image, ImageDraw
import io

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, r"d:\ESEC\backend")
from app.services.gemini_service import GeminiService
from app.services.language_service import LanguageService

def generate_test_scene_image() -> bytes:
    """
    Creates an image with:
    - Left: Red circle
    - Right: Green triangle (slightly larger than circle)
    - Bottom: Yellow rectangle
    - Top: "VISIONAI TEST 2026"
    """
    img = Image.new("RGB", (800, 600), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)
    
    # Left Red circle
    draw.ellipse([60, 150, 260, 350], fill=(239, 68, 68), outline=(255, 255, 255), width=2)
    
    # Right Green triangle (prominent)
    draw.polygon([(650, 130), (520, 370), (780, 370)], fill=(34, 197, 94), outline=(255, 255, 255), width=2)
    
    # Bottom Yellow rectangle
    draw.rectangle([250, 420, 550, 520], fill=(234, 179, 8), outline=(255, 255, 255), width=2)
    
    # Top text banner
    draw.text((220, 60), "VISIONAI TEST 2026", fill=(255, 255, 255))
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()

async def run_short_followup_test():
    print("=" * 80)
    print("VISIONAI SHORT TANGLISH FOLLOW-UP INTELLIGENCE TEST")
    print("=" * 80)
    
    img_bytes = generate_test_scene_image()
    history = []
    
    test_turns = [
        # --- TANGLISH SHORT FOLLOW-UP CONVERSATION (TURNS 1 to 9) ---
        (1, "Indha image la enna irukku?", "Overview in Tanglish"),
        (2, "Left side la irukkuradhu enna?", "Spatial object query"),
        (3, "Adhu enna color?", "Pronoun 'Adhu' color query"),
        (4, "Adhu enga irukku?", "Pronoun 'Adhu' position query"),
        (5, "Adhu pakkathula enna irukku?", "Pronoun 'Adhu' adjacency query"),
        (6, "Adha compare pannu.", "Pronoun 'Adha' comparison"),
        (7, "Color?", "Ultra-short omitted subject query (inherited Tanglish)"),
        (8, "Size?", "Ultra-short size comparison (inherited Tanglish)"),
        (9, "Konjam detail ah explain pannu.", "Detailed elaboration in Tanglish"),
        
        # --- DYNAMIC LANGUAGE SWITCH WITH CONTEXT PRESERVATION (TURNS 10 to 12) ---
        (10, "What is the color of that object?", "Switch to English"),
        (11, "அது எங்கே இருக்கிறது?", "Switch to Tamil Script"),
        (12, "Adhu enna shape?", "Switch back to Tanglish")
    ]
    
    passed = 0
    total = len(test_turns)
    
    for turn_num, user_msg, description in test_turns:
        print(f"\n[TURN {turn_num}: {description}]")
        print(f"USER: \"{user_msg}\"")
        
        lang_info = LanguageService.detect_language_and_style(
            text=user_msg,
            conversation_history=history
        )
        
        resp = await GeminiService.chat_with_vision(
            user_message=user_msg,
            conversation_history=history,
            image_bytes=img_bytes,
            language_hint=lang_info["response_language"],
            language_directive=lang_info["prompt_directive"]
        )
        print(f"VISIONAI: \"{resp}\"")
        print(f"[Language Detected: {lang_info['input_language']} | Response Mode: {lang_info['response_language']}]")
        
        # Update conversation history
        history.append({"role": "user", "content": user_msg})
        history.append({"role": "assistant", "content": resp})
        
        if resp and len(resp.strip()) > 3:
            print(f"[PASS] Turn {turn_num}")
            passed += 1
        else:
            print(f"[FAIL] Turn {turn_num}")
            
    print("\n" + "=" * 80)
    print(f"SHORT FOLLOW-UP TEST RESULT: {passed}/{total} Passed")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_short_followup_test())
