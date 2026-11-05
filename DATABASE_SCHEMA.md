# AttendIQ — Database Architecture & Schema Specification

## PostgreSQL / Supabase Integration | Problem Statement CIH-001

---

## Entity Relationship Overview

```
departments
   │ 1
   │───< subjects (1:N)
   │───< student_profiles (1:N)
   └───< faculty_profiles (1:N)
             │ 1
             └───< class_sessions (1:N)
                       │ 1
                       └───< attendance_records (1:N) >─── student_profiles
                                    │
                                    └─── classrooms (N:1)

face_embeddings ──────── (1:1) ─── student_profiles
biometric_consents ───── (1:1) ─── student_profiles
suspicious_attempts ──── (N:1) ─── class_sessions
audit_logs (Immutable append-only system log)
```

---

## Complete Table Specifications

### 1. `student_profiles`
- `id` (UUID, PK): Unique student profile ID
- `user_id` (UUID, UNIQUE): Linked to Supabase Auth User ID
- `reg_number` (VARCHAR(20), UNIQUE): College registration number (e.g. `CS2024001`)
- `full_name` (VARCHAR(100)): Student name
- `department_id` (UUID, FK -> `departments.id`)
- `semester` (INTEGER): Current semester (1 to 8)
- `section` (VARCHAR(5)): Assigned classroom section (e.g. `A`, `B`)
- `is_enrolled` (BOOLEAN): True once biometric face template is generated
- `enrollment_consent_at` (TIMESTAMPTZ): Audit timestamp of informed biometric consent

### 2. `faculty_profiles`
- `id` (UUID, PK): Unique faculty ID
- `user_id` (UUID, UNIQUE): Linked to Auth user
- `employee_id` (VARCHAR(20), UNIQUE): Institutional employee code
- `full_name` (VARCHAR(100)): Faculty name
- `department_id` (UUID, FK -> `departments.id`)
- `designation` (VARCHAR(100)): Academic rank

### 3. `classrooms`
- `id` (UUID, PK): Classroom identifier (e.g. `room-101`)
- `name` (VARCHAR(100)): Friendly room label
- `building` (VARCHAR(100)): Campus building
- `floor` (INTEGER): Floor number
- `latitude` (DOUBLE PRECISION): High-precision GPS latitude centroid
- `longitude` (DOUBLE PRECISION): High-precision GPS longitude centroid
- `radius_meters` (INTEGER): Allowed boundary circle radius (typically 35–75m)
- `ble_beacon_id` (VARCHAR(100)): Optional BLE beacon UUID/Major/Minor string

### 4. `class_sessions`
- `id` (UUID, PK): Session UUID
- `faculty_id` (UUID, FK -> `faculty_profiles.id`)
- `subject_id` (UUID, FK -> `subjects.id`)
- `classroom_id` (UUID, FK -> `classrooms.id`)
- `section` (VARCHAR(5))
- `start_time` (TIMESTAMPTZ): When session opened
- `end_time` (TIMESTAMPTZ): When session closed
- `is_active` (BOOLEAN): Whether currently accepting attendance submissions
- `session_nonce` (VARCHAR(64)): Ephemeral cryptographic session nonce
- `qr_code_data` (TEXT): Base64 PNG data URI of dynamic room QR code

### 5. `face_embeddings` (Sensitive Biometric Vault)
- `id` (UUID, PK)
- `student_id` (UUID, UNIQUE, FK -> `student_profiles.id`)
- `embedding_vector` (FLOAT8[]): 128-dimensional normalized floating point array
- `embedding_model` (VARCHAR(50)): Model identifier (`opencv-dnn-moments-v1`)
- `created_at` (TIMESTAMPTZ)
- *Security:* Protected by strict Row Level Security (RLS); accessible only by backend service role.

### 6. `attendance_records` (Final Decision & Forensic Audit)
- `id` (UUID, PK)
- `student_id` (UUID, FK -> `student_profiles.id`)
- `session_id` (UUID, FK -> `class_sessions.id`)
- `subject_id` (UUID, FK -> `subjects.id`)
- `classroom_id` (UUID, FK -> `classrooms.id`)
- `attempt_timestamp` (TIMESTAMPTZ)
- `student_latitude` (DOUBLE PRECISION)
- `student_longitude` (DOUBLE PRECISION)
- `distance_from_classroom_meters` (FLOAT)
- `geofence_passed` (BOOLEAN)
- `face_match_score` (FLOAT): Cosine similarity ($0.0 - 1.0$)
- `face_match_passed` (BOOLEAN)
- `liveness_passed` (BOOLEAN)
- `antispoof_score` (FLOAT): Presentation attack score ($0.0 - 1.0$)
- `antispoof_passed` (BOOLEAN)
- `trust_score` (INTEGER): Explainable Trust Score ($0 - 100$)
- `trust_grade` (CHAR(1)): Grade (`A`, `B`, `C`, `D`, `F`)
- `status` (VARCHAR(20)): `present`, `rejected`, `pending`, `manual_override`
- `rejection_reasons` (TEXT[])
- `is_manual_override` (BOOLEAN)
- `override_by` (UUID, FK -> `faculty_profiles.id`)
- `override_reason` (TEXT)
- `is_suspicious` (BOOLEAN)
- `suspicious_flags` (TEXT[])
- `UNIQUE(student_id, session_id)`: Enforces database-level duplicate prevention

---

## PostgreSQL DDL Script
The complete, executable migration script is located at:
`backend/supabase_migrations/001_initial_schema.sql`
