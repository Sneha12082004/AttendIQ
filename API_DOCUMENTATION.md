# AttendIQ — REST API Reference Documentation

Base URL: `http://localhost:8000/api`  
Swagger UI: `http://localhost:8000/docs`  
Authentication: Bearer Token in `Authorization: Bearer <JWT>` header

---

## 1. Authentication Endpoints

### `POST /auth/login`
Authenticates a user and returns a JWT access token.
- **Request Body:**
  ```json
  {
    "email": "dr.mehta@attendiq.demo",
    "password": "Demo@123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "user": {
      "id": "fac-001",
      "email": "dr.mehta@attendiq.demo",
      "full_name": "Dr. Priya Mehta",
      "role": "faculty"
    },
    "profile": { ... }
  }
  ```

### `GET /auth/me`
Returns current authenticated user details from JWT token.

### `GET /auth/demo-accounts`
Returns pre-configured demo credentials for hackathon evaluators.

---

## 2. Biometric Face Enrollment

### `POST /enrollment/consent`
Records explicit student consent.
- **Request Body:**
  ```json
  {
    "consent_granted": true,
    "consent_text": "I grant consent for biometric template extraction..."
  }
  ```

### `POST /enrollment/quality-check`
Pre-flight check of camera frame quality before capture.

### `POST /enrollment/enroll`
Submits multiple camera frames, extracts 128-d template embedding, and stores it.
- **Request Body:**
  ```json
  {
    "student_id": "stud-001",
    "face_images_base64": ["data:image/jpeg;base64,..."]
  }
  ```

### `DELETE /enrollment/reset`
Purges enrolled biometric vector template (Right to Erasure).

---

## 3. Class Sessions

### `POST /sessions/create` (Faculty)
Creates an active classroom session with dynamic QR code and nonce.
- **Request Body:**
  ```json
  {
    "subject_id": "subj-cs-01",
    "classroom_id": "room-101",
    "section": "A",
    "duration_minutes": 60
  }
  ```

### `GET /sessions/active`
Lists active sessions currently open for student attendance.

### `PUT /sessions/{session_id}/close` (Faculty)
Closes the active session; prevents subsequent submissions.

---

## 4. Multi-Layer Attendance Verification

### `POST /attendance/challenge`
Requests a randomized active liveness challenge.
- **Request Body:**
  ```json
  { "session_id": "sess-cs301-live" }
  ```
- **Response `200 OK`:**
  ```json
  {
    "challenge_id": "chal-a1b2c3d4",
    "challenge_type": "blink",
    "instruction": "Blink your eyes twice naturally",
    "nonce": "7f8e9d0a1b2c3d4e",
    "expires_in_seconds": 90
  }
  ```

### `POST /attendance/mark`
Submits complete multi-layer verification data.
- **Request Body:**
  ```json
  {
    "session_id": "sess-cs301-live",
    "challenge_id": "chal-a1b2c3d4",
    "challenge_nonce": "7f8e9d0a1b2c3d4e",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "accuracy": 8.5,
    "is_mock_location": false,
    "ble_beacon_id": "BEACON-CS-101",
    "face_image_base64": "data:image/jpeg;base64,...",
    "device_id": "android-pixel-7"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "record_id": "att-9f8e7d",
    "status": "present",
    "geofence_passed": true,
    "face_match_passed": true,
    "liveness_passed": true,
    "antispoof_passed": true,
    "trust_score": {
      "overall_score": 92,
      "grade": "A",
      "location_score": 24.5,
      "face_match_score": 28.0,
      "liveness_score": 24.5,
      "antispoof_score": 15.0,
      "ble_score": 5.0,
      "explanation": "Grade A (92/100) — Classroom geofence verified; Biometric matched; Challenge completed"
    },
    "rejection_reasons": []
  }
  ```

### `POST /attendance/override` (Faculty)
Authorizes a manual override with documented reason.

---

## 5. Administrative Endpoints

### `GET /admin/analytics`
System-wide telemetry, department attendance rates, and daily area chart trends.

### `GET /admin/defaulters?threshold_percent=75`
Identifies students below threshold and calculates exact recovery classes needed.

### `POST /admin/classrooms`
Configures classroom centroid latitude, longitude, and geofence radius.

### `GET /admin/erp/export`
Exports attendance formatted for College ERP systems (SAP, Ellucian Banner, TCS iON).
