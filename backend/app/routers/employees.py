import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_database
from app.core.security import get_password_hash
from app.dependencies.auth import get_current_tenant_user, require_roles
from app.models.schemas import EmployeeCreateRequest

router = APIRouter(prefix="/employees", tags=["Employee Management"])

@router.get("")
def list_employees(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    employees = list(db.users.find({"tenant_id": tenant_id}))
    for e in employees:
        e.pop("_id", None)
        e.pop("hashed_password", None)
    return employees

@router.post("")
def add_employee(
    payload: EmployeeCreateRequest,
    current_user: dict = Depends(require_roles(["business_owner", "business_admin"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    existing = db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    emp_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": emp_id,
        "tenant_id": tenant_id,
        "email": payload.email.lower(),
        "full_name": payload.full_name,
        "phone": payload.phone or "",
        "hashed_password": get_password_hash(payload.password),
        "role": payload.role.lower(),
        "branch_ids": [payload.branch_id or "HQ"],
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    db.users.insert_one(doc)

    doc.pop("_id", None)
    doc.pop("hashed_password", None)
    return doc

@router.put("/{employee_id}/toggle-status")
def toggle_employee_status(
    employee_id: str,
    current_user: dict = Depends(require_roles(["business_owner", "business_admin"]))
):
    db = get_database()
    tenant_id = current_user["tenant_id"]
    user = db.users.find_one({"tenant_id": tenant_id, "id": employee_id})
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_status = not user.get("is_active", True)
    db.users.update_one({"tenant_id": tenant_id, "id": employee_id}, {"$set": {"is_active": new_status}})
    return {"message": f"Employee status updated to {'active' if new_status else 'deactivated'}", "is_active": new_status}
