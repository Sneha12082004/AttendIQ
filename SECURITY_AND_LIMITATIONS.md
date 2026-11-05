# AttendIQ — Security Architecture, Threat Model & Known Limitations

## CIH-001 | Tech Avinya Hackathon 2026

---

## 1. Threat Model & Countermeasures

| Threat Vector | Attack Description | AttendIQ Countermeasure | Residual Risk / Limitations |
| :--- | :--- | :--- | :--- |
| **Printed Photo Spoof** | Attacker holds high-resolution paper printout of student in front of camera. | **Layer B (Active Liveness)** requires dynamic reaction (e.g. blink twice). **Layer C (PAD)** detects flat micro-texture & lack of depth. | Low risk. Defeated by unpredictable active challenges. |
| **Screen Replay Spoof** | Attacker replays a video or portrait from an iPad or secondary smartphone. | **Layer B** challenges are server-randomized with 90s TTL. Attacker cannot predict sequence in advance. **Layer C** checks for screen glare & moiré. | Low-to-Medium risk for standard video; see Deepfake limitations below. |
| **GPS Coordinate Mocking** | Attacker uses a fake GPS app or developer mock location provider to simulate being in class. | **Android Mock Location API** inspection. **Location jump detector** flags impossible campus velocity. Required accuracy check ($<35$m). | Rooted devices or kernel-level GPS hooks can spoof low-level HAL. BLE beacons mitigate this when deployed. |
| **Proxy Account Sharing** | Student shares password with a friend who is physically seated in class. | Friend enters classroom (passes geofence), but camera captures friend's face. **Layer A** detects biometric mismatch ($<0.65$ similarity) and flags attempt. | Repeated failures trigger `REPEATED_FACE_MISMATCH` and alert faculty. |
| **Session Hijacking / Replay** | Attacker intercepts a valid attendance HTTP packet and resubmits it for another student or later session. | Cryptographic nonce bound to `(student_id, session_id, attempt_id)`. Tokens are single-use and invalidated immediately. | Attacker cannot replay expired or consumed challenge nonces. |
| **Simultaneous Multi-Device Attempt** | Student attempts attendance from two phones simultaneously. | Backend enforces `UNIQUE(student_id, session_id)` in database. Anomaly detector flags `MULTIPLE_DEVICES`. | Zero risk of duplicate attendance records. |

---

## 2. Honest Security & Hardware Limitations

### A. The Fundamental Limit of RGB Smartphone Cameras
A single standard 2D RGB camera sensor measures light intensity across red, green, and blue pixels. It does **not** have hardware-level time-of-flight (ToF) depth sensing or structured infrared illumination (such as Apple FaceID TrueDepth).
- **Real-Time Deepfake Video Injections:** If an attacker uses an Android virtual camera driver or emulator to pipe a real-time synthetic deepfake (e.g. driving an avatar via generative neural networks responding to the challenge), an RGB camera alone cannot guarantee 100% mathematical defense.
- **Why Multi-Layering is Mandatory:** This is why AttendIQ combines **Classroom Geofencing + Dynamic QR scanning + Random Liveness + Biometric Matching + BLE Signals**. Even if a deepfake tool is used, the student must still be physically within the classroom geofence and scanning the live faculty screen.

### B. Indoor GPS Precision
GPS signals attenuate significantly inside multi-story concrete and steel academic buildings (indoor multipath degradation).
- Standalone GPS horizontal accuracy can degrade to 40–100 meters indoors.
- **AttendIQ Mitigation:** We introduce an adaptive accuracy buffer ($\text{radius} + 0.5 \times \text{accuracy}$) and provide **BLE proximity beacon integration** as an auxiliary local signal.
- If GPS signal is completely lost, students utilize the **Faculty-Assisted Manual Override Workflow** rather than being silently marked present or permanently blocked.

---

## 3. Biometric Privacy & Data Governance

1. **No Raw Face Photos Stored:** AttendIQ processes frames in volatile memory, computes a 128-d mathematical vector, and discards raw camera images.
2. **Irreversible Vector Embeddings:** It is computationally infeasible to reconstruct the student's original face image from a 128-dimensional normalized intensity moment array.
3. **Explicit Consent & Right to Erasure:** Students must give documented opt-in consent before initial enrollment. A student can purge their template at any time via `DELETE /api/enrollment/reset`.
4. **Service-Role Isolation:** Database biometric tables (`face_embeddings`) are protected by Supabase Row-Level Security (RLS) and restricted strictly to backend service keys.
