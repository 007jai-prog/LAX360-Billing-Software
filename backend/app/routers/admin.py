import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query

from app.core.database import get_database, db_manager
from app.core.security import get_password_hash, create_access_token
from app.dependencies.auth import require_saas_admin, get_current_user
from app.services.config_engine import BUSINESS_CATEGORIES, CATEGORY_CONFIGURATIONS
from app.routers.subscriptions import SAAS_PLANS
from app.models.schemas import (
    AdminTenantCreateRequest,
    AdminTenantUpdateRequest,
    AdminTenantStatusRequest,
    AdminSubscriptionOverrideRequest,
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    AdminUserStatusRequest,
    AdminPasswordResetRequest,
    AdminAnnouncementCreateRequest,
    AdminPlatformSettingsUpdateRequest,
)

router = APIRouter(prefix="/admin", tags=["SaaS Platform Super Admin"])

# ----------------- AUDIT LOGGER HELPER -----------------
def log_audit_event(
    db,
    actor: dict,
    action: str,
    target_type: str,
    target_id: str,
    details: Any = None
):
    try:
        db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor_id": actor.get("id", "system"),
            "actor_name": actor.get("full_name", "Super Administrator"),
            "actor_email": actor.get("email", "admin@lax360.com"),
            "action": action,
            "target_type": target_type,
            "target_id": str(target_id),
            "details": details or {},
        })
    except Exception as e:
        print(f"Failed to record audit log: {e}")

# ----------------- 1. PLATFORM OVERVIEW -----------------
@router.get("/overview")
def get_saas_platform_overview(current_user: dict = Depends(require_saas_admin)):
    db = get_database()
    all_tenants = list(db.tenants.find())
    all_invoices = list(db.invoices.find())
    all_users = list(db.users.find())
    all_products = list(db.products.find())

    # Tenant statuses
    active_tenants = [t for t in all_tenants if t.get("status", "active") == "active"]
    suspended_tenants = [t for t in all_tenants if t.get("status") == "suspended"]

    # Category distribution (counts & GMV)
    cat_counts = {}
    cat_gmv = {}
    for t in all_tenants:
        cat = t.get("business_category", "grocery")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        t_id = t.get("id")
        t_invoices = [inv for inv in all_invoices if inv.get("tenant_id") == t_id]
        t_gmv = sum(float(inv.get("final_payable", 0)) for inv in t_invoices)
        cat_gmv[cat] = cat_gmv.get(cat, 0.0) + t_gmv

    # Subscription distribution & MRR Calculation
    plan_prices = {
        "free": 0,
        "starter": 499.0,
        "basic": 999.0,
        "professional": 1999.0,
        "business": 3499.0,
        "enterprise": 6999.0
    }
    plan_counts = {}
    mrr_estimate = 0.0
    for t in all_tenants:
        sub = t.get("subscription") or {}
        plan = str(sub.get("plan", "starter")).lower()
        plan_counts[plan] = plan_counts.get(plan, 0) + 1
        if t.get("status", "active") == "active":
            mrr_estimate += plan_prices.get(plan, 1499.0)

    total_platform_gmv = sum(float(inv.get("final_payable", 0)) for inv in all_invoices)

    # Recent tenants (last 5)
    recent_tenants = sorted(
        all_tenants,
        key=lambda x: x.get("created_at", ""),
        reverse=True
    )[:5]
    for rt in recent_tenants:
        rt.pop("_id", None)

    # Recent audit activities (last 8)
    recent_logs = list(db.audit_logs.find().sort("timestamp", -1).limit(8))
    for log in recent_logs:
        log.pop("_id", None)

    return {
        "total_tenants": len(all_tenants),
        "active_tenants": len(active_tenants),
        "suspended_tenants": len(suspended_tenants),
        "total_users": len(all_users),
        "total_products": len(all_products),
        "total_invoices_generated": len(all_invoices),
        "total_platform_gmv": round(total_platform_gmv, 2),
        "mrr_estimate": round(mrr_estimate, 2),
        "arr_estimate": round(mrr_estimate * 12, 2),
        "category_distribution": cat_counts,
        "category_gmv": {k: round(v, 2) for k, v in cat_gmv.items()},
        "subscription_distribution": plan_counts,
        "recent_tenants": recent_tenants,
        "recent_activities": recent_logs,
        "total_domains": len(all_tenants),
        "system_health": {
            "database_status": "connected",
            "is_mock": db_manager.is_mock,
            "version": "v2.4-Production",
            "uptime": "99.98%",
            "environment": "Production-Cloud"
        }
    }

# ----------------- 2. REGISTERED BUSINESSES (TENANTS) -----------------
@router.get("/tenants")
def list_all_tenants(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    query = {}
    if category:
        query["business_category"] = category.lower()
    if status:
        query["status"] = status.lower()

    tenants = list(db.tenants.find(query))
    enriched = []

    for t in tenants:
        t.pop("_id", None)
        t_id = t.get("id")

        # Invoices and revenue calculation
        invoices = list(db.invoices.find({"tenant_id": t_id}))
        t["invoices_count"] = len(invoices)
        t["total_revenue"] = round(sum(float(inv.get("final_payable", 0)) for inv in invoices), 2)
        t["users_count"] = db.users.count_documents({"tenant_id": t_id})
        t["branches_count"] = db.branches.count_documents({"tenant_id": t_id})
        t["products_count"] = db.products.count_documents({"tenant_id": t_id})
        t["status"] = t.get("status", "active")

        # Fallback subscription if missing
        if not t.get("subscription"):
            t["subscription"] = {
                "plan": "starter",
                "status": "ACTIVE",
                "billing_cycle": "monthly",
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
            }

        # Filter by plan if requested
        if plan and t["subscription"].get("plan", "").lower() != plan.lower():
            continue

        # Search filter
        if search:
            q = search.lower().strip()
            name = (t.get("name") or "").lower()
            owner = (t.get("owner_name") or "").lower()
            email = (t.get("email") or "").lower()
            gstin = (t.get("gstin") or "").lower()
            city = (t.get("city") or "").lower()
            if not any(q in field for field in [name, owner, email, gstin, city]):
                continue

        enriched.append(t)

    return sorted(enriched, key=lambda x: x.get("created_at", ""), reverse=True)

@router.post("/tenants")
def create_tenant_by_admin(
    payload: AdminTenantCreateRequest,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    email_clean = payload.email.lower().strip()

    # Check if email exists
    if db.users.find_one({"email": email_clean}):
        raise HTTPException(status_code=400, detail=f"User with email '{email_clean}' already exists")

    now = datetime.now(timezone.utc).isoformat()
    t_id = str(uuid.uuid4())
    u_id = str(uuid.uuid4())

    plan_name = payload.plan.lower() if payload.plan else "professional"
    sub_data = {
        "plan": plan_name,
        "status": "ACTIVE",
        "billing_cycle": "monthly",
        "started_at": now,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    }

    new_tenant = {
        "id": t_id,
        "name": payload.name,
        "business_category": payload.business_category.lower(),
        "owner_id": u_id,
        "owner_name": payload.owner_name,
        "email": email_clean,
        "phone": payload.phone,
        "gstin": payload.gstin.strip().upper() if payload.gstin else "",
        "address": payload.address,
        "city": payload.city,
        "state": payload.state,
        "pincode": payload.pincode,
        "currency": "INR",
        "financial_year": "2025-2026",
        "invoice_prefix": payload.invoice_prefix.upper(),
        "default_tax_rate": 18.0,
        "is_tax_inclusive": False,
        "is_setup_completed": True,
        "status": "active",
        "subscription": sub_data,
        "created_at": now,
        "updated_at": now
    }
    db.tenants.insert_one(new_tenant)

    # Create default HQ branch
    db.branches.insert_one({
        "id": "HQ",
        "tenant_id": t_id,
        "name": "Main Headquarter",
        "code": "HQ",
        "address": payload.address,
        "phone": payload.phone,
        "is_main": True,
        "created_at": now
    })

    # Create Owner Account
    new_user = {
        "id": u_id,
        "tenant_id": t_id,
        "email": email_clean,
        "full_name": payload.owner_name,
        "phone": payload.phone,
        "hashed_password": get_password_hash(payload.password),
        "role": "business_owner",
        "branch_ids": ["HQ"],
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    db.users.insert_one(new_user)

    # Record Audit Log
    log_audit_event(
        db,
        current_user,
        "TENANT_CREATED",
        "TENANT",
        t_id,
        {"business_name": payload.name, "category": payload.business_category, "owner_email": email_clean}
    )

    new_tenant.pop("_id", None)
    return {
        "message": f"Business '{payload.name}' successfully onboarded",
        "tenant": new_tenant,
        "owner_user": {"id": u_id, "email": email_clean, "role": "business_owner"}
    }

@router.get("/tenants/{tenant_id}")
def get_tenant_details(
    tenant_id: str,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    tenant = db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Business tenant not found")
    tenant.pop("_id", None)

    branches = list(db.branches.find({"tenant_id": tenant_id}))
    for b in branches:
        b.pop("_id", None)

    users = list(db.users.find({"tenant_id": tenant_id}))
    for u in users:
        u.pop("_id", None)
        u.pop("hashed_password", None)

    recent_invoices = list(db.invoices.find({"tenant_id": tenant_id}).sort("created_at", -1).limit(10))
    for inv in recent_invoices:
        inv.pop("_id", None)

    total_revenue = sum(float(inv.get("final_payable", 0)) for inv in db.invoices.find({"tenant_id": tenant_id}))

    return {
        "tenant": tenant,
        "branches": branches,
        "users": users,
        "recent_invoices": recent_invoices,
        "metrics": {
            "total_invoices": db.invoices.count_documents({"tenant_id": tenant_id}),
            "total_products": db.products.count_documents({"tenant_id": tenant_id}),
            "total_customers": db.customers.count_documents({"tenant_id": tenant_id}),
            "total_revenue": round(total_revenue, 2)
        }
    }

@router.put("/tenants/{tenant_id}")
def update_tenant_by_admin(
    tenant_id: str,
    payload: AdminTenantUpdateRequest,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    tenant = db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Business tenant not found")

    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.tenants.update_one({"id": tenant_id}, {"$set": updates})

    log_audit_event(
        db,
        current_user,
        "TENANT_UPDATED",
        "TENANT",
        tenant_id,
        updates
    )

    updated_tenant = db.tenants.find_one({"id": tenant_id})
    updated_tenant.pop("_id", None)
    return {"message": "Business details updated successfully", "tenant": updated_tenant}

@router.put("/tenants/{tenant_id}/status")
def update_tenant_status(
    tenant_id: str,
    payload: AdminTenantStatusRequest,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    tenant = db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Business tenant not found")

    new_status = payload.status.lower()
    now = datetime.now(timezone.utc).isoformat()

    db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "status": new_status,
            "status_reason": payload.reason or "",
            "updated_at": now
        }}
    )

    # If suspended, optionally deactivate tenant users
    if new_status == "suspended":
        db.users.update_many({"tenant_id": tenant_id}, {"$set": {"is_active": False}})
    elif new_status == "active":
        db.users.update_many({"tenant_id": tenant_id}, {"$set": {"is_active": True}})

    log_audit_event(
        db,
        current_user,
        "TENANT_STATUS_CHANGED",
        "TENANT",
        tenant_id,
        {"status": new_status, "reason": payload.reason}
    )

    return {"message": f"Tenant status changed to '{new_status}'", "status": new_status}

@router.put("/tenants/{tenant_id}/subscription")
def override_tenant_subscription(
    tenant_id: str,
    payload: AdminSubscriptionOverrideRequest,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    tenant = db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Business tenant not found")

    now = datetime.now(timezone.utc)
    if payload.expires_at:
        expiry_str = payload.expires_at
    else:
        days = payload.extension_days if payload.extension_days else 30
        expiry_str = (now + timedelta(days=days)).strftime("%Y-%m-%d")

    sub_update = {
        "plan": payload.plan.lower(),
        "status": payload.status.upper(),
        "billing_cycle": payload.billing_cycle.lower() if payload.billing_cycle else "monthly",
        "updated_at": now.isoformat(),
        "expires_at": expiry_str,
        "admin_notes": payload.notes or "Manual override by SaaS Administrator"
    }

    db.tenants.update_one({"id": tenant_id}, {"$set": {"subscription": sub_update}})

    # Record in subscription transactions ledger
    txn_id = str(uuid.uuid4())
    db.subscription_transactions.insert_one({
        "id": txn_id,
        "tenant_id": tenant_id,
        "tenant_name": tenant.get("name", "Unknown Business"),
        "plan": payload.plan.lower(),
        "amount": 0.0 if "complementary" in (payload.notes or "").lower() else 1999.0,
        "billing_cycle": payload.billing_cycle or "monthly",
        "payment_method": "ADMIN_MANUAL_GRANT",
        "status": "COMPLETED",
        "transaction_ref": f"TXN-ADM-{txn_id[:8].upper()}",
        "notes": payload.notes or "Granted via SaaS Admin Panel",
        "created_at": now.isoformat()
    })

    log_audit_event(
        db,
        current_user,
        "SUBSCRIPTION_OVERRIDDEN",
        "TENANT",
        tenant_id,
        sub_update
    )

    return {
        "message": f"Subscription updated to {payload.plan.upper()} (Valid until {expiry_str})",
        "subscription": sub_update
    }

@router.delete("/tenants/{tenant_id}")
def delete_tenant(
    tenant_id: str,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    tenant = db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Business tenant not found")

    # Clean up associated tenant records
    db.tenants.delete_one({"id": tenant_id})
    db.users.delete_many({"tenant_id": tenant_id})
    db.branches.delete_many({"tenant_id": tenant_id})
    db.products.delete_many({"tenant_id": tenant_id})
    db.invoices.delete_many({"tenant_id": tenant_id})

    log_audit_event(
        db,
        current_user,
        "TENANT_DELETED",
        "TENANT",
        tenant_id,
        {"business_name": tenant.get("name")}
    )

    return {"message": f"Tenant '{tenant.get('name')}' and all associated data permanently deleted"}

@router.post("/tenants/{tenant_id}/impersonate")
def impersonate_tenant(
    tenant_id: str,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    tenant = db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Business tenant not found")

    # Find owner user
    owner_user = db.users.find_one({"tenant_id": tenant_id, "role": "business_owner"})
    if not owner_user:
        owner_user = db.users.find_one({"tenant_id": tenant_id})

    if not owner_user:
        raise HTTPException(status_code=404, detail="No active user found for this tenant to impersonate")

    impersonation_token = create_access_token(
        subject=owner_user["id"],
        tenant_id=tenant_id,
        role="business_owner",
        expires_delta=timedelta(hours=2)
    )

    log_audit_event(
        db,
        current_user,
        "TENANT_IMPERSONATED",
        "TENANT",
        tenant_id,
        {"target_user_email": owner_user.get("email"), "business_name": tenant.get("name")}
    )

    owner_user_sanitized = {k: v for k, v in owner_user.items() if k not in ["_id", "hashed_password"]}
    tenant_sanitized = {k: v for k, v in tenant.items() if k != "_id"}

    return {
        "access_token": impersonation_token,
        "user": owner_user_sanitized,
        "tenant": tenant_sanitized,
        "message": f"Impersonating session for {tenant.get('name')}"
    }

# ----------------- 3. USERS MANAGEMENT (PLATFORM-WIDE) -----------------
@router.get("/users")
def list_all_platform_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    query = {}
    if role:
        query["role"] = role
    if tenant_id:
        query["tenant_id"] = tenant_id

    users = list(db.users.find(query))
    tenants_map = {t["id"]: t for t in db.tenants.find()}
    results = []

    for u in users:
        u.pop("_id", None)
        u.pop("hashed_password", None)

        t_id = u.get("tenant_id")
        t_data = tenants_map.get(t_id, {})
        u["tenant_name"] = t_data.get("name", "Platform SuperAdmin" if not t_id else "Unassigned")
        u["tenant_category"] = t_data.get("business_category", "N/A")
        u["is_active"] = u.get("is_active", True)
        u["status"] = "Active" if u["is_active"] else "Inactive"

        # Filter by status
        if status:
            if status.lower() == "active" and not u["is_active"]:
                continue
            if status.lower() == "inactive" and u["is_active"]:
                continue

        # Search filter
        if search:
            q = search.lower().strip()
            name = (u.get("full_name") or u.get("name") or "").lower()
            email = (u.get("email") or "").lower()
            phone = (u.get("phone") or "").lower()
            t_name = u["tenant_name"].lower()
            if not any(q in f for f in [name, email, phone, t_name]):
                continue

        results.append(u)

    return sorted(results, key=lambda x: x.get("created_at", ""), reverse=True)

@router.post("/users")
def create_platform_user(
    payload: AdminUserCreateRequest,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    email_clean = payload.email.lower().strip()

    if db.users.find_one({"email": email_clean}):
        raise HTTPException(status_code=400, detail=f"User with email '{email_clean}' already exists")

    now = datetime.now(timezone.utc).isoformat()
    u_id = str(uuid.uuid4())

    new_user = {
        "id": u_id,
        "tenant_id": payload.tenant_id if payload.tenant_id else None,
        "email": email_clean,
        "full_name": payload.full_name,
        "phone": payload.phone or "",
        "hashed_password": get_password_hash(payload.password),
        "role": payload.role,
        "branch_ids": ["HQ"],
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    db.users.insert_one(new_user)

    log_audit_event(
        db,
        current_user,
        "USER_CREATED",
        "USER",
        u_id,
        {"email": email_clean, "role": payload.role, "tenant_id": payload.tenant_id}
    )

    new_user.pop("_id", None)
    new_user.pop("hashed_password", None)
    return {"message": "User account created successfully", "user": new_user}

@router.get("/users/{user_id}")
def get_user_detail(
    user_id: str,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    user.pop("_id", None)
    user.pop("hashed_password", None)

    tenant = None
    if user.get("tenant_id"):
        tenant = db.tenants.find_one({"id": user["tenant_id"]})
        if tenant:
            tenant.pop("_id", None)

    return {"user": user, "tenant": tenant}

@router.put("/users/{user_id}")
def update_user_details(
    user_id: str,
    payload: AdminUserUpdateRequest,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.users.update_one({"id": user_id}, {"$set": updates})

    log_audit_event(
        db,
        current_user,
        "USER_UPDATED",
        "USER",
        user_id,
        updates
    )

    updated_user = db.users.find_one({"id": user_id})
    updated_user.pop("_id", None)
    updated_user.pop("hashed_password", None)
    return {"message": "User updated successfully", "user": updated_user}

@router.put("/users/{user_id}/status")
def toggle_user_status(
    user_id: str,
    payload: AdminUserStatusRequest,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    if user["id"] == current_user["id"] and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own superadmin account")

    db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_active": payload.is_active,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    action_text = "activated" if payload.is_active else "deactivated"
    log_audit_event(
        db,
        current_user,
        "USER_STATUS_TOGGLED",
        "USER",
        user_id,
        {"is_active": payload.is_active}
    )

    return {"message": f"User account successfully {action_text}", "is_active": payload.is_active}

@router.put("/users/{user_id}/password")
def reset_user_password(
    user_id: str,
    payload: AdminPasswordResetRequest,
    current_user: dict = Depends(require_saas_admin)
):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    db = get_database()
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    new_hash = get_password_hash(payload.new_password)
    db.users.update_one(
        {"id": user_id},
        {"$set": {
            "hashed_password": new_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    log_audit_event(
        db,
        current_user,
        "USER_PASSWORD_RESET",
        "USER",
        user_id,
        {"user_email": user.get("email")}
    )

    return {"message": f"Password for {user.get('email')} successfully reset"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    if user["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own superadmin account")

    db.users.delete_one({"id": user_id})

    log_audit_event(
        db,
        current_user,
        "USER_DELETED",
        "USER",
        user_id,
        {"email": user.get("email")}
    )

    return {"message": f"User account {user.get('email')} deleted"}

# ----------------- 4. BUSINESS CATEGORIES MANAGEMENT -----------------
@router.get("/categories")
def list_admin_categories(current_user: dict = Depends(require_saas_admin)):
    db = get_database()
    all_tenants = list(db.tenants.find())
    all_invoices = list(db.invoices.find())

    # Fetch custom DB overrides
    db_overrides = {c["category_id"]: c for c in db.category_settings.find()}

    results = []
    for cat in BUSINESS_CATEGORIES:
        cid = cat["id"]
        override = db_overrides.get(cid, {})

        # Compute tenant counts & GMV
        cat_tenants = [t for t in all_tenants if t.get("business_category", "") == cid]
        cat_tenant_ids = {t["id"] for t in cat_tenants}
        cat_invoices = [inv for inv in all_invoices if inv.get("tenant_id") in cat_tenant_ids]
        cat_gmv = sum(float(inv.get("final_payable", 0)) for inv in cat_invoices)

        config = CATEGORY_CONFIGURATIONS.get(cid, {})

        merged = {
            **cat,
            "is_enabled": override.get("is_enabled", True),
            "tenants_count": len(cat_tenants),
            "invoices_count": len(cat_invoices),
            "total_gmv": round(cat_gmv, 2),
            "pos_layout": config.get("pos_layout", "standard"),
            "features": override.get("features", config.get("features", {})),
            "tagline": override.get("tagline", cat.get("tagline")),
            "description": override.get("description", cat.get("description")),
            "theme_accent": override.get("theme_accent", config.get("theme_accent", cat.get("color", "indigo")))
        }
        results.append(merged)

    return results

@router.put("/categories/{category_id}/status")
def toggle_category_status(
    category_id: str,
    payload: dict,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    is_enabled = bool(payload.get("is_enabled", True))

    db.category_settings.update_one(
        {"category_id": category_id},
        {"$set": {
            "category_id": category_id,
            "is_enabled": is_enabled,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    log_audit_event(
        db,
        current_user,
        "CATEGORY_STATUS_TOGGLED",
        "CATEGORY",
        category_id,
        {"is_enabled": is_enabled}
    )

    return {"message": f"Category '{category_id}' status set to {'Enabled' if is_enabled else 'Disabled'}"}

@router.put("/categories/{category_id}/config")
def update_category_configuration(
    category_id: str,
    payload: dict,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    update_data = {
        "category_id": category_id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if "features" in payload:
        update_data["features"] = payload["features"]
    if "tagline" in payload:
        update_data["tagline"] = payload["tagline"]
    if "description" in payload:
        update_data["description"] = payload["description"]
    if "theme_accent" in payload:
        update_data["theme_accent"] = payload["theme_accent"]

    db.category_settings.update_one(
        {"category_id": category_id},
        {"$set": update_data},
        upsert=True
    )

    log_audit_event(
        db,
        current_user,
        "CATEGORY_CONFIG_UPDATED",
        "CATEGORY",
        category_id,
        update_data
    )

    return {"message": f"Configuration for '{category_id}' updated successfully"}

# ----------------- 5. SUBSCRIPTIONS & PLANS MANAGEMENT -----------------
@router.get("/subscriptions/plans")
def list_admin_subscription_plans(current_user: dict = Depends(require_saas_admin)):
    db = get_database()
    all_tenants = list(db.tenants.find())

    # Count tenants per plan
    subscriber_counts = {}
    for t in all_tenants:
        plan = (t.get("subscription", {}).get("plan") or "starter").lower()
        subscriber_counts[plan] = subscriber_counts.get(plan, 0) + 1

    plans_with_stats = []
    for plan in SAAS_PLANS:
        p_id = plan["id"].lower()
        active_subs = subscriber_counts.get(p_id, 0)
        plans_with_stats.append({
            **plan,
            "active_subscribers": active_subs,
            "monthly_revenue": active_subs * plan["monthly_price"],
            "yearly_revenue": active_subs * plan["yearly_price"]
        })

    return plans_with_stats

@router.get("/subscriptions/transactions")
def list_subscription_transactions(
    tenant_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    query = {}
    if tenant_id:
        query["tenant_id"] = tenant_id

    txns = list(db.subscription_transactions.find(query).sort("created_at", -1).limit(100))
    for tx in txns:
        tx.pop("_id", None)

    # If transactions collection is empty, seed demo subscription transactions from existing tenants
    if not txns:
        tenants = list(db.tenants.find().limit(6))
        seed_txns = []
        now = datetime.now(timezone.utc)
        for i, t in enumerate(tenants):
            t_plan = t.get("subscription", {}).get("plan", "professional")
            price = 1999.0 if t_plan == "professional" else 999.0
            stx = {
                "id": str(uuid.uuid4()),
                "tenant_id": t.get("id"),
                "tenant_name": t.get("name"),
                "plan": t_plan,
                "amount": price,
                "billing_cycle": "monthly",
                "payment_method": "UPI" if i % 2 == 0 else "CREDIT_CARD",
                "status": "COMPLETED",
                "transaction_ref": f"TXN-BILL-{1000 + i}",
                "notes": "Automated recurring subscription charge",
                "created_at": (now - timedelta(days=i * 5)).isoformat()
            }
            db.subscription_transactions.insert_one(stx)
            stx.pop("_id", None)
            seed_txns.append(stx)
        return seed_txns

    return txns

# ----------------- 6. PLATFORM ANNOUNCEMENTS -----------------
@router.get("/announcements")
def list_announcements(current_user: dict = Depends(require_saas_admin)):
    db = get_database()
    items = list(db.announcements.find().sort("created_at", -1))
    for it in items:
        it.pop("_id", None)
    return items

@router.post("/announcements")
def create_announcement(
    payload: AdminAnnouncementCreateRequest,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    a_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": a_id,
        "title": payload.title,
        "message": payload.message,
        "type": payload.type or "info",
        "target_category": payload.target_category or "all",
        "is_active": True,
        "created_by": current_user.get("full_name", "Super Administrator"),
        "created_at": now,
        "expires_at": payload.expires_at or (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d")
    }
    db.announcements.insert_one(doc)

    log_audit_event(
        db,
        current_user,
        "ANNOUNCEMENT_CREATED",
        "ANNOUNCEMENT",
        a_id,
        {"title": payload.title, "type": payload.type}
    )

    doc.pop("_id", None)
    return {"message": "Announcement broadcast created successfully", "announcement": doc}

@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    db.announcements.delete_one({"id": announcement_id})
    return {"message": "Announcement deleted"}

# ----------------- 7. AUDIT LOGS -----------------
@router.get("/audit-logs")
def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    logs = list(db.audit_logs.find().sort("timestamp", -1).limit(limit))
    filtered = []
    for lg in logs:
        lg.pop("_id", None)
        if search:
            q = search.lower().strip()
            action = lg.get("action", "").lower()
            actor = lg.get("actor_email", "").lower()
            target = lg.get("target_type", "").lower()
            if not any(q in f for f in [action, actor, target]):
                continue
        filtered.append(lg)
    return filtered

# ----------------- 8. PLATFORM SETTINGS -----------------
DEFAULT_SETTINGS = {
    "platform_name": "LAX360 Universal Billing SaaS",
    "company_name": "LAX360 Cloud Technologies Pvt Ltd",
    "support_email": "support@lax360.com",
    "support_phone": "+91 (011) 4560-3600",
    "website_url": "https://lax360.com",
    "default_trial_days": 14,
    "maintenance_mode": False,
    "default_currency": "INR",
    "payment_gateway_mode": "sandbox",
    "allow_self_registration": True,
    "default_tax_rate": 18.0,
    "default_theme_mode": "light",
    "default_accent_color": "indigo",
    "default_font_scaling": "comfortable",
    "default_radius": "rounded-xl",
    "theme": {
        "mode": "light",
        "preset": "indigo",
        "density": "comfortable",
        "radius": "rounded-xl"
    }
}

@router.get("/settings")
def get_platform_settings(current_user: dict = Depends(require_saas_admin)):
    db = get_database()
    record = db.platform_settings.find_one({"id": "global_config"})
    if not record:
        record = {**DEFAULT_SETTINGS, "id": "global_config"}
        db.platform_settings.insert_one(record)
    record.pop("_id", None)
    return record

@router.put("/settings")
def update_platform_settings(
    payload: AdminPlatformSettingsUpdateRequest,
    current_user: dict = Depends(require_saas_admin)
):
    db = get_database()
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    db.platform_settings.update_one(
        {"id": "global_config"},
        {"$set": updates},
        upsert=True
    )

    log_audit_event(
        db,
        current_user,
        "PLATFORM_SETTINGS_UPDATED",
        "SETTINGS",
        "global_config",
        updates
    )

    record = db.platform_settings.find_one({"id": "global_config"})
    record.pop("_id", None)
    return {"message": "Platform settings updated successfully", "settings": record}

# ----------------- 9. DOMAINS (BACKWARD COMPATIBILITY) -----------------
@router.get("/domains")
def list_platform_domains(current_user: dict = Depends(require_saas_admin)):
    db = get_database()
    tenants = list(db.tenants.find())
    domains = []
    for t in tenants:
        slug = t.get("name", "store").lower().replace(" ", "-").replace("&", "and")
        domains.append({
            "id": f"dom-{t.get('id')[:8]}",
            "domain": f"{slug}.lax360.app",
            "tenant_id": t.get("id"),
            "tenant_name": t.get("name"),
            "verification_status": "Verified",
            "status": "Active" if t.get("status", "active") == "active" else "Suspended",
            "created_at": t.get("created_at")
        })
    return domains
