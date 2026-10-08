import io
from typing import List
from PIL import Image
from app.models.schemas import DetectedObject, BoundingBox
from app.config import settings

# Global cached model instance
_yolo_model = None

def get_yolo_model():
    global _yolo_model
    if _yolo_model is None and settings.ENABLE_YOLO:
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO(settings.YOLO_MODEL)
            print(f"[YoloService] Loaded YOLO model: {settings.YOLO_MODEL}")
        except Exception as e:
            print(f"[YoloService] Failed to load YOLO: {e}")
            _yolo_model = None
    return _yolo_model

class YoloService:
    @staticmethod
    def detect_objects(image_bytes: bytes) -> List[DetectedObject]:
        """
        Runs YOLO object detection on image bytes and returns bounding boxes with confidence scores.
        """
        if not settings.ENABLE_YOLO:
            return []
            
        model = get_yolo_model()
        if not model:
            return []
            
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            width, height = image.size
            results = model(image, verbose=False)
            
            detected: List[DetectedObject] = []
            
            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue
                    
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    name = model.names[cls_id] if model.names else f"class_{cls_id}"
                    conf = float(box.conf[0].item())
                    
                    # Convert coords to normalized percentages (0-100)
                    xyxy = box.xyxy[0].tolist()
                    x_min = max(0.0, (xyxy[0] / width) * 100)
                    y_min = max(0.0, (xyxy[1] / height) * 100)
                    x_max = min(100.0, (xyxy[2] / width) * 100)
                    y_max = min(100.0, (xyxy[3] / height) * 100)
                    
                    detected.append(
                        DetectedObject(
                            name=name,
                            confidence=round(conf, 3),
                            box=BoundingBox(
                                x_min=round(x_min, 2),
                                y_min=round(y_min, 2),
                                x_max=round(x_max, 2),
                                y_max=round(y_max, 2)
                            )
                        )
                    )
            return detected
        except Exception as e:
            print(f"[YoloService] YOLO detection failed: {e}")
            return []
