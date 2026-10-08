from fastapi import APIRouter, Depends
from app.models.schemas import ApiResponse, InsightsData
from app.utils.security import get_current_user
from app.services.conversation_service import ConversationService

router = APIRouter(prefix="/api/insights", tags=["Insights & Analytics"])

@router.get("", response_model=ApiResponse[InsightsData])
async def get_user_insights(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    insights = ConversationService.get_insights(user_id=user_id)
    return ApiResponse(data=insights)
