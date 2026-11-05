"""
app/main.py
───────────
FastAPI Entrypoint for AttendIQ: AI-Driven Geo-Fenced and Biometric Attendance System.
Tech Avinya Hackathon 2026 | Problem Statement CIH-001.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.enrollment import router as enrollment_router
from app.routers.sessions import router as sessions_router
from app.routers.attendance import router as attendance_router
from app.routers.faculty import router as faculty_router
from app.routers.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    print("=" * 60)
    print("  AttendIQ Backend Service Initialized")
    print(f"  Demo Mode: {settings.demo_mode}")
    print(f"  Face Similarity Threshold: {settings.face_match_threshold}")
    print(f"  Geofence Default Radius: {settings.geofence_default_radius_meters}m")
    print("=" * 60)
    yield
    # Shutdown sequence
    print("AttendIQ Backend Service Shutting Down...")


app = FastAPI(
    title="AttendIQ API",
    description=(
        "Production-ready backend API for AttendIQ: AI-Driven Geo-Fenced and Biometric Attendance System. "
        "Enforces multi-layer authentication: Classroom GPS geofencing, single-face validation, "
        "biometric matching, server-randomized active liveness challenges, and passive anti-spoofing."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local development, Vite dev server (5173), and mobile emulator
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api")
app.include_router(enrollment_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(attendance_router, prefix="/api")
app.include_router(faculty_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


# ─── Health & Root Endpoints ─────────────────────────────────────────────────

@app.get("/health", tags=["System Telemetry"])
async def health_check():
    """System health check and runtime status."""
    return {
        "status": "healthy",
        "service": "AttendIQ Verification API",
        "version": "1.0.0",
        "demo_mode": settings.demo_mode,
        "database": "in_memory_db" if settings.demo_mode else "supabase",
        "ai_pipeline": {
            "face_matching": "active",
            "active_liveness": "active",
            "passive_antispoof": "active",
            "geofence_engine": "haversine_active",
        },
    }


@app.get("/", tags=["System Telemetry"])
async def root():
    """API Discovery root endpoint."""
    return {
        "message": "Welcome to AttendIQ API — AI-Driven Biometric Attendance System",
        "documentation": "/docs",
        "version": "1.0.0",
        "hackathon": "Tech Avinya Hackathon 2026 (CIH-001)",
        "demo_mode": settings.demo_mode,
        "roles_supported": ["student", "faculty", "admin"],
    }
