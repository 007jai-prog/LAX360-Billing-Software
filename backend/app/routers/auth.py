import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import get_database
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.dependencies.auth import get_current_user
from app.models.schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    RefreshTokenRequest, ForgotPasswordRequest
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register_user(payload: UserRegisterRequest):
    db = get_database()
    
    # Check if user already exists
    existing_user = db.users.find_one({"email": payload.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    now = datetime.now(timezone.utc).isoformat()
    tenant_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    # 1. Create Tenant
    tenant_doc = {
        "id": tenant_id,
        "name": payload.business_name,
        "business_category": payload.business_category.lower(),
        "owner_id": user_id,
        "email": payload.email.lower(),
        "phone": payload.phone,
        "is_setup_completed": False,
        "currency": "INR",
        "invoice_prefix": "INV",
        "state": "Delhi",
        "created_at": now,
        "updated_at": now,
        "subscription": {
            "plan": "Trial",
            "status": "ACTIVE",
            "expires_at": "2027-12-31"
        }
    }
    db.tenants.insert_one(tenant_doc)

    # 2. Create Primary Branch
    db.branches.insert_one({
        "id": "HQ",
        "tenant_id": tenant_id,
        "name": "Main Branch / Headquarter",
        "code": "HQ",
        "is_main": True,
        "created_at": now
    })

    # 3. Create Business Owner User
    hashed_pwd = get_password_hash(payload.password)
    user_doc = {
        "id": user_id,
        "tenant_id": tenant_id,
        "email": payload.email.lower(),
        "full_name": payload.full_name,
        "phone": payload.phone,
        "hashed_password": hashed_pwd,
        "role": "business_owner",
        "branch_ids": ["HQ"],
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    db.users.insert_one(user_doc)

    # Generate JWT
    access_token = create_access_token(subject=user_id, tenant_id=tenant_id, role="business_owner")
    refresh_token = create_refresh_token(subject=user_id, tenant_id=tenant_id)

    user_doc.pop("_id", None)
    user_doc.pop("hashed_password", None)
    tenant_doc.pop("_id", None)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_doc,
        "tenant": tenant_doc
    }

@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLoginRequest):
    db = get_database()
    user = db.users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(payload.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated"
        )

    user_id = user.get("id")
    tenant_id = user.get("tenant_id")
    role = user.get("role", "employee")

    access_token = create_access_token(subject=user_id, tenant_id=tenant_id, role=role)
    refresh_token = create_refresh_token(subject=user_id, tenant_id=tenant_id)

    tenant_doc = None
    if tenant_id:
        tenant_doc = db.tenants.find_one({"id": tenant_id})
        if tenant_doc:
            tenant_doc.pop("_id", None)

    user.pop("_id", None)
    user.pop("hashed_password", None)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user,
        "tenant": tenant_doc
    }

@router.get("/me")
def get_authenticated_user_profile(current_user: dict = Depends(get_current_user)):
    db = get_database()
    tenant_id = current_user.get("tenant_id")
    tenant_doc = None
    if tenant_id:
        tenant_doc = db.tenants.find_one({"id": tenant_id})
        if tenant_doc:
            tenant_doc.pop("_id", None)

    global_settings = db.platform_settings.find_one({"id": "global_config"}) or {}
    global_theme_sub = global_settings.get("theme", {}) or {}
    global_theme = {
        "mode": global_theme_sub.get("mode") or global_settings.get("default_theme_mode", "light"),
        "preset": global_theme_sub.get("preset") or global_settings.get("default_accent_color", "modern-indigo"),
        "density": global_theme_sub.get("density") or global_settings.get("default_font_scaling", "comfortable"),
        "radius": global_theme_sub.get("radius") or global_settings.get("default_radius", "rounded-xl"),
        "theme": global_theme_sub
    }

    return {
        "user": current_user,
        "tenant": tenant_doc,
        "global_theme": global_theme
    }

@router.post("/refresh")
def refresh_access_token(payload: RefreshTokenRequest):
    token_data = decode_token(payload.refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = token_data.get("sub")
    tenant_id = token_data.get("tenant_id")

    db = get_database()
    user = db.users.find_one({"id": user_id})
    if not user or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active"
        )

    role = user.get("role", "employee")
    new_access_token = create_access_token(subject=user_id, tenant_id=tenant_id, role=role)
    new_refresh_token = create_refresh_token(subject=user_id, tenant_id=tenant_id)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    # In a production setup, dispatch reset email link
    db = get_database()
    user = db.users.find_one({"email": payload.email.lower()})
    return {
        "message": "If an account matches this email, password reset instructions have been dispatched.",
        "success": bool(user)
    }

@router.post("/logout")
def logout_user(current_user: dict = Depends(get_current_user)):
    return {"message": "Successfully logged out of session"}

@router.get("/theme")
def get_global_theme_settings():
    """Public endpoint to fetch current global default theme set by admin."""
    db = get_database()
    record = db.platform_settings.find_one({"id": "global_config"})
    if not record:
        return {
            "mode": "light",
            "preset": "modern-indigo",
            "density": "comfortable",
            "radius": "rounded-xl",
            "theme": {}
        }
    theme_sub = record.get("theme", {}) or {}
    return {
        "mode": theme_sub.get("mode") or record.get("default_theme_mode", "light"),
        "preset": theme_sub.get("preset") or record.get("default_accent_color", "modern-indigo"),
        "density": theme_sub.get("density") or record.get("default_font_scaling", "comfortable"),
        "radius": theme_sub.get("radius") or record.get("default_radius", "rounded-xl"),
        "theme": theme_sub
    }

@router.put("/preferences")
def update_user_preferences(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """Allows any individual user to independently customize and save their appearance theme without affecting other users or global theme."""
    db = get_database()
    user_id = current_user["id"]
    
    user_doc = db.users.find_one({"id": user_id}) or {}
    current_prefs = user_doc.get("preferences", {})
    
    # Merge theme preferences
    theme_prefs = payload.get("theme", payload)
    current_prefs["theme"] = theme_prefs
    now = datetime.now(timezone.utc).isoformat()
    
    db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "preferences": current_prefs,
                "updated_at": now
            }
        }
    )
    
    updated_user = db.users.find_one({"id": user_id})
    updated_user.pop("_id", None)
    updated_user.pop("hashed_password", None)
    
    return {
        "message": "Personal appearance preferences saved successfully",
        "preferences": current_prefs,
        "user": updated_user
    }
