import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LAX360 Universal Billing SaaS"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "lax360-super-secret-jwt-key-2026-production-ready-universal-billing")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # Database
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "lax360_billing")
    USE_IN_MEMORY_FALLBACK: bool = True  # Automatically falls back to mock if MongoDB Atlas/local is offline

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://lax360-billing.vercel.app",
        "*"
    ]

    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

settings = Settings()

