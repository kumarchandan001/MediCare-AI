import logging
from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import os
import shutil
from datetime import datetime
from fastapi.responses import JSONResponse

from core.database import get_db
from core.config import settings
from core.deps import get_current_user
from core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
)
from shared.response import success_response, error_response
from features.auth import service
from features.auth.models import User
from features.auth.schemas import (
    SignupRequest,
    LoginRequest,
    VerifyOTPRequest,
    ResendOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    RefreshTokenRequest,
)
from services.email_service import send_otp_email, send_reset_success_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _get_ua(request: Request) -> str:
    return request.headers.get("User-Agent", "")[:500]


# ── POST /auth/signup ─────────────────────
@router.post("/signup", status_code=201)
async def signup(
    data: SignupRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account."""
    # Check if email exists
    existing = await service.get_user_by_email(db, data.email)
    if existing and existing.email_verified:
        return error_response(
            message="Email already registered. Please login.",
            error_type="EMAIL_EXISTS",
            status_code=409,
        )

    # Create user (or reuse unverified)
    if not existing:
        try:
            user = await service.create_user(db, data)
        except Exception as e:
            if "unique" in str(e).lower():
                return error_response(
                    message="Username already taken.",
                    error_type="USERNAME_EXISTS",
                    status_code=409,
                )
            raise
    else:
        user = existing

    # Send OTP
    otp, err = await service.create_otp(
        db=db,
        email=data.email,
        purpose="signup",
        user_id=user.id,
        ip_address=_get_ip(request),
        user_agent=_get_ua(request),
    )
    if err:
        return error_response(err, status_code=429)

    sent = await send_otp_email(
        data.email, otp, "signup", settings.OTP_EXPIRE_MINUTES
    )
    if not sent:
        logger.warning(f"OTP email failed for {data.email}")

    cooldown = await service.get_resend_cooldown(db, data.email, "signup")

    return success_response(
        data={
            "email": data.email,
            "purpose": "signup",
            "expires_in_minutes": settings.OTP_EXPIRE_MINUTES,
            "resend_cooldown": cooldown,
        },
        message="Verification OTP sent to your email.",
        status_code=201,
    )


# ── POST /auth/verify-otp ─────────────────
@router.post("/verify-otp")
async def verify_otp_endpoint(
    data: VerifyOTPRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Verify OTP for signup, login, or reset."""
    success, err = await service.verify_otp(
        db, data.email, data.otp, data.purpose
    )
    if not success:
        return error_response(
            err or "Invalid OTP.",
            error_type="INVALID_OTP",
            status_code=400,
        )

    user = await service.get_user_by_email(db, data.email)
    if not user:
        return error_response("User not found.", status_code=404)

    # Signup — mark email verified + login
    if data.purpose == "signup":
        await service.verify_user_email(db, user.id)
        await db.refresh(user)

    # Login — generate tokens
    if data.purpose in ("signup", "login"):
        await service.record_login_attempt(
            db, data.email, True, _get_ip(request)
        )
        await service.unlock_user(db, data.email)

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        await service.store_refresh_token(
            db,
            user_id=user.id,
            refresh_token=refresh_token,
            ip_address=_get_ip(request),
            user_agent=_get_ua(request),
        )

        return success_response(
            data={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MIN * 60,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "gender": user.gender,
                    "height": user.height,
                    "weight": user.weight,
                    "blood_type": user.blood_type,
                    "medical_conditions": user.medical_conditions,
                    "allergies": user.allergies,
                    "email_verified": True,
                    "is_admin": user.is_admin,
                    "created_at": str(user.created_at),
                },
            },
            message="Login successful.",
        )

    # Reset password — return reset token
    if data.purpose == "reset_password":
        plain_token, err = await service.create_reset_token(
            db, user.id, data.email, _get_ip(request)
        )
        if err:
            return error_response(err, status_code=500)
        return success_response(
            data={"reset_token": plain_token},
            message="OTP verified. Set your new password.",
        )


# ── POST /auth/login ──────────────────────
@router.post("/login")
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Login with email + password → sends OTP."""
    ip = _get_ip(request)

    # Check brute force lock
    locked, wait = await service.check_brute_force(db, data.email)
    if locked:
        return error_response(
            f"Account locked for {wait} minutes due to failed attempts.",
            error_type="ACCOUNT_LOCKED",
            status_code=423,
        )

    # Find user
    user = await service.get_user_by_email(db, data.email)
    if not user:
        await service.record_login_attempt(db, data.email, False, ip)
        return error_response(
            "Invalid email or password.",
            error_type="INVALID_CREDENTIALS",
            status_code=401,
        )

    # Check verified
    if not user.email_verified:
        return error_response(
            "Email not verified. Please check your inbox.",
            error_type="EMAIL_NOT_VERIFIED",
            status_code=403,
        )

    # Verify password
    if not verify_password(data.password, user.password_hash):
        await service.record_login_attempt(db, data.email, False, ip)
        locked2, wait2 = await service.check_brute_force(db, data.email)
        if locked2:
            return error_response(
                f"Account locked for {wait2} minutes.",
                error_type="ACCOUNT_LOCKED",
                status_code=423,
            )
        return error_response(
            "Invalid email or password.",
            error_type="INVALID_CREDENTIALS",
            status_code=401,
        )

    # Send login OTP
    otp, err = await service.create_otp(
        db=db,
        email=data.email,
        purpose="login",
        user_id=user.id,
        ip_address=ip,
        user_agent=_get_ua(request),
    )
    if err:
        return error_response(err, status_code=429)

    await send_otp_email(data.email, otp, "login", settings.OTP_EXPIRE_MINUTES)
    cooldown = await service.get_resend_cooldown(db, data.email, "login")

    return success_response(
        data={
            "email": data.email,
            "purpose": "login",
            "expires_in_minutes": settings.OTP_EXPIRE_MINUTES,
            "resend_cooldown": cooldown,
        },
        message="OTP sent to your email.",
    )


# ── POST /auth/login-password ─────────────
@router.post("/login-password")
async def login_password(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Login with email + password directly (no OTP)."""
    ip = _get_ip(request)

    # Check brute force lock
    locked, wait = await service.check_brute_force(db, data.email)
    if locked:
        return error_response(
            f"Account locked for {wait} minutes due to failed attempts.",
            error_type="ACCOUNT_LOCKED",
            status_code=423,
        )

    # Find user
    user = await service.get_user_by_email(db, data.email)
    if not user:
        await service.record_login_attempt(db, data.email, False, ip)
        return error_response(
            "Invalid email or password.",
            error_type="INVALID_CREDENTIALS",
            status_code=401,
        )

    # Check verified
    if not user.email_verified:
        return error_response(
            "Email not verified. Please check your inbox.",
            error_type="EMAIL_NOT_VERIFIED",
            status_code=403,
        )

    # Verify password
    if not verify_password(data.password, user.password_hash):
        await service.record_login_attempt(db, data.email, False, ip)
        locked2, wait2 = await service.check_brute_force(db, data.email)
        if locked2:
            return error_response(
                f"Account locked for {wait2} minutes.",
                error_type="ACCOUNT_LOCKED",
                status_code=423,
            )
        return error_response(
            "Invalid email or password.",
            error_type="INVALID_CREDENTIALS",
            status_code=401,
        )

    # Success — generate tokens directly
    await service.record_login_attempt(db, data.email, True, ip)
    await service.unlock_user(db, data.email)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    await service.store_refresh_token(
        db,
        user_id=user.id,
        refresh_token=refresh_token,
        ip_address=ip,
        user_agent=_get_ua(request),
    )

    return success_response(
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MIN * 60,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "gender": user.gender,
                "height": user.height,
                "weight": user.weight,
                "blood_type": user.blood_type,
                "medical_conditions": user.medical_conditions,
                "allergies": user.allergies,
                "email_verified": True,
                "is_admin": user.is_admin,
                "created_at": str(user.created_at),
            },
        },
        message="Login successful.",
    )


# ── POST /auth/forgot-password ────────────
@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Send password reset OTP."""
    user = await service.get_user_by_email(db, data.email)

    # Always return success (prevent enumeration)
    if user and user.email_verified:
        allowed, _, wait = await service.check_rate_limit(
            db, data.email, "reset_password"
        )
        if allowed:
            otp, err = await service.create_otp(
                db=db,
                email=data.email,
                purpose="reset_password",
                user_id=user.id,
                ip_address=_get_ip(request),
                user_agent=_get_ua(request),
            )
            if otp:
                await send_otp_email(
                    data.email, otp, "reset_password", settings.OTP_EXPIRE_MINUTES
                )

    return success_response(
        data={"email": data.email},
        message="If this email is registered, you will receive an OTP shortly.",
    )


# ── POST /auth/reset-password ─────────────
@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using valid token."""
    record, err = await service.verify_reset_token(db, data.token)
    if err:
        return error_response(
            err, error_type="INVALID_TOKEN", status_code=400
        )

    # Update password
    await service.update_user_password(db, record.user_id, data.password)

    # Consume token
    record.is_used = True
    await db.commit()

    # Unlock account
    user = await service.get_user_by_id(db, record.user_id)
    if user:
        await service.unlock_user(db, user.email)
        await send_reset_success_email(user.email, user.username)

    return success_response(
        data={"success": True},
        message="Password reset successfully. Please login.",
    )


# ── POST /auth/resend-otp ─────────────────
@router.post("/resend-otp")
async def resend_otp(
    data: ResendOTPRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Resend OTP with cooldown check."""
    cooldown = await service.get_resend_cooldown(db, data.email, data.purpose)
    if cooldown > 0:
        return error_response(
            f"Please wait {cooldown} seconds before requesting another OTP.",
            error_type="COOLDOWN_ACTIVE",
            status_code=429,
        )

    user = await service.get_user_by_email(db, data.email)
    otp, err = await service.create_otp(
        db=db,
        email=data.email,
        purpose=data.purpose,
        user_id=user.id if user else None,
        ip_address=_get_ip(request),
        user_agent=_get_ua(request),
    )
    if err:
        return error_response(err, status_code=429)

    await send_otp_email(data.email, otp, data.purpose, settings.OTP_EXPIRE_MINUTES)
    new_cooldown = await service.get_resend_cooldown(
        db, data.email, data.purpose
    )

    return success_response(
        data={"email": data.email, "resend_cooldown": new_cooldown},
        message="OTP resent successfully.",
    )


# ── POST /auth/refresh ────────────────────
@router.post("/refresh")
async def refresh_tokens(
    data: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get new access token using refresh token."""
    user_id = await service.validate_refresh_token(db, data.refresh_token)
    if not user_id:
        return error_response(
            "Invalid or expired refresh token.",
            error_type="INVALID_REFRESH_TOKEN",
            status_code=401,
        )

    # Revoke old, issue new (token rotation)
    await service.revoke_refresh_token(db, data.refresh_token)
    new_access = create_access_token(str(user_id))
    new_refresh = create_refresh_token(str(user_id))
    await service.store_refresh_token(
        db,
        user_id=user_id,
        refresh_token=new_refresh,
        ip_address=_get_ip(request),
        user_agent=_get_ua(request),
    )

    return success_response(
        data={
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MIN * 60,
        },
        message="Tokens refreshed.",
    )


# ── POST /auth/logout ─────────────────────
@router.post("/logout")
async def logout(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Logout and revoke refresh token."""
    await service.revoke_refresh_token(db, data.refresh_token)
    return success_response(
        data={"logged_out": True},
        message="Logged out successfully.",
    )


# ── GET /auth/me ──────────────────────────
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return success_response(
        data={
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "gender": current_user.gender,
            "height": current_user.height,
            "weight": current_user.weight,
            "blood_type": current_user.blood_type,
            "medical_conditions": current_user.medical_conditions,
            "allergies": current_user.allergies,
            "profile_picture_url": current_user.profile_picture_url,
            "email_verified": current_user.email_verified,
            "is_admin": current_user.is_admin,
            "created_at": str(current_user.created_at),
        }
    )

# ── PUT /auth/me ──────────────────────────
from features.auth.schemas import UserProfileUpdate

@router.put("/me")
async def update_me(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return success_response(
        data={
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "gender": current_user.gender,
            "height": current_user.height,
            "weight": current_user.weight,
            "blood_type": current_user.blood_type,
            "medical_conditions": current_user.medical_conditions,
            "allergies": current_user.allergies,
            "profile_picture_url": current_user.profile_picture_url,
            "email_verified": current_user.email_verified,
            "is_admin": current_user.is_admin,
            "created_at": str(current_user.created_at),
        },
        message="Profile updated successfully."
    )


# ── POST /auth/me/avatar ──────────────────
@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload and set profile picture."""
    # Basic validation
    if not file.content_type.startswith("image/"):
        return error_response("File must be an image", status_code=400)
        
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"user_{current_user.id}_{int(datetime.now().timestamp())}.{ext}"
    file_path = os.path.join("uploads", filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save avatar: {e}")
        return error_response("Failed to save image", status_code=500)
        
    # Update user in db
    url_path = f"/uploads/{filename}"
    current_user.profile_picture_url = url_path
    await db.commit()
    await db.refresh(current_user)
    
    return success_response(
        data={"profile_picture_url": url_path},
        message="Profile picture updated successfully."
    )

