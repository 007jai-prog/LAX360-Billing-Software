import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import db_manager
from app.seed.seed_data import seed_database

# Routers
from app.routers import (
    auth,
    tenants,
    business_categories,
    dashboard,
    products,
    billing,
    invoices,
    returns,
    customers,
    suppliers,
    inventory,
    purchases,
    expenses,
    reports,
    restaurant,
    specialized,
    employees,
    subscriptions,
    admin,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lax360")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing LAX360 Universal Billing SaaS Backend...")
    db_manager.connect()

    try:
        seed_database()
    except Exception as e:
        logger.warning(f"Seed note: {e}")

    yield
    logger.info("Shutting down LAX360 Backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description=(
        "Universal Multi-Tenant Multi-Category Billing & Business "
        "Management SaaS"
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled error processing %s %s: %s",
        request.method,
        request.url,
        exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": (
                "An internal server error occurred. "
                "Please contact system support."
            )
        },
    )


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "is_mock_database": db_manager.is_mock,
        "version": "1.0.0",
    }


# Mount routers
api_v1 = settings.API_V1_STR

app.include_router(auth.router, prefix=api_v1)
app.include_router(tenants.router, prefix=api_v1)
app.include_router(business_categories.router, prefix=api_v1)
app.include_router(dashboard.router, prefix=api_v1)
app.include_router(products.router, prefix=api_v1)
app.include_router(billing.router, prefix=api_v1)
app.include_router(invoices.router, prefix=api_v1)
app.include_router(returns.router, prefix=api_v1)
app.include_router(customers.router, prefix=api_v1)
app.include_router(suppliers.router, prefix=api_v1)
app.include_router(inventory.router, prefix=api_v1)
app.include_router(purchases.router, prefix=api_v1)
app.include_router(expenses.router, prefix=api_v1)
app.include_router(reports.router, prefix=api_v1)
app.include_router(restaurant.router, prefix=api_v1)
app.include_router(specialized.router, prefix=api_v1)
app.include_router(employees.router, prefix=api_v1)
app.include_router(subscriptions.router, prefix=api_v1)
app.include_router(admin.router, prefix=api_v1)