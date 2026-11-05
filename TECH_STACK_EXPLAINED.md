# AttendIQ — Technology Stack Explained

> Written for the Tech Avinya 2026 judging panel and for our own team reference.  
> Every technology choice is justified with concrete "why we chose it" reasoning.

---

## Table of Contents

1. [Flutter + Dart](#1-flutter--dart)
2. [React + TypeScript](#2-react--typescript)
3. [Vite](#3-vite)
4. [Tailwind CSS](#4-tailwind-css)
5. [FastAPI](#5-fastapi)
6. [Python](#6-python)
7. [OpenCV](#7-opencv)
8. [Face Recognition (HOG + InsightFace approach)](#8-face-recognition-hog--insightface-approach)
9. [Supabase](#9-supabase)
10. [PostgreSQL](#10-postgresql)
11. [SQLite](#11-sqlite)
12. [BLE (Bluetooth Low Energy)](#12-ble-bluetooth-low-energy)
13. [Framer Motion](#13-framer-motion)
14. [Recharts](#14-recharts)
15. [Concept Pairs Explained](#15-concept-pairs-explained)

---

## 1. Flutter + Dart

**What it is:** Flutter is Google's open-source UI toolkit for building natively compiled applications from a single codebase; Dart is the programming language it uses.

**What it does in AttendIQ:** Flutter powers the entire student-facing mobile app — the face enrollment wizard, the liveness challenge screen, the attendance marking UI, and the offline queue indicator. One codebase targets Android (and potentially iOS) without rewriting anything.

**Why we chose it:**
- **Single codebase** for Android and iOS saves development time (critical for a hackathon)
- **Hot reload** lets us iterate on UI in seconds
- Rich camera plugin ecosystem (`camera` package) for face capture
- Strong geolocation support (`geolocator` package)
- Riverpod for clean state management

**Alternatives considered:**
- React Native: JavaScript bridge overhead, slower camera frame rate
- Native Android (Kotlin): Faster but no iOS, longer dev time
- Capacitor (web-to-native): Poor camera/biometric performance

**Where it's used:**
- `mobile/lib/` — all Dart source files
- `mobile/lib/screens/` — UI screens (enrollment, liveness, home, history)
- `mobile/lib/services/` — camera, GPS, BLE, API, offline queue
- `mobile/lib/providers/` — Riverpod state management
- `mobile/pubspec.yaml` — dependency manifest

---

## 2. React + TypeScript

**What it is:** React is a JavaScript library for building interactive user interfaces using a component model; TypeScript adds static type checking to JavaScript.

**What it does in AttendIQ:** React powers the web dashboard used by faculty (to start sessions, view live attendance) and admins (to manage classrooms, students, and audit logs). TypeScript ensures API response shapes are type-safe, catching bugs at compile time rather than runtime.

**Why we chose it:**
- **Component reusability** — attendance table, trust score badge, etc. used across pages
- TypeScript catches mismatched API types early
- Huge ecosystem: TanStack Query for data fetching, React Router for navigation
- Vite provides sub-second HMR (Hot Module Replacement)

**Alternatives considered:**
- Vue.js: Great, but team was more familiar with React
- Next.js: Overkill for a dashboard (SSR not needed here)
- Plain HTML + JS: No type safety, hard to scale even for hackathon

**Where it's used:**
- `web/src/components/` — reusable components (AttendanceTable, TrustBadge, etc.)
- `web/src/pages/` — Dashboard, Sessions, Reports, Admin pages
- `web/src/services/api.ts` — typed Axios wrappers for all API calls
- `web/src/types/` — TypeScript interfaces matching DB schema

---

## 3. Vite

**What it is:** Vite is a next-generation JavaScript build tool that starts the development server in milliseconds using native ES modules.

**What it does in AttendIQ:** Vite serves the React web dashboard during development with instant hot reload, and bundles it into optimized static files for production deployment.

**Why we chose it:**
- Dev server starts in ~300ms (vs ~10s with Webpack/CRA)
- Native TypeScript support without configuration
- Tree-shaking removes unused code from the production bundle
- Official `@vitejs/plugin-react` for React Fast Refresh

**Alternatives considered:**
- Create React App (CRA): Deprecated, slow Webpack-based build
- Webpack: Powerful but complex config; not ideal for hackathon speed

**Where it's used:**
- `web/vite.config.ts` — configuration
- `web/package.json` → `"scripts": {"dev": "vite"}`

---

## 4. Tailwind CSS

**What it is:** Tailwind CSS is a utility-first CSS framework where you style elements by composing small, single-purpose class names directly in HTML/JSX.

**What it does in AttendIQ:** Provides all styling for the web dashboard — layout, spacing, colors, responsive breakpoints, and the dark-mode-ready color palette — without writing a single line of custom CSS.

**Why we chose it:**
- **Speed** — no context-switching between `.jsx` and `.css` files
- Responsive design built-in (`md:`, `lg:` prefixes)
- Consistent design system (spacing scale, color palette)
- PurgeCSS built in: production bundle only includes used classes

**Alternatives considered:**
- Material UI: Heavy component library with opinionated look
- Bootstrap: Older, less flexible utility approach
- Plain CSS: Too slow for hackathon, inconsistent output

**Where it's used:**
- Every JSX file in `web/src/` uses Tailwind class names
- `web/tailwind.config.js` — custom theme colors (AttendIQ brand)
- `web/postcss.config.js` — Tailwind + Autoprefixer pipeline

---

## 5. FastAPI

**What it is:** FastAPI is a modern Python web framework for building REST APIs, with automatic OpenAPI documentation and async support.

**What it does in AttendIQ:** FastAPI is the backbone of the entire backend — it receives face frames and GPS data from the mobile app, runs the AI verification pipeline, communicates with Supabase, and returns structured JSON responses.

**Why we chose it:**
- **Auto-generated `/docs`** (Swagger UI) is invaluable for hackathon demos — judges can explore every endpoint
- Pydantic models provide automatic request validation and clear error messages
- Async support allows concurrent face processing requests
- Python ecosystem gives access to OpenCV, NumPy, SciPy for AI processing

**Alternatives considered:**
- Flask: No automatic validation, no async, no auto-docs
- Django REST Framework: Heavy, slow to set up for a hackathon
- Node.js (Express): Would lose Python's AI library ecosystem
- Go (Gin): Faster, but no convenient AI/ML libraries

**Where it's used:**
- `backend/app/main.py` — app instance, middleware, router registration
- `backend/app/routers/*.py` — one file per domain (auth, enrollment, etc.)
- `backend/app/` — all Pydantic models for request/response validation

---

## 6. Python

**What it is:** Python is a high-level, general-purpose programming language celebrated for its readable syntax and vast scientific library ecosystem.

**What it does in AttendIQ:** Python is the implementation language for the entire backend. It was selected specifically because face recognition, computer vision (OpenCV), numerical computing (NumPy), and signal processing (SciPy) all have mature, well-tested Python libraries that would take months to replicate in another language.

**Why we chose it:**
- OpenCV, NumPy, SciPy are Python-first; best documentation and community
- `face_recognition` library (dlib HOG) is Python-native
- FastAPI is Python-native
- Supabase has an official Python client

**Where it's used:**
- All files under `backend/` — the entire backend is Python

---

## 7. OpenCV

**What it is:** OpenCV (Open Source Computer Vision Library) is the world's most widely used computer vision library, with 2500+ algorithms for image/video processing.

**What it does in AttendIQ:** OpenCV is the workhorse of the face pipeline:
1. **Decoding** incoming JPEG frames from the mobile app into NumPy arrays
2. **Face detection** using the HOG-based frontal face detector (or Haar cascades in demo mode)
3. **Image preprocessing** — grayscale conversion, histogram equalization — before embedding extraction
4. **LBP (Local Binary Pattern)** computation for anti-spoofing texture analysis
5. **Frame-differencing** for temporal consistency checks in liveness

**Why we chose it:**
- Runs entirely offline — no cloud API calls needed
- HOG detector is fast enough to run in real-time on a CPU
- Mature, well-documented, Python bindings via `cv2`
- Installed as `opencv-python-headless` (no GUI dependencies — suitable for a server)

**Alternatives considered:**
- Dlib: We use its HOG implementation indirectly via the `face_recognition` package
- MediaPipe: Excellent, but adds 150MB+ to backend; better suited for on-device (Flutter)

**Where it's used:**
- `backend/app/utils/face_pipeline.py` — detection and preprocessing
- `backend/app/utils/antispoof.py` — LBP and frame analysis
- `backend/app/utils/liveness.py` — frame delta computation

---

## 8. Face Recognition (HOG + InsightFace approach)

**What it is:** "Face recognition" in AttendIQ refers to our custom two-phase pipeline: HOG-based face detection (using OpenCV/dlib) plus cosine-similarity matching of 128-dimensional face embeddings.

**What it does in AttendIQ:**
1. **Enrollment phase:** 5 frames captured → HOG detects face region → embedding extracted → 5 vectors averaged → stored in `face_embeddings` table
2. **Verification phase:** 1 live frame → HOG detect → extract embedding → cosine similarity vs. stored vector → pass if score ≥ 0.65 threshold

**Why we chose HOG over deep learning models for the demo:**
- HOG runs on CPU with no GPU requirement — works on any laptop for the hackathon demo
- `face_recognition` Python package (dlib HOG) produces 128-dim vectors reliably
- Zero model download at runtime
- In production, InsightFace (`ArcFace` R100 model) would replace HOG for superior accuracy with 512-dim embeddings

**Alternatives for production:**
- InsightFace ArcFace: State-of-the-art, 99.8% LFW accuracy, 512-dim embeddings
- FaceNet (Google): 128-dim, good accuracy, needs TFLite for on-device use
- DeepFace: Wrapper library, easier API but less control

**Where it's used:**
- `backend/app/utils/face_pipeline.py` — the full pipeline
- `backend/app/routers/enrollment.py` — calls `extract_embedding()`
- `backend/app/routers/attendance.py` — calls `match_face(embedding, stored_vector)`

---

## 9. Supabase

**What it is:** Supabase is an open-source Firebase alternative that provides a PostgreSQL database, authentication, real-time subscriptions, and storage through a convenient managed service.

**What it does in AttendIQ:** Supabase hosts the production database (PostgreSQL), manages user authentication (JWTs), enforces Row Level Security policies, and provides real-time change streams that the web dashboard subscribes to for the live attendance feed.

**Why we chose it:**
- **Free tier** is generous — perfect for a hackathon project
- Built-in auth means we don't build a login system from scratch
- Row Level Security enforced at the database layer (not just application layer)
- Python client (`supabase-py`) is easy to integrate with FastAPI
- Realtime subscriptions power the live attendance feed on the faculty dashboard without polling

**Alternatives considered:**
- Firebase (Firestore): NoSQL — not ideal for relational attendance data with complex joins
- PlanetScale: Great MySQL service but no built-in auth or realtime
- Raw PostgreSQL on Railway: We'd need to implement auth ourselves

**Where it's used:**
- `backend/app/dependencies.py` — Supabase client initialization
- All routers — CRUD via `supabase.table("...").select().execute()`
- Web dashboard — Supabase Realtime JS client for live feed

---

## 10. PostgreSQL

**What it is:** PostgreSQL is the world's most advanced open-source relational database system, known for strong ACID guarantees, complex queries, and extensibility.

**What it does in AttendIQ:** PostgreSQL (hosted by Supabase) stores all attendance records, face embeddings, session data, audit logs, and user profiles. The relational model is essential for queries like "show all students who attended ≥75% of sessions in subject X this semester."

**Why we chose it:**
- Native support for `FLOAT8[]` arrays to store face embedding vectors
- `TIMESTAMPTZ` for timezone-aware timestamps (critical for multi-location classrooms)
- `JSONB` for flexible audit log details
- `INET` type for IP addresses in audit logs
- UUID primary keys (no sequential ID guessing)
- RLS (Row Level Security) — unique to PostgreSQL, enforced server-side

**Where it's used:**
- Entirely within Supabase; schema defined in `backend/supabase_migrations/001_initial_schema.sql`
- See [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) for full schema documentation

---

## 11. SQLite

**What it is:** SQLite is an embedded relational database that runs entirely within the application process — no separate server required.

**What it does in AttendIQ:** SQLite runs inside the Flutter mobile app (via the `sqflite` package) as the offline queue store. When the student's device is offline, attendance attempts are saved locally and replayed to the server when connectivity returns.

**Why we chose it:**
- Runs entirely on-device — no network required
- `sqflite` Flutter package provides simple async API
- Lightweight: ~600KB added to app size
- ACID compliant — no data corruption on app crash

**Where it's used:**
- `mobile/lib/services/local_db_service.dart` — schema creation, insert, query, delete
- `mobile/lib/services/offline_queue.dart` — dequeue and sync logic

---

## 12. BLE (Bluetooth Low Energy)

**What it is:** BLE is a wireless communication standard designed for short-range, low-power device communication — commonly used in IoT beacons.

**What it does in AttendIQ:** BLE is an optional **fourth verification layer** beyond GPS, face, and liveness. If the classroom has a BLE beacon configured, the Flutter app scans for it and measures signal strength (RSSI). A strong RSSI confirms the student is physically in the room, even if GPS is unreliable indoors.

**Why we included it:**
- GPS is often unreliable indoors (accuracy ±20–100m in buildings)
- BLE beacons provide room-level precision (~5–10m radius)
- Existing BLE beacon deployments in many institutions

**Demo note:** BLE is flagged as `ble_beacon_id` in the `classrooms` table but runs as an enhancement — attendance marks without BLE still succeed if GPS + face + liveness pass.

**Where it's used:**
- `mobile/lib/services/ble_service.dart` — beacon scan, RSSI reading
- `backend/app/routers/attendance.py` — optional `ble_rssi` field processed if present
- `backend/supabase_migrations/001_initial_schema.sql` — `classrooms.ble_beacon_id` column

---

## 13. Framer Motion

**What it is:** Framer Motion is a production-ready animation library for React that provides declarative API for complex animations and gestures.

**What it does in AttendIQ:** Provides smooth, professional animations on the web dashboard: page transition effects, the trust score gauge animation, the live attendance feed slide-in effect, and the success/failure card flips.

**Why we chose it:**
- Declarative API — `<motion.div animate={{ opacity: 1 }}>` is instantly readable
- Physics-based spring animations feel natural
- Built-in `AnimatePresence` for exit animations (table row removals)
- 1-day learning curve

**Where it's used:**
- `web/src/components/TrustScoreGauge.tsx` — animated circular gauge
- `web/src/pages/Dashboard.tsx` — page transitions, live feed animations
- `web/src/components/AttendanceCard.tsx` — success/failure flip animation

---

## 14. Recharts

**What it is:** Recharts is a composable charting library built on D3 and React components, providing bar, line, area, pie, and other chart types.

**What it does in AttendIQ:** Powers all data visualizations on the admin analytics dashboard: daily attendance trends (line chart), per-subject attendance rate (bar chart), department comparison (pie chart), and trust score distribution (area chart).

**Why we chose it:**
- Native React components (not D3 imperative code)
- Responsive out of the box (`<ResponsiveContainer>`)
- Animated chart entries look polished in demos
- Lightweight compared to Chart.js React wrappers

**Where it's used:**
- `web/src/pages/Reports.tsx` — all chart components
- `web/src/components/AttendanceTrend.tsx` — time series line chart
- `web/src/components/DepartmentBreakdown.tsx` — pie chart

---

## 15. Concept Pairs Explained

### Face Detection vs. Face Recognition

| | Face Detection | Face Recognition |
|---|---|---|
| **Question answered** | "Is there a face in this image?" | "Whose face is this?" |
| **Output** | Bounding box coordinates | Identity (or similarity score) |
| **In AttendIQ** | OpenCV HOG finds the face region | Cosine similarity matches the embedding to a stored profile |
| **Step order** | First | Second (depends on detection) |

---

### Face Embeddings vs. Similarity Matching

**Face embedding:** A compact numerical representation of a face — a list of 128 (or 512) floating-point numbers that encode facial geometry. Faces of the same person produce embeddings that are "close" in vector space.

**Similarity matching:** Given two embeddings, compute how "close" they are. AttendIQ uses **cosine similarity**:

```
cosine_similarity(A, B) = (A · B) / (|A| × |B|)
```

Result ranges from -1 (opposite) to 1 (identical). We use threshold 0.65: scores ≥ 0.65 → match.

---

### Face Recognition vs. Liveness Detection

| | Face Recognition | Liveness Detection |
|---|---|---|
| **Question** | "Is this the right person?" | "Is this person real and present right now?" |
| **Defeats** | Wrong-person attacks | Photo attacks, printed masks |
| **Limitation** | A photo of the enrolled person can fool it | A sophisticated 3D mask might fool it |
| **In AttendIQ** | Cosine similarity step | Active challenge (blink/nod) + passive LBP |

Both are needed. Face recognition alone is fooled by holding up a photo. Liveness alone doesn't verify identity.

---

### Passive Anti-Spoofing vs. Active Challenge-Response

| | Passive Anti-Spoofing | Active Challenge-Response |
|---|---|---|
| **User action required** | None | Yes (blink, nod, smile) |
| **How it works** | Analyzes texture, frequency, temporal artifacts of the image | Challenges user to perform an unpredictable gesture |
| **Defeats** | Static photos, low-quality printouts | Pre-recorded videos, most photo attacks |
| **Limitation** | A high-quality screen replay can fool basic LBP | A sophisticated actor watching the challenge can mimic it |
| **In AttendIQ** | LBP texture in `antispoof.py` | Challenge engine in `liveness.py` |

AttendIQ uses **both layers** as independent checks. Neither alone is sufficient.

---

### GPS Geofencing vs. BLE Proximity

| | GPS Geofencing | BLE Proximity |
|---|---|---|
| **Technology** | Satellite-based positioning | Bluetooth radio signal strength |
| **Indoor accuracy** | ±20–100 m (unreliable) | ±3–10 m (room-level) |
| **Hardware needed** | GPS chip (all smartphones) | BLE beacon in classroom |
| **Spoofing risk** | Mock GPS apps, VPN-based spoofing | Harder to fake; requires physical beacon proximity |
| **In AttendIQ** | Primary location check (`geofence.py`) | Optional enhancement layer (`ble_service.dart`) |

---

### Frontend vs. Backend

| | Frontend | Backend |
|---|---|---|
| **Runs on** | User's device (browser / phone) | Server |
| **Language** | TypeScript/React (web), Dart/Flutter (mobile) | Python/FastAPI |
| **Can be trusted?** | No — user controls their device | Yes — server is under our control |
| **In AttendIQ** | Displays UI, captures frames, sends data | Makes ALL verification decisions; never trusts client |

**Critical rule in AttendIQ:** The mobile app never self-approves attendance. It sends raw data (frame + GPS) to the server, and only the server decides the outcome.

---

### Authentication vs. Authorisation

| | Authentication (AuthN) | Authorisation (AuthZ) |
|---|---|---|
| **Question** | "Who are you?" | "What are you allowed to do?" |
| **Mechanism** | Password + JWT token | RBAC roles in JWT claims |
| **In AttendIQ** | Supabase Auth login → JWT issued | Roles: `student`, `faculty`, `admin`; enforced in `dependencies.py` and RLS |

Example: A student is authenticated (they are CS2024001), but not authorised to call `GET /api/admin/users` (admin-only route).

---

### Local Offline Storage vs. Server-Side Records

| | Local Offline (SQLite) | Server-Side (Supabase) |
|---|---|---|
| **Purpose** | Temporary queue when offline | Permanent official record |
| **Trust level** | Low — client-controlled | High — server-controlled |
| **In AttendIQ** | Holds pending attempts; deleted after sync | Official attendance record after server validation |
| **What happens on conflict** | Local record is discarded if nonce expired | Server record is authoritative |

---

### API Integration vs. Mock API

| | Real API Integration | Mock API (Demo Mode) |
|---|---|---|
| **Data** | Real Supabase queries, real face processing | Simulated responses from `demo_helpers.py` |
| **Purpose** | Production use | Hackathon demo without full infrastructure |
| **Response** | Real scores, real records | Realistic fake scores, labeled `[DEMO]` |
| **In AttendIQ** | `DEMO_MODE=false` in `.env` | `DEMO_MODE=true` in `.env` |

Demo mode is implemented in `backend/app/utils/demo_helpers.py`. Every mock response includes `"is_demo": true` so it is never confused with real data.
