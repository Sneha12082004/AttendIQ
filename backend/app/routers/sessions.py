"""
app/routers/sessions.py
───────────────────────
Class session management: Create session, List active sessions, Session QR code, Close session.
"""

import secrets
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user, require_faculty
from app.database import get_db
from app.models import ClassSession
from app.utils.qr_code import generate_session_qr_payload, render_qr_base64

router = APIRouter(prefix="/sessions", tags=["Class Sessions"])


class CreateSessionRequest(BaseModel):
    subject_id: str
    classroom_id: str
    section: str = "A"
    duration_minutes: int = 60


@router.post("/create")
async def create_class_session(
    payload: CreateSessionRequest,
    current_user: dict = Depends(require_faculty)
):
    """Faculty initiates an active classroom attendance session with dynamic QR code & nonce."""
    db = get_db()
    f_res = db.table("faculty").select("*").eq("user_id", current_user["id"]).execute()
    if not f_res.data:
        raise HTTPException(status_code=404, detail="Faculty profile not found.")
    faculty = f_res.data[0]

    session_id = f"sess-{uuid.uuid4().hex[:10]}"
    nonce = secrets.token_hex(16)
    now = datetime.utcnow()
    end_time = now + timedelta(minutes=payload.duration_minutes)

    qr_payload = generate_session_qr_payload(
        session_id=session_id,
        classroom_id=payload.classroom_id,
        session_nonce=nonce,
        ttl_seconds=payload.duration_minutes * 60,
    )
    qr_code_b64 = render_qr_base64(qr_payload)

    new_session = {
        "id": session_id,
        "faculty_id": faculty["id"],
        "subject_id": payload.subject_id,
        "classroom_id": payload.classroom_id,
        "section": payload.section,
        "start_time": now.isoformat() + "Z",
        "end_time": end_time.isoformat() + "Z",
        "scheduled_duration_minutes": payload.duration_minutes,
        "is_active": True,
        "session_nonce": nonce,
        "qr_code": qr_code_b64,
        "is_demo": False,
    }

    db.table("sessions").insert(new_session).execute()

    # Fetch related classroom & subject names for convenient UI response
    subj_res = db.table("subjects").select("*").eq("id", payload.subject_id).execute()
    room_res = db.table("classrooms").select("*").eq("id", payload.classroom_id).execute()

    response_data = dict(new_session)
    response_data["subject_name"] = subj_res.data[0]["name"] if subj_res.data else "Subject"
    response_data["subject_code"] = subj_res.data[0]["code"] if subj_res.data else "SUBJ"
    response_data["classroom_name"] = room_res.data[0]["name"] if room_res.data else "Classroom"
    response_data["classroom_lat"] = room_res.data[0]["latitude"] if room_res.data else 0.0
    response_data["classroom_lon"] = room_res.data[0]["longitude"] if room_res.data else 0.0
    response_data["geofence_radius"] = room_res.data[0]["radius_meters"] if room_res.data else 50.0

    return response_data


@router.get("/active")
async def list_active_sessions(current_user: dict = Depends(get_current_user)):
    """Lists currently open/active sessions available for attendance."""
    db = get_db()
    res = db.table("sessions").select("*").eq("is_active", True).execute()
    sessions = res.data if hasattr(res, "data") else []

    # Enrich with subject and classroom details
    enriched = []
    for s in sessions:
        subj = db.table("subjects").select("*").eq("id", s["subject_id"]).execute()
        room = db.table("classrooms").select("*").eq("id", s["classroom_id"]).execute()
        fac = db.table("faculty").select("*").eq("id", s["faculty_id"]).execute()

        item = dict(s)
        item["subject_name"] = subj.data[0]["name"] if subj.data else "Subject"
        item["subject_code"] = subj.data[0]["code"] if subj.data else "SUBJ"
        item["classroom_name"] = room.data[0]["name"] if room.data else "Classroom"
        item["classroom_lat"] = room.data[0]["latitude"] if room.data else 0.0
        item["classroom_lon"] = room.data[0]["longitude"] if room.data else 0.0
        item["geofence_radius"] = room.data[0]["radius_meters"] if room.data else 50.0
        item["faculty_name"] = fac.data[0]["name"] if fac.data else "Faculty"
        enriched.append(item)

    return enriched


@router.get("/{session_id}")
async def get_session_details(session_id: str, current_user: dict = Depends(get_current_user)):
    """Retrieves session details by ID."""
    db = get_db()
    res = db.table("sessions").select("*").eq("id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Class session not found.")
    s = res.data[0]

    subj = db.table("subjects").select("*").eq("id", s["subject_id"]).execute()
    room = db.table("classrooms").select("*").eq("id", s["classroom_id"]).execute()
    fac = db.table("faculty").select("*").eq("id", s["faculty_id"]).execute()

    item = dict(s)
    item["subject_name"] = subj.data[0]["name"] if subj.data else "Subject"
    item["classroom_name"] = room.data[0]["name"] if room.data else "Classroom"
    item["classroom_lat"] = room.data[0]["latitude"] if room.data else 0.0
    item["classroom_lon"] = room.data[0]["longitude"] if room.data else 0.0
    item["geofence_radius"] = room.data[0]["radius_meters"] if room.data else 50.0
    item["faculty_name"] = fac.data[0]["name"] if fac.data else "Faculty"

    return item


@router.put("/{session_id}/close")
async def close_class_session(session_id: str, current_user: dict = Depends(require_faculty)):
    """Faculty closes active session; stops accepting new attendance submissions."""
    db = get_db()
    now_iso = datetime.utcnow().isoformat() + "Z"
    db.table("sessions").update({
        "is_active": False,
        "end_time": now_iso,
    }).eq("id", session_id).execute()

    return {"status": "closed", "session_id": session_id, "closed_at": now_iso}


@router.get("/{session_id}/qr")
async def get_session_qr(session_id: str, current_user: dict = Depends(require_faculty)):
    """Fetches or refreshes the classroom QR code display for students to scan."""
    db = get_db()
    res = db.table("sessions").select("*").eq("id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    s = res.data[0]
    return {
        "session_id": session_id,
        "qr_code": s.get("qr_code"),
        "nonce": s.get("session_nonce"),
        "is_active": s.get("is_active", True),
    }
