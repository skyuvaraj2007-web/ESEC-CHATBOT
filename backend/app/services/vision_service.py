import asyncio
from typing import Optional, List
from app.models.schemas import ImageAnalysisData, DetectedObject, OCRResult
from app.services.yolo_service import YoloService
from app.services.ocr_service import OCRService
from app.services.gemini_service import GeminiService

class VisionService:
    @staticmethod
    async def process_routed_analysis(
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        use_yolo: bool = False,
        use_ocr: bool = False
    ) -> ImageAnalysisData:
        """
        Executes adaptive multimodal processing:
        - If neither YOLO nor OCR is requested, returns lightweight analysis without extra overhead.
        - If YOLO is requested, executes YOLO object detection for spatial bounding boxes.
        - If OCR is requested, executes OCR text extraction for verbatim text.
        """
        # If no specialized vision tool is needed, avoid all extra compute
        if not use_yolo and not use_ocr:
            return ImageAnalysisData(
                description="Visual scene analyzed with primary Gemini Multimodal engine.",
                scene="Visual Scene",
                objects=[],
                ocr_text="",
                confidence=0.92,
                analysis_json={
                    "mode": "gemini_multimodal",
                    "yolo_active": False,
                    "ocr_active": False
                }
            )

        tasks = []
        task_types = []

        if use_yolo:
            tasks.append(asyncio.to_thread(YoloService.detect_objects, image_bytes))
            task_types.append("yolo")

        if use_ocr:
            tasks.append(asyncio.to_thread(OCRService.extract_text, image_bytes))
            task_types.append("ocr")

        results = await asyncio.gather(*tasks, return_exceptions=True)

        yolo_objects: List[DetectedObject] = []
        ocr_result = OCRResult(text="", confidence=0.0)

        for t_type, res in zip(task_types, results):
            if t_type == "yolo" and isinstance(res, list):
                yolo_objects = res
            elif t_type == "ocr" and isinstance(res, OCRResult):
                ocr_result = res

        return ImageAnalysisData(
            description="Specialized vision submodules executed.",
            scene="Specialized Visual Target",
            objects=yolo_objects,
            ocr_text=ocr_result.text,
            confidence=0.94 if yolo_objects or ocr_result.text else 0.90,
            analysis_json={
                "mode": "specialized_pipeline",
                "yolo_count": len(yolo_objects),
                "ocr_found": bool(ocr_result.text),
                "yolo_active": use_yolo,
                "ocr_active": use_ocr
            }
        )

    @staticmethod
    async def process_full_image_analysis(
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> ImageAnalysisData:
        """
        Runs complete multimodal fusion pipeline on explicit demand (YOLO + OCR + Gemini VLM).
        """
        opt_bytes = GeminiService.optimize_image_for_vlm(image_bytes, max_dim=1024)

        yolo_task = asyncio.to_thread(YoloService.detect_objects, image_bytes)
        ocr_task = asyncio.to_thread(OCRService.extract_text, image_bytes)
        gemini_task = GeminiService.analyze_image_structured(opt_bytes, "image/jpeg")

        yolo_res, ocr_res, gemini_res = await asyncio.gather(
            yolo_task, ocr_task, gemini_task, return_exceptions=True
        )

        yolo_objects = yolo_res if isinstance(yolo_res, list) else []
        ocr_result = ocr_res if isinstance(ocr_res, OCRResult) else OCRResult(text="", confidence=0.0)
        gemini_analysis = gemini_res if isinstance(gemini_res, ImageAnalysisData) else ImageAnalysisData(
            description="Visual scene analyzed with multimodal reasoning.",
            scene="Visual Scene",
            objects=[],
            ocr_text="",
            confidence=0.88
        )

        all_objects: list[DetectedObject] = []
        seen_names = set()

        for y_obj in yolo_objects:
            all_objects.append(y_obj)
            seen_names.add(y_obj.name.lower())

        for g_obj in gemini_analysis.objects:
            if g_obj.name.lower() not in seen_names:
                all_objects.append(g_obj)
                seen_names.add(g_obj.name.lower())

        final_ocr = ocr_result.text if ocr_result.text else gemini_analysis.ocr_text

        conf_scores = [gemini_analysis.confidence]
        if ocr_result.confidence > 0:
            conf_scores.append(ocr_result.confidence)
        if yolo_objects:
            yolo_avg = sum(o.confidence for o in yolo_objects) / len(yolo_objects)
            conf_scores.append(yolo_avg)

        overall_conf = round(sum(conf_scores) / len(conf_scores), 2)

        return ImageAnalysisData(
            description=gemini_analysis.description,
            scene=gemini_analysis.scene,
            objects=all_objects,
            ocr_text=final_ocr,
            confidence=overall_conf,
            analysis_json={
                "gemini_scene": gemini_analysis.scene,
                "yolo_count": len(yolo_objects),
                "ocr_found": bool(final_ocr),
                "fused_objects_count": len(all_objects)
            }
        )

    @staticmethod
    def build_visual_context_prompt(analysis: Optional[ImageAnalysisData]) -> str:
        """
        Builds a formatted visual context string for Gemini language reasoning.
        """
        if not analysis:
            return ""

        context_parts = []
        if analysis.scene and analysis.scene != "Visual Scene":
            context_parts.append(f"Scene: {analysis.scene}")
        if analysis.description and "Visual scene analyzed" not in analysis.description:
            context_parts.append(f"Description: {analysis.description}")

        if analysis.objects:
            obj_list_str = ", ".join([
                f"{o.name} [Confidence: {int(o.confidence * 100)}%{f', Box: ({o.box.x_min}%, {o.box.y_min}%, {o.box.x_max}%, {o.box.y_max}%)' if o.box else ''}]"
                for o in analysis.objects[:12]
            ])
            context_parts.append(f"Detected Objects (with bounding coordinates): {obj_list_str}")

        if analysis.ocr_text:
            context_parts.append(f"Specialized Verbatim OCR Text: \"{analysis.ocr_text}\"")

        return "\n".join(context_parts)
