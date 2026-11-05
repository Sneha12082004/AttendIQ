# AttendIQ — AI-Driven Geo-Fenced Biometric Attendance System

> **Tech Avinya Hackathon 2026 · Problem Statement CIH-001**  
> Built by Team AttendIQ · November 2026

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python)](https://python.org)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?logo=flutter)](https://flutter.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-2.0-3ECF8E?logo=supabase)](https://supabase.com)

---

## 🎯 What is AttendIQ?

AttendIQ eliminates proxy attendance fraud through a **triple-layer verification pipeline**:

1. **Geo-Fencing** — The student's GPS must place them inside the classroom boundary (configurable radius, default 50 m).  
2. **Face Recognition** — The live camera frame is compared against the student's enrolled face embedding using cosine similarity.  
3. **Liveness Detection + Anti-Spoofing** — Active challenge-response (blink / nod / smile) plus passive LBP texture analysis ensures the face is a live human, not a photo or screen replay.

All three checks must pass for attendance to be recorded. Every decision is logged with a trust score (0–100) and audit trail.

---

## 📋 Prerequisites

| Requirement | Minimum Version | Purpose |
|-------------|----------------|---------|
| Python | 3.9+ | Backend API |
| Node.js | 18+ | Web dashboard |
| npm / pnpm | 9+ | Web package manager |
| Flutter | 3.x (Dart 3) | Mobile app |
| Android SDK | API 26+ | Running on Android device/emulator |
| Supabase account | — | Database & Auth (optional in demo mode) |
| Git | 2.x | Version control |

> **Demo mode** (`DEMO_MODE=true`) lets you run the full system without a real Supabase project. All verification checks run with realistic simulated results, clearly labeled `[DEMO]`.

---

## 🗂 Folder Structure

```
AttendIQ/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # App entry point, middleware, router registration
│   │   ├── config.py           # Pydantic settings (reads .env)
│   │   ├── dependencies.py     # Auth & DB dependency injection
│   │   ├── routers/
│   │   │   ├── auth.py         # /api/auth/* endpoints
│   │   │   ├── enrollment.py   # /api/enrollment/* endpoints
│   │   │   ├── sessions.py     # /api/sessions/* endpoints
│   │   │   ├── attendance.py   # /api/attendance/* endpoints
│   │   │   ├── faculty.py      # /api/faculty/* endpoints
│   │   │   └── admin.py        # /api/admin/* endpoints
│   │   └── utils/
│   │       ├── face_pipeline.py     # Face detection, embedding, matching
│   │       ├── liveness.py          # Active liveness challenge logic
│   │       ├── antispoof.py         # Passive anti-spoofing (LBP, temporal)
│   │       ├── geofence.py          # Haversine distance + geofence check
│   │       ├── trust_score.py       # Trust score aggregation
│   │       └── demo_helpers.py      # Demo mode simulation utilities
│   ├── supabase_migrations/
│   │   └── 001_initial_schema.sql  # Full DB schema DDL
│   ├── .env.example            # Environment variable template
│   └── requirements.txt        # Python dependencies
│
├── web/                        # React + TypeScript dashboard
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route-level page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # Axios API client wrappers
│   │   ├── stores/             # State management
│   │   └── types/              # TypeScript type definitions
│   ├── package.json
│   └── vite.config.ts
│
├── mobile/                     # Flutter mobile app
│   ├── lib/
│   │   ├── config/             # App configuration, constants, API base URL
│   │   ├── models/             # Dart data models
│   │   ├── providers/          # Riverpod state providers
│   │   ├── screens/            # UI screens
│   │   ├── services/           # API calls, local DB, face/liveness
│   │   ├── theme/              # App theme, colors, text styles
│   │   ├── utils/              # Helpers (geolocation, permissions, etc.)
│   │   └── widgets/            # Reusable Flutter widgets
│   ├── assets/
│   │   ├── animations/         # Lottie JSON files
│   │   ├── images/             # Static images / icons
│   │   └── models/             # On-device ML model files (tflite)
│   └── android/                # Android-specific configuration
│
└── docs/                       # Additional documentation assets
```

---

## ⚡ Quick Start (3 Commands)

```bash
# 1. Clone and enter the project
git clone https://github.com/your-team/AttendIQ.git && cd AttendIQ

# 2. Start the backend in demo mode
cp backend/.env.example backend/.env && cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# 3. Start the web dashboard (new terminal tab)
cd web && npm install && npm run dev
```

Then open **http://localhost:5173** in your browser and log in with `admin@attendiq.demo` / `Demo@123`.

---

## 🔧 Detailed Setup

### Backend (FastAPI + Python)

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DEMO_MODE=true to skip Supabase setup
# If using real Supabase, fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY

# Run the development server
uvicorn app.main:app --reload --port 8000
```

The backend will be available at:
- **API root:** http://localhost:8000
- **Interactive docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

**Key environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `DEMO_MODE` | `true` | Skip real AI/DB calls; return simulated results |
| `SUPABASE_URL` | — | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | — | Service role key (server-side only) |
| `JWT_SECRET_KEY` | — | Min 32-char random string for token signing |
| `FACE_MATCH_THRESHOLD` | `0.65` | Cosine similarity threshold for face match |
| `GEOFENCE_DEFAULT_RADIUS_METERS` | `50` | Radius around classroom coordinates |

---

### Web Dashboard (React + TypeScript + Vite)

```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev          # → http://localhost:5173

# Build for production
npm run build        # Output in web/dist/

# Preview production build
npm run preview
```

The dashboard includes:
- **Admin panel** — manage departments, subjects, classrooms, users
- **Faculty portal** — start/end sessions, view real-time attendance, manual override
- **Analytics** — attendance trends, charts (Recharts), department summaries

---

### Mobile App (Flutter)

```bash
cd mobile

# Install Flutter dependencies
flutter pub get

# Check device/emulator status
flutter devices

# Run on a connected device or emulator
flutter run

# Build release APK
flutter build apk --release
```

**Required permissions (Android):**
- `CAMERA` — face capture
- `ACCESS_FINE_LOCATION` — GPS geofencing
- `BLUETOOTH` / `BLUETOOTH_SCAN` — BLE beacon proximity (optional enhancement)
- `INTERNET` — backend API calls

> **Physical device recommended** for GPS and BLE testing. Camera functionality requires a real device or emulator with webcam passthrough.

**Flutter environment setup:**
```bash
# Verify Flutter installation
flutter doctor

# If Android SDK is missing
flutter doctor --android-licenses
```

---

## 🔑 Demo Credentials

> See [`DEMO_CREDENTIALS.md`](DEMO_CREDENTIALS.md) for the complete list.

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@attendiq.demo | Demo@123 |
| Faculty | dr.mehta@attendiq.demo | Demo@123 |
| Student | student1@attendiq.demo | Demo@123 |

---

## 🎮 Running in Demo Mode

Demo mode (`DEMO_MODE=true` in `backend/.env`) enables a fully functional demo without real Supabase, real GPS, or a camera:

- **Face verification** returns a simulated match score of 0.87 labeled `[DEMO]`
- **Liveness** auto-passes with a 2-second simulated challenge
- **Geofence** accepts any coordinates within demo classroom bounds
- **Database** uses an in-memory SQLite store that resets on restart
- **QR codes** are generated and scannable from the web dashboard
- All demo responses include `"is_demo": true` in the JSON payload

To trigger a **simulated failure** (useful for demo), append `?force_fail=geofence` to any attendance mark request.

---

## 🛠 Troubleshooting

### Backend won't start

```
Error: ModuleNotFoundError: No module named 'cv2'
```
**Fix:** `pip install opencv-python-headless==4.8.1.78`

```
Error: pydantic_settings not found
```
**Fix:** `pip install pydantic-settings==2.1.0`

---

### Web dashboard: blank page after login

- Check that the backend is running on port 8000
- Verify CORS in `backend/.env`: `CORS_ORIGINS=http://localhost:5173`
- Open browser DevTools → Console for detailed error

---

### Flutter build fails

```
Error: Gradle build failed
```
**Fix:** `cd mobile/android && ./gradlew clean`, then retry `flutter run`

```
Error: minSdkVersion < 26
```
**Fix:** Edit `mobile/android/app/build.gradle` → set `minSdkVersion 26`

---

### "JWT decode error" on API calls

- Regenerate `JWT_SECRET_KEY` in `.env` (must be ≥ 32 characters)
- If using Supabase, ensure `SUPABASE_ANON_KEY` matches your project

---

### GPS not working in emulator

GPS does not function on Android Studio emulators by default. Use:
- **Extended Controls** in AVD Manager → Location → Send coordinates manually
- Or connect a physical Android device

---

## 📸 Screenshots

> _Screenshots to be added after final demo run_

| Screen | Description |
|--------|-------------|
| `docs/screenshots/enrollment.png` | Student face enrollment flow |
| `docs/screenshots/session_start.png` | Faculty starting a class session |
| `docs/screenshots/attendance_mark.png` | Student marking attendance |
| `docs/screenshots/dashboard.png` | Admin analytics dashboard |

---

## 📄 Documentation Index

| Document | Description |
|----------|-------------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Full system architecture and data flows |
| [`AI_PIPELINE.md`](AI_PIPELINE.md) | Detailed AI verification pipeline |
| [`TECH_STACK_EXPLAINED.md`](TECH_STACK_EXPLAINED.md) | Every technology explained for beginners |
| [`SECURITY_AND_LIMITATIONS.md`](SECURITY_AND_LIMITATIONS.md) | Threat model and known limitations |
| [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md) | Complete REST API reference |
| [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) | Full DB schema with SQL DDL |
| [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) | Step-by-step Supabase configuration |
| [`TEST_REPORT.md`](TEST_REPORT.md) | Test results and known issues |
| [`PRESENTATION_GUIDE.md`](PRESENTATION_GUIDE.md) | Hackathon pitch guide and demo script |
| [`DEMO_CREDENTIALS.md`](DEMO_CREDENTIALS.md) | Demo login credentials (never commit to prod) |

---

## 👥 Team

| Name | Role |
|------|------|
| _(Team Member 1)_ | Mobile + AI Pipeline |
| _(Team Member 2)_ | Backend + Web Dashboard |

**Institution:** _(College Name)_  
**Hackathon:** Tech Avinya 2026 — Problem CIH-001

---

## 📜 License

This project is submitted as a hackathon entry for **Tech Avinya 2026**. All source code is original work by the team. See individual library licenses in `requirements.txt` and `web/package.json`.
