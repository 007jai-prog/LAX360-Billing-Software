import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user, require_roles
from app.models.schemas import SupplierCreateRequest

router = APIRouter(prefix="/suppliers", tags=["Supplier Management"])

@router.get("")
def list_suppliers(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_tenant_user)
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    query = {"tenant_id": tenant_id}

    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"name": search_regex},
            {"contact_person": search_regex},
            {"phone": search_regex},
            {"gstin": search_regex}
        ]

    skip = (page - 1) * limit
    total = db.suppliers.count_documents(query)
    cursor = db.suppliers.find(query).sort("created_at", -1).skip(skip).limit(limit)

    items = list(cursor)
    for s in items:
        s.pop("_id", None)

    return {"items": items, "total": total, "page": page, "limit": limit}

@router.post("")
def create_supplier(
    payload: SupplierCreateRequest,
    current_user: dict = Depends(require_roles(["business_owner", "business_admin", "inventory_manager"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    sup_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": sup_id,
        "tenant_id": tenant_id,
        "name": payload.name,
        "contact_person": payload.contact_person or "",
        "phone": payload.phone,
        "email": payload.email or "",
        "gstin": payload.gstin.strip().upper() if payload.gstin else "",
        "address": payload.address or "",
        "state": payload.state or "",
        "city": payload.city or "",
        "total_purchases": 0.0,
        "outstanding_payables": 0.0,
        "created_at": now,
        "updated_at": now
    }
    db.suppliers.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/{supplier_id}")
def get_supplier(supplier_id: str, current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    sup = db.suppliers.find_one({"tenant_id": tenant_id, "id": supplier_id})
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    sup.pop("_id", None)
    return sup
