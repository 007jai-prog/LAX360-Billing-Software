import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user, require_roles
from app.models.schemas import CustomerCreateRequest

router = APIRouter(prefix="/customers", tags=["Customer Management"])

@router.get("")
def list_customers(
    search: Optional[str] = None,
    tier: Optional[str] = None,
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
            {"phone": search_regex},
            {"email": search_regex},
            {"gstin": search_regex}
        ]

    if tier:
        query["customer_tier"] = tier.upper()

    skip = (page - 1) * limit
    total_count = db.customers.count_documents(query)
    cursor = db.customers.find(query).sort("created_at", -1).skip(skip).limit(limit)

    items = list(cursor)
    for c in items:
        c.pop("_id", None)

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit
    }

@router.get("/{customer_id}")
def get_customer(customer_id: str, current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    customer = db.customers.find_one({"tenant_id": tenant_id, "id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.pop("_id", None)

    # Invoices history
    invoices = list(db.invoices.find({"tenant_id": tenant_id, "customer_id": customer_id}).sort("created_at", -1).limit(20))
    for inv in invoices:
        inv.pop("_id", None)
    customer["invoices"] = invoices
    return customer

@router.post("")
def create_customer(
    payload: CustomerCreateRequest,
    current_user: dict = Depends(get_current_tenant_user)
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    cust_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": cust_id,
        "tenant_id": tenant_id,
        "name": payload.name,
        "phone": payload.phone,
        "email": payload.email or "",
        "gstin": payload.gstin.strip().upper() if payload.gstin else "",
        "billing_address": payload.billing_address or "",
        "city": payload.city or "",
        "state": payload.state or "",
        "pincode": payload.pincode or "",
        "credit_limit": payload.credit_limit,
        "customer_tier": payload.customer_tier.upper(),
        "outstanding_balance": 0.0,
        "total_spent": 0.0,
        "last_purchase_date": None,
        "created_at": now,
        "updated_at": now
    }
    db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/{customer_id}")
def update_customer(
    customer_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_tenant_user)
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    payload.pop("_id", None)
    payload.pop("id", None)
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    db.customers.update_one({"tenant_id": tenant_id, "id": customer_id}, {"$set": payload})
    updated = db.customers.find_one({"tenant_id": tenant_id, "id": customer_id})
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    updated.pop("_id", None)
    return updated
