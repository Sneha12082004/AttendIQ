# AttendIQ — Hackathon Presentation & Live Demo Guide

## Tech Avinya Hackathon 2026 | Problem Statement CIH-001

---

## Part 1: 6-Slide Pitch Deck Structure

### Slide 1: The Proxy Crisis in Higher Education
- **Problem:** Manual paper roll-calls waste 10–15 minutes of every lecture. Mobile QR codes and static location apps are trivially bypassed through WhatsApp screenshot sharing and GPS mock apps.
- **The Core Challenge:** How do you prove that *the specific enrolled student is physically in the assigned classroom and physically interacting with the camera in real time*?

### Slide 2: Introducing AttendIQ
- **Overview:** AttendIQ is an AI-driven, multi-layer geo-fenced and biometric attendance verification platform.
- **Three Pillars:**
  1. High-precision classroom geofencing ($<50$m radius).
  2. Single-face biometric identity verification (128-d embeddings).
  3. Server-randomized active liveness challenges & passive presentation attack detection (PAD).

### Slide 3: The Multi-Layer AI Pipeline (Our Competitive Edge)
- **Face Recognition ≠ Liveness Detection:** We explain why matching a face is useless if the camera is viewing a photograph or pre-recorded replay.
- **Explainable Trust Score:** We don't output a black-box boolean. AttendIQ calculates a multi-signal trust score (Location: 25%, Biometrics: 30%, Liveness: 25%, Anti-Spoof: 15%, BLE: 5%) with an audit grade (A–F).

### Slide 4: Real-World Resilient Engineering
- **Offline / Low-Network Queuing:** Network drops on campus? Attendance attempts are securely signed and queued locally—never prematurely marked present without server verification.
- **Faculty Assisted Overrides:** If indoor GPS drifts, faculty can approve attendance with an immutable audit log and required justification.

### Slide 5: Features That Make AttendIQ Stand Out
- **Feature A:** Attendance Trust Score with forensic explainability.
- **Feature B:** Suspicious Attempt Intelligence (detects GPS jumps, spoofing bursts).
- **Feature C:** Dynamic Classroom QR Code + Geofence Binding.
- **Feature D:** Defaulter Early-Warning System (exact recovery class estimator).
- **Feature E:** ERP-Ready Export (compatible with SAP, Ellucian Banner, TCS iON).

### Slide 6: Roadmap & Production Hardening
- Hardware BLE micro-location beacons for multi-floor indoor discrimination.
- Migration to InsightFace (ArcFace) + MiniFASNet neural networks in enterprise cloud tier.
- Integration with institutional SIS/ERP via authenticated webhooks.

---

## Part 2: 3-Minute Live Demo Script

Follow this exact sequence during judging:

### Step 1: Faculty Starts the Classroom Session (Web Dashboard)
1. Open the web dashboard at `http://localhost:5173/login`.
2. Click the quick button **"Dr. Priya Mehta (Faculty)"** to sign in instantly.
3. On the Faculty Dashboard, click **"Start Attendance Session"**.
4. Select `Data Structures (CS301)` and `Room 101 (50m radius)`. Click **"Initialize Session"**.
5. Click **"Project Classroom QR"** to showcase the live dynamic QR code and session nonce.

### Step 2: Student Marks Attendance (Mobile Experience)
1. Open the mobile app. Sign in as `student1@attendiq.demo` (Arjun Patel).
2. The active session for *Data Structures* appears automatically on the student home screen.
3. Click **"Mark Biometric Attendance"**.
4. **Demonstrate Layer 1 (Geo):** Show the animated location check verifying proximity to Classroom 101.
5. **Demonstrate Layer 2 & 3 (Face & Liveness):** Show the camera frame detecting the face, followed by the unpredictable active challenge (e.g. *Blink your eyes twice*).
6. Show the real-time confirmation screen displaying:
   - Status: `Verified Present`
   - **Trust Score: 92/100 (Grade A)**
   - Signal Breakdown: Location (24.5/25), Biometrics (28/30), Liveness (24.5/25).

### Step 3: Real-Time Faculty Stream Updates
1. Switch back to the faculty web tab.
2. Show that Arjun Patel's record appeared in the **Live Attendance Stream** with Trust Score A, zero duplicate entries, and full audit breakdown.

### Step 4: Admin Defaulter Early Warning & Intelligence
1. Switch to Admin Console (`admin@attendiq.demo`).
2. Navigate to **"Defaulter Early Warning"**.
3. Highlight an at-risk student (e.g. 53.3% attendance) and show the formula-based recovery indicator:
   - *"Needs 26 consecutive classes without absence to reach 75%"*.
4. Navigate to **"Classrooms & Geofence"** to show how administrators can adjust GPS centroids and radius sliders.

---

## Part 3: Anticipated Judge Questions & Strong Answers

**Q1: "Can a student spoof attendance using a photograph of their friend?"**  
*Answer:* "No. Even if the photograph matches the biometric identity in Layer A, it will fail **Layer B (Active Liveness)** because the photo cannot blink or turn on command, and **Layer C (Passive Anti-Spoofing)** because our texture analysis detects the lack of micro-gradients and skin reflection."

**Q2: "What if GPS has poor signal inside a concrete classroom?"**  
*Answer:* "We designed for this exact reality. AttendIQ checks reported horizontal GPS accuracy. If accuracy degrades beyond acceptable limits, we combine it with BLE beacons if deployed, or route the attempt to our **Faculty Assisted Override Workflow**, where the professor can verify and approve the student with a logged reason. We never silently guess."

**Q3: "Does storing face data violate student privacy regulations?"**  
*Answer:* "AttendIQ enforces privacy by design. We do not store raw face photos on our servers. Frames are processed to extract a one-way, irreversible 128-dimensional mathematical vector. Students provide explicit informed consent during enrollment and have a one-click right to erase their template at any time."
