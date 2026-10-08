from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import ApiResponse, CompareRequest, CompareResponseData
from app.utils.security import get_current_user
from app.services.storage_service import StorageService
from app.services.gemini_service import GeminiService
from app.services.conversation_service import ConversationService

router = APIRouter(prefix="/api/compare", tags=["Image Comparison"])

@router.post("", response_model=ApiResponse[CompareResponseData])
async def compare_images_endpoint(
    body: CompareRequest,
    current_user: dict = Depends(get_current_user)
):
    img1_record = ConversationService.get_image(body.image_id_1)
    img2_record = ConversationService.get_image(body.image_id_2)
    
    if not img1_record or not img2_record:
        raise HTTPException(status_code=404, detail="One or both images could not be located.")
        
    try:
        bytes1 = StorageService.get_image_bytes(img1_record.storage_path)
        bytes2 = StorageService.get_image_bytes(img2_record.storage_path)
        
        result = await GeminiService.compare_images(
            image_bytes_1=bytes1,
            image_bytes_2=bytes2,
            prompt=body.prompt or "Compare these two images in detail."
        )
        
        return ApiResponse(
            data=CompareResponseData(
                comparison=result.get("comparison", "Comparison completed."),
                image_1_summary=result.get("image_1_summary", ""),
                image_2_summary=result.get("image_2_summary", ""),
                similarities=result.get("similarities", []),
                differences=result.get("differences", [])
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
