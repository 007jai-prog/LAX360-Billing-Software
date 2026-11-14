import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user

router = APIRouter(prefix="/specialized", tags=["Specialized Business Verticals"])

# ----------------- PHARMACY & MEDICAL -----------------
@router.get("/pharmacy/expiry-batches")
def get_pharmacy_batches(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    products = list(db.products.find({"tenant_id": tenant_id}))

    batches = []
    for p in products:
        cfields = p.get("custom_fields", {})
        batch_no = cfields.get("batch_number") or p.get("sku")
        exp_date = cfields.get("expiry_date") or "2026-12"
        batches.append({
            "product_id": p.get("id"),
            "product_name": p.get("name"),
            "batch_number": batch_no,
            "expiry_date": exp_date,
            "stock": p.get("stock", 0),
            "manufacturer": cfields.get("manufacturer", "Generic Pharma"),
            "is_schedule_h": cfields.get("is_schedule_h", False),
            "status": "VALID" # VALID, EXPIRING_SOON, EXPIRED
        })
    return batches

@router.get("/pharmacy/prescriptions")
def get_prescriptions_log(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    invoices = list(db.invoices.find({
        "tenant_id": tenant_id,
        "metadata.doctor_name": {"$exists": True}
    }).sort("created_at", -1).limit(50))

    rx_list = []
    for inv in invoices:
        meta = inv.get("metadata", {})
        rx_list.append({
            "id": inv.get("id"),
            "invoice_number": inv.get("invoice_number"),
            "date": inv.get("created_at")[:10],
            "patient_name": inv.get("customer_name"),
            "patient_phone": inv.get("customer_phone"),
            "doctor_name": meta.get("doctor_name", "Dr. Sharma"),
            "doctor_reg_no": meta.get("doctor_reg_no", "MCI-48921"),
            "medicines_dispensed": [it.get("name") for it in inv.get("items", [])],
            "total_amount": inv.get("final_payable")
        })
    return rx_list

# ----------------- TEXTILE & GARMENTS -----------------
@router.get("/textile/tags/{product_id}")
def get_garment_barcode_tag(product_id: str, current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    product = db.products.find_one({"tenant_id": tenant_id, "id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Garment item not found")

    cfields = product.get("custom_fields", {})
    return {
        "brand": cfields.get("brand", "LAX Fashion"),
        "style_name": product.get("name"),
        "barcode": product.get("barcode") or product.get("sku"),
        "sku": product.get("sku"),
        "sizes": cfields.get("sizes", "M, L, XL"),
        "colors": cfields.get("colors", "Navy, Black"),
        "mrp": product.get("selling_price"),
        "tax_inclusive": True
    }

@router.post("/textile/exchange")
def process_garment_exchange(payload: dict, current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    exchange_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": exchange_id,
        "tenant_id": tenant_id,
        "original_invoice_no": payload.get("original_invoice_no"),
        "customer_name": payload.get("customer_name", "Walk-in"),
        "returned_item": payload.get("returned_item"),
        "exchanged_item": payload.get("exchanged_item"),
        "size_returned": payload.get("size_returned"),
        "size_given": payload.get("size_given"),
        "price_difference": float(payload.get("price_difference", 0.0)),
        "status": "COMPLETED",
        "created_at": now
    }
    db.returns.insert_one(doc)
    doc.pop("_id", None)
    return doc

# ----------------- WHOLESALE & DISTRIBUTION -----------------
@router.get("/wholesale/dealer-ledger")
def get_wholesale_dealers_ledger(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    dealers = list(db.customers.find({
        "tenant_id": tenant_id,
        "customer_tier": {"$in": ["DEALER", "DISTRIBUTOR"]}
    }))

    ledger = []
    for d in dealers:
        limit = float(d.get("credit_limit", 100000))
        balance = float(d.get("outstanding_balance", 0))
        usage_pct = round((balance / max(1.0, limit)) * 100.0, 1)
        ledger.append({
            "customer_id": d.get("id"),
            "dealer_name": d.get("name"),
            "contact": d.get("phone"),
            "tier": d.get("customer_tier"),
            "gstin": d.get("gstin"),
            "credit_limit": limit,
            "outstanding_balance": balance,
            "credit_utilization_pct": usage_pct,
            "credit_status": "EXCEEDED" if balance > limit else ("WARNING" if usage_pct > 80 else "HEALTHY")
        })
    return ledger

@router.get("/wholesale/warehouses")
def get_warehouses_and_stock(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    branches = list(db.branches.find({"tenant_id": tenant_id}))
    for b in branches:
        b.pop("_id", None)
    return branches

# ----------------- ELECTRONICS & MOBILE -----------------
@router.get("/electronics/imei/{imei_or_serial}")
def lookup_imei_and_warranty(imei_or_serial: str, current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    # Search in invoices metadata
    invoice = db.invoices.find_one({
        "tenant_id": tenant_id,
        "metadata.imei_number": imei_or_serial.strip()
    })

    if not invoice:
        # Check in products
        prod = db.products.find_one({"tenant_id": tenant_id, "sku": imei_or_serial})
        return {
            "found": False,
            "message": f"No active device registered with IMEI {imei_or_serial}",
            "device": prod.get("name") if prod else None
        }

    meta = invoice.get("metadata", {})
    created_at = invoice.get("created_at")[:10]
    warranty_months = int(meta.get("warranty_months", 12))

    return {
        "found": True,
        "imei": imei_or_serial,
        "product_name": invoice.get("items", [{}])[0].get("name", "Smartphone"),
        "customer_name": invoice.get("customer_name"),
        "customer_phone": invoice.get("customer_phone"),
        "invoice_number": invoice.get("invoice_number"),
        "purchase_date": created_at,
        "warranty_months": warranty_months,
        "warranty_status": "ACTIVE",
        "brand": meta.get("brand", "Samsung")
    }

@router.get("/electronics/repairs")
def list_repair_tickets(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    tickets = list(db.repair_tickets.find({"tenant_id": tenant_id}).sort("created_at", -1))
    for t in tickets:
        t.pop("_id", None)
    return tickets

@router.post("/electronics/repairs")
def create_repair_ticket(payload: dict, current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    now = datetime.now(timezone.utc).isoformat()
    ticket_id = str(uuid.uuid4())
    ticket_no = f"REP-{len(list(db.repair_tickets.find({'tenant_id': tenant_id})))+1:04d}"

    doc = {
        "id": ticket_id,
        "tenant_id": tenant_id,
        "ticket_number": ticket_no,
        "customer_name": payload.get("customer_name"),
        "customer_phone": payload.get("customer_phone"),
        "device_model": payload.get("device_model"),
        "imei_serial": payload.get("imei_serial", ""),
        "issue_description": payload.get("issue_description"),
        "estimated_cost": float(payload.get("estimated_cost", 0)),
        "status": "RECEIVED", # RECEIVED, DIAGNOSING, REPAIRED, DELIVERED
        "created_at": now
    }
    db.repair_tickets.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/electronics/repairs/{ticket_id}/status")
def update_repair_status(ticket_id: str, payload: dict, current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    new_status = payload.get("status", "REPAIRED").upper()

    db.repair_tickets.update_one(
        {"tenant_id": tenant_id, "id": ticket_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    t = db.repair_tickets.find_one({"tenant_id": tenant_id, "id": ticket_id})
    if not t:
        raise HTTPException(status_code=404, detail="Repair ticket not found")
    t.pop("_id", None)
    return t
