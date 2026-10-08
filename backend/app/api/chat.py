import time
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import ApiResponse, ChatRequest, ChatResponseData, MessageModel
from app.utils.security import get_current_user
from app.services.conversation_service import ConversationService
from app.services.storage_service import StorageService
from app.services.vision_service import VisionService
from app.services.gemini_service import GeminiService
from app.services.language_service import LanguageService
from app.services.task_router import TaskRouter
from app.utils.image_utils import base64_to_bytes, validate_image_bytes

router = APIRouter(prefix="/api/chat", tags=["Chat & Conversational Memory"])

@router.post("", response_model=ApiResponse[ChatResponseData])
async def send_chat_message(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    t_start = time.perf_counter()
    user_id = current_user["id"]
    t_auth = time.perf_counter()
    
    # 1. Get or create conversation
    conv_id = body.conversation_id
    title_snippet = body.message[:32] if body.message else "Visual Chat Session"
    if not conv_id:
        conv = ConversationService.create_conversation(user_id=user_id, title=title_snippet)
        conv_id = conv.id
        
    conv_detail = ConversationService.get_conversation_detail(conversation_id=conv_id, user_id=user_id)
    if not conv_detail:
        conv = ConversationService.create_conversation(user_id=user_id, title=title_snippet)
        conv_id = conv.id
        conv_detail = ConversationService.get_conversation_detail(conversation_id=conv_id, user_id=user_id)
        
    t_conv = time.perf_counter()

    # 2. Determine active image context & load image bytes
    active_image_id = body.image_id
    image_bytes = None
    analysis = None
    
    if not active_image_id and conv_detail and conv_detail.images:
        last_img = conv_detail.images[-1]
        active_image_id = last_img.id
        analysis = last_img.analysis
        
    if body.image_base64:
        try:
            raw_bytes = base64_to_bytes(body.image_base64)
            width, height, mime = validate_image_bytes(raw_bytes)
            img_id, path, pub_url = StorageService.upload_image(
                image_bytes=raw_bytes,
                user_id=user_id,
                conversation_id=conv_id,
                file_ext=".jpg",
                mime_type=mime
            )
            ConversationService.save_image_record(
                image_id=img_id,
                user_id=user_id,
                conversation_id=conv_id,
                storage_path=path,
                public_url=pub_url,
                file_name="captured_image.jpg",
                mime_type=mime,
                file_size=len(raw_bytes),
                width=width,
                height=height
            )
            active_image_id = img_id
            image_bytes = raw_bytes
        except Exception as e:
            print(f"[ChatRouter] Base64 image upload error: {e}")
            
    elif active_image_id:
        img_model = ConversationService.get_image(active_image_id)
        if img_model:
            try:
                image_bytes = StorageService.get_image_bytes(img_model.storage_path)
            except Exception as e:
                print(f"[ChatRouter] Image load error: {e}")
            if img_model.analysis:
                analysis = img_model.analysis

    t_img = time.perf_counter()

    # 3. Crop selected region if user specified an interactive object/region selection
    cropped_bytes = None
    selected_reg_dict = None
    selected_obj_dict = None

    if body.selected_region and image_bytes:
        selected_reg_dict = body.selected_region.dict() if hasattr(body.selected_region, "dict") else body.selected_region.__dict__
        try:
            from app.utils.image_utils import crop_image_region
            cropped_bytes = crop_image_region(
                data=image_bytes,
                x=body.selected_region.x,
                y=body.selected_region.y,
                width=body.selected_region.width,
                height=body.selected_region.height,
                unit=body.selected_region.unit or "percent"
            )
        except Exception as crop_err:
            print(f"[ChatRouter] Crop extraction error: {crop_err}")

    if body.selected_object:
        selected_obj_dict = body.selected_object.dict() if hasattr(body.selected_object, "dict") else body.selected_object.__dict__

    # 4. Task Routing: Determine whether YOLO / OCR specialized modules are requested
    is_new_upload = bool(body.image_base64) or (bool(body.image_id) and not conv_detail.messages)
    route_res = TaskRouter.route(body.message, is_new_upload=is_new_upload)

    # 5. Optional lazy execution of specialized tools if requested
    if (route_res.use_yolo or route_res.use_ocr) and image_bytes:
        try:
            analysis = await VisionService.process_routed_analysis(
                image_bytes=image_bytes,
                use_yolo=route_res.use_yolo,
                use_ocr=route_res.use_ocr
            )
            if active_image_id:
                ConversationService.save_image_analysis(image_id=active_image_id, analysis=analysis)
        except Exception as e:
            print(f"[ChatRouter] Specialized vision routing error: {e}")

    visual_context = VisionService.build_visual_context_prompt(analysis)
    history_messages = [{"role": m.role, "content": m.content} for m in conv_detail.messages]

    # 6. Detect Language & Conversational Style
    lang_info = LanguageService.detect_language_and_style(
        text=body.message or "",
        user_preference=body.language,
        conversation_history=history_messages
    )
    input_lang = lang_info["input_language"]
    resp_lang = lang_info["response_language"]
    detected_style = lang_info["style"]
    directive = lang_info["prompt_directive"]

    # 7. Save User Message (if actual user query exists)
    display_user_content = body.message
    if not display_user_content or route_res.mode == "gemini_auto_description":
        display_user_content = "[Uploaded image for automatic visual understanding]"

    user_msg = ConversationService.save_message(
        conversation_id=conv_id,
        user_id=user_id,
        role="user",
        content=display_user_content,
        image_id=active_image_id,
        input_mode=body.input_mode or "text",
        language=body.language or input_lang,
        input_language=input_lang,
        response_language=resp_lang,
        style=detected_style
    )
    
    t_prep = time.perf_counter()

    # 8. Generate Response (Auto-description or Multimodal QA with region focus)
    if route_res.mode == "gemini_auto_description" and image_bytes:
        ai_response_text = await GeminiService.generate_auto_image_description(
            image_bytes=image_bytes,
            language_hint=resp_lang
        )
    else:
        ai_response_text = await GeminiService.chat_with_vision(
            user_message=body.message or "Describe what you see in this image.",
            conversation_history=history_messages,
            image_bytes=image_bytes,
            cropped_bytes=cropped_bytes,
            selected_region=selected_reg_dict,
            selected_object=selected_obj_dict,
            visual_context=visual_context,
            language_hint=resp_lang,
            language_directive=directive
        )
    
    t_gemini = time.perf_counter()

    suggested_q = GeminiService.get_suggested_questions(resp_lang)
    tools_used_dict = route_res.to_tools_used()
    if selected_reg_dict:
        tools_used_dict["selected_region"] = selected_reg_dict
        tools_used_dict["selected_object"] = selected_obj_dict
        tools_used_dict["has_selection"] = True

    # 9. Save Assistant Message with Tool Metadata
    assistant_msg = ConversationService.save_message(
        conversation_id=conv_id,
        user_id=user_id,
        role="assistant",
        content=ai_response_text,
        image_id=active_image_id,
        input_mode="voice_response" if body.input_mode == "voice" else "text",
        language=body.language or resp_lang,
        input_language=resp_lang,
        response_language=resp_lang,
        style=detected_style
    )
    assistant_msg.tools_used = tools_used_dict
    assistant_msg.suggested_questions = suggested_q
    
    t_end = time.perf_counter()

    print(
        f"[CHAT PERF] mode: {route_res.mode} | "
        f"auth: {int((t_auth - t_start)*1000)}ms | "
        f"gemini_vlm: {int((t_gemini - t_prep)*1000)}ms | "
        f"total: {int((t_end - t_start)*1000)}ms"
    )

    return ApiResponse(
        data=ChatResponseData(
            conversation_id=conv_id,
            message=assistant_msg,
            analysis=analysis,
            tools_used=tools_used_dict,
            suggested_questions=suggested_q
        )
    )

@router.post("/stream")
async def stream_chat_message(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]

    # 1. Get or create conversation
    conv_id = body.conversation_id
    title_snippet = body.message[:32] if body.message else "Visual Chat Session"
    if not conv_id:
        conv = ConversationService.create_conversation(user_id=user_id, title=title_snippet)
        conv_id = conv.id

    conv_detail = ConversationService.get_conversation_detail(conversation_id=conv_id, user_id=user_id)
    if not conv_detail:
        conv = ConversationService.create_conversation(user_id=user_id, title=title_snippet)
        conv_id = conv.id
        conv_detail = ConversationService.get_conversation_detail(conversation_id=conv_id, user_id=user_id)

    # 2. Determine active image context & load image bytes
    active_image_id = body.image_id
    image_bytes = None
    analysis = None

    if not active_image_id and conv_detail and conv_detail.images:
        last_img = conv_detail.images[-1]
        active_image_id = last_img.id
        analysis = last_img.analysis

    if body.image_base64:
        try:
            raw_bytes = base64_to_bytes(body.image_base64)
            width, height, mime = validate_image_bytes(raw_bytes)
            img_id, path, pub_url = StorageService.upload_image(
                image_bytes=raw_bytes,
                user_id=user_id,
                conversation_id=conv_id,
                file_ext=".jpg",
                mime_type=mime
            )
            ConversationService.save_image_record(
                image_id=img_id,
                user_id=user_id,
                conversation_id=conv_id,
                storage_path=path,
                public_url=pub_url,
                file_name="captured_image.jpg",
                mime_type=mime,
                file_size=len(raw_bytes),
                width=width,
                height=height
            )
            active_image_id = img_id
            image_bytes = raw_bytes
        except Exception as e:
            print(f"[ChatStream] Base64 image upload error: {e}")

    elif active_image_id:
        img_model = ConversationService.get_image(active_image_id)
        if img_model:
            try:
                image_bytes = StorageService.get_image_bytes(img_model.storage_path)
            except Exception as e:
                print(f"[ChatStream] Image load error: {e}")

            if img_model.analysis:
                analysis = img_model.analysis

    # 3. Crop selected region if user specified an interactive object/region selection
    cropped_bytes = None
    selected_reg_dict = None
    selected_obj_dict = None

    if body.selected_region and image_bytes:
        selected_reg_dict = body.selected_region.dict() if hasattr(body.selected_region, "dict") else body.selected_region.__dict__
        try:
            from app.utils.image_utils import crop_image_region
            cropped_bytes = crop_image_region(
                data=image_bytes,
                x=body.selected_region.x,
                y=body.selected_region.y,
                width=body.selected_region.width,
                height=body.selected_region.height,
                unit=body.selected_region.unit or "percent"
            )
        except Exception as crop_err:
            print(f"[ChatStream] Crop extraction error: {crop_err}")

    if body.selected_object:
        selected_obj_dict = body.selected_object.dict() if hasattr(body.selected_object, "dict") else body.selected_object.__dict__

    # 4. Task Routing: Check if specialized YOLO / OCR requested
    is_new_upload = bool(body.image_base64) or (bool(body.image_id) and not conv_detail.messages)
    route_res = TaskRouter.route(body.message, is_new_upload=is_new_upload)

    if (route_res.use_yolo or route_res.use_ocr) and image_bytes:
        try:
            analysis = await VisionService.process_routed_analysis(
                image_bytes=image_bytes,
                use_yolo=route_res.use_yolo,
                use_ocr=route_res.use_ocr
            )
            if active_image_id:
                ConversationService.save_image_analysis(image_id=active_image_id, analysis=analysis)
        except Exception as e:
            print(f"[ChatStream] Specialized vision routing error: {e}")

    visual_context = VisionService.build_visual_context_prompt(analysis)
    history_messages = [{"role": m.role, "content": m.content} for m in conv_detail.messages]

    # 5. Detect Language & Conversational Style
    lang_info = LanguageService.detect_language_and_style(
        text=body.message or "",
        user_preference=body.language,
        conversation_history=history_messages
    )
    input_lang = lang_info["input_language"]
    resp_lang = lang_info["response_language"]
    detected_style = lang_info["style"]
    directive = lang_info["prompt_directive"]

    # 6. Save User Message
    display_user_content = body.message
    if not display_user_content or route_res.mode == "gemini_auto_description":
        display_user_content = "[Uploaded image for automatic visual understanding]"

    user_msg = ConversationService.save_message(
        conversation_id=conv_id,
        user_id=user_id,
        role="user",
        content=display_user_content,
        image_id=active_image_id,
        input_mode=body.input_mode or "text",
        language=body.language or input_lang,
        input_language=input_lang,
        response_language=resp_lang,
        style=detected_style
    )

    tools_used_dict = route_res.to_tools_used()
    if selected_reg_dict:
        tools_used_dict["selected_region"] = selected_reg_dict
        tools_used_dict["selected_object"] = selected_obj_dict
        tools_used_dict["has_selection"] = True

    suggested_q = GeminiService.get_suggested_questions(resp_lang)

    async def sse_event_generator():
        accumulated_text = []
        try:
            # Check whether to stream automatic description or multimodal QA with region focus
            if route_res.mode == "gemini_auto_description" and image_bytes:
                stream_generator = GeminiService.stream_auto_image_description(
                    image_bytes=image_bytes,
                    language_hint=resp_lang
                )
            else:
                stream_generator = GeminiService.stream_chat_with_vision(
                    user_message=body.message or "Describe what you see in this image.",
                    conversation_history=history_messages,
                    image_bytes=image_bytes,
                    cropped_bytes=cropped_bytes,
                    selected_region=selected_reg_dict,
                    selected_object=selected_obj_dict,
                    visual_context=visual_context,
                    language_hint=resp_lang,
                    language_directive=directive
                )

            async for token in stream_generator:
                accumulated_text.append(token)
                yield f"data: {json.dumps({'type': 'chunk', 'text': token})}\n\n"

            full_text = "".join(accumulated_text).strip()
            if not full_text:
                full_text = "Visual content received and analyzed by Gemini Multimodal engine."

            assistant_msg = ConversationService.save_message(
                conversation_id=conv_id,
                user_id=user_id,
                role="assistant",
                content=full_text,
                image_id=active_image_id,
                input_mode="voice_response" if body.input_mode == "voice" else "text",
                language=body.language or resp_lang,
                input_language=resp_lang,
                response_language=resp_lang,
                style=detected_style
            )
            assistant_msg.tools_used = tools_used_dict
            assistant_msg.suggested_questions = suggested_q

            done_payload = {
                "type": "done",
                "conversation_id": conv_id,
                "message": assistant_msg.dict() if hasattr(assistant_msg, "dict") else assistant_msg.__dict__,
                "analysis": analysis.dict() if analysis and hasattr(analysis, "dict") else (analysis.__dict__ if analysis else None),
                "tools_used": tools_used_dict,
                "suggested_questions": suggested_q
            }
            yield f"data: {json.dumps(done_payload)}\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'type': 'error', 'error': str(err)})}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
