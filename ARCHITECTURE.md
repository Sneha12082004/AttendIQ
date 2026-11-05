# AttendIQ — System Architecture

> **Tech Avinya Hackathon 2026 · CIH-001**

---

## High-Level System Diagram

```mermaid
flowchart TD
    subgraph Student["📱 Student Device (Flutter App)"]
        CAM[Camera Module]
        GPS[GPS / Location]
        BLE[BLE Scanner]
        LOCAL_DB[(SQLite\nOffline Store)]
        UI_STUDENT[Student UI Screens]
    end

    subgraph Faculty["🖥️ Faculty Device (Web Browser)"]
        WEB[React Dashboard\nVite + TypeScript]
    end

    subgraph Backend["⚙️ FastAPI Backend (Python)"]
        AUTH_MW[JWT Auth Middleware]
        subgraph Routers
            R_AUTH[auth router]
            R_ENROLL[enrollment router]
            R_SESSION[sessions router]
            R_ATTEND[attendance router]
            R_FACULTY[faculty router]
            R_ADMIN[admin router]
        end
        subgraph AI_PIPELINE["🧠 AI Pipeline"]
            FACE[Face Detection\n+ Embedding]
            MATCH[Cosine Similarity\nMatcher]
            LIVENESS[Active Liveness\nChallenge Engine]
            ANTISPOOF[Passive Anti-Spoof\nLBP + Temporal]
            TRUST[Trust Score\nAggregator]
        end
        GEOFENCE[Geofence\nEngine\nHaversine]
        NONCE[Nonce /\nSession Token\nManager]
    end

    subgraph DB["🗄️ Supabase (PostgreSQL)"]
        PGDB[(PostgreSQL\nTables)]
        RLS[Row Level\nSecurity Policies]
        AUTH_SB[Supabase Auth\nJWT Issuer]
        STORAGE[Supabase Storage\nAudit Logs]
    end

    %% Student flows
    UI_STUDENT --> CAM
    UI_STUDENT --> GPS
    UI_STUDENT --> BLE
    UI_STUDENT -->|HTTPS REST| AUTH_MW
    CAM -->|JPEG frame| R_ATTEND
    GPS -->|lat/lon| R_ATTEND
    BLE -->|beacon RSSI| R_ATTEND
    UI_STUDENT <-->|offline queue| LOCAL_DB

    %% Faculty flows
    WEB -->|HTTPS REST| AUTH_MW
    WEB -->|Start/End session| R_SESSION
    WEB -->|View reports| R_FACULTY

    %% Backend internal
    AUTH_MW --> Routers
    R_ATTEND --> GEOFENCE
    R_ATTEND --> AI_PIPELINE
    AI_PIPELINE --> FACE --> MATCH --> LIVENESS --> ANTISPOOF --> TRUST
    R_ATTEND --> NONCE
    R_SESSION --> NONCE

    %% DB connections
    Routers -->|supabase-py client| PGDB
    PGDB --- RLS
    AUTH_SB -->|token validation| AUTH_MW
```

---

## Component Descriptions

### 1. Flutter Mobile App (`mobile/`)

The student-facing application built with Flutter (Dart). It handles all three input channels for verification:

| Sub-component | File(s) | Responsibility |
|---------------|---------|---------------|
| Camera Service | `lib/services/camera_service.dart` | Captures frames for enrollment and attendance |
| Geolocation Service | `lib/services/location_service.dart` | Reads GPS coordinates, requests fine location permission |
| BLE Scanner | `lib/services/ble_service.dart` | Scans for classroom BLE beacon (enhancement layer) |
| Attendance API | `lib/services/attendance_api.dart` | Sends face frame + location to backend |
| Offline Queue | `lib/services/offline_queue.dart` | Queues attendance attempts when offline; syncs on reconnect |
| SQLite Store | `lib/services/local_db_service.dart` | Stores pending records using `sqflite` package |
| Liveness UI | `lib/screens/liveness_screen.dart` | Displays challenge prompt, animates countdown |
| Enrollment UI | `lib/screens/enrollment_screen.dart` | Multi-step face capture wizard |

### 2. FastAPI Backend (`backend/`)

The central processing unit. All verification logic lives here — the mobile app sends raw data, and the backend makes all trust decisions.

| Module | File | Responsibility |
|--------|------|---------------|
| Entry Point | `app/main.py` | CORS, rate limiting (SlowAPI), router mounting |
| Auth | `app/routers/auth.py` | Login, token refresh, role extraction |
| Enrollment | `app/routers/enrollment.py` | Face embedding extraction + storage |
| Sessions | `app/routers/sessions.py` | Faculty start/end session, QR + nonce generation |
| Attendance | `app/routers/attendance.py` | Orchestrates the full AI pipeline per attempt |
| Face Pipeline | `app/utils/face_pipeline.py` | HOG detection, embedding, cosine match |
| Liveness | `app/utils/liveness.py` | Challenge generation, response validation |
| Anti-Spoof | `app/utils/antispoof.py` | LBP texture, temporal frames, frequency |
| Geofence | `app/utils/geofence.py` | Haversine distance, radius check |
| Trust Score | `app/utils/trust_score.py` | Weighted score aggregation, grade assignment |

### 3. React Web Dashboard (`web/`)

Faculty and admin interface. Built with React 18, TypeScript, Vite, and Tailwind CSS.

| Page | Responsibility |
|------|---------------|
| `/login` | Auth form, JWT token stored in `localStorage` |
| `/dashboard` | Real-time attendance feed, session status |
| `/sessions` | Start/end sessions, generate QR codes |
| `/reports` | Attendance analytics, Recharts graphs |
| `/admin/students` | Student enrollment management |
| `/admin/classrooms` | Classroom coordinates + geofence config |
| `/admin/audit` | Suspicious attempt review, audit log |

### 4. Supabase (PostgreSQL + Auth + Storage)

Supabase serves as the backend-as-a-service layer providing:
- **PostgreSQL** — relational storage for all attendance data
- **Supabase Auth** — JWT issuance and user management
- **Row Level Security** — database-enforced access control
- **Storage buckets** — optional encrypted biometric data archival

---

## Data Flow: Student Enrollment

```mermaid
sequenceDiagram
    actor S as Student
    participant App as Flutter App
    participant BE as FastAPI Backend
    participant DB as Supabase DB

    S->>App: Opens enrollment screen
    App->>App: Request CAMERA permission
    App->>S: Show face capture guide overlay
    S->>App: Positions face in frame (5 captures)
    App->>BE: POST /api/enrollment/face\n{student_id, frames[5]}
    BE->>BE: Face detection (OpenCV HOG)
    BE->>BE: Extract 128-d embedding per frame
    BE->>BE: Average embeddings → master vector
    BE->>DB: INSERT face_embeddings\n(student_id, vector, model)
    BE->>DB: UPDATE student_profiles\nSET is_enrolled=TRUE
    BE-->>App: {success: true, enrollment_id}
    App-->>S: "Enrollment complete! ✓"
```

## Data Flow: Attendance Marking

```mermaid
sequenceDiagram
    actor S as Student
    participant App as Flutter App
    participant BE as FastAPI Backend
    participant DB as Supabase DB

    S->>App: Taps "Mark Attendance"
    App->>App: Check active session QR / nonce
    App->>App: Read GPS coordinates
    App->>BE: GET /api/sessions/active\n{classroom_id}
    BE-->>App: {session_id, nonce, challenge_type}

    Note over App,BE: Step 1 — Liveness Challenge
    App->>S: Show challenge ("Please BLINK")
    S->>App: Performs gesture (camera captures)
    App->>BE: POST /api/attendance/verify-liveness\n{session_id, nonce, liveness_frames[]}
    BE->>BE: Validate gesture via frame delta
    BE-->>App: {liveness_passed: true, token}

    Note over App,BE: Step 2 — Full Verification
    App->>App: Capture final face frame
    App->>BE: POST /api/attendance/mark\n{session_id, nonce, face_frame, lat, lon, liveness_token}
    BE->>BE: ① Geofence check (Haversine)
    BE->>BE: ② Face detection (OpenCV HOG)
    BE->>DB: SELECT embedding WHERE student_id
    BE->>BE: ③ Cosine similarity match
    BE->>BE: ④ Anti-spoofing (LBP texture)
    BE->>BE: ⑤ Trust score aggregation
    BE->>DB: INSERT attendance_records (all results)
    BE-->>App: {status: "present", trust_score: 87, grade: "A"}
    App-->>S: "Attendance Marked ✓ (Trust: 87/A)"
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY                        │
│                                                          │
│  Student Device          FastAPI Backend                 │
│  ┌──────────────┐        ┌────────────────────────────┐ │
│  │ Flutter App  │        │ Auth Middleware             │ │
│  │              │ HTTPS  │  • JWT signature verify     │ │
│  │ No secrets   │◄──────►│  • Role extraction (RBAC)  │ │
│  │ stored       │        │  • Rate limiting (SlowAPI) │ │
│  │              │        │                            │ │
│  │ Face frames  │        │ Verification Pipeline      │ │
│  │ → NOT stored │        │  • Nonce replay prevention │ │
│  │   after send │        │  • Challenge expiry (90s)  │ │
│  └──────────────┘        │  • All checks server-side  │ │
│                          └────────────────────────────┘ │
│                                   │                      │
│                                   │ supabase-py          │
│                                   ▼                      │
│                          ┌────────────────────────────┐ │
│                          │ Supabase / PostgreSQL       │ │
│                          │  • RLS: students only see  │ │
│                          │    own records             │ │
│                          │  • Service key on server   │ │
│                          │  • Embeddings encrypted    │ │
│                          │    at rest (AES-256)       │ │
│                          └────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key security principles:**
1. **No biometric data leaves the backend** — mobile app sends raw frames, not embeddings
2. **All verification decisions are server-side** — the app cannot self-approve attendance
3. **Nonce-based replay prevention** — each session has a unique nonce; re-use is rejected
4. **Short-lived challenges** — liveness challenges expire in 90 seconds
5. **RBAC enforced at API layer** — students cannot access faculty or admin routes
6. **RLS enforced at DB layer** — students cannot query other students' records

---

## API Communication Patterns

| Pattern | Usage |
|---------|-------|
| REST (JSON over HTTPS) | All mobile↔backend and web↔backend communication |
| JWT Bearer tokens | Included in `Authorization: Bearer <token>` header |
| Multipart form-data | Face frame image upload in enrollment/attendance |
| Supabase Realtime | Web dashboard subscribes to `attendance_records` table changes (live feed) |

---

## Offline Architecture

When the mobile device loses connectivity during an attendance attempt:

1. The Flutter app detects the network error from the Axios/Dio response
2. The attempt is serialized to **SQLite** via `sqflite` (`lib/services/local_db_service.dart`)
3. A background sync service (`lib/services/offline_queue.dart`) monitors connectivity
4. On reconnection, queued attempts are replayed to the backend **in order**
5. The backend validates nonce freshness; expired attempts (>5 minutes) are rejected with `NONCE_EXPIRED`
6. A visual badge on the student home screen shows the pending queue count

> **Limitation:** Offline attendance is only valid if the nonce has not expired. Prolonged offline periods (>5 min) will cause rejection on sync.

---

## AI Pipeline Overview

```
Frame Input (JPEG from camera)
        │
        ▼
┌───────────────┐
│  Face Detect  │  OpenCV HOG → bounding box
└──────┬────────┘
       │
       ▼
┌───────────────┐
│  Embedding    │  128-dim vector (HOG/InsightFace)
└──────┬────────┘
       │
       ▼
┌───────────────┐
│  Face Match   │  Cosine similarity vs. enrolled vector
└──────┬────────┘
       │
       ▼
┌───────────────┐
│  Liveness     │  Challenge-response (blink/nod/smile)
└──────┬────────┘
       │
       ▼
┌───────────────┐
│  Anti-Spoof   │  LBP texture + temporal + frequency
└──────┬────────┘
       │
       ▼
┌───────────────┐
│  Trust Score  │  Weighted aggregation → 0-100, grade A-F
└──────┬────────┘
       │
       ▼
  PRESENT / ABSENT / SUSPICIOUS
```

See [`AI_PIPELINE.md`](AI_PIPELINE.md) for the full technical deep dive.
