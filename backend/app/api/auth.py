import time
import secrets
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import ApiResponse, UserProfile, UserProfileUpdate
from app.utils.security import get_current_user, get_supabase_client
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication & Profile"])

# In-memory temporary demo OTP store: email -> { otp, expires_at, created_at, full_name, password }
_demo_otps: Dict[str, Dict[str, Any]] = {}

class DemoOtpGenerateRequest(BaseModel):
    email: str
    password: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None

class DemoOtpVerifyRequest(BaseModel):
    email: str
    otp: str

class DemoOtpResponse(BaseModel):
    otp: str
    expires_in_seconds: int
    demo_mode: bool = True
    message: str = "Demo OTP generated successfully."

class DemoVerifyResponse(BaseModel):
    verified: bool
    email: str
    password: Optional[str] = None
    message: str

@router.get("/demo-otp/status", response_model=ApiResponse[Dict[str, bool]])
async def get_demo_otp_status():
    return ApiResponse(data={"demo_otp_mode": settings.DEMO_OTP_MODE})

@router.post("/demo-otp/generate", response_model=ApiResponse[DemoOtpResponse])
async def generate_demo_otp(body: DemoOtpGenerateRequest):
    if not settings.DEMO_OTP_MODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demo OTP mode is disabled. Please use standard Supabase verification."
        )

    clean_email = body.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email address.")

    # 1. Determine effective credentials
    existing_record = _demo_otps.get(clean_email)
    now = time.time()
    effective_password = body.password or (existing_record.get("password") if existing_record else None)
    effective_full_name = body.full_name or (existing_record.get("full_name") if existing_record else clean_email.split("@")[0])

    # 2. Register / Confirm user in Supabase Auth using Admin API so real session can be created
    supabase = get_supabase_client()
    if supabase and effective_password:
        try:
            supabase.auth.admin.create_user({
                "email": clean_email,
                "password": effective_password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": effective_full_name,
                    "phone": body.phone
                }
            })
        except Exception:
            try:
                users_list = supabase.auth.admin.list_users()
                matching = [u for u in users_list if getattr(u, 'email', '').lower() == clean_email]
                if matching:
                    supabase.auth.admin.update_user_by_id(
                        matching[0].id,
                        {"password": effective_password, "email_confirm": True}
                    )
            except Exception:
                pass

    # 3. If an unexpired active OTP challenge already exists and no new password was supplied, reuse it
    if existing_record and existing_record.get("expires_at", 0) > now and not body.password:
        remaining_seconds = int(existing_record["expires_at"] - now)
        return ApiResponse(
            data=DemoOtpResponse(
                otp=existing_record["otp"],
                expires_in_seconds=max(remaining_seconds, 10),
                demo_mode=True,
                message="Active demo verification code retrieved."
            )
        )

    # 4. Generate random 6-digit cryptographic code (never hardcoded 123456)
    random_otp = str(secrets.randbelow(900000) + 100000)
    expires_at = now + 300  # 5 minutes expiration

    _demo_otps[clean_email] = {
        "otp": random_otp,
        "expires_at": expires_at,
        "created_at": now,
        "full_name": effective_full_name,
        "password": effective_password
    }

    return ApiResponse(
        data=DemoOtpResponse(
            otp=random_otp,
            expires_in_seconds=300,
            demo_mode=True,
            message="Your demo verification code has been generated."
        )
    )

@router.post("/demo-otp/verify", response_model=ApiResponse[DemoVerifyResponse])
async def verify_demo_otp(body: DemoOtpVerifyRequest):
    if not settings.DEMO_OTP_MODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demo OTP mode is disabled. Use Supabase verification."
        )

    clean_email = body.email.strip().lower()
    entered_otp = body.otp.strip()

    record = _demo_otps.get(clean_email)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active demo verification code found for this email. Please request a new code."
        )

    # Check expiration (5 minutes)
    if time.time() > record["expires_at"]:
        _demo_otps.pop(clean_email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code expired. Generate a new Demo OTP."
        )

    # Check OTP correctness
    if entered_otp != record["otp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    # Success: retrieve saved password for client session establishment
    stored_password = record.get("password")
    full_name = record.get("full_name") or clean_email.split("@")[0]
    _demo_otps.pop(clean_email, None)

    # Sync profile to Supabase database if available
    supabase = get_supabase_client()
    if supabase:
        try:
            users_list = supabase.auth.admin.list_users()
            matching = [u for u in users_list if getattr(u, 'email', '').lower() == clean_email]
            if matching:
                user_id = matching[0].id
                supabase.table("profiles").upsert({
                    "id": user_id,
                    "full_name": full_name,
                    "updated_at": "NOW()"
                }).execute()
        except Exception:
            pass

    return ApiResponse(
        data=DemoVerifyResponse(
            verified=True,
            email=clean_email,
            password=stored_password,
            message="Demo verification completed successfully."
        )
    )

@router.post("/demo-otp/resend", response_model=ApiResponse[DemoOtpResponse])
async def resend_demo_otp(body: DemoOtpGenerateRequest):
    clean_email = body.email.strip().lower()
    existing_record = _demo_otps.get(clean_email, {})
    effective_password = body.password or existing_record.get("password")
    effective_full_name = body.full_name or existing_record.get("full_name") or clean_email.split("@")[0]

    random_otp = str(secrets.randbelow(900000) + 100000)
    now = time.time()
    expires_at = now + 300

    _demo_otps[clean_email] = {
        "otp": random_otp,
        "expires_at": expires_at,
        "created_at": now,
        "full_name": effective_full_name,
        "password": effective_password
    }

    return ApiResponse(
        data=DemoOtpResponse(
            otp=random_otp,
            expires_in_seconds=300,
            demo_mode=True,
            message="A new demo verification code has been generated."
        )
    )

@router.get("/me", response_model=ApiResponse[UserProfile])
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    supabase = get_supabase_client()
    
    if supabase:
        try:
            res = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
            if res.data:
                p = res.data
                return ApiResponse(
                    data=UserProfile(
                        id=p["id"],
                        email=current_user.get("email"),
                        full_name=p.get("full_name") or current_user.get("full_name"),
                        avatar_url=p.get("avatar_url") or current_user.get("avatar_url"),
                        created_at=p.get("created_at")
                    )
                )
        except Exception:
            pass
            
    return ApiResponse(
        data=UserProfile(
            id=user_id,
            email=current_user.get("email", "user@visionai.io"),
            full_name=current_user.get("full_name", "VisionAI User"),
            avatar_url=current_user.get("avatar_url")
        )
    )

@router.put("/profile", response_model=ApiResponse[UserProfile])
async def update_my_profile(
    body: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    supabase = get_supabase_client()
    
    updates = {}
    if body.full_name is not None:
        updates["full_name"] = body.full_name
    if body.avatar_url is not None:
        updates["avatar_url"] = body.avatar_url
        
    if supabase and updates:
        try:
            supabase.table("profiles").update(updates).eq("id", user_id).execute()
        except Exception as e:
            print(f"[AuthRouter] Profile update error: {e}")
            
    return ApiResponse(
        data=UserProfile(
            id=user_id,
            email=current_user.get("email"),
            full_name=body.full_name or current_user.get("full_name"),
            avatar_url=body.avatar_url or current_user.get("avatar_url")
        )
    )
