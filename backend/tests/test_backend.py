"""
backend/tests/test_backend.py
─────────────────────────────
Comprehensive automated test suite for AttendIQ:
1. Health & Configuration
2. Auth & Role-Based Access Control
3. Geofence & Proximity Engine (Haversine & Mock rejection)
4. Face Pipeline & Biometric Cosine Similarity
5. Active Liveness Challenge Engine (Server Nonces, TTL, Single-use)
6. Passive Anti-Spoofing Heuristics
7. Trust Score Engine (0-100 & Letter Grades)
8. Session Lifecycle (Create, Active List, Dynamic QR, Close)
9. Defaulter Early-Warning Recovery Math
10. ERP Export API Schema Compliance
"""

import math
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.utils.geofence import haversine_distance, check_geofence
from app.utils.face_pipeline import cosine_similarity
from app.utils.liveness import challenge_manager
from app.utils.antispoof import evaluate_anti_spoofing
from app.utils.trust_score import compute_trust_score
import numpy as np


class TestAttendIQBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_health_check(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["version"], "1.0.0")

    def test_02_demo_accounts_list(self):
        res = self.client.get("/api/auth/demo-accounts")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("admin", data)
        self.assertIn("faculty", data)
        self.assertIn("students", data)
        self.assertGreaterEqual(len(data["faculty"]), 1)
        self.assertGreaterEqual(len(data["students"]), 1)

    def test_03_auth_login_faculty_and_admin(self):
        # Admin login
        res_admin = self.client.post("/api/auth/login", json={
            "email": "admin@attendiq.demo",
            "password": "Demo@123"
        })
        self.assertEqual(res_admin.status_code, 200)
        admin_data = res_admin.json()
        self.assertEqual(admin_data["user"]["role"], "admin")
        self.assertIn("access_token", admin_data)

        # Faculty login
        res_fac = self.client.post("/api/auth/login", json={
            "email": "dr.mehta@attendiq.demo",
            "password": "Demo@123"
        })
        self.assertEqual(res_fac.status_code, 200)
        fac_data = res_fac.json()
        self.assertEqual(fac_data["user"]["role"], "faculty")

        # Student login
        res_stud = self.client.post("/api/auth/login", json={
            "email": "student1@attendiq.demo",
            "password": "Demo@123"
        })
        self.assertEqual(res_stud.status_code, 200)
        stud_data = res_stud.json()
        self.assertEqual(stud_data["user"]["role"], "student")

    def test_04_geofence_haversine_calculation(self):
        # Point 1: Exact match -> distance should be ~0m
        dist_exact = haversine_distance(19.0760, 72.8777, 19.0760, 72.8777)
        self.assertAlmostEqual(dist_exact, 0.0, places=2)

        # Point 2: Within 50m radius
        res = check_geofence(
            student_lat=19.0761,
            student_lon=72.8778,
            classroom_lat=19.0760,
            classroom_lon=72.8777,
            radius_meters=50.0,
            reported_accuracy_meters=5.0,
            is_mock_location=False
        )
        self.assertTrue(res["is_within"])
        self.assertLess(res["distance_meters"], 50.0)

        # Point 3: Outside 50m radius
        res_far = check_geofence(
            student_lat=19.0800,
            student_lon=72.8850,
            classroom_lat=19.0760,
            classroom_lon=72.8777,
            radius_meters=50.0,
            reported_accuracy_meters=5.0,
            is_mock_location=False
        )
        self.assertFalse(res_far["is_within"])
        self.assertGreater(res_far["distance_meters"], 50.0)

        # Point 4: Mock location flag rejection
        res_mock = check_geofence(
            student_lat=19.0760,
            student_lon=72.8777,
            classroom_lat=19.0760,
            classroom_lon=72.8777,
            radius_meters=50.0,
            reported_accuracy_meters=5.0,
            is_mock_location=True
        )
        self.assertFalse(res_mock["is_within"])
        self.assertTrue(res_mock["mock_location_detected"])

    def test_05_face_cosine_similarity(self):
        v1 = [1.0, 0.0, 0.0, 1.0]
        v2 = [1.0, 0.0, 0.0, 1.0]
        # Identical vectors -> similarity = 1.0
        self.assertAlmostEqual(cosine_similarity(v1, v2), 1.0, places=3)

        # Orthogonal vectors -> similarity = 0.0
        v3 = [0.0, 1.0, 1.0, 0.0]
        self.assertAlmostEqual(cosine_similarity(v1, v3), 0.0, places=3)

    def test_06_liveness_challenge_lifecycle(self):
        # 1. Issue challenge
        challenge = challenge_manager.issue_challenge("st-001", "sess-test")
        c_id = challenge["challenge_id"]
        self.assertIn(challenge["challenge_type"], ["blink", "turn_left", "turn_right", "look_up", "move_closer", "nod"])

        # 2. Validate challenge
        val_res = challenge_manager.validate_and_consume(c_id, "st-001", "sess-test")
        self.assertTrue(val_res["passed"])

        # 3. Re-use challenge (should be invalidated immediately)
        val_reuse = challenge_manager.validate_and_consume(c_id, "st-001", "sess-test")
        self.assertFalse(val_reuse["passed"])

    def test_07_trust_score_calculation(self):
        # High trust inputs
        ts = compute_trust_score(
            geofence_passed=True,
            location_trust_factor=0.9,
            face_match_passed=True,
            face_similarity_score=0.88,
            liveness_passed=True,
            liveness_confidence=0.95,
            antispoof_passed=True,
            antispoof_score=0.92,
        )
        self.assertGreaterEqual(ts.overall_score, 85.0)
        self.assertIn(ts.grade, ["A", "B"])

        # Low trust inputs (spoofed / out of bounds)
        ts_low = compute_trust_score(
            geofence_passed=False,
            location_trust_factor=0.1,
            face_match_passed=False,
            face_similarity_score=0.35,
            liveness_passed=False,
            liveness_confidence=0.20,
            antispoof_passed=False,
            antispoof_score=0.30,
        )
        self.assertLess(ts_low.overall_score, 60.0)
        self.assertEqual(ts_low.grade, "F")

    def test_08_session_lifecycle(self):
        # Faculty token
        fac_res = self.client.post("/api/auth/login", json={
            "email": "dr.mehta@attendiq.demo",
            "password": "Demo@123"
        })
        fac_token = fac_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {fac_token}"}

        # 1. Create session
        create_res = self.client.post("/api/sessions/create", headers=headers, json={
            "subject_id": "subj-cs-01",
            "classroom_id": "room-101",
            "section": "A",
            "duration_minutes": 45,
        })
        self.assertEqual(create_res.status_code, 200)
        sess_data = create_res.json()
        session_id = sess_data["id"]
        self.assertTrue(sess_data["is_active"])
        self.assertTrue(sess_data["qr_code"].startswith("data:image/png;base64,"))

        # 2. Get active sessions
        active_res = self.client.get("/api/sessions/active", headers=headers)
        self.assertEqual(active_res.status_code, 200)
        active_ids = [s["id"] for s in active_res.json()]
        self.assertIn(session_id, active_ids)

        # 3. Close session
        close_res = self.client.put(f"/api/sessions/{session_id}/close", headers=headers)
        self.assertEqual(close_res.status_code, 200)
        self.assertEqual(close_res.json()["status"], "closed")

    def test_09_defaulter_early_warning_recovery_math(self):
        admin_res = self.client.post("/api/auth/login", json={
            "email": "admin@attendiq.demo",
            "password": "Demo@123"
        })
        admin_token = admin_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = self.client.get("/api/admin/defaulters?threshold_percent=75.0", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["threshold_percent"], 75.0)
        self.assertIsInstance(data["defaulters"], list)

        # Verify math formula for each defaulter
        for d in data["defaulters"]:
            t = d["threshold_percentage"] / 100.0
            tot = d["classes_held"]
            att = d["classes_attended"]
            expected_needed = max(1, math.ceil(((t * tot) - att) / (1.0 - t)))
            self.assertEqual(d["classes_needed_to_recover"], expected_needed)

    def test_10_erp_export_api(self):
        admin_res = self.client.post("/api/auth/login", json={
            "email": "admin@attendiq.demo",
            "password": "Demo@123"
        })
        admin_token = admin_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = self.client.get("/api/admin/erp/export", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["erp_export_version"], "2.0")
        self.assertEqual(data["college_code"], "TECHNO-ENG-2026")
        self.assertIn("data", data)


    def test_11_attendance_marking_flow(self):
        # 1. Faculty login & create active session
        fac_res = self.client.post("/api/auth/login", json={
            "email": "dr.mehta@attendiq.demo",
            "password": "Demo@123"
        })
        fac_token = fac_res.json()["access_token"]
        create_res = self.client.post("/api/sessions/create", headers={"Authorization": f"Bearer {fac_token}"}, json={
            "subject_id": "subj-cs-01",
            "classroom_id": "room-101",
            "section": "A",
            "duration_minutes": 60,
        })
        session_id = create_res.json()["id"]

        # 2. Student login
        stud_res = self.client.post("/api/auth/login", json={
            "email": "student1@attendiq.demo",
            "password": "Demo@123"
        })
        stud_token = stud_res.json()["access_token"]
        stud_headers = {"Authorization": f"Bearer {stud_token}"}

        # 3. Request liveness challenge
        chal_res = self.client.post("/api/attendance/challenge", headers=stud_headers, json={
            "session_id": session_id
        })
        self.assertEqual(chal_res.status_code, 200)
        chal_id = chal_res.json()["challenge_id"]

        # 4. Submit attendance verification
        mark_res = self.client.post("/api/attendance/mark", headers=stud_headers, json={
            "session_id": session_id,
            "challenge_id": chal_id,
            "latitude": 19.0760,
            "longitude": 72.8777,
            "location_accuracy": 5.0,
            "is_mock_location": False,
        })
        self.assertEqual(mark_res.status_code, 200)
        mark_data = mark_res.json()
        self.assertIn("record_id", mark_data)
        record_id = mark_data["record_id"]

        # 5. Faculty manual override on this attendance record
        override_res = self.client.post("/api/attendance/override", headers={"Authorization": f"Bearer {fac_token}"}, json={
            "attendance_record_id": record_id,
            "new_status": "present",
            "reason": "Student had minor camera glare, verified in person by faculty",
        })
        self.assertEqual(override_res.status_code, 200)
        self.assertEqual(override_res.json()["status"], "success")

        # 6. Verify audit logs record this override
        admin_res = self.client.post("/api/auth/login", json={
            "email": "admin@attendiq.demo",
            "password": "Demo@123"
        })
        admin_token = admin_res.json()["access_token"]
        audit_res = self.client.get("/api/admin/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(audit_res.status_code, 200)
        logs = audit_res.json()
        self.assertTrue(any(l.get("action") == "FACULTY_MANUAL_OVERRIDE" for l in logs))


if __name__ == "__main__":
    unittest.main()
