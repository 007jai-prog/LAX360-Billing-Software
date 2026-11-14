import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user, require_roles
from app.models.schemas import PurchaseCreateRequest

router = APIRouter(prefix="/purchases", tags=["Purchase Management"])

@router.get("")
def list_purchases(
    search: Optional[str] = None,
    supplier_id: Optional[str] = None,
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
            {"purchase_number": search_regex},
            {"supplier_invoice_no": search_regex},
            {"supplier_name": search_regex}
        ]

    if supplier_id:
        query["supplier_id"] = supplier_id

    skip = (page - 1) * limit
    total = db.purchases.count_documents(query)
    cursor = db.purchases.find(query).sort("created_at", -1).skip(skip).limit(limit)

    items = list(cursor)
    for p in items:
        p.pop("_id", None)

    return {"items": items, "total": total, "page": page, "limit": limit}

@router.post("")
def record_purchase(
    payload: PurchaseCreateRequest,
    current_user: dict = Depends(require_roles(["business_owner", "business_admin", "inventory_manager"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    supplier = db.suppliers.find_one({"tenant_id": tenant_id, "id": payload.supplier_id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    purchase_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    current_year = datetime.now(timezone.utc).year

    # Sequential purchase number
    counter_key = f"{tenant_id}_PO_{current_year}"
    counter_doc = db.counters.find_one({"_id": counter_key})
    if not counter_doc:
        db.counters.insert_one({"_id": counter_key, "seq": 1})
        seq = 1
    else:
        db.counters.update_one({"_id": counter_key}, {"$inc": {"seq": 1}})
        seq = counter_doc.get("seq", 0) + 1
    purchase_number = f"PO-{current_year}-{seq:04d}"

    # Calculate item totals & inward stock
    total_amount = 0.0
    processed_items = []

    for item in payload.items:
        line_cost = float(item.quantity) * float(item.unit_cost)
        tax_amt = line_cost * (float(item.tax_rate) / 100.0)
        line_total = line_cost + tax_amt
        total_amount += line_total

        processed_items.append({
            "product_id": item.product_id,
            "name": item.name,
            "quantity": float(item.quantity),
            "unit_cost": float(item.unit_cost),
            "tax_rate": float(item.tax_rate),
            "total_tax": round(tax_amt, 2),
            "line_total": round(line_total, 2),
            "batch_number": item.batch_number,
            "expiry_date": item.expiry_date
        })

        # Replenish product stock
        if item.product_id:
            db.products.update_one(
                {"tenant_id": tenant_id, "id": item.product_id},
                {"$inc": {"stock": float(item.quantity)}, "$set": {"purchase_price": float(item.unit_cost)}}
            )
            # Log stock movement
            db.stock_movements.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "product_id": item.product_id,
                "product_name": item.name,
                "movement_type": "PURCHASE_INWARD",
                "quantity": float(item.quantity),
                "reference_id": purchase_id,
                "reference_type": "PURCHASE_BILL",
                "created_at": now
            })

    total_amount = round(total_amount, 2)
    paid = round(float(payload.paid_amount), 2)
    balance_due = round(max(0.0, total_amount - paid), 2)

    doc = {
        "id": purchase_id,
        "tenant_id": tenant_id,
        "purchase_number": purchase_number,
        "supplier_id": payload.supplier_id,
        "supplier_name": supplier.get("name"),
        "supplier_gstin": supplier.get("gstin", ""),
        "supplier_invoice_no": payload.supplier_invoice_no,
        "purchase_date": payload.purchase_date or now[:10],
        "items": processed_items,
        "total_amount": total_amount,
        "paid_amount": paid,
        "balance_due": balance_due,
        "payment_method": payload.payment_method,
        "status": "PAID" if balance_due == 0 else ("PARTIAL" if paid > 0 else "UNPAID"),
        "notes": payload.notes or "",
        "created_by": current_user.get("full_name"),
        "created_at": now
    }
    db.purchases.insert_one(doc)

    # Update supplier purchase records
    db.suppliers.update_one(
        {"tenant_id": tenant_id, "id": payload.supplier_id},
        {"$inc": {"total_purchases": total_amount, "outstanding_payables": balance_due}}
    )

    doc.pop("_id", None)
    return doc
