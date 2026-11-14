import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user, require_roles
from app.models.schemas import ExpenseCreateRequest

router = APIRouter(prefix="/expenses", tags=["Expense Management"])

@router.get("")
def list_expenses(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_tenant_user)
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    query = {"tenant_id": tenant_id}

    if category:
        query["category"] = category

    skip = (page - 1) * limit
    total = db.expenses.count_documents(query)
    cursor = db.expenses.find(query).sort("date", -1).skip(skip).limit(limit)

    items = list(cursor)
    for e in items:
        e.pop("_id", None)

    return {"items": items, "total": total, "page": page, "limit": limit}

@router.post("")
def add_expense(
    payload: ExpenseCreateRequest,
    current_user: dict = Depends(require_roles(["business_owner", "business_admin", "accountant"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    exp_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": exp_id,
        "tenant_id": tenant_id,
        "category": payload.category,
        "amount": round(float(payload.amount), 2),
        "payment_method": payload.payment_method,
        "date": payload.date or now[:10],
        "description": payload.description or "",
        "reference": payload.reference or "",
        "created_by": current_user.get("full_name"),
        "created_at": now
    }
    db.expenses.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/summary")
def get_expense_summary(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    expenses = list(db.expenses.find({"tenant_id": tenant_id}))

    category_breakdown = {}
    total_amount = 0.0

    for e in expenses:
        cat = e.get("category", "General")
        amt = float(e.get("amount", 0))
        total_amount += amt
        category_breakdown[cat] = category_breakdown.get(cat, 0.0) + amt

    formatted_chart = [{"category": k, "amount": round(v, 2)} for k, v in category_breakdown.items()]
    return {
        "total_expenses": round(total_amount, 2),
        "by_category": formatted_chart
    }
