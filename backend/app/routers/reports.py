from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user

router = APIRouter(prefix="/reports", tags=["Financial & GST Reports"])

@router.get("/sales")
def get_sales_report(
    period: str = Query("monthly", pattern="^(daily|monthly|yearly)$"),
    current_user: dict = Depends(get_current_tenant_user)
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    invoices = list(db.invoices.find({"tenant_id": tenant_id, "status": "COMPLETED"}))

    period_data = {}
    for inv in invoices:
        date_str = inv.get("created_at", "")[:10]
        if period == "daily":
            key = date_str
        elif period == "monthly":
            key = date_str[:7] # YYYY-MM
        else:
            key = date_str[:4] # YYYY

        total = float(inv.get("final_payable", 0))
        tax = float(inv.get("total_tax", 0))

        if key not in period_data:
            period_data[key] = {"period": key, "sales": 0.0, "tax": 0.0, "invoices_count": 0}

        period_data[key]["sales"] += total
        period_data[key]["tax"] += tax
        period_data[key]["invoices_count"] += 1

    sorted_result = sorted(period_data.values(), key=lambda x: x["period"])
    return {
        "period": period,
        "records": sorted_result,
        "grand_total_sales": sum(r["sales"] for r in sorted_result),
        "grand_total_tax": sum(r["tax"] for r in sorted_result)
    }

@router.get("/gst-gstr1")
def get_gstr1_report(
    month: Optional[str] = None, # YYYY-MM
    current_user: dict = Depends(get_current_tenant_user)
):
    """
    GSTR-1 Tax return preparation: B2B vs B2C, HSN/SAC classification, and Tax Split
    """
    db = get_database()
    tenant_id = current_user["tenant_id"]
    query = {"tenant_id": tenant_id, "status": "COMPLETED"}
    if month:
        query["created_at"] = {"$regex": f"^{month}"}

    invoices = list(db.invoices.find(query))

    b2b_invoices = []
    b2c_invoices = []
    hsn_summary_aggregate = {}

    total_taxable = 0.0
    total_cgst = 0.0
    total_sgst = 0.0
    total_igst = 0.0

    for inv in invoices:
        taxable = float(inv.get("total_taxable", 0))
        cgst = float(inv.get("cgst_amount", 0))
        sgst = float(inv.get("sgst_amount", 0))
        igst = float(inv.get("igst_amount", 0))

        total_taxable += taxable
        total_cgst += cgst
        total_sgst += sgst
        total_igst += igst

        clean_inv = {
            "invoice_number": inv.get("invoice_number"),
            "date": inv.get("created_at")[:10],
            "customer_name": inv.get("customer_name"),
            "customer_gstin": inv.get("customer_gstin"),
            "taxable_amount": taxable,
            "cgst": cgst,
            "sgst": sgst,
            "igst": igst,
            "total_value": float(inv.get("final_payable", 0))
        }

        if inv.get("customer_gstin") and len(inv.get("customer_gstin").strip()) == 15:
            b2b_invoices.append(clean_inv)
        else:
            b2c_invoices.append(clean_inv)

        # Aggregate HSN
        for hsn in inv.get("hsn_summary", []):
            code = hsn.get("hsn_sac", "COMMON")
            if code not in hsn_summary_aggregate:
                hsn_summary_aggregate[code] = {
                    "hsn_sac": code,
                    "taxable_amount": 0.0,
                    "cgst_amount": 0.0,
                    "sgst_amount": 0.0,
                    "igst_amount": 0.0,
                    "total_tax": 0.0
                }
            hsn_summary_aggregate[code]["taxable_amount"] += float(hsn.get("taxable_amount", 0))
            hsn_summary_aggregate[code]["cgst_amount"] += float(hsn.get("cgst_amount", 0))
            hsn_summary_aggregate[code]["sgst_amount"] += float(hsn.get("sgst_amount", 0))
            hsn_summary_aggregate[code]["igst_amount"] += float(hsn.get("igst_amount", 0))
            hsn_summary_aggregate[code]["total_tax"] += float(hsn.get("total_tax", 0))

    return {
        "summary": {
            "total_taxable_value": round(total_taxable, 2),
            "total_cgst": round(total_cgst, 2),
            "total_sgst": round(total_sgst, 2),
            "total_igst": round(total_igst, 2),
            "total_tax_collected": round(total_cgst + total_sgst + total_igst, 2),
            "b2b_count": len(b2b_invoices),
            "b2c_count": len(b2c_invoices)
        },
        "b2b_table": b2b_invoices,
        "b2c_table": b2c_invoices,
        "hsn_summary_table": list(hsn_summary_aggregate.values())
    }

@router.get("/profit-loss")
def get_profit_and_loss(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    invoices = list(db.invoices.find({"tenant_id": tenant_id, "status": "COMPLETED"}))
    purchases = list(db.purchases.find({"tenant_id": tenant_id}))
    expenses = list(db.expenses.find({"tenant_id": tenant_id}))

    gross_revenue = sum(float(inv.get("subtotal", 0)) for inv in invoices)
    taxes_collected = sum(float(inv.get("total_tax", 0)) for inv in invoices)
    total_sales_with_tax = sum(float(inv.get("final_payable", 0)) for inv in invoices)

    cogs_purchases = sum(float(p.get("total_amount", 0)) for p in purchases)
    operating_expenses = sum(float(e.get("amount", 0)) for e in expenses)

    gross_profit = gross_revenue - cogs_purchases
    net_profit = gross_profit - operating_expenses
    profit_margin = round((net_profit / max(1.0, gross_revenue)) * 100.0, 2)

    return {
        "gross_revenue": round(gross_revenue, 2),
        "total_sales_with_tax": round(total_sales_with_tax, 2),
        "taxes_collected": round(taxes_collected, 2),
        "cogs_purchases": round(cogs_purchases, 2),
        "gross_profit": round(gross_profit, 2),
        "operating_expenses": round(operating_expenses, 2),
        "net_profit": round(net_profit, 2),
        "net_margin_percentage": profit_margin
    }
