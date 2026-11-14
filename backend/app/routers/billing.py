from decimal import Decimal
from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_tenant_user
from app.models.schemas import InvoiceCreateRequest
from app.services.invoice_service import InvoiceService
from app.services.gst_engine import GSTCalculationEngine
from app.core.database import get_database

router = APIRouter(prefix="/billing", tags=["Billing & POS"])

@router.post("/calculate-preview")
def calculate_cart_preview(
    payload: dict,
    current_user: dict = Depends(get_current_tenant_user)
):
    """Real-time cart GST preview without saving to database"""
    db = get_database()
    tenant = db.tenants.find_one({"id": current_user["tenant_id"]}) or {}
    seller_state = tenant.get("state", "Delhi")
    buyer_state = payload.get("customer_state") or seller_state

    items = payload.get("items", [])
    discount_pct = Decimal(str(payload.get("discount_percentage", 0)))
    flat_disc = Decimal(str(payload.get("flat_discount", 0)))
    shipping = Decimal(str(payload.get("shipping_charges", 0)))

    calculation = GSTCalculationEngine.calculate_invoice_totals(
        items=items,
        seller_state=seller_state,
        buyer_state=buyer_state,
        discount_percentage=discount_pct,
        flat_discount=flat_disc,
        shipping_charges=shipping
    )
    return calculation

@router.post("/checkout")
def checkout_invoice(
    payload: InvoiceCreateRequest,
    current_user: dict = Depends(get_current_tenant_user)
):
    """Generates official tax invoice, updates stock, records payment"""
    invoice_doc = InvoiceService.create_invoice(
        tenant_id=current_user["tenant_id"],
        user_id=current_user["id"],
        user_name=current_user.get("full_name", "Operator"),
        payload=payload.dict()
    )
    return invoice_doc
