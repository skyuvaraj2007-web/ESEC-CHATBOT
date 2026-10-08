import os
import uuid
from typing import Tuple
from pathlib import Path
from app.config import settings
from app.utils.security import get_supabase_client

LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "uploads"
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class StorageService:
    @staticmethod
    def upload_image(
        image_bytes: bytes,
        user_id: str,
        conversation_id: str,
        file_ext: str,
        mime_type: str
    ) -> Tuple[str, str, str]:
        """
        Uploads image to Supabase Storage or local static storage fallback.
        Returns (image_id, storage_path, public_url).
        """
        image_id = str(uuid.uuid4())
        ext = file_ext.lstrip(".")
        file_name = f"{image_id}.{ext}"
        storage_path = f"{user_id}/{conversation_id}/{file_name}"
        
        supabase = get_supabase_client()
        
        if supabase and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                # Upload to Supabase Storage
                bucket = settings.STORAGE_BUCKET
                supabase.storage.from_(bucket).upload(
                    path=storage_path,
                    file=image_bytes,
                    file_options={"content-type": mime_type, "upsert": "true"}
                )
                
                # Get public URL
                public_url_res = supabase.storage.from_(bucket).get_public_url(storage_path)
                public_url = public_url_res if isinstance(public_url_res, str) else public_url_res.get("publicURL", "")
                return image_id, storage_path, public_url
            except Exception as e:
                print(f"[StorageService] Supabase upload failed, falling back to local storage: {e}")
        
        # Local fallback storage
        local_user_dir = LOCAL_UPLOAD_DIR / user_id / conversation_id
        local_user_dir.mkdir(parents=True, exist_ok=True)
        file_dest = local_user_dir / file_name
        
        with open(file_dest, "wb") as f:
            f.write(image_bytes)
            
        public_url = f"http://localhost:{settings.PORT}/static/uploads/{user_id}/{conversation_id}/{file_name}"
        return image_id, storage_path, public_url

    @staticmethod
    def get_image_bytes(storage_path: str) -> bytes:
        local_path = LOCAL_UPLOAD_DIR / storage_path
        if local_path.exists():
            with open(local_path, "rb") as f:
                return f.read()

        supabase = get_supabase_client()
        if supabase and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                bucket = settings.STORAGE_BUCKET
                return supabase.storage.from_(bucket).download(storage_path)
            except Exception as e:
                print(f"[StorageService] Supabase download error: {e}")
                
        raise FileNotFoundError(f"Image not found at path: {storage_path}")

    @staticmethod
    def delete_image(storage_path: str) -> bool:
        supabase = get_supabase_client()
        if supabase and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                bucket = settings.STORAGE_BUCKET
                supabase.storage.from_(bucket).remove([storage_path])
            except Exception:
                pass
        
        local_path = LOCAL_UPLOAD_DIR / storage_path
        if local_path.exists():
            try:
                local_path.unlink()
            except Exception:
                pass
        return True
