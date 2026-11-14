
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query

from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user, require_roles
from app.models.schemas import StockAdjustmentRequest


router = APIRouter(prefix="/inventory", tags=["Inventory Management"])


@router.get("/stock")
def get_inventory_stock(
    search: Optional[str] = None,
    low_stock_only: bool = False,
    current_user: dict = Depends(get_current_tenant_user)
):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    query = {"tenant_id": tenant_id}

    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"product_name": search_regex},
            {"name": search_regex},
            {"sku": search_regex},
            {"barcode": search_regex}
        ]

    inventory_items = list(
        db.inventory.find(query).sort("product_name", 1)
    )

    stock_list = []

    for inventory_item in inventory_items:
        product_id = inventory_item.get("product_id")

        product = db.products.find_one({
            "tenant_id": tenant_id,
            "id": product_id
        }) or {}

        current_stock = float(
            inventory_item.get(
                "quantity",
                product.get("stock", 0)
            ) or 0
        )

        raw_threshold = inventory_item.get("low_stock_threshold")
        if raw_threshold is None:
            raw_threshold = product.get("low_stock_threshold")

        threshold = float(
            5 if raw_threshold is None else raw_threshold
        )

        purchase_price = float(
            inventory_item.get(
                "purchase_price",
                product.get("purchase_price", 0)
            ) or 0
        )

        selling_price = float(
            inventory_item.get(
                "selling_price",
                product.get("selling_price", 0)
            ) or 0
        )

        name = (
            inventory_item.get("product_name")
            or product.get("name")
        )

        is_low = current_stock <= threshold

        if low_stock_only and not is_low:
            continue

        stock_list.append({
            "product_id": product_id,
            "name": name,
            "sku": inventory_item.get("sku") or product.get("sku"),
            "barcode": inventory_item.get("barcode") or product.get("barcode"),
            "category": inventory_item.get("category") or product.get("category"),
            "unit": inventory_item.get("unit") or product.get("unit", "Pcs"),
            "current_stock": current_stock,
            "low_stock_threshold": threshold,
            "purchase_price": purchase_price,
            "selling_price": selling_price,
            "stock_valuation": round(
                current_stock * purchase_price, 2
            ),
            "is_low_stock": is_low,
            "custom_fields": product.get("custom_fields", {})
        })

    return {
        "items": stock_list,
        "total_valuation": sum(
            item["stock_valuation"] for item in stock_list
        ),
        "total_items": len(stock_list)
    }


@router.post("/adjust")
def adjust_stock(
    payload: StockAdjustmentRequest,
    current_user: dict = Depends(
        require_roles([
            "business_owner",
            "business_admin",
            "inventory_manager"
        ])
    )
):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    product = db.products.find_one({
        "tenant_id": tenant_id,
        "id": payload.product_id
    })

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    now = datetime.now(timezone.utc).isoformat()
    adjustment_type = payload.adjustment_type.upper()

    if adjustment_type in ["REDUCE", "DAMAGE", "EXPIRY"]:
        change_qty = -abs(float(payload.quantity))
    else:
        change_qty = abs(float(payload.quantity))

    old_stock = float(product.get("stock", 0) or 0)
    new_stock = old_stock + change_qty

    if new_stock < 0:
        raise HTTPException(
            status_code=400,
            detail="Insufficient stock for this adjustment"
        )

    db.products.update_one(
        {
            "tenant_id": tenant_id,
            "id": payload.product_id
        },
        {
            "$set": {
                "stock": new_stock,
                "updated_at": now
            }
        }
    )

    existing_inventory = db.inventory.find_one({
        "tenant_id": tenant_id,
        "product_id": payload.product_id
    })

    raw_threshold = (
        existing_inventory.get("low_stock_threshold")
        if existing_inventory
        else product.get("low_stock_threshold")
    )

    threshold = 5 if raw_threshold is None else raw_threshold

    db.inventory.update_one(
        {
            "tenant_id": tenant_id,
            "product_id": payload.product_id
        },
        {
            "$set": {
                "tenant_id": tenant_id,
                "product_id": payload.product_id,
                "product_name": product.get("name"),
                "sku": product.get("sku"),
                "barcode": product.get("barcode"),
                "category": product.get("category"),
                "unit": product.get("unit", "Pcs"),
                "quantity": new_stock,
                "low_stock_threshold": threshold,
                "purchase_price": product.get("purchase_price", 0),
                "selling_price": product.get("selling_price", 0),
                "updated_at": now
            },
            "$setOnInsert": {
                "created_at": now
            }
        },
        upsert=True
    )

    movement_id = str(uuid.uuid4())

    movement_doc = {
        "id": movement_id,
        "tenant_id": tenant_id,
        "product_id": payload.product_id,
        "product_name": product.get("name"),
        "movement_type": f"ADJUSTMENT_{adjustment_type}",
        "quantity": change_qty,
        "reason": payload.reason,
        "branch_id": payload.branch_id,
        "reference_id": movement_id,
        "reference_type": "MANUAL_ADJUSTMENT",
        "created_by": current_user.get("full_name"),
        "created_at": now
    }

    db.stock_movements.insert_one(movement_doc)
    movement_doc.pop("_id", None)

    return {
        "message": f"Stock adjusted by {change_qty}",
        "new_stock": new_stock,
        "movement": movement_doc
    }


@router.get("/movements")
def list_stock_movements(
    product_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_tenant_user)
):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    query = {"tenant_id": tenant_id}

    if product_id:
        query["product_id"] = product_id

    movements = list(
        db.stock_movements.find(query)
        .sort("created_at", -1)
        .limit(limit)
    )

    for movement in movements:
        movement.pop("_id", None)

    return movements
