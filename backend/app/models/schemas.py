from typing import Any, Generic, TypeVar, Optional, List, Dict
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None

class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float

class DetectedObject(BaseModel):
    name: str
    confidence: float
    box: Optional[BoundingBox] = None
    color: Optional[str] = None

class OCRResult(BaseModel):
    text: str = ""
    confidence: float = 0.0

class ImageAnalysisData(BaseModel):
    description: str = ""
    scene: str = "general"
    objects: List[DetectedObject] = []
    ocr_text: str = ""
    confidence: float = 0.9
    analysis_json: Optional[Dict[str, Any]] = None

class ImageModel(BaseModel):
    id: str
    conversation_id: Optional[str] = None
    user_id: str
    storage_path: str
    public_url: str
    file_name: str
    mime_type: str
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: Optional[datetime] = None
    analysis: Optional[ImageAnalysisData] = None

class MessageModel(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    role: str # 'user' | 'assistant' | 'system'
    content: str
    image_id: Optional[str] = None
    image: Optional[ImageModel] = None
    input_mode: Optional[str] = "text" # 'text' | 'voice' | 'voice_response'
    language: Optional[str] = None
    input_language: Optional[str] = None
    response_language: Optional[str] = None
    style: Optional[str] = None
    tools_used: Optional[Dict[str, Any]] = None
    suggested_questions: Optional[List[str]] = None
    created_at: Optional[datetime] = None

class ConversationModel(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    image_count: int = 0
    message_count: int = 0

class ConversationDetail(ConversationModel):
    messages: List[MessageModel] = []
    images: List[ImageModel] = []

class ConversationCreateRequest(BaseModel):
    title: Optional[str] = "New Visual Chat"

class SelectedRegion(BaseModel):
    x: float # X position percentage (0-100) or pixel
    y: float # Y position percentage (0-100) or pixel
    width: float # Width percentage (0-100) or pixel
    height: float # Height percentage (0-100) or pixel
    unit: Optional[str] = "percent" # 'percent' | 'pixel'

class SelectedObjectContext(BaseModel):
    label: Optional[str] = None
    confidence: Optional[float] = None
    bbox: Optional[List[float]] = None # [x_min, y_min, x_max, y_max]

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = ""
    image_id: Optional[str] = None
    image_base64: Optional[str] = None # For direct/transient sends
    input_mode: Optional[str] = "text" # 'text' | 'voice'
    language: Optional[str] = None # 'auto' | 'ta' | 'ta-Latn' | 'en' | 'hi' | 'ml' | 'te' | 'kn' | 'bn' | 'mr'
    style: Optional[str] = None
    selected_region: Optional[SelectedRegion] = None
    selected_object: Optional[SelectedObjectContext] = None

class ChatResponseData(BaseModel):
    conversation_id: str
    message: MessageModel
    analysis: Optional[ImageAnalysisData] = None
    tools_used: Optional[Dict[str, Any]] = None
    suggested_questions: Optional[List[str]] = None

class ImageAnalyzeRequest(BaseModel):
    prompt: Optional[str] = None

class CompareRequest(BaseModel):
    image_id_1: str
    image_id_2: str
    prompt: Optional[str] = "Compare these two images in detail and list their similarities and differences."

class CompareResponseData(BaseModel):
    comparison: str
    image_1_summary: str
    image_2_summary: str
    similarities: List[str] = []
    differences: List[str] = []

class InsightsData(BaseModel):
    total_images: int = 0
    total_conversations: int = 0
    total_messages: int = 0
    total_objects_detected: int = 0
    average_confidence: float = 0.0
    detected_classes_breakdown: Dict[str, int] = {}
    recent_activity: List[Dict[str, Any]] = []

class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
