
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user, require_roles
from app.models.schemas import ProductCreateRequest, ProductUpdateRequest

router = APIRouter(prefix="/products", tags=["Product Management"])


@router.get("")
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: Optional[bool] = False,
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
            {"name": search_regex},
            {"sku": search_regex},
            {"barcode": search_regex},
            {"category": search_regex}
        ]

    if category:
        query["category"] = category

    if low_stock:
        query["$expr"] = {
            "$lte": [
                {"$ifNull": ["$stock", 0]},
                {"$ifNull": ["$low_stock_threshold", 5]}
            ]
        }

    skip = (page - 1) * limit
    total_count = db.products.count_documents(query)

    cursor = db.products.find(query).sort(
        "created_at", -1
    ).skip(skip).limit(limit)

    items = list(cursor)

    for p in items:
        p.pop("_id", None)

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit
    }


@router.get("/barcode/{barcode}")
def get_product_by_barcode(
    barcode: str,
    current_user: dict = Depends(get_current_tenant_user)
):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    product = db.products.find_one({
        "tenant_id": tenant_id,
        "barcode": barcode
    })

    if not product:
        raise HTTPException(
            status_code=404,
            detail="No product found with this barcode"
        )

    product.pop("_id", None)
    return product


@router.get("/{product_id}")
def get_product(
    product_id: str,
    current_user: dict = Depends(get_current_tenant_user)
):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    product = db.products.find_one({
        "tenant_id": tenant_id,
        "id": product_id
    })

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product.pop("_id", None)
    return product


@router.post("")
def create_product(
    payload: ProductCreateRequest,
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

    if payload.sku:
        existing = db.products.find_one({
            "tenant_id": tenant_id,
            "sku": payload.sku.strip()
        })

        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Product with SKU '{payload.sku}' already exists"
            )

    prod_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    initial_stock = float(payload.stock or 0)

    product_doc = {
        "id": prod_id,
        "tenant_id": tenant_id,
        "name": payload.name,
        "sku": payload.sku.strip(),
        "barcode": payload.barcode.strip() if payload.barcode else payload.sku.strip(),
        "category": payload.category,
        "description": payload.description or "",
        "unit": payload.unit,
        "purchase_price": payload.purchase_price,
        "selling_price": payload.selling_price,
        "tax_rate": payload.tax_rate,
        "is_tax_inclusive": payload.is_tax_inclusive,
        "hsn_sac": payload.hsn_sac or "9983",
        "stock": initial_stock,
        "low_stock_threshold": payload.low_stock_threshold,
        "image_url": payload.image_url or "",
        "custom_fields": payload.custom_fields or {},
        "variants": payload.variants or [],
        "created_at": now,
        "updated_at": now
    }

    # Save product
    db.products.insert_one(product_doc)

    # Create corresponding inventory document
    inventory_doc = {
        "tenant_id": tenant_id,
        "product_id": prod_id,
        "product_name": payload.name,
        "sku": payload.sku,
        "barcode": product_doc["barcode"],
        "category": payload.category,
        "unit": payload.unit,
        "quantity": initial_stock,
        "low_stock_threshold": payload.low_stock_threshold,
        "purchase_price": payload.purchase_price,
        "selling_price": payload.selling_price,
        "created_at": now,
        "updated_at": now
    }

    db.inventory.update_one(
        {
            "tenant_id": tenant_id,
            "product_id": prod_id
        },
        {"$set": inventory_doc},
        upsert=True
    )

    # Record initial stock movement
    if initial_stock > 0:
        db.stock_movements.insert_one({
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "product_id": prod_id,
            "product_name": payload.name,
            "movement_type": "INITIAL_STOCK",
            "quantity": initial_stock,
            "reference_id": "INIT",
            "reference_type": "MANUAL",
            "created_at": now
        })

    product_doc.pop("_id", None)

    return product_doc


@router.put("/{product_id}")
def update_product(
    product_id: str,
    payload: ProductUpdateRequest,
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

    existing = db.products.find_one({
        "tenant_id": tenant_id,
        "id": product_id
    })

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    update_data = {
        k: v
        for k, v in payload.dict(exclude_unset=True).items()
        if v is not None
    }

    now = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = now

    old_stock = float(existing.get("stock", 0))
    new_stock = float(update_data.get("stock", old_stock))
    stock_changed = new_stock != old_stock

    db.products.update_one(
        {
            "tenant_id": tenant_id,
            "id": product_id
        },
        {"$set": update_data}
    )

    updated = db.products.find_one({
        "tenant_id": tenant_id,
        "id": product_id
    })

    # Synchronize inventory whenever product details or stock change
    db.inventory.update_one(
        {
            "tenant_id": tenant_id,
            "product_id": product_id
        },
        {
            "$set": {
                "tenant_id": tenant_id,
                "product_id": product_id,
                "product_name": updated.get("name"),
                "sku": updated.get("sku"),
                "barcode": updated.get("barcode"),
                "category": updated.get("category"),
                "unit": updated.get("unit", "Pcs"),
                "quantity": new_stock,
                "low_stock_threshold": updated.get("low_stock_threshold", 5),
                "purchase_price": updated.get("purchase_price", 0),
                "selling_price": updated.get("selling_price", 0),
                "updated_at": now
            },
            "$setOnInsert": {
                "created_at": now
            }
        },
        upsert=True
    )

    # Record stock changes made during product editing
    if stock_changed:
        db.stock_movements.insert_one({
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "product_id": product_id,
            "product_name": updated.get("name"),
            "movement_type": "PRODUCT_STOCK_UPDATE",
            "quantity": new_stock - old_stock,
            "reference_id": product_id,
            "reference_type": "PRODUCT_UPDATE",
            "created_at": now
        })

    updated.pop("_id", None)
    return updated


@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    current_user: dict = Depends(
        require_roles([
            "business_owner",
            "business_admin"
        ])
    )
):
    db = get_database()
    tenant_id = current_user["tenant_id"]

    res = db.products.delete_one({
        "tenant_id": tenant_id,
        "id": product_id
    })

    if res.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Remove corresponding inventory record
    db.inventory.delete_one({
        "tenant_id": tenant_id,
        "product_id": product_id
    })

    return {
        "message": "Product removed successfully"
    }
