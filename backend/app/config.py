import os
from pathlib import Path
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    # Deterministically load from backend/.env then root .env with override
    backend_env = Path(__file__).resolve().parent.parent / ".env"
    root_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=True)
    if backend_env.exists():
        load_dotenv(backend_env, override=True)
    load_dotenv(override=True)
except ImportError:
    pass

class Settings(BaseModel):
    # App config
    APP_NAME: str = "VISIONAI API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Server config
    HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))
    STORAGE_BUCKET: str = "vision-images"
    
    # Gemini Multimodal AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", os.getenv("GEMINI_KEY", ""))).strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite").strip()
    
    # Vision Pipeline Flags
    ENABLE_YOLO: bool = os.getenv("ENABLE_YOLO", "true").lower() == "true"
    YOLO_MODEL: str = os.getenv("YOLO_MODEL", "yolov8n.pt")
    ENABLE_OCR: bool = os.getenv("ENABLE_OCR", "true").lower() == "true"
    
    # Demo OTP Mode Flag for Hackathon / Demonstration
    DEMO_OTP_MODE: bool = os.getenv("DEMO_OTP_MODE", "true").lower() == "true"
    
    # Image constraints
    MAX_IMAGE_SIZE_MB: int = 15
    ALLOWED_MIME_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp", "image/gif"]

settings = Settings()

# Safe initialization status (Never print the actual key)
if bool(settings.GEMINI_API_KEY):
    print(f"[*] Gemini API Key: LOADED (Model: {settings.GEMINI_MODEL})")
else:
    print("[!] Gemini API Key: NOT LOADED")


