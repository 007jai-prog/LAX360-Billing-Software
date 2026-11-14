import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user, require_roles
from app.models.schemas import TenantSetupRequest, BranchCreateRequest

router = APIRouter(prefix="/tenants", tags=["Tenants & Onboarding"])

@router.get("/profile")
def get_tenant_profile(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant = db.tenants.find_one({"id": current_user["tenant_id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
    tenant.pop("_id", None)
    return tenant

@router.post("/setup-wizard")
def complete_setup_wizard(
    payload: TenantSetupRequest,
    current_user: dict = Depends(require_roles(["business_owner", "business_admin"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    now = datetime.now(timezone.utc).isoformat()

    update_fields = {
        "name": payload.business_name,
        "business_category": payload.business_category.lower(),
        "owner_name": payload.owner_name,
        "email": payload.email.lower(),
        "phone": payload.phone,
        "gstin": payload.gstin.strip().upper() if payload.gstin else "",
        "address": payload.address,
        "city": payload.city,
        "state": payload.state,
        "pincode": payload.pincode,
        "currency": payload.currency,
        "financial_year": payload.financial_year,
        "invoice_prefix": payload.invoice_prefix.upper(),
        "default_tax_rate": payload.default_tax_rate,
        "is_tax_inclusive": payload.is_tax_inclusive,
        "is_setup_completed": True,
        "updated_at": now
    }

    db.tenants.update_one({"id": tenant_id}, {"$set": update_fields})

    # Add custom branches if supplied
    if payload.branches:
        for b in payload.branches:
            b_id = str(uuid.uuid4())
            db.branches.insert_one({
                "id": b_id,
                "tenant_id": tenant_id,
                "name": b.get("name", "Branch"),
                "code": b.get("code", "BR1"),
                "address": b.get("address", payload.address),
                "is_main": False,
                "created_at": now
            })

    updated_tenant = db.tenants.find_one({"id": tenant_id})
    updated_tenant.pop("_id", None)
    return {
        "message": "Business setup completed successfully",
        "tenant": updated_tenant
    }

@router.put("/profile")
def update_tenant_profile(
    payload: dict,
    current_user: dict = Depends(require_roles(["business_owner", "business_admin"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    payload.pop("_id", None)
    payload.pop("id", None)
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    db.tenants.update_one({"id": tenant_id}, {"$set": payload})
    tenant = db.tenants.find_one({"id": tenant_id})
    tenant.pop("_id", None)
    return {"message": "Profile updated", "tenant": tenant}

@router.get("/branches")
def list_branches(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    branches = list(db.branches.find({"tenant_id": current_user["tenant_id"]}))
    for b in branches:
        b.pop("_id", None)
    return branches

@router.post("/branches")
def add_branch(
    payload: BranchCreateRequest,
    current_user: dict = Depends(require_roles(["business_owner", "business_admin"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    branch_id = str(uuid.uuid4())
    branch_doc = {
        "id": branch_id,
        "tenant_id": tenant_id,
        "name": payload.name,
        "code": payload.code.upper(),
        "address": payload.address,
        "phone": payload.phone,
        "gstin": payload.gstin,
        "is_main": payload.is_main,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.branches.insert_one(branch_doc)
    branch_doc.pop("_id", None)
    return branch_doc
