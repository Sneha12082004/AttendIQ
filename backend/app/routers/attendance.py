"""
app/routers/attendance.py
─────────────────────────
Core Attendance Engine:
- Liveness challenge request
- End-to-end multi-layer attendance verification
- Trust score computation
- Historical records & analytics
- Faculty manual override workflow
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user, require_student, require_faculty
from app.config import settings
from app.database import get_db
from app.models import (
    AttendanceRequest,
    AttendanceResponse,
    AttendanceStatus,
    LivenessChallengeRequest,
    LivenessChallengeResponse,
    ManualOverrideRequest,
)
from app.utils.antispoof import evaluate_anti_spoofing
from app.utils.face_pipeline import verify_face_identity
from app.utils.geofence import check_geofence, calculate_trust_contribution_location
from app.utils.liveness import challenge_manager
from app.utils.suspicious import suspicious_detector
from app.utils.trust_score import compute_trust_score

router = APIRouter(prefix="/attendance", tags=["Attendance Engine"])


@router.post("/challenge", response_model=LivenessChallengeResponse)
async def request_liveness_challenge(
    payload: LivenessChallengeRequest,
    current_user: dict = Depends(require_student)
):
    """
    Step 1 of verification: Generates a cryptographically bound,
    unpredictable active liveness challenge (e.g. 'Blink twice', 'Turn head left').
    """
    db = get_db()
    # Confirm active session
    s_res = db.table("sessions").select("*").eq("id", payload.session_id).execute()
    if not s_res.data or not s_res.data[0].get("is_active", True):
        raise HTTPException(
            status_code=400,
            detail="Cannot issue challenge: Class session is inactive or does not exist."
        )

    # Resolve student profile id
    st_res = db.table("students").select("*").eq("user_id", current_user["id"]).execute()
    if not st_res.data:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    student_id = st_res.data[0]["id"]

    challenge_info = challenge_manager.issue_challenge(
        student_id=student_id,
        session_id=payload.session_id,
    )

    return LivenessChallengeResponse(
        challenge_id=challenge_info["challenge_id"],
        challenge_type=challenge_info["challenge_type"],
        instruction=challenge_info["instruction"],
        nonce=challenge_info["nonce"],
        expires_in_seconds=challenge_info["expires_in_seconds"],
    )


@router.post("/mark", response_model=AttendanceResponse)
async def mark_attendance(
    payload: AttendanceRequest,
    current_user: dict = Depends(require_student)
):
    """
    Step 2: Full Multi-Layer Biometric, Geofence, and Liveness Attendance Submission.

    Decision Pipeline:
    1. Validate Session is Active
    2. Check for Duplicate Attendance
    3. Multi-layer Geofence Proximity Check
    4. Layer A: Biometric Face Match (Single Face, Quality, Cosine Similarity)
    5. Layer B: Active Liveness Challenge Validation (Nonce & Challenge Token)
    6. Layer C: Passive Anti-Spoofing PAD Analysis
    7. Suspicious Activity Intelligence Analysis
    8. Attendance Trust Score Calculation
    9. Final Decision (Present / Rejected)
    """
    db = get_db()
    now_iso = datetime.utcnow().isoformat() + "Z"

    # 1. Resolve student profile
    st_res = db.table("students").select("*").eq("user_id", current_user["id"]).execute()
    if not st_res.data:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    student = st_res.data[0]
    student_id = student["id"]

    # 2. Verify Session exists and is active
    sess_res = db.table("sessions").select("*").eq("id", payload.session_id).execute()
    if not sess_res.data:
        raise HTTPException(status_code=404, detail="Class session not found.")
    session = sess_res.data[0]
    if not session.get("is_active", True):
        raise HTTPException(status_code=400, detail="Attendance session has ended or expired.")

    # 3. Duplicate Attendance Check
    existing = db.table("attendance").select("*") \
        .eq("student_id", student_id) \
        .eq("session_id", payload.session_id) \
        .execute()
    if existing.data and any(r.get("status") == AttendanceStatus.present.value for r in existing.data):
        raise HTTPException(
            status_code=409,
            detail="Duplicate attendance rejected: You have already marked present for this session."
        )

    # 4. Fetch classroom coordinates for geofencing
    room_res = db.table("classrooms").select("*").eq("id", session["classroom_id"]).execute()
    if not room_res.data:
        raise HTTPException(status_code=500, detail="Associated classroom not found.")
    classroom = room_res.data[0]

    rejection_reasons: List[str] = []

    # ── Multi-Layer Check 1: Geofence Verification ───────────────────────────
    geofence_eval = check_geofence(
        student_lat=payload.latitude,
        student_lon=payload.longitude,
        classroom_lat=classroom["latitude"],
        classroom_lon=classroom["longitude"],
        radius_meters=classroom["radius_meters"],
        reported_accuracy_meters=payload.accuracy,
        is_mock_location=payload.is_mock_location or False,
    )
    geofence_passed = geofence_eval["is_within"]
    if not geofence_passed:
        rejection_reasons.append(geofence_eval["detail"])

    location_trust = calculate_trust_contribution_location(
        is_within=geofence_passed,
        distance_meters=geofence_eval["distance_meters"],
        radius_meters=classroom["radius_meters"],
        accuracy_meters=payload.accuracy,
    )

    # Optional BLE Beacon verification
    ble_verified = False
    if payload.ble_beacon_id and classroom.get("ble_beacon_id"):
        ble_verified = payload.ble_beacon_id.strip() == classroom["ble_beacon_id"].strip()

    # ── Multi-Layer Check 2: Biometric Face Identity (Layer A) ───────────────
    # Fetch enrolled embedding
    emb_res = db.table("face_embeddings").select("*").eq("student_id", student_id).execute()
    enrolled_embedding = emb_res.data[0]["embedding_vector"] if emb_res.data else None

    face_eval = verify_face_identity(
        submitted_frame_b64=payload.face_image_base64,
        enrolled_embedding=enrolled_embedding,
        threshold=settings.face_match_threshold,
        is_demo_mode=settings.demo_mode,
    )
    face_match_passed = face_eval["passed"]
    if not face_match_passed:
        rejection_reasons.append(face_eval.get("rejection_reason") or "Face match verification failed")

    # ── Multi-Layer Check 3: Active Liveness Challenge (Layer B) ─────────────
    liveness_eval = challenge_manager.validate_and_consume(
        challenge_id=payload.challenge_id,
        student_id=student_id,
        session_id=payload.session_id,
        nonce=payload.challenge_nonce,
        is_demo_mode=settings.demo_mode,
    )
    liveness_passed = liveness_eval["passed"]
    if not liveness_passed:
        rejection_reasons.append(liveness_eval.get("rejection_reason") or "Liveness challenge failed")

    # ── Multi-Layer Check 4: Passive Anti-Spoofing PAD (Layer C) ─────────────
    antispoof_eval = evaluate_anti_spoofing(
        frame_b64=payload.face_image_base64,
        is_demo_mode=settings.demo_mode,
    )
    antispoof_passed = antispoof_eval["passed"]
    if not antispoof_passed:
        rejection_reasons.append(antispoof_eval.get("rejection_reason") or "Presentation attack detected")

    # ── Suspicious Attempt Intelligence Analysis ─────────────────────────────
    suspicious_flags = suspicious_detector.analyze_attempt(
        student_id=student_id,
        session_id=payload.session_id,
        device_id=payload.device_id,
        face_match_passed=face_match_passed,
        geofence_passed=geofence_passed,
        lat=payload.latitude,
        lon=payload.longitude,
        is_mock_location=payload.is_mock_location or False,
        challenge_reused=(not liveness_passed and "already been used" in (liveness_eval.get("rejection_reason") or "")),
    )
    is_suspicious = len(suspicious_flags) > 0

    # ── Attendance Trust Score Computation (Feature A) ───────────────────────
    trust_score_breakdown = compute_trust_score(
        geofence_passed=geofence_passed,
        location_trust_factor=location_trust,
        face_match_passed=face_match_passed,
        face_similarity_score=face_eval["similarity_score"],
        liveness_passed=liveness_passed,
        liveness_confidence=liveness_eval.get("confidence", 0.0),
        antispoof_passed=antispoof_passed,
        antispoof_score=antispoof_eval["antispoof_score"],
        ble_verified=ble_verified,
    )

    # ── Final Decision Engine ────────────────────────────────────────────────
    # Attendance is present ONLY if ALL mandatory verification layers pass
    if geofence_passed and face_match_passed and liveness_passed and antispoof_passed and not is_suspicious:
        final_decision = AttendanceStatus.present
    else:
        final_decision = AttendanceStatus.rejected

    record_id = f"att-{uuid.uuid4().hex[:10]}"

    record_data = {
        "id": record_id,
        "student_id": student_id,
        "session_id": payload.session_id,
        "subject_id": session["subject_id"],
        "classroom_id": session["classroom_id"],
        "timestamp": now_iso,
        "student_name": student["full_name"],
        "student_reg_no": student["reg_number"],
        # Geolocation
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "location_accuracy": payload.accuracy,
        "distance_meters": geofence_eval["distance_meters"],
        "geofence_result": geofence_passed,
        # Biometrics
        "face_match_score": face_eval["similarity_score"],
        "face_match_passed": face_match_passed,
        # Liveness & PAD
        "liveness_challenge_type": liveness_eval.get("challenge_type", "unknown"),
        "liveness_passed": liveness_passed,
        "antispoof_score": antispoof_eval["antispoof_score"],
        "antispoof_passed": antispoof_passed,
        # Trust & Decision
        "trust_score": trust_score_breakdown.overall_score,
        "trust_grade": trust_score_breakdown.grade,
        "final_decision": final_decision.value,
        "status": final_decision.value,
        "rejection_reasons": rejection_reasons,
        "is_suspicious": is_suspicious,
        "suspicious_flags": suspicious_flags,
        "is_manual_override": False,
        "device_id": payload.device_id,
        "is_demo": settings.demo_mode,
    }

    db.table("attendance").insert(record_data).execute()

    # If flagged as suspicious, also log in suspicious_attempts
    if is_suspicious:
        db.table("suspicious_attempts").insert({
            "id": f"susp-{uuid.uuid4().hex[:8]}",
            "student_id": student_id,
            "session_id": payload.session_id,
            "flags": suspicious_flags,
            "details": {
                "distance": geofence_eval["distance_meters"],
                "face_similarity": face_eval["similarity_score"],
                "rejection_reasons": rejection_reasons,
            },
            "timestamp": now_iso,
            "reviewed": False,
        }).execute()

    return AttendanceResponse(
        record_id=record_id,
        status=final_decision,
        geofence_passed=geofence_passed,
        face_match_passed=face_match_passed,
        liveness_passed=liveness_passed,
        antispoof_passed=antispoof_passed,
        trust_score=trust_score_breakdown,
        rejection_reasons=rejection_reasons,
        timestamp=datetime.utcnow(),
    )


@router.get("/history/{student_id}")
async def get_student_attendance_history(student_id: str, current_user: dict = Depends(get_current_user)):
    """Returns chronologically ordered attendance history for a student."""
    db = get_db()
    res = db.table("attendance").select("*").eq("student_id", student_id).order("timestamp", desc=True).execute()
    records = res.data if hasattr(res, "data") else []

    # Enrich with subject and classroom names
    enriched = []
    for r in records:
        subj = db.table("subjects").select("*").eq("id", r["subject_id"]).execute()
        item = dict(r)
        item["subject_name"] = subj.data[0]["name"] if subj.data else "Subject"
        item["subject_code"] = subj.data[0]["code"] if subj.data else "SUBJ"
        enriched.append(item)

    return enriched


@router.get("/session/{session_id}")
async def get_session_attendance(session_id: str, current_user: dict = Depends(get_current_user)):
    """Returns live student attendance records for a specific class session."""
    db = get_db()
    res = db.table("attendance").select("*").eq("session_id", session_id).order("timestamp", desc=True).execute()
    return res.data if hasattr(res, "data") else []


@router.post("/override")
async def faculty_manual_override(
    payload: ManualOverrideRequest,
    current_user: dict = Depends(require_faculty)
):
    """
    Faculty Manual Override Workflow:
    Permits authorized faculty to override a rejected or pending attempt with documented reason.
    Never silently changes records — logs faculty identity, timestamp, and audit trail.
    """
    db = get_db()
    f_res = db.table("faculty").select("*").eq("user_id", current_user["id"]).execute()
    faculty_id = f_res.data[0]["id"] if f_res.data else current_user["id"]
    now_iso = datetime.utcnow().isoformat() + "Z"

    db.table("attendance").update({
        "status": AttendanceStatus.manual_override.value,
        "final_decision": AttendanceStatus.manual_override.value,
        "is_manual_override": True,
        "override_by": faculty_id,
        "override_reason": payload.reason,
        "override_at": now_iso,
    }).eq("id", payload.attendance_record_id).execute()

    db.table("audit_logs").insert({
        "action": "FACULTY_MANUAL_OVERRIDE",
        "user_id": current_user["id"],
        "details": {
            "record_id": payload.attendance_record_id,
            "new_status": payload.new_status.value,
            "reason": payload.reason,
        },
    }).execute()

    return {
        "status": "success",
        "message": f"Attendance record overridden to '{payload.new_status.value}' by faculty",
        "override_at": now_iso,
    }


@router.get("/stats/{student_id}")
async def get_student_attendance_stats(student_id: str, current_user: dict = Depends(get_current_user)):
    """Computes overall and per-subject attendance percentages for a student."""
    db = get_db()
    records_res = db.table("attendance").select("*").eq("student_id", student_id).execute()
    records = records_res.data if hasattr(records_res, "data") else []

    all_subjects_res = db.table("subjects").select("*").execute()
    subjects = {s["id"]: s for s in (all_subjects_res.data or [])}

    subject_stats: Dict[str, Dict[str, Any]] = {}
    for s_id, s_info in subjects.items():
        subject_stats[s_id] = {
            "subject_id": s_id,
            "subject_name": s_info["name"],
            "subject_code": s_info["code"],
            "total_classes": s_info.get("total_classes_held", 20),
            "attended": 0,
            "percentage": 0.0,
            "defaulter_risk": False,
        }

    for r in records:
        s_id = r.get("subject_id")
        if s_id in subject_stats and r.get("status") in ["present", "manual_override"]:
            subject_stats[s_id]["attended"] += 1

    total_attended = 0
    total_classes = 0

    for s_id, stat in subject_stats.items():
        tot = max(1, stat["total_classes"])
        pct = round((stat["attended"] / tot) * 100.0, 1)
        stat["percentage"] = min(100.0, pct)
        stat["defaulter_risk"] = pct < 75.0
        total_attended += stat["attended"]
        total_classes += tot

    overall_pct = round((total_attended / max(1, total_classes)) * 100.0, 1)

    return {
        "student_id": student_id,
        "overall_percentage": min(100.0, overall_pct),
        "total_classes_held": total_classes,
        "total_classes_attended": total_attended,
        "is_defaulter": overall_pct < 75.0,
        "subjects": list(subject_stats.values()),
    }
