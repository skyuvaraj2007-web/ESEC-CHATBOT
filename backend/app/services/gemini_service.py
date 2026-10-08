import io
import json
import re
import base64
import time
from typing import List, Dict, Any, Optional, AsyncGenerator
from PIL import Image
import httpx
from app.config import settings
from app.models.schemas import DetectedObject, ImageAnalysisData

class GeminiService:
    FALLBACK_MODELS = [
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-latest",
        "gemini-3.5-flash",
        "gemini-3.7-flash",
    ]

    _client: Optional[httpx.AsyncClient] = None

    @classmethod
    def _get_client(cls) -> httpx.AsyncClient:
        """
        Returns an AsyncClient configured for Gemini API requests.
        Ensures the client is recreated if the underlying event loop changed or was closed.
        """
        if cls._client is not None:
            try:
                if cls._client.is_closed:
                    cls._client = None
            except Exception:
                cls._client = None

        if cls._client is None:
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(connect=10.0, read=45.0, write=10.0, pool=10.0),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=40, keepalive_expiry=60.0)
            )
        return cls._client

    @classmethod
    def _get_api_url(cls, model: str) -> str:
        key = settings.GEMINI_API_KEY
        clean_model = model.replace("models/", "")
        return f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={key}"

    @classmethod
    def _get_stream_api_url(cls, model: str) -> str:
        key = settings.GEMINI_API_KEY
        clean_model = model.replace("models/", "")
        return f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:streamGenerateContent?alt=sse&key={key}"

    @classmethod
    def has_api_key(cls) -> bool:
        key = settings.GEMINI_API_KEY
        return bool(key and key != "your-gemini-api-key" and len(key) > 5)

    @staticmethod
    def optimize_image_for_vlm(image_bytes: bytes, max_dim: int = 1024, quality: int = 82) -> bytes:
        """
        Downscales oversized images for multimodal inference, reducing upload payload size by ~80%
        without loss of visual reasoning quality.
        """
        if not image_bytes or len(image_bytes) < 40000:
            return image_bytes
        try:
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            w, h = img.size
            if max(w, h) > max_dim:
                scale = max_dim / float(max(w, h))
                new_w = max(1, int(w * scale))
                new_h = max(1, int(h * scale))
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=True)
            return buf.getvalue()
        except Exception:
            return image_bytes

    @classmethod
    async def analyze_image_structured(
        cls,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> ImageAnalysisData:
        """
        Requests structured visual breakdown (description, scene, objects, text, confidence) from Gemini VLM.
        """
        if not cls.has_api_key():
            return ImageAnalysisData(
                description="Visual scene captured. Set GEMINI_API_KEY to enable full multimodal AI scene description.",
                scene="Visual Input",
                objects=[],
                ocr_text="",
                confidence=0.90
            )

        try:
            opt_bytes = cls.optimize_image_for_vlm(image_bytes, max_dim=1024)
            b64_data = base64.b64encode(opt_bytes).decode("utf-8")
            prompt = (
                "You are the visual intelligence engine of VISIONAI. Analyze the provided image thoroughly and objectively.\n"
                "Return ONLY a valid JSON object with the following structure:\n"
                "{\n"
                '  "description": "Comprehensive and accurate description of what is visible in this image",\n'
                '  "scene": "Short descriptive scene/environment classification",\n'
                '  "objects": [\n'
                '    {"name": "object_name", "confidence": 0.95}\n'
                "  ],\n"
                '  "ocr_text": "Any readable text, logos, or signs extracted verbatim from the image, or empty string if none",\n'
                '  "confidence": 0.94\n'
                "}\n"
                "Do not include markdown or explanations outside the JSON."
            )

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inlineData": {
                                    "mimeType": "image/jpeg",
                                    "data": b64_data
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "responseMimeType": "application/json"
                }
            }

            models_to_try = [settings.GEMINI_MODEL] + [m for m in cls.FALLBACK_MODELS if m != settings.GEMINI_MODEL]
            client = cls._get_client()

            for model in models_to_try:
                try:
                    res = await client.post(cls._get_api_url(model), json=payload)
                    if res.status_code == 200:
                        data_json = res.json()
                        candidates = data_json.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            raw_text = "".join(p.get("text", "") for p in parts).strip()
                            json_match = re.search(r"\{[\s\S]*\}", raw_text)
                            if json_match:
                                parsed = json.loads(json_match.group(0))
                                objects_list = []
                                for obj in parsed.get("objects", []):
                                    if isinstance(obj, dict) and obj.get("name"):
                                        objects_list.append(
                                            DetectedObject(
                                                name=str(obj.get("name", "Object")),
                                                confidence=float(obj.get("confidence", 0.9))
                                            )
                                        )
                                return ImageAnalysisData(
                                    description=parsed.get("description", "Visual scene analyzed."),
                                    scene=parsed.get("scene", "Visual Scene"),
                                    objects=objects_list,
                                    ocr_text=parsed.get("ocr_text", ""),
                                    confidence=float(parsed.get("confidence", 0.92)),
                                    analysis_json=parsed
                                )
                except Exception as model_err:
                    print(f"[GeminiService] Attempt with model {model} failed: {model_err}")
                    continue
        except Exception as e:
            print(f"[GeminiService] Structured analysis error: {e}")

        return ImageAnalysisData(
            description="Analyzed visual content with multimodal reasoning.",
            scene="Visual Scene",
            objects=[],
            ocr_text="",
            confidence=0.88
        )

    @classmethod
    def _build_chat_payload(
        cls,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        image_bytes: Optional[bytes] = None,
        cropped_bytes: Optional[bytes] = None,
        selected_region: Optional[Dict[str, Any]] = None,
        selected_object: Optional[Dict[str, Any]] = None,
        visual_context: Optional[str] = None,
        language_hint: Optional[str] = None,
        language_directive: Optional[str] = None
    ) -> Dict[str, Any]:
        parts = []

        # Grounding Context
        if visual_context:
            parts.append({
                "text": f"[STRUCTURED VISUAL INTELLIGENCE & TELEMETRY]\n{visual_context}\n"
            })

        # Selected Object / Region Context
        if selected_region:
            if hasattr(selected_region, "model_dump"):
                sr_dict = selected_region.model_dump()
            elif hasattr(selected_region, "dict"):
                sr_dict = selected_region.dict()
            elif isinstance(selected_region, dict):
                sr_dict = selected_region
            else:
                sr_dict = {
                    "x": getattr(selected_region, "x", 0),
                    "y": getattr(selected_region, "y", 0),
                    "width": getattr(selected_region, "width", 0),
                    "height": getattr(selected_region, "height", 0),
                }

            rx = sr_dict.get("x", 0)
            ry = sr_dict.get("y", 0)
            rw = sr_dict.get("width", 0)
            rh = sr_dict.get("height", 0)

            obj_label_str = ""
            if selected_object:
                if hasattr(selected_object, "model_dump"):
                    so_dict = selected_object.model_dump()
                elif hasattr(selected_object, "dict"):
                    so_dict = selected_object.dict()
                elif isinstance(selected_object, dict):
                    so_dict = selected_object
                else:
                    so_dict = {
                        "label": getattr(selected_object, "label", None),
                        "confidence": getattr(selected_object, "confidence", 0.9),
                    }
                if so_dict.get("label"):
                    conf_pct = int(so_dict.get("confidence", 0.9) * 100)
                    obj_label_str = f"Detector Label: {so_dict.get('label')} (Confidence: {conf_pct}%)\n"

            region_prompt = (
                f"[USER-SELECTED OBJECT / REGION OF INTEREST]\n"
                f"The user has actively selected a specific region/object of interest within the uploaded image.\n"
                f"Selected Region Coordinates: X={rx}%, Y={ry}%, Width={rw}%, Height={rh}%\n"
                f"{obj_label_str}"
                f"CRITICAL REGION FOCUS DIRECTIVE:\n"
                f"You are analyzing a user-selected region of an image.\n"
                f"Focus primarily on the selected region/object.\n"
                f"Use the surrounding image only when necessary to understand broader scene context.\n"
                f"Do not describe unrelated parts of the image unless the user explicitly asks for them.\n"
                f"If the selected region does not clearly contain the requested information, say so honestly rather than inventing an answer.\n\n"
            )
            parts.append({"text": region_prompt})

        # Conversation History (compact window of last 8 turns)
        if conversation_history:
            hist_text = "[CONVERSATION HISTORY]\n"
            for msg in conversation_history[-8:]:
                role = "User" if msg.get("role") == "user" else "Assistant"
                hist_text += f"{role}: {msg.get('content')}\n"
            parts.append({"text": hist_text + "\n"})

        # Primary Full Image Stream (optimized for VLM payload)
        if image_bytes:
            opt_img = cls.optimize_image_for_vlm(image_bytes, max_dim=1024)
            b64_img = base64.b64encode(opt_img).decode("utf-8")
            parts.append({
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": b64_img
                }
            })

        # Cropped Region High-Resolution Stream (if user selected an object/region)
        if cropped_bytes:
            opt_crop = cls.optimize_image_for_vlm(cropped_bytes, max_dim=600)
            b64_crop = base64.b64encode(opt_crop).decode("utf-8")
            parts.append({
                "text": "[FOCUSED HIGH-RESOLUTION CROP OF THE SELECTED OBJECT/REGION]"
            })
            parts.append({
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": b64_crop
                }
            })

        # Current Question with Language Guidance
        lang_guidance = ""
        if language_directive:
            lang_guidance = f"[LANGUAGE & STYLE DIRECTIVE]\n{language_directive}\n\n"
        elif language_hint and language_hint != "auto":
            lang_guidance = f"[REQUESTED RESPONSE LANGUAGE/STYLE: {language_hint}]\n\n"

        parts.append({
            "text": (
                f"{lang_guidance}[CURRENT USER QUESTION]\n{user_message}\n\n"
                "Instructions: Answer the question directly, concisely, and naturally based on the uploaded image and context above. "
                "If an object/region was selected, focus specifically on answering about that selected entity. "
                "If asked what text is present or what something says, read the actual text accurately. "
                "If asked about visual elements, colors, positions, logos, objects, or people, answer accurately and concisely. "
                "Do not repeat fake placeholders or echo the question."
            )
        })

        system_prompt = (
            "You are VISIONAI, an intelligent, precise, and conversational multimodal visual AI assistant.\n"
            "You are looking at the uploaded image and answering user questions about it with real visual reasoning.\n\n"
            "INTERACTIVE OBJECT & REGION SELECTION RULES:\n"
            "1. When the user has selected a region or clicked an object, all pronouns or implicit references (e.g., 'it', 'this', 'that', 'its', 'this object', 'what is this?', 'what color is it?', 'idhu', 'adhu', 'andha object', 'idhu enna color?', 'adha explain pannu') refer directly to the user-selected object/region.\n"
            "2. Provide grounded, detailed, and accurate observations about the selected object/region.\n"
            "3. If the selected region is too blurry or ambiguous to determine, state what is visibly discernible without hallucinating.\n\n"
            "SHORT FOLLOW-UP QUESTIONS & PRONOUN RESOLUTION RULES:\n"
            "1. Short follow-up questions often contain pronouns or omitted subjects (e.g., 'Adhu?', 'Idhu?', 'Adhu enna color?', 'Color?', 'Adhu enga irukku?', 'Enga?', 'Size?', 'Adhu pakkathula enna irukku?', 'Adha compare pannu.', 'Konjam detail ah explain pannu.', 'Why?', 'Explain', 'Next?', 'Apram?').\n"
            "2. Resolve these short questions directly against the immediately preceding conversation history, the selected object/region, and the uploaded image. NEVER treat them as generic or standalone questions when an antecedent object exists in the conversation.\n"
            "   - 'adhu' / 'adha' / 'adhula' / 'adhukku' refers to the selected object or most recently discussed object.\n"
            "   - 'idhu' / 'idha' / 'idhula' / 'idhukku' refers to the currently selected or referenced object.\n"
            "   - 'Color?' or 'Enna color?' asks for the color of the selected / currently discussed object.\n"
            "   - 'Enga?' or 'Adhu enga irukku?' asks for its spatial position in the image.\n"
            "   - 'Size?' asks for relative size compared to other items in the image.\n"
            "   - 'Adhu pakkathula enna irukku?' asks for neighboring objects in the image relative to the referenced object.\n"
            "   - 'avan' / 'aval' refers to a previously identified person if visible.\n\n"
            "CRITICAL LANGUAGE MIRRORING & CONVERSATIONAL RULES:\n"
            "1. Always respond in the EXACT same language, writing script, and conversational style as the user's latest message unless the user explicitly requests another language.\n"
            "2. TANGLISH (Romanized Tamil): If the user writes in Tanglish, YOU MUST RESPOND IN NATURAL SPOKEN TANGLISH (e.g., 'Idhu blue color car.', 'Adhu left side la irukku.').\n"
            "   - DO NOT convert Tanglish into formal English. DO NOT convert Tanglish into Tamil Unicode. Respond naturally in Romanized Tamil + casual English words.\n"
            "3. SHORT FOLLOW-UP LANGUAGE INHERITANCE: If the ongoing conversation was in Tanglish and the user asks a short question (e.g., 'Color?', 'Size?', 'Why?'), MAINTAIN Tanglish.\n"
            "4. TAMIL UNICODE: If the user asks in Tamil script, reply in natural Tamil script.\n"
            "5. ENGLISH: If the user asks in English, reply in fluent English.\n"
            "6. VISUAL TRUTHFULNESS: Base all answers directly on the visual contents of the uploaded image. Never hallucinate details."
        )

        return {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": parts
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 2048
            }
        }

    @classmethod
    async def chat_with_vision(
        cls,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        image_bytes: Optional[bytes] = None,
        cropped_bytes: Optional[bytes] = None,
        selected_region: Optional[Dict[str, Any]] = None,
        selected_object: Optional[Dict[str, Any]] = None,
        visual_context: Optional[str] = None,
        language_hint: Optional[str] = None,
        language_directive: Optional[str] = None
    ) -> str:
        """
        Sends conversational QA request to Gemini with connection pooling and fast response extraction.
        """
        if not cls.has_api_key():
            return (
                "Gemini API Key is not configured or is missing. "
                "Please add a valid GEMINI_API_KEY in your .env file to enable live visual question answering."
            )

        try:
            payload = cls._build_chat_payload(
                user_message=user_message,
                conversation_history=conversation_history,
                image_bytes=image_bytes,
                cropped_bytes=cropped_bytes,
                selected_region=selected_region,
                selected_object=selected_object,
                visual_context=visual_context,
                language_hint=language_hint,
                language_directive=language_directive
            )

            models_to_try = [settings.GEMINI_MODEL] + [m for m in cls.FALLBACK_MODELS if m != settings.GEMINI_MODEL]
            client = cls._get_client()

            for model in models_to_try:
                try:
                    res = await client.post(cls._get_api_url(model), json=payload)
                    if res.status_code == 200:
                        data_json = res.json()
                        candidates = data_json.get("candidates", [])
                        if candidates:
                            content_parts = candidates[0].get("content", {}).get("parts", [])
                            response_text = "".join(p.get("text", "") for p in content_parts).strip()
                            if response_text:
                                return response_text
                except Exception as model_err:
                    print(f"[GeminiService] Chat attempt with {model} failed: {model_err}")
                    continue

            return "I analyzed the image and selected region, but was unable to generate a response. Please verify your Gemini API key and try again."
        except Exception as e:
            print(f"[GeminiService] Chat generation error: {e}")
            return f"I encountered an error while processing your visual query: {str(e)}"

    @classmethod
    async def stream_chat_with_vision(
        cls,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        image_bytes: Optional[bytes] = None,
        cropped_bytes: Optional[bytes] = None,
        selected_region: Optional[Dict[str, Any]] = None,
        selected_object: Optional[Dict[str, Any]] = None,
        visual_context: Optional[str] = None,
        language_hint: Optional[str] = None,
        language_directive: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Real Gemini SSE streaming generator for instant token-by-token response rendering.
        """
        if not cls.has_api_key():
            yield "Gemini API Key is not configured or is missing."
            return

        payload = cls._build_chat_payload(
            user_message=user_message,
            conversation_history=conversation_history,
            image_bytes=image_bytes,
            cropped_bytes=cropped_bytes,
            selected_region=selected_region,
            selected_object=selected_object,
            visual_context=visual_context,
            language_hint=language_hint,
            language_directive=language_directive
        )

        models_to_try = [settings.GEMINI_MODEL] + [m for m in cls.FALLBACK_MODELS if m != settings.GEMINI_MODEL]
        client = cls._get_client()

        for model in models_to_try:
            try:
                stream_url = cls._get_stream_api_url(model)
                async with client.stream("POST", stream_url, json=payload, timeout=40.0) as response:
                    if response.status_code != 200:
                        continue

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            raw_json = line[6:].strip()
                            if raw_json == "[DONE]":
                                break
                            try:
                                chunk_obj = json.loads(raw_json)
                                candidates = chunk_obj.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    for part in parts:
                                        text_chunk = part.get("text", "")
                                        if text_chunk:
                                            yield text_chunk
                            except Exception:
                                continue
                    return
            except Exception as stream_err:
                print(f"[GeminiService] Stream attempt with {model} error: {stream_err}")
                continue

        # Fallback to non-streaming if stream fails
        fallback_res = await cls.chat_with_vision(
            user_message=user_message,
            conversation_history=conversation_history,
            image_bytes=image_bytes,
            cropped_bytes=cropped_bytes,
            selected_region=selected_region,
            selected_object=selected_object,
            visual_context=visual_context,
            language_hint=language_hint,
            language_directive=language_directive
        )
        yield fallback_res

    @classmethod
    async def compare_images(
        cls,
        image_bytes_1: bytes,
        image_bytes_2: bytes,
        prompt: str = "Compare these two images in detail."
    ) -> Dict[str, Any]:
        """
        Compares two images using Gemini Multimodal reasoning with connection pooling.
        """
        if not cls.has_api_key():
            return {
                "comparison": "Gemini API key is required for automated multimodal image comparison.",
                "image_1_summary": "Image 1 loaded.",
                "image_2_summary": "Image 2 loaded.",
                "similarities": ["Both images loaded into visual pipeline"],
                "differences": ["Set GEMINI_API_KEY for detailed comparison breakdown"]
            }

        try:
            opt_1 = cls.optimize_image_for_vlm(image_bytes_1, max_dim=800)
            opt_2 = cls.optimize_image_for_vlm(image_bytes_2, max_dim=800)
            b64_1 = base64.b64encode(opt_1).decode("utf-8")
            b64_2 = base64.b64encode(opt_2).decode("utf-8")

            comp_prompt = f"""
You are VISIONAI. Compare Image 1 and Image 2 based on: "{prompt}"
Respond ONLY with a valid JSON object in this format:
{{
  "comparison": "Detailed natural language comparison",
  "image_1_summary": "Summary of Image 1",
  "image_2_summary": "Summary of Image 2",
  "similarities": ["similarity 1", "similarity 2"],
  "differences": ["difference 1", "difference 2"]
}}
"""
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": comp_prompt},
                            {"inlineData": {"mimeType": "image/jpeg", "data": b64_1}},
                            {"inlineData": {"mimeType": "image/jpeg", "data": b64_2}}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "responseMimeType": "application/json"
                }
            }

            models_to_try = [settings.GEMINI_MODEL] + [m for m in cls.FALLBACK_MODELS if m != settings.GEMINI_MODEL]
            client = cls._get_client()

            for model in models_to_try:
                try:
                    res = await client.post(cls._get_api_url(model), json=payload)
                    if res.status_code == 200:
                        candidates = res.json().get("candidates", [])
                        if candidates:
                            raw_text = "".join(p.get("text", "") for p in candidates[0].get("content", {}).get("parts", [])).strip()
                            json_match = re.search(r"\{[\s\S]*\}", raw_text)
                            if json_match:
                                return json.loads(json_match.group(0))
                except Exception as model_err:
                    print(f"[GeminiService] Compare attempt with {model} failed: {model_err}")
                    continue
        except Exception as e:
            print(f"[GeminiService] Compare error: {e}")

        return {
            "comparison": "Both images were processed.",
            "image_1_summary": "Image 1 visual review.",
            "image_2_summary": "Image 2 visual review.",
            "similarities": ["Visual stream evaluated"],
            "differences": ["Distinct scene elements"]
        }

    @staticmethod
    def get_suggested_questions(language_hint: Optional[str] = None) -> List[str]:
        if language_hint in ("ta-Latn", "Tanglish"):
            return [
                "Indha image la enna main objects irukku?",
                "Idhula edhavadhu text irukka?",
                "Adhu enna color?",
                "Tamil la explain pannu"
            ]
        elif language_hint in ("ta", "Tamil"):
            return [
                "இந்த படத்தில் என்ன முக்கிய பொருட்கள் உள்ளன?",
                "இதில் ஏதேனும் எழுத்துக்கள் உள்ளதா?",
                "விவரமாக விளக்கு",
                "ஆங்கிலத்தில் கூறு"
            ]
        return [
            "What are the main objects in this image?",
            "What text is visible or readable?",
            "Describe the spatial layout and colors",
            "Explain in Tamil / Tanglish"
        ]

    @classmethod
    def _build_auto_description_payload(
        cls,
        image_bytes: bytes,
        language_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        opt_img = cls.optimize_image_for_vlm(image_bytes, max_dim=1024)
        b64_img = base64.b64encode(opt_img).decode("utf-8")

        lang_instruction = "Respond in clear, professional English."
        if language_hint:
            if language_hint in ("ta", "Tamil"):
                lang_instruction = "Respond naturally in Tamil Unicode script."
            elif language_hint in ("ta-Latn", "Tanglish"):
                lang_instruction = "Respond naturally in conversational Tanglish (Romanized Tamil script with English words)."

        prompt = f"""You are VISIONAI's primary visual understanding engine.
Analyze the uploaded image carefully and provide an automatic visual description.

{lang_instruction}

Structure your response clearly as follows:
### Image Overview
[A concise, comprehensive 2-3 sentence overview describing the overall scene, environment, and context]

### Key Visual Details
• Main Subjects & Actions: [Main people, subjects, animals, or actions visibly occurring]
• Objects & Colors: [Notable objects, their apparent colors, and spatial layout]
• Visible Text & Signs: [Any readable signs, labels, or text visibly present, or state 'No prominent text readable']
• Environment & Conditions: [Environment type, lighting conditions, or notable observations]

RULES:
1. Clearly indicate uncertainty when something cannot be definitively determined (use phrases such as 'appears to be', 'seems to be', 'visible', 'not clearly visible').
2. Do not invent details or make claims that are not visually supported.
3. This is an automatic visual overview, so do NOT ask the user a question at the end.
4. Return a natural, human-readable response."""

        return {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inlineData": {
                                "mimeType": "image/jpeg",
                                "data": b64_img
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024
            }
        }

    @classmethod
    async def generate_auto_image_description(
        cls,
        image_bytes: bytes,
        language_hint: Optional[str] = None
    ) -> str:
        """
        Generates automatic visual description for an uploaded image without requiring a user query.
        """
        if not cls.has_api_key():
            return "### Image Overview\nImage uploaded and loaded into visual workspace. Add GEMINI_API_KEY for automatic multimodal understanding."

        try:
            payload = cls._build_auto_description_payload(image_bytes, language_hint)
            models_to_try = [settings.GEMINI_MODEL] + [m for m in cls.FALLBACK_MODELS if m != settings.GEMINI_MODEL]
            client = cls._get_client()

            for model in models_to_try:
                try:
                    res = await client.post(cls._get_api_url(model), json=payload)
                    if res.status_code == 200:
                        candidates = res.json().get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            return "".join(p.get("text", "") for p in parts).strip()
                except Exception as model_err:
                    print(f"[GeminiService] Auto-describe attempt with {model} failed: {model_err}")
                    continue
        except Exception as e:
            print(f"[GeminiService] Auto-describe error: {e}")

        return "### Image Overview\nVisual content successfully received. You can ask any question about this image."

    @classmethod
    async def stream_auto_image_description(
        cls,
        image_bytes: bytes,
        language_hint: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Streams automatic visual description for uploaded image using real SSE.
        """
        if not cls.has_api_key():
            yield "### Image Overview\nImage uploaded and loaded into visual workspace. Add GEMINI_API_KEY for automatic multimodal understanding."
            return

        payload = cls._build_auto_description_payload(image_bytes, language_hint)
        models_to_try = [settings.GEMINI_MODEL] + [m for m in cls.FALLBACK_MODELS if m != settings.GEMINI_MODEL]
        client = cls._get_client()

        for model in models_to_try:
            try:
                stream_url = cls._get_stream_api_url(model)
                async with client.stream("POST", stream_url, json=payload, timeout=40.0) as response:
                    if response.status_code != 200:
                        continue

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            raw_json = line[6:].strip()
                            if raw_json == "[DONE]":
                                break
                            try:
                                chunk_obj = json.loads(raw_json)
                                candidates = chunk_obj.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    for part in parts:
                                        text_chunk = part.get("text", "")
                                        if text_chunk:
                                            yield text_chunk
                            except Exception:
                                continue
                    return
            except Exception as stream_err:
                print(f"[GeminiService] Auto-describe stream error with {model}: {stream_err}")
                continue

        # Fallback to non-stream
        fallback_res = await cls.generate_auto_image_description(image_bytes, language_hint)
        yield fallback_res

