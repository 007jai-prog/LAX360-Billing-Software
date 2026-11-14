from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user, require_roles

router = APIRouter(prefix="/subscriptions", tags=["Subscription Management"])

SAAS_PLANS = [
    {
        "id": "starter",
        "name": "Starter",
        "monthly_price": 499,
        "yearly_price": 4990,
        "currency": "INR",
        "max_invoices_per_month": 300,
        "max_users": 2,
        "max_branches": 1,
        "features": ["Single Branch", "Standard Invoicing", "Basic Reports", "GST Filing Summary", "Email Support"],
        "recommended": False
    },
    {
        "id": "basic",
        "name": "Basic",
        "monthly_price": 999,
        "yearly_price": 9990,
        "currency": "INR",
        "max_invoices_per_month": 1000,
        "max_users": 5,
        "max_branches": 2,
        "features": ["2 Branches", "Barcode & POS Engine", "Inventory Tracking", "GSTR-1 Reports", "Priority Support"],
        "recommended": False
    },
    {
        "id": "professional",
        "name": "Professional",
        "monthly_price": 1999,
        "yearly_price": 19990,
        "currency": "INR",
        "max_invoices_per_month": 5000,
        "max_users": 15,
        "max_branches": 5,
        "features": ["5 Branches", "Full Category Modules (KDS, Matrix, Serial)", "Credit Limits", "Stock Transfer", "Phone & WhatsApp Support"],
        "recommended": True
    },
    {
        "id": "business",
        "name": "Business",
        "monthly_price": 3499,
        "yearly_price": 34990,
        "currency": "INR",
        "max_invoices_per_month": 20000,
        "max_users": 50,
        "max_branches": 15,
        "features": ["15 Branches", "Unlimited Invoices", "Multi-warehouse Logistics", "Advanced Audit Logs", "Dedicated Account Manager"],
        "recommended": False
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "monthly_price": 6999,
        "yearly_price": 69990,
        "currency": "INR",
        "max_invoices_per_month": 999999,
        "max_users": 999,
        "max_branches": 99,
        "features": ["Unlimited Branches & Users", "Custom ERP Integrations", "SLA 99.99%", "Custom GST Plugins", "24/7 Premium Support"],
        "recommended": False
    }
]

@router.get("/plans")
def list_plans():
    return SAAS_PLANS

@router.get("/current")
def get_current_subscription(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    tenant = db.tenants.find_one({"id": tenant_id}) or {}

    sub = tenant.get("subscription", {
        "plan": "starter",
        "status": "ACTIVE",
        "billing_cycle": "monthly",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    })

    # Count current usage
    invoices_this_month = db.invoices.count_documents({"tenant_id": tenant_id})
    users_count = db.users.count_documents({"tenant_id": tenant_id})
    branches_count = db.branches.count_documents({"tenant_id": tenant_id})

    matched_plan = next((p for p in SAAS_PLANS if p["id"].lower() == sub.get("plan", "starter").lower()), SAAS_PLANS[0])

    return {
        "subscription": sub,
        "plan_details": matched_plan,
        "usage": {
            "invoices_used": invoices_this_month,
            "invoices_limit": matched_plan["max_invoices_per_month"],
            "users_active": users_count,
            "users_limit": matched_plan["max_users"],
            "branches_active": branches_count,
            "branches_limit": matched_plan["max_branches"]
        }
    }

@router.post("/upgrade")
def upgrade_subscription(
    payload: dict,
    current_user: dict = Depends(require_roles(["business_owner"]))
):
    plan_id = payload.get("plan_id", "professional").lower()
    billing_cycle = payload.get("billing_cycle", "monthly")
    db = get_database()
    tenant_id = current_user["tenant_id"]

    matched = next((p for p in SAAS_PLANS if p["id"] == plan_id), None)
    if not matched:
        raise HTTPException(status_code=400, detail="Invalid plan selected")

    days = 365 if billing_cycle == "yearly" else 30
    expires = (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")

    sub_data = {
        "plan": plan_id,
        "status": "ACTIVE",
        "billing_cycle": billing_cycle,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires
    }

    db.tenants.update_one({"id": tenant_id}, {"$set": {"subscription": sub_data}})
    return {"message": f"Successfully upgraded to {matched['name']} plan", "subscription": sub_data}
