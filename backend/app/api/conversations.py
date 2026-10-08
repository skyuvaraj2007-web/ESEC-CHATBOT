from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import (
    ApiResponse, ConversationModel, ConversationDetail,
    ConversationCreateRequest, ErrorDetail
)
from app.utils.security import get_current_user
from app.services.conversation_service import ConversationService

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])

@router.post("", response_model=ApiResponse[ConversationModel])
async def create_conversation(
    body: ConversationCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    conv = ConversationService.create_conversation(user_id=user_id, title=body.title or "New Visual Chat")
    return ApiResponse(data=conv)

@router.get("", response_model=ApiResponse[List[ConversationModel]])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    convs = ConversationService.get_user_conversations(user_id=user_id)
    return ApiResponse(data=convs)

@router.get("/{conversation_id}", response_model=ApiResponse[ConversationDetail])
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    conv = ConversationService.get_conversation_detail(conversation_id=conversation_id, user_id=user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ApiResponse(data=conv)

@router.delete("/{conversation_id}", response_model=ApiResponse[bool])
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    success = ConversationService.delete_conversation(conversation_id=conversation_id, user_id=user_id)
    return ApiResponse(data=success)
