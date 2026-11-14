import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user


router = APIRouter(prefix="/returns", tags=["Returns & Exchanges"])

CENT = Decimal("0.01")
VALID_TYPES = {"RETURN", "EXCHANGE"}
VALID_REFUND_METHODS = {
    "STORE_CREDIT",
    "CASH",
    "UPI",
    "CARD",
    "BANK_TRANSFER",
    "CHEQUE",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _money(value) -> Decimal:
    try:
        amount = Decimal(str(value or 0))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0.00")

    if not amount.is_finite():
        return Decimal("0.00")

    return amount.quantize(CENT, rounding=ROUND_HALF_UP)


def _without_mongo_id(document: dict) -> dict:
    document.pop("_id", None)
    return document


def _calculate_line_credit(
    item: dict,
    quantity: Decimal,
    invoice_discount: Decimal,
    invoice_taxable: Decimal,
) -> Decimal:
    """
    Calculate the credit for a returned quantity from the saved invoice line.

    Invoice-level discount is allocated proportionally by taxable amount.
    Prices and tax values are read from the stored invoice, not trusted from
    the browser.
    """
    sold_quantity = Decimal(str(item.get("quantity", 0) or 0))
    if sold_quantity <= 0:
        return Decimal("0.00")

    if item.get("line_total") is not None:
        line_total = _money(item["line_total"])
    else:
        gross = _money(
            Decimal(str(item.get("unit_price", 0) or 0)) * sold_quantity
        )
        item_discount = _money(item.get("discount", 0))
        taxable = max(Decimal("0.00"), gross - item_discount)
        tax_rate = Decimal(str(item.get("tax_rate", 0) or 0))

        if item.get("is_tax_inclusive"):
            line_total = gross - item_discount
        else:
            tax = _money(taxable * tax_rate / Decimal("100"))
            line_total = taxable + tax

    line_taxable = _money(item.get("taxable_amount", 0))
    if invoice_taxable > 0 and line_taxable > 0:
        allocated_discount = _money(
            invoice_discount * line_taxable / invoice_taxable
        )
    else:
        allocated_discount = Decimal("0.00")

    adjusted_line_total = max(
        Decimal("0.00"),
        line_total - allocated_discount,
    )

    return _money(adjusted_line_total * quantity / sold_quantity)


@router.get("")
def list_returns(
    invoice_id: Optional[str] = None,
    current_user: dict = Depends(get_current_tenant_user),
):
    """List recent return/exchange records for the authenticated tenant."""
    db = get_database()
    query = {"tenant_id": current_user["tenant_id"]}

    if invoice_id:
        query["original_invoice_id"] = invoice_id

    records = list(
        db.returns.find(query).sort("created_at", -1).limit(100)
    )

    return [_without_mongo_id(record) for record in records]


@router.post("")
def create_return_or_exchange(
    payload: dict,
    current_user: dict = Depends(get_current_tenant_user),
):
    """Record returned invoice items, issue a credit note, and restore stock."""
    tenant_id = current_user["tenant_id"]
    invoice_id = str(payload.get("invoice_id") or "").strip()
    return_type = str(payload.get("type") or "RETURN").upper()
    reason = str(payload.get("reason") or "").strip()
    refund_method = str(
        payload.get("refund_method") or "STORE_CREDIT"
    ).upper()
    requested_items = payload.get("items")

    if not invoice_id:
        raise HTTPException(status_code=422, detail="invoice_id is required")

    if return_type not in VALID_TYPES:
        raise HTTPException(
            status_code=422,
            detail="type must be RETURN or EXCHANGE",
        )

    if refund_method not in VALID_REFUND_METHODS:
        raise HTTPException(
            status_code=422,
            detail="Unsupported refund_method",
        )

    if not isinstance(requested_items, list) or not requested_items:
        raise HTTPException(
            status_code=422,
            detail="Select at least one invoice item to return",
        )

    normalized_items = []
    seen_indexes = set()

    for requested in requested_items:
        if not isinstance(requested, dict):
            raise HTTPException(
                status_code=422,
                detail="Each return item must be an object",
            )

        try:
            line_index = int(requested.get("line_index"))
            quantity = Decimal(str(requested.get("quantity", 0)))
        except (TypeError, ValueError, InvalidOperation):
            raise HTTPException(
                status_code=422,
                detail="Each return item needs a valid line_index and quantity",
            )

        if line_index < 0:
            raise HTTPException(status_code=422, detail="Invalid line_index")

        if not quantity.is_finite() or quantity <= 0:
            raise HTTPException(
                status_code=422,
                detail="Return quantity must be greater than zero",
            )

        if line_index in seen_indexes:
            raise HTTPException(
                status_code=422,
                detail="An invoice line can only appear once per request",
            )

        seen_indexes.add(line_index)
        normalized_items.append((line_index, quantity))

    db = get_database()
    now = _now_iso()
    return_id = str(uuid.uuid4())
    return_number = (
        f"RET-{datetime.now(timezone.utc):%Y%m%d}-"
        f"{return_id[:8].upper()}"
    )
    credit_note_number = f"CN-{return_id[:10].upper()}"

    try:
        with db.client.start_session() as session:
            with session.start_transaction():
                invoice = db.invoices.find_one(
                    {"tenant_id": tenant_id, "id": invoice_id},
                    session=session,
                )

                if not invoice:
                    raise HTTPException(
                        status_code=404,
                        detail="Original invoice not found",
                    )

                if invoice.get("status") != "COMPLETED":
                    raise HTTPException(
                        status_code=409,
                        detail="Only completed invoices can be returned",
                    )

                invoice_items = invoice.get("items") or []
                invoice_discount = _money(invoice.get("invoice_discount"))
                invoice_taxable = _money(invoice.get("total_taxable"))

                return_lines = []
                increment_fields = {}
                quantity_conditions = []

                for line_index, requested_quantity in normalized_items:
                    if line_index >= len(invoice_items):
                        raise HTTPException(
                            status_code=422,
                            detail="An invoice line was not found",
                        )

                    item = invoice_items[line_index]
                    sold_quantity = Decimal(
                        str(item.get("quantity", 0) or 0)
                    )
                    already_returned = Decimal(
                        str(item.get("returned_quantity", 0) or 0)
                    )
                    remaining = sold_quantity - already_returned

                    if requested_quantity > remaining:
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                f"Return quantity exceeds the remaining "
                                f"quantity for {item.get('name', 'invoice item')}"
                            ),
                        )

                    product_id = item.get("product_id")
                    if not product_id:
                        raise HTTPException(
                            status_code=422,
                            detail=(
                                f"{item.get('name', 'This invoice item')} has "
                                "no product ID, so its stock cannot be restored"
                            ),
                        )

                    credit_amount = _calculate_line_credit(
                        item=item,
                        quantity=requested_quantity,
                        invoice_discount=invoice_discount,
                        invoice_taxable=invoice_taxable,
                    )

                    item_path = f"items.{line_index}.returned_quantity"
                    increment_fields[item_path] = float(requested_quantity)

                    # This condition protects against concurrent return
                    # requests for the same invoice line.
                    quantity_conditions.append(
                        {
                            "$or": [
                                {item_path: {"$exists": False}},
                                {
                                    item_path: {
                                        "$lte": float(
                                            sold_quantity - requested_quantity
                                        )
                                    }
                                },
                            ]
                        }
                    )

                    return_lines.append(
                        {
                            "line_index": line_index,
                            "product_id": product_id,
                            "name": item.get("name", ""),
                            "sku": item.get("sku", ""),
                            "quantity": float(requested_quantity),
                            "unit": item.get("unit", "Pcs"),
                            "unit_price": float(
                                item.get("unit_price", 0) or 0
                            ),
                            "credit_amount": float(credit_amount),
                            "custom_fields": item.get("custom_fields") or {},
                        }
                    )

                update_result = db.invoices.update_one(
                    {
                        "tenant_id": tenant_id,
                        "id": invoice_id,
                        "status": "COMPLETED",
                        "$and": quantity_conditions,
                    },
                    {"$inc": increment_fields},
                    session=session,
                )

                if update_result.modified_count != 1:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Invoice items changed while processing this "
                            "return. Refresh the invoice and try again."
                        ),
                    )

                total_credit = _money(
                    sum(
                        (
                            Decimal(str(line["credit_amount"]))
                            for line in return_lines
                        ),
                        Decimal("0.00"),
                    )
                )

                return_doc = {
                    "id": return_id,
                    "tenant_id": tenant_id,
                    "return_number": return_number,
                    "type": return_type,
                    "status": "COMPLETED",
                    "original_invoice_id": invoice_id,
                    "original_invoice_number": invoice.get("invoice_number"),
                    "customer_id": invoice.get("customer_id"),
                    "customer_name": invoice.get("customer_name"),
                    "customer_phone": invoice.get("customer_phone"),
                    "items": return_lines,
                    "credit_amount": float(total_credit),
                    "reason": reason or "Customer return",
                    "refund_method": refund_method,
                    "replacement_invoice_id": payload.get(
                        "replacement_invoice_id"
                    ),
                    "created_by_id": current_user.get("id"),
                    "created_by_name": current_user.get("full_name"),
                    "created_at": now,
                }

                credit_note_doc = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "credit_note_number": credit_note_number,
                    "return_id": return_id,
                    "original_invoice_id": invoice_id,
                    "original_invoice_number": invoice.get("invoice_number"),
                    "customer_id": invoice.get("customer_id"),
                    "customer_name": invoice.get("customer_name"),
                    "amount": float(total_credit),
                    "reason": reason or "Customer return",
                    "created_by": current_user.get("full_name"),
                    "created_at": now,
                }

                db.returns.insert_one(return_doc, session=session)
                db.credit_notes.insert_one(credit_note_doc, session=session)

                for line in return_lines:
                    product_update = db.products.update_one(
                        {
                            "id": line["product_id"],
                            "tenant_id": tenant_id,
                        },
                        {"$inc": {"stock": line["quantity"]}},
                        session=session,
                    )

                    if product_update.matched_count != 1:
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                f"Product for returned item "
                                f"{line['name']} was not found"
                            ),
                        )

                    db.stock_movements.insert_one(
                        {
                            "id": str(uuid.uuid4()),
                            "tenant_id": tenant_id,
                            "product_id": line["product_id"],
                            "product_name": line["name"],
                            "movement_type": "CUSTOMER_RETURN",
                            "quantity": line["quantity"],
                            "reference_id": return_id,
                            "reference_type": return_type,
                            "created_at": now,
                        },
                        session=session,
                    )

                return_doc.pop("_id", None)
                return {
                    **return_doc,
                    "credit_note_number": credit_note_number,
                }

    except HTTPException:
        raise
    except Exception as error:
        # Keep the transaction fail-safe; a partial return must not be saved.
        raise HTTPException(
            status_code=503,
            detail=(
                "Return could not be completed. Confirm MongoDB is configured "
                "as a replica set and check the backend logs."
            ),
        ) from error