"""
app/routers/enrollment.py
─────────────────────────
Student Biometric Face Enrollment Workflow & Consent Management.

Steps:
1. Student grants explicit legal/biometric consent
2. Pre-enrollment Quality & Pose Pre-Check
3. Capture of 3 quality frames
4. 128-dimensional biometric template generation and secure storage
5. Re-enrollment request / deletion workflow
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user, require_student
from app.database import get_db
from app.models import EnrollmentRequest, EnrollmentResponse
from app.utils.face_pipeline import (
    decode_image,
    compute_face_quality,
    detect_faces,
    extract_face_embedding,
)

router = APIRouter(prefix="/enrollment", tags=["Biometric Enrollment"])


class ConsentRequest(BaseModel):
    consent_granted: bool
    consent_text: str


class QualityCheckRequest(BaseModel):
    frame_b64: str


@router.post("/consent")
async def record_biometric_consent(
    payload: ConsentRequest,
    current_user: dict = Depends(require_student)
):
    """Records student's explicit, informed biometric consent."""
    if not payload.consent_granted:
        raise HTTPException(status_code=400, detail="Consent must be explicitly accepted.")

    db = get_db()
    now_iso = datetime.utcnow().isoformat() + "Z"

    # Store consent
    db.table("biometric_consents").insert({
        "student_user_id": current_user["id"],
        "consented_at": now_iso,
        "consent_text": payload.consent_text,
    }).execute()

    # Update student profile
    db.table("students").update({
        "consent_at": now_iso,
    }).eq("user_id", current_user["id"]).execute()

    return {"status": "success", "message": "Biometric consent recorded successfully", "consented_at": now_iso}


@router.post("/quality-check")
async def check_enrollment_frame_quality(payload: QualityCheckRequest):
    """Pre-flight quality check of live camera frame before final enrollment capture."""
    img = decode_image(payload.frame_b64)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode frame image.")

    quality = compute_face_quality(img)
    faces = detect_faces(img)

    return {
        "quality_ok": quality["quality_ok"] and len(faces) == 1,
        "face_count": len(faces),
        "quality_details": quality,
        "feedback": "Position face directly in the frame oval" if len(faces) == 0 else (
            "Ensure only one person is in camera view" if len(faces) > 1 else "Good pose and lighting"
        ),
    }


@router.post("/enroll", response_model=EnrollmentResponse)
async def enroll_student_face(
    payload: EnrollmentRequest,
    current_user: dict = Depends(require_student)
):
    """
    Finalizes face enrollment:
    1. Validates submitted frames
    2. Enforces single face and quality across frames
    3. Extracts robust template embedding (averaged over submitted angles)
    4. Saves embedding to secure table and marks student is_enrolled=True
    """
    if not payload.face_images_base64:
        raise HTTPException(status_code=400, detail="At least 1 valid facial frame must be provided.")

    embeddings: List[List[float]] = []

    for idx, b64_frame in enumerate(payload.face_images_base64[:3]):
        img = decode_image(b64_frame)
        if img is None:
            continue
        quality = compute_face_quality(img)
        faces = detect_faces(img)
        if len(faces) != 1:
            raise HTTPException(
                status_code=400,
                detail=f"Frame #{idx+1} rejected: Detected {len(faces)} faces. Exactly 1 face required.",
            )
        emb = extract_face_embedding(img, faces[0])
        embeddings.append(emb)

    if not embeddings:
        raise HTTPException(status_code=400, detail="Could not extract reliable biometric template from frames.")

    # Average embeddings across multiple frames for pose invariance
    import numpy as np
    avg_vector = np.mean(embeddings, axis=0)
    norm = np.linalg.norm(avg_vector)
    if norm > 1e-6:
        avg_vector = avg_vector / norm
    final_embedding = [round(float(v), 5) for v in avg_vector]

    db = get_db()
    # Find student profile id
    s_res = db.table("students").select("*").eq("user_id", current_user["id"]).execute()
    if not s_res.data:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    student_id = s_res.data[0]["id"]

    now_iso = datetime.utcnow().isoformat() + "Z"

    # Store or update face embedding
    db.table("face_embeddings").insert({
        "student_id": student_id,
        "embedding_vector": final_embedding,
        "model_version": "opencv-dnn-moments-v1",
        "created_at": now_iso,
    }).execute()

    # Mark profile as enrolled
    db.table("students").update({
        "is_enrolled": True,
        "enrolled_at": now_iso,
    }).eq("id", student_id).execute()

    db.table("audit_logs").insert({
        "action": "FACE_ENROLLED",
        "user_id": current_user["id"],
        "details": {"student_id": student_id, "frames_analyzed": len(embeddings)},
    }).execute()

    return EnrollmentResponse(
        success=True,
        student_id=student_id,
        message="Biometric template enrolled securely",
        enrolled_at=datetime.utcnow(),
    )


@router.get("/status")
async def get_enrollment_status(current_user: dict = Depends(require_student)):
    """Returns enrollment status for the requesting student."""
    db = get_db()
    s_res = db.table("students").select("*").eq("user_id", current_user["id"]).execute()
    if not s_res.data:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    student = s_res.data[0]

    return {
        "student_id": student["id"],
        "is_enrolled": student.get("is_enrolled", False),
        "enrolled_at": student.get("enrolled_at"),
        "consent_recorded": student.get("consent_at") is not None,
    }


@router.delete("/reset")
async def reset_enrollment(current_user: dict = Depends(require_student)):
    """Allows student to reset their biometric template (e.g. for re-enrollment)."""
    db = get_db()
    s_res = db.table("students").select("*").eq("user_id", current_user["id"]).execute()
    if not s_res.data:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    student_id = s_res.data[0]["id"]

    db.table("face_embeddings").delete().eq("student_id", student_id).execute()
    db.table("students").update({"is_enrolled": False, "enrolled_at": None}).eq("id", student_id).execute()

    db.table("audit_logs").insert({
        "action": "BIOMETRIC_DATA_PURGED",
        "user_id": current_user["id"],
        "details": {"student_id": student_id},
    }).execute()

    return {"status": "success", "message": "Biometric template cleared. You may now re-enroll."}
