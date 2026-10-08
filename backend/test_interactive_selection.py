"""
VISIONAI - Interactive Object Selection Automated Test Suite
Tests:
1. crop_image_region coordinate transformation and buffer validation.
2. Real Gemini multimodal call with selected_region coordinates & crop.
3. Pronoun context resolution ("What is this?", "What color is it?", "Adhu enna?").
4. Multilingual & Tanglish support on selected object region.
"""
import asyncio
import io
import os
import sys
from PIL import Image, ImageDraw

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.utils.image_utils import crop_image_region, optimize_image_for_ai
from app.services.gemini_service import GeminiService
from app.models.schemas import SelectedRegion, SelectedObjectContext


def create_test_composite_image() -> bytes:
    """Create a high contrast multi-object synthetic test image:
       - Left: Bright Red Square (Box 1)
       - Center: Bright Blue Circle (Box 2)
       - Right: Bright Yellow Triangle (Box 3)
    """
    img = Image.new("RGB", (600, 400), color=(240, 240, 245))
    draw = ImageDraw.Draw(img)

    # Red Square on Left (x: 50..180, y: 100..280) -> approx x: 8..30%, y: 25..70%
    draw.rectangle([50, 100, 180, 280], fill=(220, 20, 60), outline=(150, 0, 20), width=3)

    # Blue Circle in Middle (x: 230..370, y: 100..280) -> approx x: 38..62%, y: 25..70%
    draw.ellipse([230, 100, 370, 280], fill=(30, 144, 255), outline=(0, 70, 180), width=3)

    # Yellow Triangle on Right (x: 420..550, y: 100..280) -> approx x: 70..92%, y: 25..70%
    draw.polygon([(485, 100), (420, 280), (550, 280)], fill=(255, 215, 0), outline=(180, 140, 0))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


async def test_cropping_utility():
    print("\n--- TEST 1: Normalized Region Cropping Utility ---")
    image_bytes = create_test_composite_image()

    # Crop the Blue Circle in the center (approx x=38%, y=25%, width=24%, height=45%)
    region = SelectedRegion(x=38.0, y=25.0, width=24.0, height=45.0)
    cropped_bytes = crop_image_region(image_bytes, region.x, region.y, region.width, region.height)

    assert cropped_bytes is not None, "Cropped bytes should not be None"
    assert len(cropped_bytes) > 0, "Cropped bytes should not be empty"

    cropped_img = Image.open(io.BytesIO(cropped_bytes))
    assert cropped_img.size[0] > 0 and cropped_img.size[1] > 0
    print(f"[OK] Cropped region generated successfully. Cropped dimensions: {cropped_img.size}")


async def test_gemini_selection_qa():
    print("\n--- TEST 2: Real Gemini Multimodal Object Selection Q&A ---")
    image_bytes = create_test_composite_image()

    # Select the Red Box on the left (x=8%, y=25%, width=22%, height=45%)
    red_region = SelectedRegion(x=8.0, y=25.0, width=22.0, height=45.0)
    cropped_red = crop_image_region(image_bytes, red_region.x, red_region.y, red_region.width, red_region.height)

    selected_object = SelectedObjectContext(
        label="geometric shape",
        bbox=[8.0, 25.0, 30.0, 70.0],
        confidence=0.98
    )

    response = await GeminiService.chat_with_vision(
        user_message="What is the color and shape of this selected object?",
        image_bytes=image_bytes,
        conversation_history=[],
        language_hint="English",
        selected_region=red_region,
        selected_object=selected_object,
        cropped_bytes=cropped_red
    )

    print(f"Gemini Response: {response}")
    assert "red" in response.lower() or "square" in response.lower() or "rectangle" in response.lower(), \
        f"Expected mention of red/square/rectangle, got: {response}"
    print("[OK] Real Gemini correctly identified the selected red region!")


async def test_pronoun_followup_and_tanglish():
    print("\n--- TEST 3: Pronoun Follow-up Resolution in Tanglish ---")
    image_bytes = create_test_composite_image()

    # Select the Blue Circle in the middle (x=38%, y=25%, width=24%, height=45%)
    blue_region = SelectedRegion(x=38.0, y=25.0, width=24.0, height=45.0)
    cropped_blue = crop_image_region(image_bytes, blue_region.x, blue_region.y, blue_region.width, blue_region.height)

    history = [
        {"role": "user", "content": "What is this selected item?"},
        {"role": "assistant", "content": "This selected region shows a blue circular shape."}
    ]

    # Follow-up using Tanglish pronoun "Idhu enna color?"
    response = await GeminiService.chat_with_vision(
        user_message="Idhu enna color?",
        image_bytes=image_bytes,
        conversation_history=history,
        language_hint="Tanglish",
        selected_region=blue_region,
        cropped_bytes=cropped_blue
    )

    print(f"Gemini Tanglish Follow-up Response: {response}")
    assert "blue" in response.lower() or "neelam" in response.lower(), \
        f"Expected blue/neelam in Tanglish response, got: {response}"
    print("[OK] Real Gemini follow-up pronoun resolution in Tanglish succeeded!")


async def main():
    print("==================================================")
    print("VISIONAI: Interactive Object Selection Test Suite")
    print("==================================================")
    try:
        await test_cropping_utility()
        await test_gemini_selection_qa()
        await test_pronoun_followup_and_tanglish()
        print("\n==================================================")
        print("ALL INTERACTIVE OBJECT SELECTION TESTS PASSED (3/3)")
        print("==================================================")
    except Exception as e:
        print(f"\n[FAIL] Test Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
