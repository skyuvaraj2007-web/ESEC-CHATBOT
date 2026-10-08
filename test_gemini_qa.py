import os
import io
import sys
import base64
import asyncio
from pathlib import Path
from PIL import Image, ImageDraw

# Add backend directory to sys.path so app.* imports work
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.services.gemini_service import GeminiService
from app.services.vision_service import VisionService
from app.services.ocr_service import OCRService
from app.services.yolo_service import YoloService

def log(msg):
    print(msg, flush=True)

log("==================================================")
log("     VISIONAI — REAL GEMINI CHATBOT RUNTIME QA    ")
log("==================================================")

# 1. Check Gemini Service Configuration
has_key = GeminiService.has_api_key()
log(f"Gemini API Key: {'LOADED' if has_key else 'NOT LOADED'}")
log(f"Active Model: {settings.GEMINI_MODEL}")

# Create Test Image 1: 'VISIONAI TEST 2026' with Blue Triangle and Orange Circle
img1 = Image.new("RGB", (600, 400), color=(15, 23, 42))
draw1 = ImageDraw.Draw(img1)
draw1.polygon([(100, 300), (200, 100), (300, 300)], fill=(37, 99, 235), outline=(96, 165, 250))
draw1.ellipse((350, 120, 500, 270), fill=(249, 115, 22), outline=(251, 146, 60))
draw1.text((120, 330), "VISIONAI TEST 2026", fill=(255, 255, 255))

buf1 = io.BytesIO()
img1.save(buf1, format="JPEG", quality=95)
img1_bytes = buf1.getvalue()
log(f"[*] Generated Test Image 1 ('VISIONAI TEST 2026'): {len(img1_bytes)} bytes")

# Create Test Image 2: 'DEEP LEARNING 2026' with Yellow Square and Green Diamond
img2 = Image.new("RGB", (600, 400), color=(30, 41, 59))
draw2 = ImageDraw.Draw(img2)
draw2.rectangle([80, 100, 260, 280], fill=(234, 179, 8), outline=(250, 204, 21))
draw2.polygon([(400, 80), (520, 200), (400, 320), (280, 200)], fill=(34, 197, 94), outline=(74, 222, 128))
draw2.text((140, 340), "DEEP LEARNING 2026", fill=(248, 250, 252))

buf2 = io.BytesIO()
img2.save(buf2, format="JPEG", quality=95)
img2_bytes = buf2.getvalue()
log(f"[*] Generated Test Image 2 ('DEEP LEARNING 2026'): {len(img2_bytes)} bytes")

async def run_qa():
    log("\n--- TEST 1: REAL MULTIMODAL TEXT IDENTIFICATION (IMAGE 1) ---")
    q1 = "What text is visible in this image?"
    r1 = await GeminiService.chat_with_vision(user_message=q1, conversation_history=[], image_bytes=img1_bytes)
    log(f"Question: {q1}")
    log(f"Gemini Real Answer: {r1}")

    log("\n--- TEST 2: VISUAL COLORS IN IMAGE 1 ---")
    q2 = "What colors are present in this image?"
    r2 = await GeminiService.chat_with_vision(
        user_message=q2,
        conversation_history=[{"role": "user", "content": q1}, {"role": "assistant", "content": r1}],
        image_bytes=img1_bytes
    )
    log(f"Question: {q2}")
    log(f"Gemini Real Answer: {r2}")

    log("\n--- TEST 3: MAIN SUBJECT IN IMAGE 1 ---")
    q3 = "What is the main subject of this image?"
    r3 = await GeminiService.chat_with_vision(
        user_message=q3,
        conversation_history=[
            {"role": "user", "content": q1}, {"role": "assistant", "content": r1},
            {"role": "user", "content": q2}, {"role": "assistant", "content": r2}
        ],
        image_bytes=img1_bytes
    )
    log(f"Question: {q3}")
    log(f"Gemini Real Answer: {r3}")

    log("\n--- TEST 4: FOLLOW-UP CONTEXT IN SAME CONVERSATION ---")
    q4 = "Can you describe the main subject in more detail?"
    r4 = await GeminiService.chat_with_vision(
        user_message=q4,
        conversation_history=[
            {"role": "user", "content": q1}, {"role": "assistant", "content": r1},
            {"role": "user", "content": q2}, {"role": "assistant", "content": r2},
            {"role": "user", "content": q3}, {"role": "assistant", "content": r3}
        ],
        image_bytes=img1_bytes
    )
    log(f"Question: {q4}")
    log(f"Gemini Real Answer: {r4}")

    q5 = "What text did you identify earlier?"
    r5 = await GeminiService.chat_with_vision(
        user_message=q5,
        conversation_history=[
            {"role": "user", "content": q1}, {"role": "assistant", "content": r1},
            {"role": "user", "content": q2}, {"role": "assistant", "content": r2},
            {"role": "user", "content": q3}, {"role": "assistant", "content": r3},
            {"role": "user", "content": q4}, {"role": "assistant", "content": r4}
        ],
        image_bytes=img1_bytes
    )
    log(f"Question: {q5}")
    log(f"Gemini Real Answer: {r5}")

    log("\n--- TEST 5: DIFFERENT IMAGE TEST (IMAGE 2) ---")
    q6 = "What do you see in this image?"
    r6 = await GeminiService.chat_with_vision(user_message=q6, conversation_history=[], image_bytes=img2_bytes)
    log(f"Question on Image 2: {q6}")
    log(f"Gemini Real Answer: {r6}")

    q7 = "What text is in this image?"
    r7 = await GeminiService.chat_with_vision(
        user_message=q7,
        conversation_history=[{"role": "user", "content": q6}, {"role": "assistant", "content": r6}],
        image_bytes=img2_bytes
    )
    log(f"Question on Image 2: {q7}")
    log(f"Gemini Real Answer: {r7}")

    log("\n--- TEST 6: 5-TURN CONVERSATION SESSION ON IMAGE 2 ---")
    turns = [
        "What is in this image?",
        "What are the main colors?",
        "Is there any visible text?",
        "Describe the image in detail.",
        "What is the most important visual element?"
    ]
    history = []
    for i, turn in enumerate(turns, 1):
        ans = await GeminiService.chat_with_vision(user_message=turn, conversation_history=history, image_bytes=img2_bytes)
        log(f"Turn {i} -> Q: {turn}")
        log(f"Turn {i} -> A: {ans}\n")
        history.append({"role": "user", "content": turn})
        history.append({"role": "assistant", "content": ans})

    log("--- TEST 7: OCR SERVICE EXECUTION ---")
    ocr1 = OCRService.extract_text(img1_bytes)
    log(f"OCR Result on Image 1: \"{ocr1.text}\" (Confidence: {ocr1.confidence})")

    log("\n--- TEST 8: YOLO SERVICE EXECUTION ---")
    yolo_dets = YoloService.detect_objects(img1_bytes)
    log(f"YOLO Detections count: {len(yolo_dets)}")
    if yolo_dets:
        for d in yolo_dets:
            log(f"  - Detected {d.name} with confidence {d.confidence}")
    else:
        log("  - Geometric shapes image processed (YOLO inference executed).")

    log("\n--- TEST 9: STRUCTURED MULTIMODAL FUSION ---")
    fusion = await VisionService.process_full_image_analysis(img1_bytes)
    log(f"Scene: {fusion.scene}")
    log(f"Description: {fusion.description}")
    log(f"OCR in Fusion: {fusion.ocr_text}")
    log(f"Overall Confidence: {fusion.confidence}")

if __name__ == "__main__":
    asyncio.run(run_qa())
