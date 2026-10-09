import os
from typing import Optional
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.config import settings

security_bearer = HTTPBearer(auto_error=False)

def get_supabase_client() -> Client:
    if settings.SUPABASE_URL and (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY):
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        return create_client(settings.SUPABASE_URL, key)
    return None

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> dict:
    """
    Validates Supabase JWT from Authorization header and extracts user details.
    Provides seamless local development fallback when using mock/dev tokens.
    """
    dev_user = {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "alex.rivera@visionai.io",
        "full_name": "Alex Rivera",
        "avatar_url": None
    }
    
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    
    token = credentials.credentials
    if token in ("dev", "dev-token", "mock-token", "anonymous", "demo"):
        return dev_user
        
    supabase = get_supabase_client()
    if not supabase:
        return dev_user
    
    try:
        # Verify token using Supabase Auth
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")
        
        user = user_response.user
        meta = user.user_metadata or {}
        return {
            "id": str(user.id),
            "email": user.email,
            "full_name": meta.get("full_name") or user.email,
            "avatar_url": meta.get("avatar_url")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> Optional[dict]:
    """
    Returns user dict if valid token is provided, or None for guest/unauthenticated requests.
    """
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except Exception:
        return None


