import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, Optional, List
from app.core.database import get_database
from app.services.gst_engine import GSTCalculationEngine

class InvoiceService:
    @staticmethod
    def get_next_invoice_number(tenant_id: str, prefix: str = "INV", branch_code: str = "HQ") -> str:
        """
        Concurrency-safe invoice number generator using MongoDB atomic find_one_and_update
        """
        db = get_database()
        current_year = datetime.now(timezone.utc).year
        counter_key = f"{tenant_id}_{branch_code}_{current_year}"
        
        # In mongomock or real MongoDB, find and increment counter
        counter_doc = db.counters.find_one({"_id": counter_key})
        if not counter_doc:
            db.counters.insert_one({"_id": counter_key, "seq": 1})
            next_seq = 1
        else:
            db.counters.update_one({"_id": counter_key}, {"$inc": {"seq": 1}})
            next_seq = counter_doc.get("seq", 0) + 1

        formatted_seq = f"{next_seq:04d}"
        return f"{prefix}-{current_year}-{formatted_seq}"

    @staticmethod
    def create_invoice(
        tenant_id: str,
        user_id: str,
        user_name: str,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        db = get_database()

        # 1. Fetch Tenant Settings for Seller Details
        tenant = db.tenants.find_one({"id": tenant_id}) or {}
        seller_state = tenant.get("state", "Delhi")
        invoice_prefix = tenant.get("invoice_prefix", "INV")
        branch_id = payload.get("branch_id", tenant.get("default_branch_id", "HQ"))

        # 2. Extract buyer state for GST calculation
        buyer_state = payload.get("customer_state") or seller_state

        # 3. Calculate GST breakdown
        items = payload.get("items", [])
        discount_percentage = Decimal(str(payload.get("discount_percentage", 0)))
        flat_discount = Decimal(str(payload.get("flat_discount", 0)))
        shipping_charges = Decimal(str(payload.get("shipping_charges", 0)))

        calc_result = GSTCalculationEngine.calculate_invoice_totals(
            items=items,
            seller_state=seller_state,
            buyer_state=buyer_state,
            discount_percentage=discount_percentage,
            flat_discount=flat_discount,
            shipping_charges=shipping_charges
        )

        # 4. Generate unique invoice number
        invoice_number = payload.get("invoice_number") or InvoiceService.get_next_invoice_number(tenant_id, invoice_prefix, branch_id)
        invoice_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # 5. Payment details handling
        payments = payload.get("payments", [])
        total_paid = Decimal('0.00')
        payment_records = []

        if payments:
            for p in payments:
                amt = Decimal(str(p.get("amount", 0)))
                total_paid += amt
                payment_records.append({
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "invoice_id": invoice_id,
                    "payment_method": p.get("method", "CASH"),
                    "amount": float(amt),
                    "reference": p.get("reference", ""),
                    "created_at": now
                })
        else:
            # Fallback if single payment method passed
            payment_method = payload.get("payment_method", "CASH")
            amount_paid = Decimal(str(payload.get("paid_amount", calc_result["final_payable"])))
            total_paid = amount_paid
            payment_records.append({
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "invoice_id": invoice_id,
                "payment_method": payment_method,
                "amount": float(total_paid),
                "reference": payload.get("payment_reference", ""),
                "created_at": now
            })

        final_payable_dec = Decimal(str(calc_result["final_payable"]))
        balance_due = max(Decimal('0.00'), final_payable_dec - total_paid)

        if total_paid >= final_payable_dec:
            payment_status = "PAID"
        elif total_paid > Decimal('0.00'):
            payment_status = "PARTIAL"
        else:
            payment_status = "UNPAID"

        # 6. Build complete invoice record
        invoice_doc = {
            "id": invoice_id,
            "tenant_id": tenant_id,
            "invoice_number": invoice_number,
            "invoice_type": payload.get("invoice_type", "REGULAR"), # REGULAR, RESTAURANT_DINE_IN, WHOLESALE_B2B
            "branch_id": branch_id,
            "business_category": tenant.get("business_category", "grocery"),
            "customer_id": payload.get("customer_id"),
            "customer_name": payload.get("customer_name", "Walk-in Customer"),
            "customer_phone": payload.get("customer_phone", ""),
            "customer_email": payload.get("customer_email", ""),
            "customer_gstin": payload.get("customer_gstin", ""),
            "customer_address": payload.get("customer_address", ""),
            "customer_state": buyer_state,
            "seller_gstin": tenant.get("gstin", ""),
            "seller_name": tenant.get("name", "LAX360 Store"),
            "seller_address": tenant.get("address", ""),
            "seller_phone": tenant.get("phone", ""),
            "seller_state": seller_state,
            "items": calc_result["items"],
            "subtotal": calc_result["subtotal"],
            "total_taxable": calc_result["total_taxable"],
            "item_discounts": calc_result["item_discounts"],
            "invoice_discount": calc_result["invoice_discount"],
            "cgst_amount": calc_result["cgst_amount"],
            "sgst_amount": calc_result["sgst_amount"],
            "igst_amount": calc_result["igst_amount"],
            "total_tax": calc_result["total_tax"],
            "shipping_charges": calc_result["shipping_charges"],
            "grand_total": calc_result["grand_total"],
            "round_off": calc_result["round_off"],
            "final_payable": calc_result["final_payable"],
            "amount_in_words": calc_result["amount_in_words"],
            "hsn_summary": calc_result["hsn_summary"],
            "is_inter_state": calc_result["is_inter_state"],
            "paid_amount": float(total_paid),
            "balance_due": float(balance_due),
            "payment_status": payment_status,
            "payments": payment_records,
            "notes": payload.get("notes", "Thank you for doing business with us!"),
            "terms": payload.get("terms", "Goods once sold cannot be returned after 7 days."),
            "created_by_id": user_id,
            "created_by_name": user_name,
            "status": "COMPLETED",
            "metadata": payload.get("metadata", {}), # For restaurant table_no, prescription doctor, imei, etc.
            "created_at": now,
            "updated_at": now
        }

        # 7. Insert to database
        db.invoices.insert_one(invoice_doc)

        # 8. Insert individual payments
        if payment_records:
            # Make a copy for insert so MongoDB does not mutate invoice_doc
            insert_payments = [dict(p) for p in payment_records]
            db.payments.insert_many(insert_payments)

        # 9. Stock deduction and movement logging
        for item in calc_result["items"]:
            prod_id = item.get("product_id")
            qty_sold = float(item.get("quantity", 1))
            if prod_id:
                # Deduct from product stock
                db.products.update_one(
                    {"id": prod_id, "tenant_id": tenant_id},
                    {"$inc": {"stock": -qty_sold}}
                )
                # Log stock movement
                db.stock_movements.insert_one({
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "product_id": prod_id,
                    "product_name": item.get("name"),
                    "movement_type": "SALE",
                    "quantity": -qty_sold,
                    "reference_id": invoice_id,
                    "reference_type": "INVOICE",
                    "created_at": now
                })

        # 10. Update customer balance if registered customer
        cust_id = payload.get("customer_id")
        if cust_id:
            db.customers.update_one(
                {"id": cust_id, "tenant_id": tenant_id},
                {
                    "$inc": {"total_spent": calc_result["final_payable"], "outstanding_balance": float(balance_due)},
                    "$set": {"last_purchase_date": now}
                }
            )

        # Remove MongoDB _id before returning
        invoice_doc.pop("_id", None)
        return invoice_doc
