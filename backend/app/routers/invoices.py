import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user, require_roles
from app.services.pdf_service import PDFInvoiceGenerator

router = APIRouter(prefix="/invoices", tags=["Invoice Management"])

@router.get("")
def list_invoices(
    search: Optional[str] = None,
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
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
            {"invoice_number": search_regex},
            {"customer_name": search_regex},
            {"customer_phone": search_regex}
        ]

    if status:
        query["payment_status"] = status.upper()

    if customer_id:
        query["customer_id"] = customer_id

    skip = (page - 1) * limit
    total_count = db.invoices.count_documents(query)
    cursor = db.invoices.find(query).sort("created_at", -1).skip(skip).limit(limit)

    items = list(cursor)
    for inv in items:
        inv.pop("_id", None)

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit
    }

@router.get("/{invoice_id}")
def get_invoice_detail(invoice_id: str, current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    invoice = db.invoices.find_one({"tenant_id": tenant_id, "id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.pop("_id", None)
    return invoice

@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    invoice = db.invoices.find_one({"tenant_id": tenant_id, "id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pdf_buffer = PDFInvoiceGenerator.generate_invoice_pdf(invoice)
    headers = {
        'Content-Disposition': f'attachment; filename="Invoice_{invoice.get("invoice_number", "LAX360")}.pdf"'
    }
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers=headers
    )

@router.post("/{invoice_id}/cancel")
def cancel_invoice(
    invoice_id: str,
    reason: str = "Customer requested cancellation",
    current_user: dict = Depends(require_roles(["business_owner", "business_admin"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    invoice = db.invoices.find_one({"tenant_id": tenant_id, "id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.get("status") == "CANCELLED":
        raise HTTPException(status_code=400, detail="Invoice is already cancelled")

    now = datetime.now(timezone.utc).isoformat()
    # 1. Reverse stock deductions
    for item in invoice.get("items", []):
        p_id = item.get("product_id")
        qty = float(item.get("quantity", 0))
        if p_id:
            db.products.update_one(
                {"id": p_id, "tenant_id": tenant_id},
                {"$inc": {"stock": qty}}
            )
            db.stock_movements.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "product_id": p_id,
                "product_name": item.get("name"),
                "movement_type": "CANCELLATION_RETURN",
                "quantity": qty,
                "reference_id": invoice_id,
                "reference_type": "INVOICE_CANCEL",
                "created_at": now
            })

    # 2. Update invoice status
    db.invoices.update_one(
        {"id": invoice_id, "tenant_id": tenant_id},
        {"$set": {"status": "CANCELLED", "cancellation_reason": reason, "updated_at": now}}
    )

    return {"message": "Invoice cancelled and stock restored successfully"}

@router.post("/{invoice_id}/credit-note")
def issue_credit_note(
    invoice_id: str,
    payload: dict,
    current_user: dict = Depends(require_roles(["business_owner", "business_admin"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    invoice = db.invoices.find_one({"tenant_id": tenant_id, "id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Original invoice not found")

    cn_id = str(uuid.uuid4())
    cn_number = f"CN-{invoice.get('invoice_number', '001')}"
    now = datetime.now(timezone.utc).isoformat()

    credit_doc = {
        "id": cn_id,
        "tenant_id": tenant_id,
        "credit_note_number": cn_number,
        "original_invoice_id": invoice_id,
        "original_invoice_number": invoice.get("invoice_number"),
        "customer_id": invoice.get("customer_id"),
        "customer_name": invoice.get("customer_name"),
        "amount": payload.get("amount", invoice.get("final_payable")),
        "reason": payload.get("reason", "Goods Returned"),
        "created_by": current_user.get("full_name"),
        "created_at": now
    }
    db.credit_notes.insert_one(credit_doc)
    credit_doc.pop("_id", None)
    return credit_doc
