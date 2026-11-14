from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user
from app.services.config_engine import get_category_config

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
def get_dashboard_metrics(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    current_month_str = now.strftime("%Y-%m")

    # Fetch tenant
    tenant = db.tenants.find_one({"id": tenant_id}) or {}
    category = tenant.get("business_category", "grocery")
    category_config = get_category_config(category)

    # Invoices stats
    invoices = list(db.invoices.find({"tenant_id": tenant_id}))
    total_sales = 0.0
    today_sales = 0.0
    month_sales = 0.0
    pending_payments = 0.0
    total_invoices_count = len(invoices)

    # Weekly sales graph data
    days_map = {}
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        day_label = (now - timedelta(days=i)).strftime("%a")
        days_map[day_date] = {"date": day_label, "sales": 0.0, "invoices": 0}

    for inv in invoices:
        inv_total = float(inv.get("final_payable", 0))
        paid = float(inv.get("paid_amount", 0))
        balance = float(inv.get("balance_due", 0))
        inv_created = inv.get("created_at", "")[:10]

        total_sales += inv_total
        pending_payments += balance

        if inv_created == today_str:
            today_sales += inv_total
        if inv_created.startswith(current_month_str):
            month_sales += inv_total

        if inv_created in days_map:
            days_map[inv_created]["sales"] += inv_total
            days_map[inv_created]["invoices"] += 1

    chart_data = list(days_map.values())

    # Expenses stats
    expenses = list(db.expenses.find({"tenant_id": tenant_id}))
    total_expenses = sum(float(e.get("amount", 0)) for e in expenses)

    # Low stock products
    products = list(db.products.find({"tenant_id": tenant_id}))
    low_stock_items = []
    total_products_count = len(products)
    for p in products:
        stock = float(p.get("stock", 0))
        threshold = float(p.get("low_stock_threshold", 5))
        if stock <= threshold:
            low_stock_items.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "stock": stock,
                "unit": p.get("unit", "Pcs"),
                "sku": p.get("sku", "")
            })

    # Recent 5 invoices
    recent_invoices = sorted(invoices, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    for r in recent_invoices:
        r.pop("_id", None)

    # Business Category-Specific Metrics
    category_metrics = {}
    if category == "restaurant":
        tables = list(db.restaurant_tables.find({"tenant_id": tenant_id}))
        occupied = sum(1 for t in tables if t.get("status") == "OCCUPIED")
        active_kots = db.kots.count_documents({"tenant_id": tenant_id, "status": {"$in": ["PENDING", "COOKING"]}})
        category_metrics = {
            "total_tables": len(tables),
            "occupied_tables": occupied,
            "active_kots": active_kots,
            "avg_table_ticket": round(total_sales / max(1, total_invoices_count), 2)
        }
    elif category == "pharmacy":
        expired_count = 0
        rx_count = db.invoices.count_documents({"tenant_id": tenant_id, "metadata.doctor_name": {"$exists": True, "$ne": ""}})
        category_metrics = {
            "expired_medicines_count": expired_count,
            "prescriptions_dispensed": rx_count,
            "generic_drugs_count": total_products_count
        }
    elif category == "textile":
        category_metrics = {
            "total_styles": total_products_count,
            "variants_tracked": total_products_count * 4,
            "exchanges_this_month": db.returns.count_documents({"tenant_id": tenant_id})
        }
    elif category == "wholesale":
        customers = list(db.customers.find({"tenant_id": tenant_id}))
        outstanding = sum(float(c.get("outstanding_balance", 0)) for c in customers)
        dealers = sum(1 for c in customers if c.get("customer_tier") in ["DEALER", "DISTRIBUTOR"])
        category_metrics = {
            "active_dealers": dealers,
            "total_receivables": round(outstanding, 2),
            "pending_dispatch_orders": 0
        }
    elif category == "electronics":
        category_metrics = {
            "serialized_devices_in_stock": total_products_count,
            "active_service_repairs": db.repair_tickets.count_documents({"tenant_id": tenant_id, "status": "IN_PROGRESS"}),
            "active_warranties": total_invoices_count
        }
    else: # grocery
        category_metrics = {
            "items_in_catalog": total_products_count,
            "fast_moving_items": min(12, total_products_count),
            "expiring_batches": 0
        }

    # Active platform announcements
    announcements = list(db.announcements.find({
        "is_active": True,
        "$or": [{"target_category": "all"}, {"target_category": category}]
    }).sort("created_at", -1).limit(3))
    for a in announcements:
        a.pop("_id", None)

    return {
        "business_category": category,
        "category_name": category_config.get("category_name"),
        "theme_accent": category_config.get("theme_accent"),
        "announcements": announcements,
        "summary": {
            "total_sales": round(total_sales, 2),
            "today_sales": round(today_sales, 2),
            "month_sales": round(month_sales, 2),
            "total_invoices": total_invoices_count,
            "pending_payments": round(pending_payments, 2),
            "total_expenses": round(total_expenses, 2),
            "net_profit": round(total_sales - total_expenses, 2),
            "total_products": total_products_count,
            "low_stock_count": len(low_stock_items)
        },
        "sales_trend": chart_data,
        "low_stock_alerts": low_stock_items[:5],
        "recent_invoices": recent_invoices,
        "category_metrics": category_metrics,
        "widgets_layout": category_config.get("dashboard_widgets", [])
    }
