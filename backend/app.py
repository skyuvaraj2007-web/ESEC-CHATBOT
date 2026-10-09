import os
import sys
from pathlib import Path
import uvicorn

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.config import settings

if __name__ == "__main__":
    host = os.getenv("BACKEND_HOST", settings.HOST or "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("BACKEND_PORT", str(settings.PORT or 8000))))
    is_reload = os.getenv("RELOAD", "false").lower() == "true" or settings.DEBUG
    
    print(f"[*] Starting VISIONAI Backend Server on http://{host}:{port}")
    print(f"[*] Interactive API Docs (Swagger): http://localhost:{port}/docs")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=is_reload
    )
