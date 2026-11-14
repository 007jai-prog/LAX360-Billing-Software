from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from app.core.security import decode_token
from app.core.database import get_database

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not an access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identity",
            headers={"WWW-Authenticate": "Bearer"},
        )

    db = get_database()
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated"
        )

    # Sanitize document
    user.pop("_id", None)
    user.pop("hashed_password", None)
    return user

def get_current_tenant_user(current_user: dict = Depends(get_current_user)):
    """
    Guarantees tenant isolation: Never trust client-supplied tenant_id!
    Derives tenant_id strictly from validated user session.
    """
    tenant_id = current_user.get("tenant_id")
    if not tenant_id and current_user.get("role") != "saas_super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any active business tenant"
        )
    return current_user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "employee")
        if user_role == "saas_super_admin" or user_role in allowed_roles:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operation not permitted for role '{user_role}'. Required roles: {allowed_roles}"
        )
    return role_checker

def require_saas_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "saas_super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SaaS Platform Super Administrators can access this endpoint"
        )
    return current_user
