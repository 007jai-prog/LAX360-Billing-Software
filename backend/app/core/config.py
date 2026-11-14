import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "LAX360 Universal Billing SaaS"
    API_V1_STR: str = "/api"

    # JWT / Auth
    SECRET_KEY: str = "lax360-super-secret-jwt-key-2026-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # ─── MongoDB ───────────────────────────────────────────────────────────────
    # On Render: set MONGO_URI or MONGODB_URI as an environment variable.
    # Supports both local ("mongodb://...") and Atlas ("mongodb+srv://...") URIs.
    # NEVER hardcode a real URI here — use Render environment variables.
    MONGO_URI: str = ""          # Render secret env key (checked first)
    MONGODB_URI: str = ""        # Alternate env key name (checked second)
    DATABASE_NAME: str = "lax360_billing"

    # Set USE_IN_MEMORY_FALLBACK=True ONLY for local development without MongoDB.
    # On Render (production), always set USE_IN_MEMORY_FALLBACK=False.
    USE_IN_MEMORY_FALLBACK: bool = False

    # ─── CORS ─────────────────────────────────────────────────────────────────
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://lax360-billing.vercel.app",
        "*",
    ]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "allow",
    }

    @property
    def effective_mongo_uri(self) -> str:
        """
        Return the MongoDB URI by checking both MONGO_URI and MONGODB_URI env
        variable names, so either works seamlessly on Render or locally.
        """
        uri = self.MONGO_URI.strip() or self.MONGODB_URI.strip()
        return uri


settings = Settings()
