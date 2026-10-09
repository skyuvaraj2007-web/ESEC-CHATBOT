import os
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.api import auth, conversations, images, chat, compare, insights, tts
from app.services.gemini_service import GeminiService

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Conversational Image Recognition & Visual Intelligence Platform API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
raw_frontend_url = os.getenv("FRONTEND_URL", settings.FRONTEND_URL)
parsed_origins = [
    url.strip().rstrip("/")
    for url in raw_frontend_url.split(",")
    if url.strip()
]
for local_origin in ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "https://localhost", "capacitor://localhost"]:
    if local_origin not in parsed_origins:
        parsed_origins.append(local_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parsed_origins if not settings.DEBUG else ["*"],
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$" if not settings.DEBUG else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Safe request telemetry middleware (No sensitive data or tokens logged)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time
    start_time = time.time()
    response = await call_next(request)
    duration = (time.time() - start_time) * 1000
    # Safe log: method, path, status, duration
    if request.url.path not in ["/health", "/docs", "/openapi.json"]:
        print(f"[HTTP] {request.method} {request.url.path} -> {response.status_code} ({duration:.1f}ms)")
    return response

# Mount local uploads directory
uploads_dir = Path(__file__).resolve().parent.parent / "static" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Include API Routers
app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(images.router)
app.include_router(chat.router)
app.include_router(compare.router)
app.include_router(insights.router)
app.include_router(tts.router)

# Global Exception Handlers for standard response schema
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters",
                "details": exc.errors()
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    print(f"[Unhandled Error] {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again."
            }
        }
    )

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint returning system status and services state.
    """
    from app.services.yolo_service import _yolo_model
    yolo_loaded = _yolo_model is not None if settings.ENABLE_YOLO else False
    
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": "development" if settings.DEBUG else "production",
        "services": {
            "gemini_vlm": bool(settings.GEMINI_API_KEY),
            "yolo_detection": yolo_loaded or settings.ENABLE_YOLO,
            "ocr_enabled": settings.ENABLE_OCR,
            "supabase_connected": bool(settings.SUPABASE_URL)
        }
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
