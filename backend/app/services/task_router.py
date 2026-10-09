import re
from typing import Dict, Any, List
from pydantic import BaseModel

class TaskRouteResult(BaseModel):
    use_gemini: bool = True
    use_yolo: bool = False
    use_ocr: bool = False
    mode: str = "gemini_multimodal"
    reason: str = "Default multimodal visual reasoning"

    def to_tools_used(self) -> Dict[str, Any]:
        return {
            "gemini": self.use_gemini,
            "yolo": self.use_yolo,
            "ocr": self.use_ocr,
            "mode": self.mode,
            "reason": self.reason
        }

class TaskRouter:
    """
    Lightweight, deterministic task-routing layer that directs queries to:
    - Primary Gemini Multimodal (Default for 99% of normal visual Q&A, descriptions, Tanglish, pronouns)
    - Optional YOLO Module (Only when bounding boxes, spatial coordinates, object counting, or tracking are requested)
    - Optional OCR Module (Only when exact verbatim text extraction, scanned form parsing, or raw OCR are requested)
    """

    # Spatial / Detection keywords for on-demand YOLO
    YOLO_PATTERNS = [
        r"\b(bounding\s*box(es)?|bbox(es)?|coordinates?|localize|localization)\b",
        r"\b(put\s+(a\s+)?box\s+(around|on)|draw\s+boxes?)\b",
        r"\b(count\s+(all\s+)?(the\s+)?(people|persons|cars|vehicles|objects|items|chairs|animals|things|bicycles|dogs|cats))\b",
        r"\b(how\s+many\s+(people|persons|cars|vehicles|objects|items|chairs|animals|things|bicycles|dogs|cats)\s+(are\s+)?(detected|present|there))\b",
        r"\b(track\s+(this|the|all)?\s*(person|object|vehicle|car|item)?|tracking|region\s+detection|spatial\s+grid|spatial\s+localization)\b",
        r"\b(show\s+detected\s+objects\s+with\s+coordinates)\b",
    ]

    # Exact text extraction / Dense document OCR keywords for on-demand OCR
    OCR_PATTERNS = [
        r"\b(extract\s+(all\s+)?(the\s+)?(every|verbatim|exact)\s+text(\s+exactly)?)\b",
        r"\b(extract\s+every\s+line(\s+of\s+text)?(\s+exactly)?)\b",
        r"\b(raw\s+ocr|pytesseract|exact\s+character\s+(extraction|preservation))\b",
        r"\b(scanned\s+(document|form|invoice|receipt)\s+text)\b",
        r"\b(read\s+(all\s+)?(the\s+)?text\s+on\s+(the\s+)?(receipt|invoice|bill|document|sign))\b",
        r"\b(text\s+in\s+table\s+format|structured\s+text\s+table|extract\s+all\s+fields(\s+from\s+this\s+scanned\s+form)?)\b",
        r"\b(extract\s+all\s+text\s+from\s+(this|the)?\s*document)\b",
    ]

    @classmethod
    def route(cls, message: str, is_new_upload: bool = False) -> TaskRouteResult:
        clean_msg = (message or "").strip().lower()

        # 1. Automatic Image Description (no user question or auto-describe trigger)
        if not clean_msg or clean_msg == "__auto_describe__" or (is_new_upload and clean_msg in (
            "analyze this image and explain what is visible.",
            "describe this image",
            "uploaded an image for automatic visual understanding.",
            "[uploaded image for automatic visual understanding]"
        )):
            return TaskRouteResult(
                use_gemini=True,
                use_yolo=False,
                use_ocr=False,
                mode="gemini_auto_description",
                reason="Automatic visual scene understanding and summary"
            )

        # 2. Check for specialized YOLO requirements
        for pattern in cls.YOLO_PATTERNS:
            if re.search(pattern, clean_msg):
                return TaskRouteResult(
                    use_gemini=True,
                    use_yolo=True,
                    use_ocr=False,
                    mode="specialized_spatial",
                    reason="Specialized object detection & spatial localization requested"
                )

        # 3. Check for specialized OCR requirements
        for pattern in cls.OCR_PATTERNS:
            if re.search(pattern, clean_msg):
                return TaskRouteResult(
                    use_gemini=True,
                    use_yolo=False,
                    use_ocr=True,
                    mode="specialized_text",
                    reason="Exact verbatim text/document extraction requested"
                )

        # 4. Default: Gemini Primary Multimodal Intelligence
        return TaskRouteResult(
            use_gemini=True,
            use_yolo=False,
            use_ocr=False,
            mode="gemini_multimodal",
            reason="Primary multimodal reasoning (scene, objects, colors, visible text, multilingual)"
        )

