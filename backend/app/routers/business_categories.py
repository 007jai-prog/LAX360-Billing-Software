from fastapi import APIRouter
from app.services.config_engine import get_all_categories, get_category_config

router = APIRouter(prefix="/business-categories", tags=["Business Categories"])

@router.get("")
def list_categories():
    """Returns all available business verticals for selection"""
    return get_all_categories()

@router.get("/{category_id}/config")
def get_category_configuration(category_id: str):
    """Dynamic module and field configuration for a specific vertical"""
    return get_category_config(category_id)
