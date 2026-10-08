import io
import base64
from PIL import Image
from typing import Tuple, Optional
from fastapi import HTTPException
from app.config import settings

def validate_image_bytes(data: bytes, content_type: Optional[str] = None) -> Tuple[int, int, str]:
    """
    Validates image bytes, ensures valid MIME and size, and returns (width, height, format).
    """
    if len(data) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Image size exceeds maximum limit of {settings.MAX_IMAGE_SIZE_MB}MB."
        )
    
    try:
        image = Image.open(io.BytesIO(data))
        image.verify()
        # Re-open because verify() closes the stream
        image = Image.open(io.BytesIO(data))
        width, height = image.size
        img_format = (image.format or "JPEG").lower()
        mime = f"image/{img_format}" if img_format != "jpg" else "image/jpeg"
        
        if content_type and content_type in settings.ALLOWED_MIME_TYPES:
            mime = content_type
            
        return width, height, mime
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

def optimize_image_for_ai(data: bytes, max_dimension: int = 1920) -> bytes:
    """
    Downscales image if dimensions exceed max_dimension while preserving aspect ratio.
    """
    try:
        image = Image.open(io.BytesIO(data))
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
            
        width, height = image.size
        if width > max_dimension or height > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=88, optimize=True)
        return output.getvalue()
    except Exception:
        return data

def bytes_to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")

def base64_to_bytes(b64_str: str) -> bytes:
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]
    return base64.b64decode(b64_str)

def crop_image_region(
    data: bytes,
    x: float,
    y: float,
    width: float,
    height: float,
    unit: str = "percent"
) -> Optional[bytes]:
    """
    Crops a sub-region of an image specified by coordinates/percentages.
    x, y, width, height: if unit == 'percent', coordinates are 0..100.
    Returns JPEG bytes of the cropped region or None if invalid.
    """
    if not data:
        return None
    try:
        image = Image.open(io.BytesIO(data))
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        img_w, img_h = image.size

        if unit == "percent":
            left = max(0, int((x / 100.0) * img_w))
            top = max(0, int((y / 100.0) * img_h))
            right = min(img_w, int(((x + width) / 100.0) * img_w))
            bottom = min(img_h, int(((y + height) / 100.0) * img_h))
        else:
            left = max(0, int(x))
            top = max(0, int(y))
            right = min(img_w, int(x + width))
            bottom = min(img_h, int(y + height))

        # Check for minimum sensible crop size (at least 6x6 pixels)
        if right - left < 6 or bottom - top < 6:
            return None

        cropped = image.crop((left, top, right, bottom))
        
        # If cropped sub-image is very small, optionally upscale slightly with LANCZOS for VLM clarity
        cw, ch = cropped.size
        if cw < 128 or ch < 128:
            scale = max(128.0 / cw, 128.0 / ch)
            if scale < 4.0:
                new_w = int(cw * scale)
                new_h = int(ch * scale)
                cropped = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        cropped.save(buf, format="JPEG", quality=92, optimize=True)
        return buf.getvalue()
    except Exception as e:
        print(f"[image_utils] Crop region error: {e}")
        return None
