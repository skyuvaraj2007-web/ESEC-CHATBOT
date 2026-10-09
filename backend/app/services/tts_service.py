import re
import hashlib
import asyncio
import logging
from typing import Optional, Tuple, Dict, List
import edge_tts

logger = logging.getLogger("visionai.tts")

# Verified Neural Voice Mappings
VOICE_MAP: Dict[str, Dict[str, str]] = {
    "en": {
        "female": "en-IN-NeerjaNeural",
        "male": "en-IN-PrabhatNeural",
        "name": "English (India / Global)"
    },
    "en-us": {
        "female": "en-US-AvaNeural",
        "male": "en-US-AndrewNeural",
        "name": "English (US)"
    },
    "ta": {
        "female": "ta-IN-PallaviNeural",
        "male": "ta-IN-ValluvarNeural",
        "name": "Tamil (தமிழ்)"
    },
    "tanglish": {
        "female": "ta-IN-PallaviNeural",
        "male": "en-IN-PrabhatNeural",
        "name": "Tanglish (Tamil-English)"
    },
    "ml": {
        "female": "ml-IN-SobhanaNeural",
        "male": "ml-IN-MidhunNeural",
        "name": "Malayalam (മലയാളം)"
    },
    "hi": {
        "female": "hi-IN-SwaraNeural",
        "male": "hi-IN-MadhurNeural",
        "name": "Hindi (हिन्दी)"
    },
}

# In-memory bounded cache with TTL / Size limit
AUDIO_CACHE: Dict[str, bytes] = {}
MAX_CACHE_SIZE = 120

def detect_script_language(text: str) -> str:
    """
    Detects language based on Unicode character distribution.
    Supports Tamil, Malayalam, Hindi (Devanagari), and Latin (English/Tanglish).
    """
    if not text:
        return "en"

    tamil_chars = len(re.findall(r'[\u0B80-\u0BFF]', text))
    malayalam_chars = len(re.findall(r'[\u0D00-\u0D7F]', text))
    hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
    
    total_indic = tamil_chars + malayalam_chars + hindi_chars
    if total_indic > 0:
        if tamil_chars >= malayalam_chars and tamil_chars >= hindi_chars:
            return "ta"
        elif malayalam_chars >= tamil_chars and malayalam_chars >= hindi_chars:
            return "ml"
        elif hindi_chars > 0:
            return "hi"

    # Check for common Tanglish markers if Latin text
    lower_text = text.lower()
    tanglish_markers = ["irukku", "enna", "indha", "idhu", "kooda", "pannu", "theriyum", "romba", "nalla", "solunga"]
    if any(re.search(r'\b' + re.escape(w) + r'\b', lower_text) for w in tanglish_markers):
        return "tanglish"

    return "en"

def clean_text_for_speech(text: str) -> str:
    """
    Preprocesses Markdown assistant response text for realistic speech synthesis:
    - Removes code blocks, URLs, markdown headers, and formatting symbols.
    - Preserves sentence structure and pauses.
    """
    if not text:
        return ""

    # Remove triple backtick code blocks
    cleaned = re.sub(r'```[\s\S]*?```', ' [code omitted] ', text)
    # Remove inline code backticks
    cleaned = re.sub(r'`([^`]+)`', r'\1', cleaned)
    # Remove markdown links [text](url) -> text
    cleaned = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned)
    # Remove image markdown ![alt](url)
    cleaned = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', '', cleaned)
    # Remove bold/italic asterisks & underscores
    cleaned = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', cleaned)
    cleaned = re.sub(r'_{1,3}([^_]+)_{1,3}', r'\1', cleaned)
    # Remove markdown headers #, ##, ###
    cleaned = re.sub(r'^\s*#{1,6}\s*', '', cleaned, flags=re.MULTILINE)
    # Remove blockquotes >
    cleaned = re.sub(r'^\s*>\s*', '', cleaned, flags=re.MULTILINE)
    # Remove bullet markers -, *, 1.
    cleaned = re.sub(r'^\s*[-*•]\s+', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'^\s*\d+\.\s+', '', cleaned, flags=re.MULTILINE)
    # Normalize multiple whitespace and line breaks
    cleaned = re.sub(r'\n+', '. ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    return cleaned.strip()

def chunk_text(text: str, max_chars: int = 400) -> List[str]:
    """
    Splits long responses into natural sentence chunks to prevent timeouts and preserve prosody.
    """
    if len(text) <= max_chars:
        return [text]

    # Split on sentence terminators
    sentences = re.split(r'([.!?।|]+[\s$])', text)
    chunks = []
    current_chunk = ""

    for i in range(0, len(sentences), 2):
        sentence = sentences[i]
        punct = sentences[i + 1] if i + 1 < len(sentences) else ""
        full_sentence = (sentence + punct).strip()
        if not full_sentence:
            continue

        if len(current_chunk) + len(full_sentence) + 1 <= max_chars:
            current_chunk = (current_chunk + " " + full_sentence).strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = full_sentence

    if current_chunk:
        chunks.append(current_chunk)

    return chunks if chunks else [text]

class TTSService:
    """
    Enterprise Neural Text-to-Speech Engine for VISIONAI.
    Supports English, Tamil, Malayalam, and Hindi with natural pacing.
    """

    @staticmethod
    def resolve_voice(language: Optional[str] = "auto", gender: str = "female") -> Tuple[str, str]:
        """
        Resolves the appropriate neural voice ID and canonical language code.
        """
        lang_key = (language or "auto").lower().strip()
        
        if lang_key in ["tamil", "ta", "ta-in"]:
            canonical_lang = "ta"
        elif lang_key in ["malayalam", "ml", "ml-in"]:
            canonical_lang = "ml"
        elif lang_key in ["hindi", "hi", "hi-in"]:
            canonical_lang = "hi"
        elif lang_key in ["tanglish", "ta-latn"]:
            canonical_lang = "tanglish"
        elif lang_key in ["en", "english", "en-in", "en-us"]:
            canonical_lang = "en"
        else:
            canonical_lang = "auto"

        voice_entry = VOICE_MAP.get(canonical_lang, VOICE_MAP["en"])
        voice_id = voice_entry.get(gender, voice_entry["female"])
        return canonical_lang, voice_id

    @classmethod
    async def synthesize_speech(
        cls,
        text: str,
        language: Optional[str] = "auto",
        gender: str = "female",
        rate: str = "+0%",
        pitch: str = "+0Hz"
    ) -> Tuple[bytes, str, str]:
        """
        Synthesizes text into high-definition neural MP3 audio.
        Returns (audio_bytes, detected_language, voice_id).
        """
        cleaned_text = clean_text_for_speech(text)
        if not cleaned_text:
            raise ValueError("Input text is empty after preprocessing.")

        # Determine language if auto
        canonical_lang, voice_id = cls.resolve_voice(language, gender)
        if canonical_lang == "auto":
            detected = detect_script_language(cleaned_text)
            canonical_lang, voice_id = cls.resolve_voice(detected, gender)

        # Cache key based on cleaned text and voice settings
        cache_key = hashlib.sha256(f"{voice_id}_{rate}_{pitch}_{cleaned_text}".encode("utf-8")).hexdigest()
        if cache_key in AUDIO_CACHE:
            logger.info(f"[TTS Cache Hit] Key: {cache_key[:8]}, Lang: {canonical_lang}")
            return AUDIO_CACHE[cache_key], canonical_lang, voice_id

        # Chunk if text is very long
        chunks = chunk_text(cleaned_text, max_chars=500)
        audio_chunks = []

        for chunk in chunks:
            last_err = None
            chunk_bytes = b""
            for attempt in range(2):
                try:
                    communicate = edge_tts.Communicate(chunk, voice_id, rate=rate, pitch=pitch)
                    chunk_bytes = b""
                    async for data in communicate.stream():
                        if data["type"] == "audio":
                            chunk_bytes += data["data"]
                    if chunk_bytes:
                        break
                except Exception as stream_err:
                    last_err = stream_err
                    await asyncio.sleep(0.3)
            
            if not chunk_bytes:
                if last_err:
                    logger.warning(f"[TTS Stream Error] voice={voice_id}, err={last_err}")
                    raise RuntimeError(f"Voice generation service error: {last_err}")
                raise RuntimeError(f"Failed to generate neural audio for voice {voice_id}.")
            audio_chunks.append(chunk_bytes)

        full_audio = b"".join(audio_chunks)

        # Store in cache with bounded size
        if len(AUDIO_CACHE) >= MAX_CACHE_SIZE:
            # Remove oldest key
            oldest_key = next(iter(AUDIO_CACHE))
            AUDIO_CACHE.pop(oldest_key, None)

        AUDIO_CACHE[cache_key] = full_audio
        logger.info(f"[TTS Synthesized] Voice: {voice_id}, Lang: {canonical_lang}, Size: {len(full_audio)} bytes")
        return full_audio, canonical_lang, voice_id
