"""
app/routers/faculty.py
──────────────────────
Faculty portal endpoints:
- Dashboard telemetry and summary counts
- Live session oversight
- Historical session records
- Subject-level attendance reports
- Suspicious attempt investigation
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.auth import get_current_user, require_faculty
from app.database import get_db

router = APIRouter(prefix="/faculty", tags=["Faculty Management"])


@router.get("/dashboard")
async def get_faculty_dashboard(current_user: dict = Depends(require_faculty)):
    """Summary dashboard telemetry for faculty."""
    db = get_db()
    f_res = db.table("faculty").select("*").eq("user_id", current_user["id"]).execute()
    faculty_id = f_res.data[0]["id"] if f_res.data else "fac-001"

    # Find active session
    sess_res = db.table("sessions").select("*") \
        .eq("faculty_id", faculty_id) \
        .eq("is_active", True) \
        .execute()
    active_session = sess_res.data[0] if sess_res.data else None

    if active_session:
        subj = db.table("subjects").select("*").eq("id", active_session["subject_id"]).execute()
        room = db.table("classrooms").select("*").eq("id", active_session["classroom_id"]).execute()
        active_session = dict(active_session)
        active_session["subject_name"] = subj.data[0]["name"] if subj.data else "Subject"
        active_session["classroom_name"] = room.data[0]["name"] if room.data else "Classroom"
        active_session["classroom_lat"] = room.data[0]["latitude"] if room.data else 0.0
        active_session["classroom_lon"] = room.data[0]["longitude"] if room.data else 0.0
        active_session["geofence_radius"] = room.data[0]["radius_meters"] if room.data else 50.0

    # Total enrolled students in faculty's department
    dept_id = f_res.data[0]["department_id"] if f_res.data else "dept-cs"
    st_res = db.table("students").select("*").eq("department_id", dept_id).execute()
    total_students = len(st_res.data or [])

    # Today's attendance counts for this faculty
    att_res = db.table("attendance").select("*").execute()
    all_attendance = att_res.data or []

    present_count = sum(1 for a in all_attendance if a.get("status") in ["present", "manual_override"])
    rejected_count = sum(1 for a in all_attendance if a.get("status") == "rejected")
    suspicious_count = sum(1 for a in all_attendance if a.get("is_suspicious", False))

    # Calculate overall attendance percentage
    total_attempts = max(1, len(all_attendance))
    overall_percentage = round((present_count / total_attempts) * 100.0, 1)

    return {
        "faculty_name": f_res.data[0]["name"] if f_res.data else current_user.get("full_name", "Faculty"),
        "department_id": dept_id,
        "total_enrolled_students": total_students,
        "active_session": active_session,
        "stats": {
            "total_students": total_students,
            "present_today": present_count,
            "absent_today": max(0, total_students - present_count),
            "rejected_attempts": rejected_count,
            "suspicious_flagged": suspicious_count,
            "attendance_rate": overall_percentage,
        },
        "recent_attendance": all_attendance[-10:] if all_attendance else [],
    }


@router.get("/sessions")
async def get_faculty_sessions(current_user: dict = Depends(require_faculty)):
    """Lists all historical and current sessions owned by this faculty member."""
    db = get_db()
    f_res = db.table("faculty").select("*").eq("user_id", current_user["id"]).execute()
    faculty_id = f_res.data[0]["id"] if f_res.data else "fac-001"

    res = db.table("sessions").select("*").eq("faculty_id", faculty_id).order("start_time", desc=True).execute()
    sessions = res.data or []

    enriched = []
    for s in sessions:
        subj = db.table("subjects").select("*").eq("id", s["subject_id"]).execute()
        room = db.table("classrooms").select("*").eq("id", s["classroom_id"]).execute()
        # count attendees
        att = db.table("attendance").select("*").eq("session_id", s["id"]).execute()
        att_data = att.data or []

        item = dict(s)
        item["subject_name"] = subj.data[0]["name"] if subj.data else "Subject"
        item["classroom_name"] = room.data[0]["name"] if room.data else "Classroom"
        item["present_count"] = sum(1 for a in att_data if a.get("status") in ["present", "manual_override"])
        item["total_attempts"] = len(att_data)
        enriched.append(item)

    return enriched


@router.get("/reports")
async def get_faculty_reports(
    subject_id: Optional[str] = None,
    current_user: dict = Depends(require_faculty)
):
    """Generates subject-wise attendance aggregation and analytics."""
    db = get_db()
    att_res = db.table("attendance").select("*").execute()
    records = att_res.data or []

    if subject_id:
        records = [r for r in records if r.get("subject_id") == subject_id]

    # Student wise summary
    students_res = db.table("students").select("*").execute()
    students_map = {s["id"]: s for s in (students_res.data or [])}

    student_summary: Dict[str, Dict[str, Any]] = {}
    for r in records:
        s_id = r["student_id"]
        if s_id not in student_summary and s_id in students_map:
            st = students_map[s_id]
            student_summary[s_id] = {
                "student_id": s_id,
                "name": st["full_name"],
                "reg_number": st["reg_number"],
                "section": st.get("section", "A"),
                "total_sessions": 0,
                "attended": 0,
                "trust_score_avg": 0,
                "_trust_scores": [],
            }
        if s_id in student_summary:
            student_summary[s_id]["total_sessions"] += 1
            if r.get("status") in ["present", "manual_override"]:
                student_summary[s_id]["attended"] += 1
            if r.get("trust_score"):
                student_summary[s_id]["_trust_scores"].append(r["trust_score"])

    report_list = []
    for s_id, data in student_summary.items():
        tot = max(1, data["total_sessions"])
        pct = round((data["attended"] / tot) * 100.0, 1)
        t_scores = data.pop("_trust_scores")
        avg_trust = round(sum(t_scores) / max(1, len(t_scores)), 1) if t_scores else 85.0
        data["percentage"] = pct
        data["average_trust_score"] = avg_trust
        data["status"] = "Normal" if pct >= 75.0 else "Defaulter Risk"
        report_list.append(data)

    return {
        "total_records": len(records),
        "students_count": len(report_list),
        "students": report_list,
    }


@router.get("/reports/export-csv")
async def export_attendance_csv(
    session_id: Optional[str] = None,
    current_user: dict = Depends(require_faculty)
):
    """Exports attendance records formatted as CSV."""
    db = get_db()
    res = db.table("attendance").select("*").execute()
    records = res.data or []
    if session_id:
        records = [r for r in records if r.get("session_id") == session_id]

    csv_lines = [
        "Record ID,Student Name,Reg Number,Session ID,Timestamp,Status,Trust Score,Grade,Distance (m),Face Match,Liveness,Anti-Spoof,Manual Override"
    ]
    for r in records:
        csv_lines.append(
            f"{r.get('id')},{r.get('student_name')},{r.get('student_reg_no')},{r.get('session_id')},"
            f"{r.get('timestamp')},{r.get('status')},{r.get('trust_score')},{r.get('trust_grade')},"
            f"{r.get('distance_meters')},{r.get('face_match_passed')},{r.get('liveness_passed')},"
            f"{r.get('antispoof_passed')},{r.get('is_manual_override')}"
        )

    csv_content = "\n".join(csv_lines)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendiq_attendance_export.csv"},
    )


@router.get("/suspicious/{session_id}")
async def get_session_suspicious_attempts(session_id: str, current_user: dict = Depends(require_faculty)):
    """Fetches flagged anomaly attempts for a given session with investigative detail."""
    db = get_db()
    res = db.table("attendance").select("*") \
        .eq("session_id", session_id) \
        .eq("is_suspicious", True) \
        .execute()
    return res.data or []
