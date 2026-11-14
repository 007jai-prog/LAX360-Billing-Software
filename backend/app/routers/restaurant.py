import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_database
from app.dependencies.auth import get_current_tenant_user
from app.models.schemas import RestaurantTableCreateRequest, KOTCreateRequest


router = APIRouter(prefix="/restaurant", tags=["Restaurant & Cafe Operations"])

ACTIVE_KOT_STATUSES = ["PENDING", "COOKING", "READY"]
ALLOWED_KOT_STATUSES = {"PENDING", "COOKING", "READY", "SERVED"}
ALLOWED_TABLE_STATUSES = {"FREE", "OCCUPIED", "BILLING"}
ALLOWED_SERVICE_STATES = {"SERVING", "CLEANING", "REFILLING", "READY"}


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _get_tenant_id(current_user: dict):
    tenant_id = current_user.get("tenant_id")
    if tenant_id is None:
        raise HTTPException(status_code=401, detail="Tenant is not available")
    return tenant_id


def _remove_mongo_id(document: dict):
    if document:
        document.pop("_id", None)
    return document


def _elapsed_seconds(started_at, ended_at):
    """Return elapsed seconds between ISO timestamps, or zero if invalid."""
    if not started_at or not ended_at:
        return 0

    try:
        started = datetime.fromisoformat(
            str(started_at).replace("Z", "+00:00")
        )
        ended = datetime.fromisoformat(
            str(ended_at).replace("Z", "+00:00")
        )
        return max(0, int((ended - started).total_seconds()))
    except (TypeError, ValueError):
        return 0


def _start_table_service_state(db, tenant_id, table, new_state, now=None):
    """
    Close the previous service-stage event and start the next one.

    When entering READY, the completed duration is persisted on the table.
    READY has no running event, so the frontend can display a frozen timer.
    """
    now = now or _now_iso()
    table_id = table.get("id")
    old_state = str(table.get("service_state") or "").upper()
    old_started_at = table.get("service_state_started_at")
    old_event_id = table.get("active_service_event_id")

    if old_state == new_state:
        return db.restaurant_tables.find_one(
            {"tenant_id": tenant_id, "id": table_id}
        )

    completed_seconds = _elapsed_seconds(old_started_at, now)

    if old_event_id:
        db.restaurant_table_service_events.update_one(
            {
                "tenant_id": tenant_id,
                "table_id": table_id,
                "id": old_event_id,
                "ended_at": None,
            },
            {
                "$set": {
                    "ended_at": now,
                    "duration_seconds": completed_seconds,
                }
            },
        )

    table_updates = {
        "service_state": new_state,
        "service_state_started_at": now,
        "service_state_duration_seconds": 0,
        "active_service_event_id": None,
        "updated_at": now,
    }

    if new_state == "READY":
        # Freeze the duration of the stage that just ended.
        table_updates["service_state_duration_seconds"] = completed_seconds
    else:
        event_id = str(uuid.uuid4())

        db.restaurant_table_service_events.insert_one(
            {
                "id": event_id,
                "tenant_id": tenant_id,
                "table_id": table_id,
                "table_number": table.get("table_number"),
                "state": new_state,
                "started_at": now,
                "ended_at": None,
                "duration_seconds": None,
            }
        )

        table_updates["active_service_event_id"] = event_id

    db.restaurant_tables.update_one(
        {"tenant_id": tenant_id, "id": table_id},
        {"$set": table_updates},
    )

    return db.restaurant_tables.find_one(
        {"tenant_id": tenant_id, "id": table_id}
    )


@router.get("/tables")
def list_tables(current_user: dict = Depends(get_current_tenant_user)):
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    settings_id = f"restaurant_tables_initialized:{tenant_id}"
    marker_result = db.restaurant_table_settings.update_one(
        {"_id": settings_id},
        {
            "$setOnInsert": {
                "tenant_id": tenant_id,
                "initialized_at": _now_iso(),
            }
        },
        upsert=True,
    )

    # Seed defaults once per tenant.
    if marker_result.upserted_id is not None:
        existing_table = db.restaurant_tables.find_one(
            {"tenant_id": tenant_id}
        )

        if existing_table is None:
            now = _now_iso()
            default_tables = [
                {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "table_number": f"T-{number}",
                    "floor": "Ground Floor",
                    "capacity": 4 if number <= 4 else 6,
                    "status": "FREE",
                    "active_order": None,
                    "service_state": "READY",
                    "service_state_started_at": now,
                    "service_state_duration_seconds": 0,
                    "active_service_event_id": None,
                    "created_at": now,
                }
                for number in range(1, 9)
            ]
            db.restaurant_tables.insert_many(default_tables)

    tables = list(
        db.restaurant_tables.find({"tenant_id": tenant_id}).sort(
            "table_number", 1
        )
    )
    return [_remove_mongo_id(table) for table in tables]


@router.post("/tables")
def create_table(
    payload: RestaurantTableCreateRequest,
    current_user: dict = Depends(get_current_tenant_user),
):
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    table_number = payload.table_number.strip()
    if not table_number:
        raise HTTPException(status_code=422, detail="Table number is required")

    existing_tables = db.restaurant_tables.find(
        {"tenant_id": tenant_id},
        {"table_number": 1},
    )
    if any(
        str(table.get("table_number", "")).strip().casefold()
        == table_number.casefold()
        for table in existing_tables
    ):
        raise HTTPException(status_code=400, detail="Table number already exists")

    capacity = int(payload.capacity)
    if capacity < 1:
        raise HTTPException(
            status_code=422,
            detail="Table capacity must be greater than zero",
        )

    now = _now_iso()
    document = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "table_number": table_number,
        "floor": (payload.floor or "Main Floor").strip() or "Main Floor",
        "capacity": capacity,
        "status": "FREE",
        "active_order": None,
        "service_state": "READY",
        "service_state_started_at": now,
        "service_state_duration_seconds": 0,
        "active_service_event_id": None,
        "created_at": now,
    }

    db.restaurant_tables.insert_one(document)
    return _remove_mongo_id(document)


@router.post("/tables/merge")
def merge_tables(
    payload: dict,
    current_user: dict = Depends(get_current_tenant_user),
):
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    raw_table_ids = payload.get("table_ids")
    if not isinstance(raw_table_ids, list):
        raise HTTPException(status_code=422, detail="table_ids must be a list")

    table_ids = list(
        dict.fromkeys(
            str(table_id).strip()
            for table_id in raw_table_ids
            if table_id is not None and str(table_id).strip()
        )
    )

    if len(table_ids) < 2:
        raise HTTPException(
            status_code=422,
            detail="Select at least two tables to merge",
        )

    selected_tables = list(
        db.restaurant_tables.find(
            {"tenant_id": tenant_id, "id": {"$in": table_ids}}
        )
    )

    if len(selected_tables) != len(table_ids):
        raise HTTPException(
            status_code=404,
            detail="One or more selected tables were not found",
        )

    for table in selected_tables:
        table_number = table.get("table_number", "A selected table")

        if (
            str(table.get("status", "FREE")).upper() != "FREE"
            or table.get("active_order")
        ):
            raise HTTPException(
                status_code=409,
                detail=f"{table_number} must be free and have no active order",
            )

        if table.get("merge_group_id"):
            raise HTTPException(
                status_code=409,
                detail=f"{table_number} is already merged",
            )

    table_numbers = [
        table.get("table_number")
        for table in selected_tables
        if table.get("table_number")
    ]

    active_kot = db.kots.find_one(
        {
            "tenant_id": tenant_id,
            "table_number": {"$in": table_numbers},
            "status": {"$in": ACTIVE_KOT_STATUSES},
        }
    )
    if active_kot:
        raise HTTPException(
            status_code=409,
            detail="Tables with active kitchen tickets cannot be merged",
        )

    merge_group_id = str(uuid.uuid4())
    now = _now_iso()

    result = db.restaurant_tables.update_many(
        {
            "tenant_id": tenant_id,
            "id": {"$in": table_ids},
            "status": "FREE",
            "active_order": None,
            "merge_group_id": {"$exists": False},
        },
        {
            "$set": {
                "merge_group_id": merge_group_id,
                "updated_at": now,
            }
        },
    )

    if result.modified_count != len(table_ids):
        db.restaurant_tables.update_many(
            {
                "tenant_id": tenant_id,
                "id": {"$in": table_ids},
                "merge_group_id": merge_group_id,
            },
            {
                "$unset": {"merge_group_id": ""},
                "$set": {"updated_at": _now_iso()},
            },
        )
        raise HTTPException(
            status_code=409,
            detail="Tables changed while merging. Refresh and try again.",
        )

    merged_tables = list(
        db.restaurant_tables.find(
            {"tenant_id": tenant_id, "id": {"$in": table_ids}}
        ).sort("table_number", 1)
    )

    return {
        "message": "Tables merged successfully",
        "merge_group_id": merge_group_id,
        "tables": [_remove_mongo_id(table) for table in merged_tables],
    }


@router.put("/tables/{table_id}")
@router.patch("/tables/{table_id}")
def edit_table(
    table_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_tenant_user),
):
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    table = db.restaurant_tables.find_one(
        {"tenant_id": tenant_id, "id": table_id}
    )
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    updates = {}

    if "table_number" in payload:
        table_number = str(payload["table_number"] or "").strip()
        if not table_number:
            raise HTTPException(
                status_code=422,
                detail="Table number is required",
            )

        other_tables = db.restaurant_tables.find(
            {
                "tenant_id": tenant_id,
                "id": {"$ne": table_id},
            },
            {"table_number": 1},
        )
        duplicate = any(
            str(other.get("table_number", "")).strip().casefold()
            == table_number.casefold()
            for other in other_tables
        )
        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Table number already exists",
            )
        updates["table_number"] = table_number

    if "floor" in payload:
        updates["floor"] = (
            str(payload.get("floor") or "Main Floor").strip()
            or "Main Floor"
        )

    if "capacity" in payload:
        try:
            capacity = int(payload["capacity"])
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=422,
                detail="Capacity must be a whole number",
            )
        if capacity < 1:
            raise HTTPException(
                status_code=422,
                detail="Table capacity must be greater than zero",
            )
        updates["capacity"] = capacity

    if not updates:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one table field to update",
        )

    updates["updated_at"] = _now_iso()
    db.restaurant_tables.update_one(
        {"tenant_id": tenant_id, "id": table_id},
        {"$set": updates},
    )

    updated_table = db.restaurant_tables.find_one(
        {"tenant_id": tenant_id, "id": table_id}
    )
    return _remove_mongo_id(updated_table)


@router.delete("/tables/{table_id}")
def delete_table(
    table_id: str,
    current_user: dict = Depends(get_current_tenant_user),
):
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    table = db.restaurant_tables.find_one(
        {"tenant_id": tenant_id, "id": table_id}
    )
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    if table.get("merge_group_id"):
        raise HTTPException(
            status_code=409,
            detail="Unmerge this table before deleting it",
        )

    if (
        str(table.get("status", "FREE")).upper() != "FREE"
        or table.get("active_order")
    ):
        raise HTTPException(
            status_code=409,
            detail="Only free tables without an active order can be deleted",
        )

    active_kot = db.kots.find_one(
        {
            "tenant_id": tenant_id,
            "table_number": table.get("table_number"),
            "status": {"$in": ACTIVE_KOT_STATUSES},
        }
    )
    if active_kot:
        raise HTTPException(
            status_code=409,
            detail="This table has an active kitchen ticket and cannot be deleted",
        )

    result = db.restaurant_tables.delete_one(
        {"tenant_id": tenant_id, "id": table_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")

    return {"message": "Table deleted successfully", "id": table_id}


@router.put("/tables/{table_id}/status")
def update_table_status(
    table_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_tenant_user),
):
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    new_status = str(payload.get("status", "FREE")).upper()
    if new_status not in ALLOWED_TABLE_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid table status")

    result = db.restaurant_tables.update_one(
        {"tenant_id": tenant_id, "id": table_id},
        {
            "$set": {
                "status": new_status,
                "active_order": payload.get("active_order"),
                "updated_at": _now_iso(),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")

    table = db.restaurant_tables.find_one(
        {"tenant_id": tenant_id, "id": table_id}
    )
    return _remove_mongo_id(table)


@router.put("/tables/{table_id}/service-state")
def update_table_service_state(
    table_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_tenant_user),
):
    """Start or finish a persisted table service stage timer."""
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    new_state = str(payload.get("state", "")).upper()
    if new_state not in ALLOWED_SERVICE_STATES:
        raise HTTPException(
            status_code=422,
            detail="State must be SERVING, CLEANING, REFILLING, or READY",
        )

    table = db.restaurant_tables.find_one(
        {"tenant_id": tenant_id, "id": table_id}
    )
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    now = _now_iso()
    _start_table_service_state(
        db,
        tenant_id,
        table,
        new_state,
        now,
    )

    if new_state == "READY":
        db.restaurant_tables.update_one(
            {"tenant_id": tenant_id, "id": table_id},
            {
                "$set": {
                    "status": "FREE",
                    "active_order": None,
                    "updated_at": now,
                }
            },
        )
    else:
        db.restaurant_tables.update_one(
            {"tenant_id": tenant_id, "id": table_id},
            {
                "$set": {
                    "status": "OCCUPIED",
                    "updated_at": now,
                }
            },
        )

    updated_table = db.restaurant_tables.find_one(
        {"tenant_id": tenant_id, "id": table_id}
    )
    return _remove_mongo_id(updated_table)


@router.get("/tables/{table_id}/service-history")
def get_table_service_history(
    table_id: str,
    current_user: dict = Depends(get_current_tenant_user),
):
    """Return service-stage events for a table owned by the current tenant."""
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    table = db.restaurant_tables.find_one(
        {"tenant_id": tenant_id, "id": table_id}
    )
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    events = list(
        db.restaurant_table_service_events.find(
            {
                "tenant_id": tenant_id,
                "table_id": table_id,
            }
        ).sort("started_at", -1)
    )
    return [_remove_mongo_id(event) for event in events]


@router.post("/kot")
def create_kot(
    payload: KOTCreateRequest,
    current_user: dict = Depends(get_current_tenant_user),
):
    db = get_database()
    tenant_id = _get_tenant_id(current_user)
    now = _now_iso()

    counter_key = f"{tenant_id}_KOT"
    counter_doc = db.counters.find_one({"_id": counter_key})
    sequence = 1 if not counter_doc else counter_doc.get("seq", 0) + 1

    db.counters.update_one(
        {"_id": counter_key},
        {"$set": {"seq": sequence}},
        upsert=True,
    )

    kot_number = f"KOT-{sequence:04d}"
    kot_doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "kot_number": kot_number,
        "table_number": payload.table_number,
        "order_type": payload.order_type,
        "items": payload.items,
        "waiter_name": payload.waiter_name,
        "status": "PENDING",
        "status_history": [
            {"status": "PENDING", "changed_at": now}
        ],
        "notes": payload.notes or "",
        "created_at": now,
        "updated_at": now,
    }

    db.kots.insert_one(kot_doc)

    db.restaurant_tables.update_one(
        {
            "tenant_id": tenant_id,
            "table_number": payload.table_number,
        },
        {
            "$set": {
                "status": "OCCUPIED",
                "active_order": kot_number,
                "updated_at": now,
            }
        },
    )

    table = db.restaurant_tables.find_one(
        {
            "tenant_id": tenant_id,
            "table_number": payload.table_number,
        }
    )
    if table:
        _start_table_service_state(
            db,
            tenant_id,
            table,
            "SERVING",
            now,
        )

    return _remove_mongo_id(kot_doc)


@router.get("/kds")
def get_kitchen_display_orders(
    current_user: dict = Depends(get_current_tenant_user),
):
    """Return tickets that are still active in the kitchen."""
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    kots = list(
        db.kots.find(
            {
                "tenant_id": tenant_id,
                "status": {"$in": ACTIVE_KOT_STATUSES},
            }
        ).sort("created_at", 1)
    )
    return [_remove_mongo_id(kot) for kot in kots]


@router.get("/kds/history")
def get_kitchen_ticket_history(
    current_user: dict = Depends(get_current_tenant_user),
):
    """Return saved kitchen tickets, including served tickets."""
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    kots = list(
        db.kots.find({"tenant_id": tenant_id})
        .sort("created_at", -1)
        .limit(100)
    )
    return [_remove_mongo_id(kot) for kot in kots]


@router.put("/kot/{kot_id}/status")
def update_kot_status(
    kot_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_tenant_user),
):
    db = get_database()
    tenant_id = _get_tenant_id(current_user)

    new_status = str(payload.get("status", "COOKING")).upper()
    if new_status not in ALLOWED_KOT_STATUSES:
        raise HTTPException(
            status_code=422,
            detail="Invalid kitchen ticket status",
        )

    existing_kot = db.kots.find_one(
        {"tenant_id": tenant_id, "id": kot_id}
    )
    if not existing_kot:
        raise HTTPException(status_code=404, detail="KOT ticket not found")

    old_status = str(existing_kot.get("status", "PENDING")).upper()

    # Persist each actual status transition, without duplicate entries for
    # repeated requests that submit the ticket's current status.
    if old_status != new_status:
        now = _now_iso()
        result = db.kots.update_one(
            {
                "tenant_id": tenant_id,
                "id": kot_id,
                "status": old_status,
            },
            {
                "$set": {
                    "status": new_status,
                    "updated_at": now,
                },
                "$push": {
                    "status_history": {
                        "status": new_status,
                        "changed_at": now,
                    }
                },
            },
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=409,
                detail="Ticket changed while updating. Refresh and try again.",
            )

    kot = db.kots.find_one(
        {"tenant_id": tenant_id, "id": kot_id}
    )
    if not kot:
        raise HTTPException(status_code=404, detail="KOT ticket not found")

    if new_status == "SERVED":
        table = db.restaurant_tables.find_one(
            {
                "tenant_id": tenant_id,
                "table_number": kot.get("table_number"),
            }
        )

        if table:
            # Clear this KOT's active order, then start the cleaning stage.
            db.restaurant_tables.update_one(
                {
                    "tenant_id": tenant_id,
                    "id": table["id"],
                    "active_order": kot.get("kot_number"),
                },
                {
                    "$set": {
                        "active_order": None,
                        "updated_at": _now_iso(),
                    }
                },
            )

            table = db.restaurant_tables.find_one(
                {
                    "tenant_id": tenant_id,
                    "id": table["id"],
                }
            )

            if table:
                _start_table_service_state(
                    db,
                    tenant_id,
                    table,
                    "CLEANING",
                )

                db.restaurant_tables.update_one(
                    {
                        "tenant_id": tenant_id,
                        "id": table["id"],
                    },
                    {
                        "$set": {
                            "status": "OCCUPIED",
                            "updated_at": _now_iso(),
                        }
                    },
                )

    updated_kot = db.kots.find_one(
        {"tenant_id": tenant_id, "id": kot_id}
    )
    return _remove_mongo_id(updated_kot)