"""
app/utils/in_memory_db.py
─────────────────────────
Thread-safe in-memory database that mimics the Supabase PostgREST client
interface.  Used when DEMO_MODE=true so the backend runs without any external
Supabase credentials.

The public API mirrors the supabase-py pattern:
    db.table("users").select("*").eq("email", x).execute()
    db.table("users").insert({...}).execute()
    db.table("users").update({...}).eq("id", x).execute()
    db.table("users").delete().eq("id", x).execute()

Each .execute() returns a SimpleNamespace with a `.data` list attribute,
matching how supabase-py returns results.
"""

from __future__ import annotations

import threading
import uuid
from copy import deepcopy
from datetime import datetime, timedelta
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─────────────────────────────────────────────────────────────────────────────
# Query builder  (fluent interface that terminates with .execute())
# ─────────────────────────────────────────────────────────────────────────────

class QueryBuilder:
    """
    Minimal Supabase-compatible query builder.
    Supports: select, insert, update, delete, eq, neq, in_, order, limit, single.
    """

    def __init__(self, store: Dict[str, List[dict]], table: str, lock: threading.RLock):
        self._store = store
        self._table = table
        self._lock = lock
        self._operation: str = "select"
        self._select_cols: Optional[str] = None
        self._filters: List[tuple] = []     # (col, op, value)
        self._payload: Optional[dict] = None
        self._order_col: Optional[str] = None
        self._order_desc: bool = False
        self._limit_n: Optional[int] = None
        self._single: bool = False

    # ── Operation setters ────────────────────────────────────────────────────

    def select(self, cols: str = "*") -> "QueryBuilder":
        self._operation = "select"
        self._select_cols = cols
        return self

    def insert(self, payload: dict) -> "QueryBuilder":
        self._operation = "insert"
        self._payload = deepcopy(payload)
        return self

    def update(self, payload: dict) -> "QueryBuilder":
        self._operation = "update"
        self._payload = deepcopy(payload)
        return self

    def delete(self) -> "QueryBuilder":
        self._operation = "delete"
        return self

    # ── Filter helpers ───────────────────────────────────────────────────────

    def eq(self, col: str, value: Any) -> "QueryBuilder":
        self._filters.append((col, "eq", value))
        return self

    def neq(self, col: str, value: Any) -> "QueryBuilder":
        self._filters.append((col, "neq", value))
        return self

    def in_(self, col: str, values: list) -> "QueryBuilder":
        self._filters.append((col, "in", values))
        return self

    def gte(self, col: str, value: Any) -> "QueryBuilder":
        self._filters.append((col, "gte", value))
        return self

    def lte(self, col: str, value: Any) -> "QueryBuilder":
        self._filters.append((col, "lte", value))
        return self

    def order(self, col: str, desc: bool = False) -> "QueryBuilder":
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n: int) -> "QueryBuilder":
        self._limit_n = n
        return self

    def single(self) -> "QueryBuilder":
        self._single = True
        return self

    # ── Filter application ───────────────────────────────────────────────────

    def _apply_filters(self, rows: List[dict]) -> List[dict]:
        result = rows
        for col, op, value in self._filters:
            if op == "eq":
                result = [r for r in result if r.get(col) == value]
            elif op == "neq":
                result = [r for r in result if r.get(col) != value]
            elif op == "in":
                result = [r for r in result if r.get(col) in value]
            elif op == "gte":
                result = [r for r in result if r.get(col, 0) >= value]
            elif op == "lte":
                result = [r for r in result if r.get(col, 0) <= value]
        return result

    def _project_cols(self, rows: List[dict]) -> List[dict]:
        if not self._select_cols or self._select_cols == "*":
            return rows
        cols = [c.strip() for c in self._select_cols.split(",")]
        return [{c: r.get(c) for c in cols} for r in rows]

    # ── Execution ────────────────────────────────────────────────────────────

    def execute(self) -> SimpleNamespace:
        with self._lock:
            if self._table not in self._store:
                self._store[self._table] = []

            table_rows = self._store[self._table]

            if self._operation == "select":
                rows = self._apply_filters(deepcopy(table_rows))
                if self._order_col:
                    rows.sort(
                        key=lambda r: r.get(self._order_col) or "",
                        reverse=self._order_desc,
                    )
                if self._limit_n is not None:
                    rows = rows[: self._limit_n]
                rows = self._project_cols(rows)
                data = rows[0] if self._single else rows
                return SimpleNamespace(data=data, error=None)

            elif self._operation == "insert":
                payload = self._payload
                # Auto-assign id if not set
                if "id" not in payload:
                    payload["id"] = str(uuid.uuid4())
                if "created_at" not in payload:
                    payload["created_at"] = datetime.utcnow().isoformat()
                table_rows.append(payload)
                return SimpleNamespace(data=[payload], error=None)

            elif self._operation == "update":
                matched = self._apply_filters(table_rows)
                updated = []
                for row in matched:
                    row.update(self._payload)
                    updated.append(deepcopy(row))
                return SimpleNamespace(data=updated, error=None)

            elif self._operation == "delete":
                before = len(table_rows)
                remaining = [r for r in table_rows if r not in self._apply_filters(table_rows)]
                self._store[self._table] = remaining
                return SimpleNamespace(data=[], error=None)

        return SimpleNamespace(data=[], error="unknown operation")


# ─────────────────────────────────────────────────────────────────────────────
# In-memory "Supabase" client
# ─────────────────────────────────────────────────────────────────────────────

class InMemoryDB:
    """
    Thread-safe in-memory store pre-seeded with all demo data.
    Exposes a .table(name) method that returns a QueryBuilder — identical
    to how supabase-py is called in routers and services.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._store: Dict[str, List[dict]] = {}
        self._seed_demo_data()

    def table(self, name: str) -> QueryBuilder:
        return QueryBuilder(self._store, name, self._lock)

    # ── Seed demo data ────────────────────────────────────────────────────────

    def _seed_demo_data(self):
        """Populate all tables with realistic demo data."""
        now = datetime.utcnow()

        # ── Departments ──────────────────────────────────────────────────────
        departments = [
            {"id": "dept-cs",   "name": "Computer Science",        "code": "CS",   "head_faculty_id": "fac-001"},
            {"id": "dept-it",   "name": "Information Technology",   "code": "IT",   "head_faculty_id": "fac-002"},
            {"id": "dept-ece",  "name": "Electronics & Communication", "code": "ECE", "head_faculty_id": "fac-003"},
            {"id": "dept-mech", "name": "Mechanical Engineering",   "code": "MECH", "head_faculty_id": None},
        ]

        # ── Subjects ─────────────────────────────────────────────────────────
        subjects = [
            # CS subjects
            {"id": "subj-cs-01", "name": "Data Structures",         "code": "CS301", "department_id": "dept-cs",   "semester": 3, "credits": 4, "total_classes_held": 30},
            {"id": "subj-cs-02", "name": "Operating Systems",       "code": "CS401", "department_id": "dept-cs",   "semester": 4, "credits": 4, "total_classes_held": 28},
            {"id": "subj-cs-03", "name": "Database Management",     "code": "CS402", "department_id": "dept-cs",   "semester": 4, "credits": 3, "total_classes_held": 25},
            {"id": "subj-cs-04", "name": "Computer Networks",       "code": "CS501", "department_id": "dept-cs",   "semester": 5, "credits": 4, "total_classes_held": 27},
            {"id": "subj-cs-05", "name": "Machine Learning",        "code": "CS601", "department_id": "dept-cs",   "semester": 6, "credits": 4, "total_classes_held": 24},
            # IT subjects
            {"id": "subj-it-01", "name": "Web Technologies",        "code": "IT301", "department_id": "dept-it",   "semester": 3, "credits": 3, "total_classes_held": 26},
            {"id": "subj-it-02", "name": "Software Engineering",    "code": "IT401", "department_id": "dept-it",   "semester": 4, "credits": 4, "total_classes_held": 28},
            {"id": "subj-it-03", "name": "Cloud Computing",         "code": "IT501", "department_id": "dept-it",   "semester": 5, "credits": 3, "total_classes_held": 22},
            {"id": "subj-it-04", "name": "Cyber Security",          "code": "IT502", "department_id": "dept-it",   "semester": 5, "credits": 3, "total_classes_held": 24},
            {"id": "subj-it-05", "name": "Big Data Analytics",      "code": "IT601", "department_id": "dept-it",   "semester": 6, "credits": 4, "total_classes_held": 20},
            # ECE subjects
            {"id": "subj-ece-01","name": "Digital Signal Processing","code":"ECE401","department_id": "dept-ece",  "semester": 4, "credits": 4, "total_classes_held": 29},
            {"id": "subj-ece-02","name": "VLSI Design",             "code": "ECE501","department_id": "dept-ece",  "semester": 5, "credits": 4, "total_classes_held": 25},
            {"id": "subj-ece-03","name": "Embedded Systems",        "code": "ECE502","department_id": "dept-ece",  "semester": 5, "credits": 3, "total_classes_held": 23},
            {"id": "subj-ece-04","name": "Microprocessors",         "code": "ECE301","department_id": "dept-ece",  "semester": 3, "credits": 4, "total_classes_held": 30},
            {"id": "subj-ece-05","name": "RF Engineering",          "code": "ECE601","department_id": "dept-ece",  "semester": 6, "credits": 3, "total_classes_held": 20},
            # Mech subjects
            {"id": "subj-me-01", "name": "Thermodynamics",          "code": "ME301", "department_id": "dept-mech", "semester": 3, "credits": 4, "total_classes_held": 32},
            {"id": "subj-me-02", "name": "Fluid Mechanics",         "code": "ME401", "department_id": "dept-mech", "semester": 4, "credits": 4, "total_classes_held": 29},
            {"id": "subj-me-03", "name": "Manufacturing Processes", "code": "ME402", "department_id": "dept-mech", "semester": 4, "credits": 3, "total_classes_held": 27},
            {"id": "subj-me-04", "name": "Machine Design",          "code": "ME501", "department_id": "dept-mech", "semester": 5, "credits": 4, "total_classes_held": 25},
            {"id": "subj-me-05", "name": "Heat Transfer",           "code": "ME502", "department_id": "dept-mech", "semester": 5, "credits": 3, "total_classes_held": 24},
        ]

        # ── Classrooms (real GPS: Techno India, Kolkata area) ────────────────
        # NOTE: Coordinates are approximate/demo — do not use for navigation.
        classrooms = [
            {
                "id": "room-101",
                "name": "Lab 101", "building": "Main Block", "floor": 1, "capacity": 60,
                "latitude": 22.5726, "longitude": 88.3639,   # ~Kolkata demo coord
                "radius_meters": 50.0,
                "ble_beacon_id": "BLE-ROOM-101", "ble_beacon_uuid": "550e8400-e29b-41d4-a716-446655440001",
            },
            {
                "id": "room-201",
                "name": "Lecture Hall 201", "building": "Main Block", "floor": 2, "capacity": 120,
                "latitude": 22.5728, "longitude": 88.3641,
                "radius_meters": 60.0,
                "ble_beacon_id": "BLE-ROOM-201", "ble_beacon_uuid": "550e8400-e29b-41d4-a716-446655440002",
            },
            {
                "id": "room-301",
                "name": "Seminar Hall", "building": "New Block", "floor": 3, "capacity": 200,
                "latitude": 22.5720, "longitude": 88.3645,
                "radius_meters": 75.0,
                "ble_beacon_id": "BLE-ROOM-301", "ble_beacon_uuid": "550e8400-e29b-41d4-a716-446655440003",
            },
        ]

        # ── Users (hashed passwords for Demo@123) ────────────────────────────
        demo_password_hash = pwd_context.hash("Demo@123")

        users = [
            # Admin
            {"id": "user-admin-01", "email": "admin@attendiq.demo",    "full_name": "Admin User",          "role": "admin",   "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            # Faculty
            {"id": "user-fac-01",   "email": "faculty1@attendiq.demo", "full_name": "Dr. Priya Sharma",    "role": "faculty", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-fac-02",   "email": "faculty2@attendiq.demo", "full_name": "Prof. Rahul Verma",   "role": "faculty", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-fac-03",   "email": "faculty3@attendiq.demo", "full_name": "Dr. Meera Nair",      "role": "faculty", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            # Students
            {"id": "user-stu-01",   "email": "student1@attendiq.demo", "full_name": "Arjun Patel",         "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-02",   "email": "student2@attendiq.demo", "full_name": "Sneha Krishnan",      "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-03",   "email": "student3@attendiq.demo", "full_name": "Rohit Mehta",         "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-04",   "email": "student4@attendiq.demo", "full_name": "Anjali Singh",        "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-05",   "email": "student5@attendiq.demo", "full_name": "Vikas Gupta",         "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-06",   "email": "student6@attendiq.demo", "full_name": "Pooja Desai",         "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-07",   "email": "student7@attendiq.demo", "full_name": "Karan Malhotra",      "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-08",   "email": "student8@attendiq.demo", "full_name": "Riya Joshi",          "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-09",   "email": "student9@attendiq.demo", "full_name": "Amit Tiwari",         "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-10",   "email": "student10@attendiq.demo","full_name": "Priyanka Roy",        "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-11",   "email": "student11@attendiq.demo","full_name": "Suresh Kumar",        "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-12",   "email": "student12@attendiq.demo","full_name": "Neha Pandey",         "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-13",   "email": "student13@attendiq.demo","full_name": "Deepak Yadav",        "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-14",   "email": "student14@attendiq.demo","full_name": "Kavya Menon",         "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-15",   "email": "student15@attendiq.demo","full_name": "Manish Srivastava",   "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-16",   "email": "student16@attendiq.demo","full_name": "Ankita Bhatt",        "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-17",   "email": "student17@attendiq.demo","full_name": "Gaurav Saxena",       "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-18",   "email": "student18@attendiq.demo","full_name": "Swati Agarwal",       "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-19",   "email": "student19@attendiq.demo","full_name": "Nikhil Chandra",      "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
            {"id": "user-stu-20",   "email": "student20@attendiq.demo","full_name": "Ritika Sharma",       "role": "student", "password_hash": demo_password_hash, "is_active": True, "created_at": now.isoformat()},
        ]

        # ── Faculty profiles ─────────────────────────────────────────────────
        faculty = [
            {"id": "fac-001", "user_id": "user-fac-01", "employee_id": "EMP001", "department_id": "dept-cs",   "designation": "Associate Professor", "subjects": ["subj-cs-01", "subj-cs-05"]},
            {"id": "fac-002", "user_id": "user-fac-02", "employee_id": "EMP002", "department_id": "dept-it",   "designation": "Professor",           "subjects": ["subj-it-01", "subj-it-02"]},
            {"id": "fac-003", "user_id": "user-fac-03", "employee_id": "EMP003", "department_id": "dept-ece",  "designation": "Assistant Professor",  "subjects": ["subj-ece-01", "subj-ece-02"]},
        ]

        # ── Student profiles ─────────────────────────────────────────────────
        student_profiles = []
        for i in range(1, 21):
            uid = f"user-stu-{i:02d}"
            dept = "dept-cs" if i <= 8 else ("dept-it" if i <= 14 else "dept-ece")
            section = "A" if i % 2 == 0 else "B"
            student_profiles.append({
                "id": f"stu-{i:03d}",
                "user_id": uid,
                "registration_number": f"TIE2021{i:04d}",
                "department_id": dept,
                "section": section,
                "semester": 5,
                "batch_year": 2021,
                "face_enrolled": i <= 15,          # first 15 students enrolled
                "face_enrollment_date": (now - timedelta(days=30)).isoformat() if i <= 15 else None,
                "biometric_consent": i <= 15,
                "consent_date": (now - timedelta(days=31)).isoformat() if i <= 15 else None,
                "face_embedding": [0.0] * 128 if i <= 15 else None,  # placeholder embedding
            })

        # ── Sessions (some active, some past) ────────────────────────────────
        sessions = [
            {
                "id": "sess-001",
                "faculty_id": "fac-001", "subject_id": "subj-cs-01",
                "classroom_id": "room-101",
                "start_time": (now - timedelta(minutes=30)).isoformat(),
                "end_time": None, "is_active": True,
                "session_nonce": "demo_nonce_001",
                "total_students": 20, "present_count": 14, "absent_count": 6,
            },
            {
                "id": "sess-002",
                "faculty_id": "fac-001", "subject_id": "subj-cs-05",
                "classroom_id": "room-201",
                "start_time": (now - timedelta(days=1, hours=2)).isoformat(),
                "end_time": (now - timedelta(days=1)).isoformat(), "is_active": False,
                "session_nonce": "demo_nonce_002",
                "total_students": 20, "present_count": 17, "absent_count": 3,
            },
            {
                "id": "sess-003",
                "faculty_id": "fac-002", "subject_id": "subj-it-01",
                "classroom_id": "room-301",
                "start_time": (now - timedelta(minutes=10)).isoformat(),
                "end_time": None, "is_active": True,
                "session_nonce": "demo_nonce_003",
                "total_students": 14, "present_count": 10, "absent_count": 4,
            },
        ]

        # ── Historical attendance records (last 30 days) ──────────────────────
        attendance_records = []
        import random
        random.seed(42)
        record_id = 1

        # Generate 30 days of historical data
        for day_offset in range(1, 31):
            session_date = now - timedelta(days=day_offset)
            # 2 sessions per day
            for s_num, (fac, subj, room) in enumerate([
                ("fac-001", "subj-cs-01", "room-101"),
                ("fac-001", "subj-cs-05", "room-201"),
            ]):
                for stu_num in range(1, 16):   # 15 enrolled students
                    stu_id = f"stu-{stu_num:03d}"
                    # Students 13-15 are low-attendance (defaulters)
                    attendance_prob = 0.5 if stu_num >= 13 else 0.85
                    attended = random.random() < attendance_prob
                    score = round(random.uniform(0.78, 0.96), 3) if attended else round(random.uniform(0.20, 0.55), 3)
                    trust = round(random.uniform(78, 97), 1) if attended else round(random.uniform(20, 55), 1)

                    attendance_records.append({
                        "id": f"rec-{record_id:05d}",
                        "student_id": stu_id,
                        "session_id": f"hist-sess-{day_offset}-{s_num}",
                        "subject_id": subj,
                        "classroom_id": room,
                        "timestamp": session_date.isoformat(),
                        "geofence_result": attended,
                        "location_accuracy": round(random.uniform(5, 20), 1),
                        "distance_meters": round(random.uniform(2, 45), 1) if attended else round(random.uniform(60, 500), 1),
                        "face_match_score": score,
                        "face_match_passed": attended,
                        "liveness_result": attended,
                        "liveness_challenge_type": random.choice(["blink", "turn_left", "turn_right", "look_up"]),
                        "antispoof_score": round(random.uniform(0.80, 0.98), 3) if attended else round(random.uniform(0.1, 0.4), 3),
                        "antispoof_passed": attended,
                        "final_decision": "present" if attended else "absent",
                        "trust_score": trust,
                        "rejection_reasons": [] if attended else ["face_match_failed", "geofence_failed"],
                        "review_status": "passed" if attended else "failed",
                        "is_manual_override": False,
                        "override_reason": None,
                        "override_by": None,
                    })
                    record_id += 1

        # ── Suspicious attempt records ────────────────────────────────────────
        suspicious_records = [
            {
                "id": "susp-001",
                "student_id": "stu-013",
                "session_id": "sess-001",
                "flags": ["REPEATED_FACE_MISMATCH", "HIGH_FREQUENCY_ATTEMPTS"],
                "timestamp": (now - timedelta(minutes=20)).isoformat(),
                "details": {"attempt_count": 5, "face_scores": [0.42, 0.38, 0.41, 0.39, 0.44]},
                "severity": "high",
            },
            {
                "id": "susp-002",
                "student_id": "stu-014",
                "session_id": "sess-001",
                "flags": ["RAPID_LOCATION_CHANGE"],
                "timestamp": (now - timedelta(minutes=15)).isoformat(),
                "details": {"prev_location": [22.60, 88.40], "curr_location": [22.57, 88.36], "time_diff_seconds": 10},
                "severity": "medium",
            },
            {
                "id": "susp-003",
                "student_id": "stu-015",
                "session_id": "sess-003",
                "flags": ["MOCK_LOCATION_SUSPECTED"],
                "timestamp": (now - timedelta(minutes=5)).isoformat(),
                "details": {"accuracy_reported": 0.5, "note": "GPS accuracy suspiciously perfect"},
                "severity": "medium",
            },
        ]

        # ── Audit log ─────────────────────────────────────────────────────────
        audit_logs = [
            {"id": "audit-001", "action": "USER_LOGIN",        "actor_id": "user-admin-01", "target_id": None,       "timestamp": (now - timedelta(hours=2)).isoformat(), "details": {"ip": "127.0.0.1"}},
            {"id": "audit-002", "action": "SESSION_CREATED",   "actor_id": "user-fac-01",   "target_id": "sess-001", "timestamp": (now - timedelta(minutes=30)).isoformat(), "details": {"subject": "Data Structures"}},
            {"id": "audit-003", "action": "ATTENDANCE_MARKED", "actor_id": "user-stu-01",   "target_id": "rec-00001","timestamp": (now - timedelta(minutes=25)).isoformat(), "details": {"decision": "present"}},
            {"id": "audit-004", "action": "SUSPICIOUS_FLAG",   "actor_id": "SYSTEM",         "target_id": "stu-013",  "timestamp": (now - timedelta(minutes=20)).isoformat(), "details": {"flags": ["REPEATED_FACE_MISMATCH"]}},
        ]

        # ── Enrollment records ────────────────────────────────────────────────
        enrollments = []
        for stu_num in range(1, 16):
            enrollments.append({
                "id": f"enroll-{stu_num:03d}",
                "student_id": f"stu-{stu_num:03d}",
                "enrolled_at": (now - timedelta(days=30)).isoformat(),
                "face_quality_score": round(0.80 + (stu_num % 5) * 0.03, 2),
                "frames_processed": 5,
                "consent_given": True,
                "status": "active",
            })

        # ── Write everything into the store ──────────────────────────────────
        self._store["departments"]  = departments
        self._store["subjects"]     = subjects
        self._store["classrooms"]   = classrooms
        self._store["users"]        = users
        self._store["faculty"]      = faculty
        self._store["students"]     = student_profiles
        self._store["sessions"]     = sessions
        self._store["attendance"]   = attendance_records
        self._store["suspicious"]   = suspicious_records
        self._store["audit_logs"]   = audit_logs
        self._store["enrollments"]  = enrollments
        self._store["challenges"]   = []   # liveness challenges (runtime only)
        self._store["biometric_consent"] = []

    # ── Convenience helpers ───────────────────────────────────────────────────

    def get_user_by_email(self, email: str) -> Optional[dict]:
        result = self.table("users").select("*").eq("email", email).execute()
        rows = result.data
        return rows[0] if rows else None

    def get_student_profile(self, user_id: str) -> Optional[dict]:
        result = self.table("students").select("*").eq("user_id", user_id).execute()
        rows = result.data
        return rows[0] if rows else None

    def get_faculty_profile(self, user_id: str) -> Optional[dict]:
        result = self.table("faculty").select("*").eq("user_id", user_id).execute()
        rows = result.data
        return rows[0] if rows else None

    def get_classroom(self, classroom_id: str) -> Optional[dict]:
        result = self.table("classrooms").select("*").eq("id", classroom_id).execute()
        rows = result.data
        return rows[0] if rows else None

    def add_audit_log(self, action: str, actor_id: str, target_id: Optional[str], details: dict):
        self.table("audit_logs").insert({
            "action": action,
            "actor_id": actor_id,
            "target_id": target_id,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details,
        }).execute()


# ─────────────────────────────────────────────────────────────────────────────
# Singleton instance (created once at import time)
# ─────────────────────────────────────────────────────────────────────────────
_in_memory_db: Optional[InMemoryDB] = None


def get_in_memory_db() -> InMemoryDB:
    global _in_memory_db
    if _in_memory_db is None:
        _in_memory_db = InMemoryDB()
    return _in_memory_db
