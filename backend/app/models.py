"""
app/models.py
─────────────
Pydantic v2 data models for the entire AttendIQ domain.
Every model is complete — no placeholder fields.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, EmailStr


# ─────────────────────────────────────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    student = "student"
    faculty = "faculty"
    admin = "admin"


class AttendanceStatus(str, Enum):
    present = "present"
    absent = "absent"
    pending = "pending"
    rejected = "rejected"
    manual_override = "manual_override"


class VerificationStatus(str, Enum):
    passed = "passed"
    failed = "failed"
    pending = "pending"
    flagged = "flagged"


class LivenessChallenge(str, Enum):
    blink = "blink"
    turn_left = "turn_left"
    turn_right = "turn_right"
    look_up = "look_up"
    move_closer = "move_closer"
    nod = "nod"


class SuspiciousFlag(str, Enum):
    REPEATED_FACE_MISMATCH = "REPEATED_FACE_MISMATCH"
    RAPID_LOCATION_CHANGE = "RAPID_LOCATION_CHANGE"
    REUSED_CHALLENGE = "REUSED_CHALLENGE"
    MULTIPLE_DEVICES = "MULTIPLE_DEVICES"
    HIGH_FREQUENCY_ATTEMPTS = "HIGH_FREQUENCY_ATTEMPTS"
    EXPIRED_CHALLENGE_REUSE = "EXPIRED_CHALLENGE_REUSE"
    MOCK_LOCATION_SUSPECTED = "MOCK_LOCATION_SUSPECTED"


# ─────────────────────────────────────────────────────────────────────────────
# Auth / Token models
# ─────────────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None


# ─────────────────────────────────────────────────────────────────────────────
# User models
# ─────────────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: str
    full_name: str
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Profile models
# ─────────────────────────────────────────────────────────────────────────────

class StudentProfile(BaseModel):
    student_id: str
    user_id: str
    registration_number: str
    department_id: str
    section: str
    semester: int
    batch_year: int
    face_enrolled: bool = False
    face_enrollment_date: Optional[datetime] = None
    biometric_consent: bool = False
    consent_date: Optional[datetime] = None


class FacultyProfile(BaseModel):
    faculty_id: str
    user_id: str
    employee_id: str
    department_id: str
    designation: str
    subjects: List[str] = Field(default_factory=list)  # list of subject_ids


# ─────────────────────────────────────────────────────────────────────────────
# Academic structure models
# ─────────────────────────────────────────────────────────────────────────────

class Department(BaseModel):
    department_id: str
    name: str
    code: str
    head_faculty_id: Optional[str] = None


class Subject(BaseModel):
    subject_id: str
    name: str
    code: str
    department_id: str
    semester: int
    credits: int
    total_classes_held: int = 0


class Classroom(BaseModel):
    classroom_id: str
    name: str
    building: str
    floor: int
    capacity: int
    # Geofence configuration
    latitude: float
    longitude: float
    radius_meters: float = 50.0
    # BLE beacon for indoor fallback
    ble_beacon_id: Optional[str] = None
    ble_beacon_uuid: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Session model
# ─────────────────────────────────────────────────────────────────────────────

class ClassSession(BaseModel):
    session_id: str
    faculty_id: str
    subject_id: str
    classroom_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool = True
    # QR / nonce for secure check-in
    qr_code: Optional[str] = None          # base64-encoded PNG
    session_nonce: str = Field(default_factory=lambda: uuid.uuid4().hex)
    total_students: int = 0
    present_count: int = 0
    absent_count: int = 0


# ─────────────────────────────────────────────────────────────────────────────
# Attendance record — the most detailed model
# ─────────────────────────────────────────────────────────────────────────────

class AttendanceRecord(BaseModel):
    record_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    session_id: str
    subject_id: str
    classroom_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # ── Geofence results ──────────────────────────────────────────────────────
    geofence_result: bool = False          # True = inside geofence
    location_accuracy: float = 999.0      # GPS accuracy in metres
    distance_meters: float = 999.0        # Actual distance from classroom

    # ── Face recognition results ──────────────────────────────────────────────
    face_match_score: float = 0.0         # Cosine similarity 0-1
    face_match_passed: bool = False

    # ── Liveness results ──────────────────────────────────────────────────────
    liveness_result: bool = False
    liveness_challenge_type: Optional[LivenessChallenge] = None

    # ── Anti-spoofing results ─────────────────────────────────────────────────
    antispoof_score: float = 0.0          # 0=fake 1=real
    antispoof_passed: bool = False

    # ── Composite trust score ─────────────────────────────────────────────────
    final_decision: AttendanceStatus = AttendanceStatus.pending
    trust_score: float = 0.0              # 0–100
    rejection_reasons: List[str] = Field(default_factory=list)

    # ── Review / override ─────────────────────────────────────────────────────
    review_status: VerificationStatus = VerificationStatus.pending
    is_manual_override: bool = False
    override_reason: Optional[str] = None
    override_by: Optional[str] = None     # faculty_id


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models for API endpoints
# ─────────────────────────────────────────────────────────────────────────────

class EnrollmentRequest(BaseModel):
    student_id: Optional[str] = None
    face_images_base64: Optional[List[str]] = None
    frames_base64: Optional[List[str]] = None
    consent_given: Optional[bool] = True


class EnrollmentResponse(BaseModel):
    success: bool = True
    student_id: str
    face_quality_score: Optional[float] = 1.0
    frames_processed: Optional[int] = 3
    enrolled_at: Optional[datetime] = None
    issues: List[str] = Field(default_factory=list)
    message: str = "Enrolled successfully"


class AttendanceRequest(BaseModel):
    session_id: str
    challenge_id: str
    challenge_response: Optional[Dict[str, Any]] = None
    challenge_nonce: Optional[str] = None
    frames_base64: Optional[List[str]] = None
    face_image_base64: Optional[str] = None
    latitude: float
    longitude: float
    location_accuracy: Optional[float] = None
    accuracy: Optional[float] = None
    is_mock_location: Optional[bool] = False
    ble_beacon_id: Optional[str] = None
    device_id: Optional[str] = None


class AttendanceResponse(BaseModel):
    success: Optional[bool] = True
    record_id: str
    final_decision: Optional[AttendanceStatus] = None
    status: Optional[AttendanceStatus] = None
    trust_score: Any = None
    trust_grade: Optional[str] = None
    geofence_passed: Optional[bool] = True
    face_match_passed: Optional[bool] = True
    face_match_score: Optional[float] = 1.0
    liveness_passed: Optional[bool] = True
    antispoof_passed: Optional[bool] = True
    rejection_reasons: List[str] = Field(default_factory=list)
    message: Optional[str] = "Attendance processed"
    demo_mode: Optional[bool] = False
    timestamp: Optional[datetime] = None


class ManualOverrideRequest(BaseModel):
    attendance_record_id: str
    new_status: AttendanceStatus = AttendanceStatus.present
    reason: str


class LivenessChallengeRequest(BaseModel):
    session_id: str
    student_id: Optional[str] = None


class LivenessChallengeResponse(BaseModel):
    challenge_id: str
    challenge_type: Any
    instruction: Optional[str] = None
    instructions: Optional[str] = None
    sequence: Optional[List[str]] = None
    expires_at: Optional[datetime] = None
    expires_in_seconds: Optional[int] = 90
    nonce: str


class GeofenceCheckRequest(BaseModel):
    student_lat: float
    student_lon: float
    location_accuracy: float
    classroom_id: str


class GeofenceCheckResponse(BaseModel):
    is_within: bool
    distance_meters: float
    classroom_radius: float
    accuracy_ok: bool
    result_detail: str


# ─────────────────────────────────────────────────────────────────────────────
# Trust score breakdown
# ─────────────────────────────────────────────────────────────────────────────

class TrustScoreBreakdown(BaseModel):
    overall_score: float                  # 0-100
    grade: str                            # A/B/C/D/F
    recommendation: Optional[str] = None
    explanation: Optional[str] = None

    location_score: float = 0.0
    location_weight: float = 0.25

    face_score: Optional[float] = None
    face_match_score: Optional[float] = 0.0
    face_weight: float = 0.30

    liveness_score: float = 0.0
    liveness_weight: float = 0.25

    antispoof_score: float = 0.0
    antispoof_weight: float = 0.15

    ble_score: float = 0.0
    ble_weight: float = 0.05

    critical_checks_passed: Optional[bool] = True


# ─────────────────────────────────────────────────────────────────────────────
# Suspicious attempt model
# ─────────────────────────────────────────────────────────────────────────────

class SuspiciousAttemptFlag(BaseModel):
    student_id: str
    session_id: str
    flags: List[SuspiciousFlag]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Dict[str, Any] = Field(default_factory=dict)
    severity: str = "medium"              # low / medium / high


# ─────────────────────────────────────────────────────────────────────────────
# Defaulter info
# ─────────────────────────────────────────────────────────────────────────────

class DefaulterInfo(BaseModel):
    student_id: str
    student_name: str
    registration_number: str
    subject_id: str
    subject_name: str
    total_classes: int
    attended_classes: int
    attendance_percentage: float
    threshold_percentage: float = 75.0
    shortfall: int                        # classes needed to reach threshold


# ─────────────────────────────────────────────────────────────────────────────
# Demo mode configuration
# ─────────────────────────────────────────────────────────────────────────────

class DemoModeConfig(BaseModel):
    enabled: bool = True
    seed_data_loaded: bool = False
    face_pipeline_mode: str = "DEMO"      # DEMO | REAL
    antispoof_mode: str = "DEMO"
    liveness_mode: str = "DEMO"
    db_backend: str = "IN_MEMORY"         # IN_MEMORY | SUPABASE
    disclaimer: str = (
        "AttendIQ is running in DEMO MODE. "
        "Face recognition, liveness, and anti-spoofing use simulated scores. "
        "No real biometric data is stored."
    )
