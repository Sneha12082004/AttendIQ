"""
app/database.py
───────────────
Database client provider for AttendIQ.
Provides a unified interface: returns Supabase client when configured,
or falls back cleanly to the pre-seeded in-memory store in demo mode.
"""

from typing import Any
from app.config import settings
from app.utils.in_memory_db import get_in_memory_db

_supabase_client = None

def get_db() -> Any:
    """
    Returns the database client instance.
    If DEMO_MODE=True or Supabase is unconfigured, returns the thread-safe InMemoryDB.
    """
    global _supabase_client
    if settings.demo_mode or "placeholder" in settings.supabase_url:
        return get_in_memory_db()

    if _supabase_client is None:
        try:
            from supabase import create_client, Client
            _supabase_client = create_client(settings.supabase_url, settings.supabase_service_key)
        except Exception as e:
            print(f"[Warning] Failed to initialize Supabase client: {e}. Falling back to in-memory DB.")
            return get_in_memory_db()

    return _supabase_client
