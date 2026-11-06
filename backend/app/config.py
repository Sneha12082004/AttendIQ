"""
app/config.py
─────────────
Centralised configuration loaded from the .env file (or environment variables).
All settings are type-annotated and validated by Pydantic-Settings v2.
"""

from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Supabase ──────────────────────────────────────────────────────────────
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_anon_key: str = "placeholder_anon"
    supabase_service_key: str = "placeholder_service"

    # ── JWT ───────────────────────────────────────────────────────────────────
    jwt_secret_key: str = "INSECURE_DEFAULT_CHANGE_ME_in_production_32chars"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ── Face Recognition ──────────────────────────────────────────────────────
    face_match_threshold: float = 0.40

    # ── Liveness / Challenge ──────────────────────────────────────────────────
    liveness_timeout_seconds: int = 120
    session_challenge_expiry_seconds: int = 90

    # ── Geofence ──────────────────────────────────────────────────────────────
    geofence_default_radius_meters: float = 50.0

    # ── App behaviour ─────────────────────────────────────────────────────────
    demo_mode: bool = True
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Pydantic-Settings v2 config
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Computed helpers ──────────────────────────────────────────────────────
    @property
    def cors_origins_list(self) -> List[str]:
        """Split the comma-separated CORS_ORIGINS env-var into a Python list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


# Singleton — imported everywhere as `from app.config import settings`
settings = Settings()
