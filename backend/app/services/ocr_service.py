import io
from PIL import Image
from app.models.schemas import OCRResult
from app.config import settings

class OCRService:
    @staticmethod
    def extract_text(image_bytes: bytes) -> OCRResult:
        """
        Extracts text from image bytes with confidence score.
        Gracefully handles errors and missing OCR dependencies.
        """
        if not settings.ENABLE_OCR:
            return OCRResult(text="", confidence=0.0)
            
        try:
            import pytesseract
            image = Image.open(io.BytesIO(image_bytes))
            
            # Extract data including confidence
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            text_tokens = []
            confidences = []
            
            for i in range(len(data["text"])):
                w = data["text"][i].strip()
                c = float(data["conf"][i])
                if w and c > 0:
                    text_tokens.append(w)
                    confidences.append(c / 100.0)
                    
            extracted_text = " ".join(text_tokens)
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
            
            return OCRResult(
                text=extracted_text,
                confidence=round(avg_conf, 2)
            )
        except Exception as e:
            # Fallback or OCR binary not in PATH
            print(f"[OCRService] Pytesseract inference skipped or failed: {e}")
            return OCRResult(text="", confidence=0.0)
