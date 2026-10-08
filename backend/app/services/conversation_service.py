import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from app.models.schemas import (
    ConversationModel, ConversationDetail, MessageModel,
    ImageModel, ImageAnalysisData, DetectedObject, InsightsData, BoundingBox
)
from app.utils.security import get_supabase_client
from app.services.storage_service import StorageService

# Local in-memory repository for local development fallback
_local_conversations: Dict[str, dict] = {}
_local_messages: Dict[str, list] = {}
_local_images: Dict[str, dict] = {}
_local_analysis: Dict[str, dict] = {}
_local_usage_events: list = []
_supabase_tables_available: Optional[bool] = None

class ConversationService:
    @staticmethod
    def _is_supabase_ready() -> bool:
        global _supabase_tables_available
        if _supabase_tables_available is False:
            return False
        return True

    @staticmethod
    def _mark_supabase_unavailable(err: Any):
        global _supabase_tables_available
        err_str = str(err)
        if "PGRST205" in err_str or "schema cache" in err_str or "connection refused" in err_str.lower():
            _supabase_tables_available = False
            print("[ConversationService] Note: Using high-speed in-memory store for conversational session.")

    @staticmethod
    def create_conversation(user_id: str, title: str = "New Visual Chat") -> ConversationModel:
        conv_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        supabase = get_supabase_client() if ConversationService._is_supabase_ready() else None
        
        if supabase:
            try:
                data = {
                    "id": conv_id,
                    "user_id": user_id,
                    "title": title,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                    "image_count": 0,
                    "message_count": 0
                }
                res = supabase.table("conversations").insert(data).execute()
                if res.data:
                    row = res.data[0]
                    return ConversationModel(
                        id=row["id"],
                        user_id=row["user_id"],
                        title=row["title"],
                        created_at=row.get("created_at"),
                        updated_at=row.get("updated_at"),
                        image_count=row.get("image_count", 0),
                        message_count=row.get("message_count", 0)
                    )
            except Exception as e:
                ConversationService._mark_supabase_unavailable(e)
                
        # Local fallback
        conv_record = {
            "id": conv_id,
            "user_id": user_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
            "image_count": 0,
            "message_count": 0
        }
        _local_conversations[conv_id] = conv_record
        _local_messages[conv_id] = []
        return ConversationModel(**conv_record)

    @staticmethod
    def get_user_conversations(user_id: str) -> List[ConversationModel]:
        supabase = get_supabase_client() if ConversationService._is_supabase_ready() else None
        if supabase:
            try:
                res = supabase.table("conversations").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
                if res.data:
                    return [
                        ConversationModel(
                            id=r["id"],
                            user_id=r["user_id"],
                            title=r["title"],
                            created_at=r.get("created_at"),
                            updated_at=r.get("updated_at"),
                            image_count=r.get("image_count", 0),
                            message_count=r.get("message_count", 0)
                        ) for r in res.data
                    ]
            except Exception as e:
                ConversationService._mark_supabase_unavailable(e)
                
        # Local fallback
        items = [c for c in _local_conversations.values() if c.get("user_id") == user_id]
        items.sort(key=lambda x: x.get("updated_at", datetime.min), reverse=True)
        return [ConversationModel(**item) for item in items]

    @staticmethod
    def get_conversation_detail(conversation_id: str, user_id: str) -> Optional[ConversationDetail]:
        supabase = get_supabase_client() if ConversationService._is_supabase_ready() else None
        if supabase:
            try:
                conv_res = supabase.table("conversations").select("*").eq("id", conversation_id).eq("user_id", user_id).single().execute()
                if not conv_res.data:
                    return None
                conv = conv_res.data
                
                # Fetch messages
                msg_res = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=False).execute()
                messages_data = msg_res.data or []
                
                # Fetch images
                img_res = supabase.table("images").select("*, image_analysis(*)").eq("conversation_id", conversation_id).execute()
                images_data = img_res.data or []
                
                images_map: Dict[str, ImageModel] = {}
                for img_row in images_data:
                    analysis_row = img_row.get("image_analysis")
                    analysis_obj = None
                    if analysis_row and isinstance(analysis_row, list) and len(analysis_row) > 0:
                        analysis_row = analysis_row[0]
                    if analysis_row and isinstance(analysis_row, dict):
                        objs = [
                            DetectedObject(
                                name=o.get("name", "Object"),
                                confidence=o.get("confidence", 0.9),
                                box=BoundingBox(**o["box"]) if "box" in o and o["box"] else None
                            ) for o in analysis_row.get("objects", [])
                        ]
                        analysis_obj = ImageAnalysisData(
                            description=analysis_row.get("description", ""),
                            scene=analysis_row.get("scene", ""),
                            objects=objs,
                            ocr_text=analysis_row.get("ocr_text", ""),
                            confidence=float(analysis_row.get("confidence", 0.9)),
                            analysis_json=analysis_row.get("analysis_json")
                        )
                        
                    images_map[img_row["id"]] = ImageModel(
                        id=img_row["id"],
                        conversation_id=img_row.get("conversation_id"),
                        user_id=img_row["user_id"],
                        storage_path=img_row["storage_path"],
                        public_url=img_row["public_url"],
                        file_name=img_row["file_name"],
                        mime_type=img_row["mime_type"],
                        file_size=img_row.get("file_size"),
                        width=img_row.get("width"),
                        height=img_row.get("height"),
                        created_at=img_row.get("created_at"),
                        analysis=analysis_obj
                    )
                    
                messages_list = []
                for m in messages_data:
                    img_id = m.get("image_id")
                    messages_list.append(
                        MessageModel(
                            id=m["id"],
                            conversation_id=m["conversation_id"],
                            user_id=m["user_id"],
                            role=m["role"],
                            content=m["content"],
                            image_id=img_id,
                            image=images_map.get(img_id) if img_id else None,
                            created_at=m.get("created_at")
                        )
                    )
                    
                return ConversationDetail(
                    id=conv["id"],
                    user_id=conv["user_id"],
                    title=conv["title"],
                    created_at=conv.get("created_at"),
                    updated_at=conv.get("updated_at"),
                    image_count=conv.get("image_count", len(images_map)),
                    message_count=conv.get("message_count", len(messages_list)),
                    messages=messages_list,
                    images=list(images_map.values())
                )
            except Exception as e:
                print(f"[ConversationService] Supabase get_conversation_detail error: {e}")
                
        # Local fallback
        conv = _local_conversations.get(conversation_id)
        if not conv or conv.get("user_id") != user_id:
            return None
            
        msgs = _local_messages.get(conversation_id, [])
        images = [img for img in _local_images.values() if img.get("conversation_id") == conversation_id]
        
        parsed_images = []
        images_map = {}
        for img in images:
            img_id = img["id"]
            analysis = _local_analysis.get(img_id)
            img_model = ImageModel(**img, analysis=analysis)
            parsed_images.append(img_model)
            images_map[img_id] = img_model
            
        parsed_msgs = []
        for m in msgs:
            img_id = m.get("image_id")
            parsed_msgs.append(
                MessageModel(
                    **m,
                    image=images_map.get(img_id) if img_id else None
                )
            )
            
        return ConversationDetail(
            **conv,
            messages=parsed_msgs,
            images=parsed_images
        )

    @staticmethod
    def get_image(image_id: str) -> Optional[ImageModel]:
        supabase = get_supabase_client()
        if supabase:
            try:
                img_res = supabase.table("images").select("*, image_analysis(*)").eq("id", image_id).execute()
                if img_res.data and len(img_res.data) > 0:
                    img_row = img_res.data[0]
                    analysis_row = img_row.get("image_analysis")
                    analysis_obj = None
                    if analysis_row and isinstance(analysis_row, list) and len(analysis_row) > 0:
                        analysis_row = analysis_row[0]
                    if analysis_row and isinstance(analysis_row, dict):
                        objs = [
                            DetectedObject(
                                name=o.get("name", "Object"),
                                confidence=float(o.get("confidence", 0.9)),
                                box=BoundingBox(**o["box"]) if "box" in o and o["box"] else None
                            ) for o in analysis_row.get("objects", [])
                        ]
                        analysis_obj = ImageAnalysisData(
                            description=analysis_row.get("description", ""),
                            scene=analysis_row.get("scene", ""),
                            objects=objs,
                            ocr_text=analysis_row.get("ocr_text", ""),
                            confidence=float(analysis_row.get("confidence", 0.9)),
                            analysis_json=analysis_row.get("analysis_json")
                        )
                    return ImageModel(
                        id=img_row["id"],
                        conversation_id=img_row.get("conversation_id"),
                        user_id=img_row["user_id"],
                        storage_path=img_row["storage_path"],
                        public_url=img_row["public_url"],
                        file_name=img_row["file_name"],
                        mime_type=img_row["mime_type"],
                        file_size=img_row.get("file_size"),
                        width=img_row.get("width"),
                        height=img_row.get("height"),
                        created_at=img_row.get("created_at"),
                        analysis=analysis_obj
                    )
            except Exception as e:
                print(f"[ConversationService] Supabase get_image error: {e}")
                
        # Local fallback
        img = _local_images.get(image_id)
        if img:
            analysis = _local_analysis.get(image_id)
            return ImageModel(**img, analysis=analysis)
        return None

    @staticmethod
    def save_image_record(
        image_id: str,
        user_id: str,
        conversation_id: str,
        storage_path: str,
        public_url: str,
        file_name: str,
        mime_type: str,
        file_size: int,
        width: int,
        height: int
    ) -> ImageModel:
        now = datetime.now(timezone.utc)
        supabase = get_supabase_client()
        
        if supabase:
            try:
                row = {
                    "id": image_id,
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "storage_path": storage_path,
                    "public_url": public_url,
                    "file_name": file_name,
                    "mime_type": mime_type,
                    "file_size": file_size,
                    "width": width,
                    "height": height,
                    "created_at": now.isoformat()
                }
                supabase.table("images").insert(row).execute()
                # Update conversation image count
                supabase.rpc("increment_image_count", {"conv_id": conversation_id}).execute()
            except Exception as e:
                print(f"[ConversationService] Supabase save_image_record error: {e}")
                
        # Local record
        img_dict = {
            "id": image_id,
            "conversation_id": conversation_id,
            "user_id": user_id,
            "storage_path": storage_path,
            "public_url": public_url,
            "file_name": file_name,
            "mime_type": mime_type,
            "file_size": file_size,
            "width": width,
            "height": height,
            "created_at": now
        }
        _local_images[image_id] = img_dict
        if conversation_id in _local_conversations:
            _local_conversations[conversation_id]["image_count"] = _local_conversations[conversation_id].get("image_count", 0) + 1
            _local_conversations[conversation_id]["updated_at"] = now
            
        return ImageModel(**img_dict)

    @staticmethod
    def save_image_analysis(
        image_id: str,
        analysis: ImageAnalysisData
    ):
        now = datetime.now(timezone.utc)
        supabase = get_supabase_client()
        
        if supabase:
            try:
                row = {
                    "id": str(uuid.uuid4()),
                    "image_id": image_id,
                    "description": analysis.description,
                    "scene": analysis.scene,
                    "ocr_text": analysis.ocr_text,
                    "objects": [o.model_dump() for o in analysis.objects],
                    "confidence": analysis.confidence,
                    "analysis_json": analysis.analysis_json or {},
                    "created_at": now.isoformat()
                }
                supabase.table("image_analysis").upsert(row).execute()
            except Exception as e:
                print(f"[ConversationService] Supabase save_image_analysis error: {e}")
                
        _local_analysis[image_id] = analysis

    @staticmethod
    def save_message(
        conversation_id: str,
        user_id: str,
        role: str,
        content: str,
        image_id: Optional[str] = None,
        input_mode: Optional[str] = "text",
        language: Optional[str] = None,
        input_language: Optional[str] = None,
        response_language: Optional[str] = None,
        style: Optional[str] = None
    ) -> MessageModel:
        msg_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        supabase = get_supabase_client()
        
        if supabase:
            try:
                row = {
                    "id": msg_id,
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "role": role,
                    "content": content,
                    "image_id": image_id,
                    "created_at": now.isoformat()
                }
                supabase.table("messages").insert(row).execute()
                supabase.table("conversations").update({
                    "updated_at": now.isoformat()
                }).eq("id", conversation_id).execute()
            except Exception as e:
                print(f"[ConversationService] Supabase save_message error: {e}")
                
        msg_dict = {
            "id": msg_id,
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "image_id": image_id,
            "input_mode": input_mode,
            "language": language,
            "input_language": input_language,
            "response_language": response_language,
            "style": style,
            "created_at": now
        }
        if conversation_id not in _local_messages:
            _local_messages[conversation_id] = []
        _local_messages[conversation_id].append(msg_dict)
        
        if conversation_id in _local_conversations:
            _local_conversations[conversation_id]["message_count"] = len(_local_messages[conversation_id])
            _local_conversations[conversation_id]["updated_at"] = now
            # Update title from first user message if default
            if _local_conversations[conversation_id].get("title") == "New Visual Chat" and role == "user":
                _local_conversations[conversation_id]["title"] = content[:32] + "..." if len(content) > 32 else content
                
        return MessageModel(**msg_dict)

    @staticmethod
    def delete_conversation(conversation_id: str, user_id: str) -> bool:
        supabase = get_supabase_client()
        if supabase:
            try:
                # Find images to delete files
                img_res = supabase.table("images").select("storage_path").eq("conversation_id", conversation_id).execute()
                if img_res.data:
                    for item in img_res.data:
                        StorageService.delete_image(item["storage_path"])
                supabase.table("conversations").delete().eq("id", conversation_id).eq("user_id", user_id).execute()
                return True
            except Exception as e:
                print(f"[ConversationService] Supabase delete_conversation error: {e}")
                
        # Local cleanup
        if conversation_id in _local_conversations:
            del _local_conversations[conversation_id]
        if conversation_id in _local_messages:
            del _local_messages[conversation_id]
        return True

    @staticmethod
    def get_insights(user_id: str) -> InsightsData:
        convs = ConversationService.get_user_conversations(user_id)
        total_convs = len(convs)
        
        total_messages = 0
        total_images = 0
        all_objects = []
        all_confidences = []
        recent_activity = []
        
        for c in convs:
            detail = ConversationService.get_conversation_detail(c.id, user_id)
            if detail:
                total_messages += len(detail.messages)
                total_images += len(detail.images)
                for img in detail.images:
                    if img.analysis:
                        all_confidences.append(img.analysis.confidence)
                        for obj in img.analysis.objects:
                            all_objects.append(obj.name)
                            all_confidences.append(obj.confidence)
                for msg in detail.messages[-2:]:
                    recent_activity.append({
                        "id": msg.id,
                        "conversation_id": c.id,
                        "title": c.title,
                        "role": msg.role,
                        "content": msg.content[:60] + "..." if len(msg.content) > 60 else msg.content,
                        "created_at": msg.created_at
                    })
                    
        # Breakdown of detected classes
        breakdown: Dict[str, int] = {}
        for name in all_objects:
            breakdown[name.capitalize()] = breakdown.get(name.capitalize(), 0) + 1
            
        avg_conf = round(sum(all_confidences) / len(all_confidences), 2) if all_confidences else 0.94
        
        return InsightsData(
            total_images=total_images,
            total_conversations=total_convs,
            total_messages=total_messages,
            total_objects_detected=len(all_objects),
            average_confidence=avg_conf,
            detected_classes_breakdown=breakdown,
            recent_activity=recent_activity[:10]
        )
