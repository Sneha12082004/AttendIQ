# AttendIQ — AI Biometric Verification Pipeline

## Problem Statement: CIH-001 | Tech Avinya Hackathon 2026

AttendIQ separates verification into two distinct, non-fungible questions:
1. **Identity Verification (Layer A):** *"Does the face in front of the lens match the enrolled student?"*
2. **Liveness & Presentation Attack Detection (Layers B & C):** *"Is this a live human being physically interacting with the camera in real time, rather than a photograph, screen replay, or 3D mask?"*

---

## High-Level Pipeline Architecture

```
[Camera Stream / Frame Capture]
                │
                ▼
   ┌───────────────────────────┐
   │    Pre-Flight Quality     │ ── Blur variance < 45? (Laplacian)
   │     & Illumination        │ ── Glare / Darkness out of bounds?
   └───────────────────────────┘
                │ Passed
                ▼
   ┌───────────────────────────┐
   │   Single-Face Enforcement │ ── Exactly 1 face required.
   │      (Face Detection)     │ ── Count == 0 or > 1 -> Immediate Rejection
   └───────────────────────────┘
                │ Single Face Confirmed
                ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  Parallel Multi-Layer Evaluation            │
   │                                                             │
   │  [Layer A] Biometric Identity Matching                      │
   │  • Normalized 128-d spatial moment feature vector           │
   │  • Cosine Similarity vs Enrolled Template (threshold 0.65)   │
   │                                                             │
   │  [Layer B] Active Liveness Challenge Engine                 │
   │  • Unpredictable server-generated instruction               │
   │  • Ephemeral cryptographic nonce + 90s TTL expiration       │
   │                                                             │
   │  [Layer C] Passive Anti-Spoofing (PAD)                      │
   │  • LBP Micro-Texture variance analysis                      │
   │  • Glass display specular reflection detection              │
   │  • Chrominance spectrum distribution analysis               │
   └─────────────────────────────────────────────────────────────┘
                │
                ▼
   ┌───────────────────────────┐
   │    Session & Replay Check │ ── Nonce single-use check
   │          (Layer D)        │ ── Velocity jump (>25 m/s) check
   └───────────────────────────┘
                │
                ▼
   ┌───────────────────────────┐
   │    Final Decision Engine  │ ── ALL required layers MUST pass.
   │          (Layer E)        │ ── Generates Explainable Trust Score
   └───────────────────────────┘
```

---

## Layer A: Biometric Face Detection & Identity Matching

### 1. What is a Face Embedding?
A face embedding is not a photograph. It is a 128-dimensional mathematical vector representing facial geometry, spatial gradient transitions, and invariant contours. Two photographs of the same student taken under different lighting will produce vectors that point in nearly the same direction in 128-dimensional vector space.

### 2. Feature Extraction
AttendIQ uses an OpenCV-based directional intensity moments pipeline:
1. Standardizes face crop to 96x96 pixels.
2. Divides the crop into a 4x4 spatial grid (16 independent facial regions).
3. Extracts 8 statistical moments per block (mean luminance, variance, horizontal gradient $\nabla_x$, vertical gradient $\nabla_y$, and 4 quadrant intensity means).
4. Produces $16 \times 8 = 128$ dimensions.
5. Applies $L_2$ Euclidean normalization:
   $$\hat{v} = \frac{v}{\|v\|_2}$$

### 3. Metric Comparison: Cosine Similarity
Comparison against the student's enrolled template vector $\hat{u}$ is calculated via the inner product:
$$\text{Similarity}(\hat{u}, \hat{v}) = \hat{u} \cdot \hat{v} = \sum_{i=1}^{128} u_i \cdot v_i$$
- **Configured Threshold:** `FACE_MATCH_THRESHOLD = 0.65`
- Values $\ge 0.65$ indicate verified identity.
- Values $< 0.65$ reject the attempt as an impersonation/proxy.

---

## Layer B: Randomized Active Liveness Challenge

A passive photo comparison cannot prevent an attacker from pointing a phone at a printed photo or an Instagram picture. AttendIQ generates unpredictable active challenges:
- **Challenges:** `Blink twice`, `Turn head left`, `Turn head right`, `Look up`, `Move closer`, `Nod`.
- **Cryptographic Binding:** Each challenge is bound to `(student_id, session_id, challenge_nonce)`.
- **Ephemeral TTL:** Challenges expire in 90 seconds.
- **Single-Use Invalidation:** The instant a challenge is evaluated, it is consumed. Replaying the same challenge token results in an immediate `REUSED_CHALLENGE` security flag.

---

## Layer C: Passive Anti-Spoofing (Presentation Attack Detection)

Passive Anti-Spoofing inspects visual artifacts without requiring user movement:

1. **Micro-Texture Variance (Local Binary Pattern Heuristic):**
   - Printed paper and low-resolution screens exhibit flattened micro-texture or unnatural high-frequency moiré patterns.
   - Real human skin features soft specular pores and micro-gradients.
2. **Specular Screen Glare:**
   - Smartphone and tablet glass reflect sharp, overexposed hotspot reflections.
   - Frames with $>8\%$ overexposed pixels are flagged for display reflection.
3. **Chrominance Balance:**
   - LED displays emit characteristic cool blue spectral peaks compared to the warm hemoglobin absorption profile of live human tissue.

*Production Note: In production enterprise deployments, this layer interfaces with deep neural networks such as MiniFASNet or Silent-Face-Anti-Spoofing.*

---

## Layer D: Replay & Session Protection

- **Server-Generated Nonces:** Ensures responses cannot be pre-computed.
- **Sliding-Window Velocity Checks:** If an account submits attendance from Lat/Lon A and submits again 30 seconds later from 2 km away, AttendIQ flags `RAPID_LOCATION_CHANGE` (> 25 m/s).
- **Mock Location Flagging:** Queries device APIs for mock-location provider tags.

---

## Layer E: Final Decision Engine & Attendance Trust Score

### Decision Rule
Attendance is marked `present` **only if all mandatory criteria pass simultaneously**:
1. Active faculty class session exists.
2. No prior attendance logged for this session (duplicate prevention).
3. Classroom GPS distance $\le$ configured radius + accuracy buffer.
4. Exactly 1 face detected with acceptable illumination and focus.
5. Biometric similarity $\ge 0.65$.
6. Active liveness challenge validated with correct nonce.
7. Anti-spoofing score $\ge 0.55$ with zero presentation attack flags.
8. Zero critical suspicious flags.

### Explainable Trust Score Formula
$$\text{Trust Score} = (0.25 \cdot S_{\text{loc}}) + (0.30 \cdot S_{\text{face}}) + (0.25 \cdot S_{\text{live}}) + (0.15 \cdot S_{\text{spoof}}) + (0.05 \cdot S_{\text{ble}})$$
- **Grade A (90–100):** High confidence verification.
- **Grade B (75–89):** Reliable verification.
- **Grade C (60–74):** Borderline signal; recommended for faculty audit.
- **Grade D/F (<60):** Rejected attempt.
