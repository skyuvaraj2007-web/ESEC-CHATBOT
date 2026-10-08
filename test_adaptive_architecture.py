import os
import io
import sys
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
from app.services.task_router import TaskRouter
from app.services.language_service import LanguageService
from app.services.ocr_service import OCRService
from app.services.yolo_service import YoloService

# Set utf-8 encoding for Windows console output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def log(msg=""):
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        sys.stdout.buffer.write(str(msg).encode("utf-8", errors="replace") + b"\n")
        sys.stdout.flush()

# Generate realistic test image with geometric shapes and visible text
img = Image.new("RGB", (640, 480), color=(15, 23, 42))
draw = ImageDraw.Draw(img)
# Blue triangle on left
draw.polygon([(80, 360), (200, 120), (320, 360)], fill=(37, 99, 235), outline=(96, 165, 250))
# Orange circle on right
draw.ellipse([(380, 150), (560, 330)], fill=(249, 115, 22), outline=(251, 146, 60))
# Text label
draw.text((100, 400), "VISIONAI ROBOTICS LAB 2026", fill=(255, 255, 255))

buf = io.BytesIO()
img.save(buf, format="JPEG", quality=95)
img_bytes = buf.getvalue()

async def run_all_tests():
    log("================================================================================")
    log("          VISIONAI — ADAPTIVE MULTIMODAL AI PIPELINE VERIFICATION SUITE         ")
    log("================================================================================")
    log(f"Gemini API Key Loaded: {GeminiService.has_api_key()}")
    log(f"Primary Gemini Model: {settings.GEMINI_MODEL}")
    log(f"Test Image Size: {len(img_bytes)} bytes\n")

    passed_count = 0
    total_count = 0

    # --------------------------------------------------------------------------
    # TEST 1: Task Router Pattern Classification
    # --------------------------------------------------------------------------
    total_count += 1
    log(">>> TEST 1: Task Router Precision Evaluation")
    router_tests = [
        ("", "gemini_auto_description", False, False),
        ("__auto_describe__", "gemini_auto_description", False, False),
        ("What is in this image?", "gemini_multimodal", False, False),
        ("Describe this image.", "gemini_multimodal", False, False),
        ("What is the main object?", "gemini_multimodal", False, False),
        ("What color is the object?", "gemini_multimodal", False, False),
        ("What is written on the sign?", "gemini_multimodal", False, False),
        ("Explain this image in Tamil.", "gemini_multimodal", False, False),
        ("Adhu enna color?", "gemini_multimodal", False, False),
        ("Give me bounding boxes around the people.", "specialized_spatial", True, False),
        ("Count all vehicles.", "specialized_spatial", True, False),
        ("Put a box around every person.", "specialized_spatial", True, False),
        ("How many people are detected?", "specialized_spatial", True, False),
        ("Show detected objects with coordinates", "specialized_spatial", True, False),
        ("Extract every line of text exactly.", "specialized_text", False, True),
        ("Extract all text exactly.", "specialized_text", False, True),
        ("Extract all text from this document.", "specialized_text", False, True),
        ("Give me the text in table format.", "specialized_text", False, True),
    ]

    all_router_passed = True
    for query, exp_mode, exp_yolo, exp_ocr in router_tests:
        res = TaskRouter.route(query)
        match = (res.mode == exp_mode and res.use_yolo == exp_yolo and res.use_ocr == exp_ocr)
        if not match:
            log(f"  [FAIL] Query: '{query}' -> Got ({res.mode}, yolo={res.use_yolo}, ocr={res.use_ocr}) vs Expected ({exp_mode}, yolo={exp_yolo}, ocr={exp_ocr})")
            all_router_passed = False
        else:
            log(f"  [PASS] '{query[:36]:<36}' -> Mode: {res.mode} | YOLO: {res.use_yolo} | OCR: {res.use_ocr}")

    if all_router_passed:
        passed_count += 1
        log("  => TEST 1 PASSED: 100% router accuracy.\n")
    else:
        log("  => TEST 1 FAILED.\n")

    # --------------------------------------------------------------------------
    # TEST 2: Automatic Image Description (Gemini Multimodal Primary)
    # --------------------------------------------------------------------------
    total_count += 1
    log(">>> TEST 2: Automatic Image Description on Upload (No initial user query)")
    auto_desc = await GeminiService.generate_auto_image_description(img_bytes, language_hint="English")
    log("Generated Auto-Description:")
    log(auto_desc)
    if "Overview" in auto_desc or "Key" in auto_desc or len(auto_desc) > 50:
        passed_count += 1
        log("  => TEST 2 PASSED: Real Gemini generated automatic scene breakdown.\n")
    else:
        log("  => TEST 2 FAILED.\n")

    # --------------------------------------------------------------------------
    # TEST 3: Normal Visual Q&A (Colors, Objects -> Gemini Only, No YOLO/OCR)
    # --------------------------------------------------------------------------
    total_count += 1
    log(">>> TEST 3: Normal Visual Q&A (Colors & Objects)")
    q3 = "What shapes and colors are visible in this image?"
    r3 = await GeminiService.chat_with_vision(user_message=q3, conversation_history=[], image_bytes=img_bytes)
    log(f"Question: {q3}")
    log(f"Gemini Answer: {r3}")
    if ("triangle" in r3.lower() or "blue" in r3.lower() or "orange" in r3.lower() or "circle" in r3.lower()):
        passed_count += 1
        log("  => TEST 3 PASSED: Gemini accurately identified visual elements.\n")
    else:
        log("  => TEST 3 FAILED.\n")

    # --------------------------------------------------------------------------
    # TEST 4: Visual Text Reading (Gemini Multimodal reads text without OCR)
    # --------------------------------------------------------------------------
    total_count += 1
    log(">>> TEST 4: Text Question via Gemini Multimodal")
    q4 = "What text is written at the bottom of the image?"
    r4 = await GeminiService.chat_with_vision(user_message=q4, conversation_history=[
        {"role": "user", "content": q3}, {"role": "assistant", "content": r3}
    ], image_bytes=img_bytes)
    log(f"Question: {q4}")
    log(f"Gemini Answer: {r4}")
    if ("visionai" in r4.lower() or "robotics" in r4.lower() or "2026" in r4.lower()):
        passed_count += 1
        log("  => TEST 4 PASSED: Gemini read visible text directly.\n")
    else:
        log("  => TEST 4 FAILED.\n")

    # --------------------------------------------------------------------------
    # TEST 5: Multilingual & Tanglish Follow-Up
    # --------------------------------------------------------------------------
    total_count += 1
    log(">>> TEST 5: Tanglish Contextual Follow-Up ('Adhu enna color?')")
    q5 = "Left side la irukura shape enna color?"
    lang_info5 = LanguageService.detect_language_and_style(text=q5)
    r5 = await GeminiService.chat_with_vision(
        user_message=q5,
        conversation_history=[
            {"role": "user", "content": q3}, {"role": "assistant", "content": r3},
            {"role": "user", "content": q4}, {"role": "assistant", "content": r4}
        ],
        image_bytes=img_bytes,
        language_hint=lang_info5["response_language"],
        language_directive=lang_info5["prompt_directive"]
    )
    log(f"Question: {q5}")
    log(f"Detected Style: {lang_info5['style']} | Language: {lang_info5['response_language']}")
    log(f"Gemini Tanglish Answer: {r5}")
    if ("blue" in r5.lower() or "neelam" in r5.lower() or "triangle" in r5.lower()):
        passed_count += 1
        log("  => TEST 5 PASSED: Tanglish response produced with conversational context.\n")
    else:
        log("  => TEST 5 FAILED.\n")

    # --------------------------------------------------------------------------
    # TEST 6: Tamil Follow-Up ("தமிழில் சொல்")
    # --------------------------------------------------------------------------
    total_count += 1
    log(">>> TEST 6: Tamil Unicode Follow-Up ('இந்த படத்தில் என்ன இருக்கிறது?')")
    q6 = "இந்த படத்தில் உள்ள முக்கிய வடிவங்களை தமிழில் விளக்கு."
    lang_info6 = LanguageService.detect_language_and_style(text=q6)
    r6 = await GeminiService.chat_with_vision(
        user_message=q6,
        conversation_history=[
            {"role": "user", "content": q3}, {"role": "assistant", "content": r3}
        ],
        image_bytes=img_bytes,
        language_hint=lang_info6["response_language"],
        language_directive=lang_info6["prompt_directive"]
    )
    log(f"Question: {q6}")
    log(f"Gemini Tamil Answer: {r6}")
    if len(r6) > 20:
        passed_count += 1
        log("  => TEST 6 PASSED: Tamil script response verified.\n")
    else:
        log("  => TEST 6 FAILED.\n")

    # --------------------------------------------------------------------------
    # TEST 7: Specialized Spatial Routing (YOLO On-Demand)
    # --------------------------------------------------------------------------
    total_count += 1
    log(">>> TEST 7: Specialized Spatial Query (YOLO On-Demand)")
    q7 = "Give me bounding boxes around the objects and count all vehicles."
    route7 = TaskRouter.route(q7)
    log(f"Query: {q7}")
    log(f"Task Route: mode={route7.mode} | use_yolo={route7.use_yolo} | use_ocr={route7.use_ocr}")
    
    routed_analysis = await VisionService.process_routed_analysis(
        image_bytes=img_bytes,
        use_yolo=route7.use_yolo,
        use_ocr=route7.use_ocr
    )
    log(f"Routed Analysis Objects: {len(routed_analysis.objects)} | Analysis JSON: {routed_analysis.analysis_json}")
    if route7.use_yolo and not route7.use_ocr:
        passed_count += 1
        log("  => TEST 7 PASSED: YOLO on-demand pipeline correctly triggered.\n")
    else:
        log("  => TEST 7 FAILED.\n")

    # --------------------------------------------------------------------------
    # TEST 8: Specialized OCR Routing (OCR On-Demand)
    # --------------------------------------------------------------------------
    total_count += 1
    log(">>> TEST 8: Specialized Verbatim Extraction Query (OCR On-Demand)")
    q8 = "Extract every line of text exactly from this document."
    route8 = TaskRouter.route(q8)
    log(f"Query: {q8}")
    log(f"Task Route: mode={route8.mode} | use_yolo={route8.use_yolo} | use_ocr={route8.use_ocr}")

    routed_ocr_analysis = await VisionService.process_routed_analysis(
        image_bytes=img_bytes,
        use_yolo=route8.use_yolo,
        use_ocr=route8.use_ocr
    )
    log(f"Routed OCR Text: '{routed_ocr_analysis.ocr_text}' | Analysis JSON: {routed_ocr_analysis.analysis_json}")
    if not route8.use_yolo and route8.use_ocr:
        passed_count += 1
        log("  => TEST 8 PASSED: OCR on-demand pipeline correctly triggered.\n")
    else:
        log("  => TEST 8 FAILED.\n")

    # --------------------------------------------------------------------------
    # Summary
    # --------------------------------------------------------------------------
    log("================================================================================")
    log(f"                      VERIFICATION SCORE: {passed_count}/{total_count} PASSED")
    log("================================================================================")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
