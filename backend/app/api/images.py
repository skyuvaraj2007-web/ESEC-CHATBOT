import os
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.models.schemas import ApiResponse, ImageModel, ImageAnalysisData, ImageAnalyzeRequest
from app.utils.security import get_current_user
from app.utils.image_utils import validate_image_bytes, optimize_image_for_ai
from app.services.storage_service import StorageService
from app.services.vision_service import VisionService
from app.services.conversation_service import ConversationService
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/api/images", tags=["Images & Analysis"])

@router.post("/upload", response_model=ApiResponse[ImageModel])
async def upload_image(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    
    # 1. Read & Validate Image
    image_bytes = await file.read()
    width, height, mime = validate_image_bytes(image_bytes, file.content_type)
    
    # Ensure conversation exists
    if not conversation_id:
        conv = ConversationService.create_conversation(user_id=user_id, title="Visual Chat")
        conversation_id = conv.id
        
    # 2. Optimize & Save in Storage
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    optimized_bytes = optimize_image_for_ai(image_bytes)
    
    image_id, storage_path, public_url = StorageService.upload_image(
        image_bytes=optimized_bytes,
        user_id=user_id,
        conversation_id=conversation_id,
        file_ext=ext,
        mime_type=mime
    )
    
    # 3. Create Image Record in Database
    image_model = ConversationService.save_image_record(
        image_id=image_id,
        user_id=user_id,
        conversation_id=conversation_id,
        storage_path=storage_path,
        public_url=public_url,
        file_name=file.filename or f"image{ext}",
        mime_type=mime,
        file_size=len(image_bytes),
        width=width,
        height=height
    )
    
    # 4. Initialize lightweight analysis (Gemini is Primary; YOLO/OCR are on-demand)
    initial_analysis = ImageAnalysisData(
        description="Image uploaded. Primary Gemini Multimodal engine ready for automatic visual description.",
        scene="Uploaded Image",
        objects=[],
        ocr_text="",
        confidence=0.94,
        analysis_json={
            "mode": "primary_gemini_multimodal",
            "yolo_active": False,
            "ocr_active": False
        }
    )
    ConversationService.save_image_analysis(image_id=image_id, analysis=initial_analysis)
    image_model.analysis = initial_analysis
    
    return ApiResponse(data=image_model)

@router.get("/{image_id}/analysis", response_model=ApiResponse[ImageAnalysisData])
async def get_image_analysis(
    image_id: str,
    current_user: dict = Depends(get_current_user)
):
    from app.services.conversation_service import _local_analysis
    analysis = _local_analysis.get(image_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found for image")
    return ApiResponse(data=analysis)

@router.post("/{image_id}/analyze", response_model=ApiResponse[ImageAnalysisData])
async def reanalyze_image(
    image_id: str,
    body: ImageAnalyzeRequest,
    current_user: dict = Depends(get_current_user)
):
    from app.services.conversation_service import _local_images
    img_record = _local_images.get(image_id)
    if not img_record:
        raise HTTPException(status_code=404, detail="Image record not found")
        
    try:
        image_bytes = StorageService.get_image_bytes(img_record["storage_path"])
        analysis = await VisionService.process_full_image_analysis(image_bytes, img_record["mime_type"])
        ConversationService.save_image_analysis(image_id=image_id, analysis=analysis)
        return ApiResponse(data=analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
