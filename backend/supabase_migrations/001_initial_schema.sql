-- ============================================================================
-- AttendIQ — Initial Schema Migration
-- Problem Statement: CIH-001 | Tech Avinya Hackathon 2026
-- Database: PostgreSQL / Supabase
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Departments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Student Profiles ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    reg_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    semester INTEGER CHECK (semester BETWEEN 1 AND 8),
    section VARCHAR(5) DEFAULT 'A',
    phone VARCHAR(15),
    is_enrolled BOOLEAN DEFAULT FALSE,
    enrollment_consent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Faculty Profiles ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faculty_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation VARCHAR(100) DEFAULT 'Assistant Professor',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Subjects / Courses ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    semester INTEGER,
    credits INTEGER DEFAULT 3,
    total_classes_held INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Classrooms & Geofence Coordinates ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL,
    floor INTEGER DEFAULT 1,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 50 CHECK (radius_meters BETWEEN 10 AND 500),
    ble_beacon_id VARCHAR(100),
    capacity INTEGER DEFAULT 60,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Class Sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID REFERENCES faculty_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    section VARCHAR(5) DEFAULT 'A',
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    scheduled_duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    session_nonce VARCHAR(64) NOT NULL,
    qr_code_data TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Biometric Face Embeddings (Secure Storage) ────────────────────────────
CREATE TABLE IF NOT EXISTS face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE REFERENCES student_profiles(id) ON DELETE CASCADE,
    embedding_vector FLOAT8[] NOT NULL,
    embedding_model VARCHAR(50) DEFAULT 'opencv-dnn-moments-v1',
    embedding_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. Attendance Records ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    
    -- Timestamps
    attempt_timestamp TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Location signals
    student_latitude DOUBLE PRECISION,
    student_longitude DOUBLE PRECISION,
    location_accuracy_meters FLOAT,
    distance_from_classroom_meters FLOAT,
    geofence_passed BOOLEAN DEFAULT FALSE,
    geofence_detail VARCHAR(255),
    
    -- Face recognition signals (Layer A)
    face_match_score FLOAT CHECK (face_match_score BETWEEN 0 AND 1),
    face_match_passed BOOLEAN DEFAULT FALSE,
    face_match_threshold FLOAT DEFAULT 0.65,
    
    -- Active Liveness signals (Layer B)
    liveness_challenge_type VARCHAR(50),
    liveness_passed BOOLEAN DEFAULT FALSE,
    liveness_confidence FLOAT,
    
    -- Passive Anti-Spoofing signals (Layer C)
    antispoof_score FLOAT CHECK (antispoof_score BETWEEN 0 AND 1),
    antispoof_passed BOOLEAN DEFAULT FALSE,
    antispoof_method VARCHAR(100),
    
    -- Trust Score (Feature A)
    trust_score INTEGER CHECK (trust_score BETWEEN 0 AND 100),
    trust_grade CHAR(1),
    
    -- Final Decision & Rejection reasons
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reasons TEXT[],
    
    -- Manual Override Audit
    is_manual_override BOOLEAN DEFAULT FALSE,
    override_by UUID REFERENCES faculty_profiles(id),
    override_reason TEXT,
    override_at TIMESTAMPTZ,
    
    -- Suspicious Flags (Feature B)
    is_suspicious BOOLEAN DEFAULT FALSE,
    suspicious_flags TEXT[],
    
    -- Metadata
    device_id VARCHAR(100),
    is_demo BOOLEAN DEFAULT FALSE,
    challenge_nonce VARCHAR(64),
    
    UNIQUE(student_id, session_id)
);

-- ── 9. Active Liveness Ephemeral Challenges ──────────────────────────────────
CREATE TABLE IF NOT EXISTS liveness_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    challenge_type VARCHAR(50) NOT NULL,
    challenge_nonce VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ
);

-- ── 10. Suspicious Attempts Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suspicious_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    flags TEXT[] NOT NULL,
    details JSONB,
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES faculty_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. Immutable Audit Logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_role VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 12. Explicit Biometric Consent Records ────────────────────────────────────
CREATE TABLE IF NOT EXISTS biometric_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE REFERENCES student_profiles(id) ON DELETE CASCADE,
    consented_at TIMESTAMPTZ NOT NULL,
    consent_text TEXT,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for Fast Lookups ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON class_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_classrooms_coords ON classrooms(latitude, longitude);

-- ── Row Level Security (RLS) ──────────────────────────────────────────────────
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Note: Biometric embeddings are strictly restricted to service-role access only.
