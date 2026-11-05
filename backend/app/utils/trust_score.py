"""
app/utils/trust_score.py
────────────────────────
Attendance Trust Score & Multi-Signal Explainability Engine.

Formula:
  Trust Score = (w_loc * S_loc) + (w_face * S_face) + (w_live * S_live) + (w_spoof * S_spoof) + (w_ble * S_ble)

Weights:
  - Location: 25%
  - Face Identity: 30%
  - Active Liveness: 25%
  - Passive Anti-Spoof: 15%
  - BLE Proximity Bonus: 5% (capped at 100%)

Grades:
  - A: 90 - 100 (High Confidence)
  - B: 75 - 89  (Reliable)
  - C: 60 - 74  (Borderline / Needs review)
  - D: 50 - 59  (Weak)
  - F: < 50     (Rejected / Untrusted)
"""

from typing import Dict, Any, List, Optional
from app.models import TrustScoreBreakdown


def compute_trust_score(
    geofence_passed: bool,
    location_trust_factor: float,   # 0.0 - 1.0
    face_match_passed: bool,
    face_similarity_score: float,   # 0.0 - 1.0
    liveness_passed: bool,
    liveness_confidence: float,     # 0.0 - 1.0
    antispoof_passed: bool,
    antispoof_score: float,         # 0.0 - 1.0
    ble_verified: bool = False
) -> TrustScoreBreakdown:
    """Computes a multi-signal calibrated trust score and returns an explainable breakdown."""

    # Normalise each signal
    loc_contrib = (location_trust_factor if geofence_passed else 0.0) * 25.0
    face_contrib = (face_similarity_score if face_match_passed else 0.0) * 30.0
    live_contrib = (liveness_confidence if liveness_passed else 0.0) * 25.0
    spoof_contrib = (antispoof_score if antispoof_passed else 0.0) * 15.0
    ble_contrib = 5.0 if ble_verified else 0.0

    raw_total = loc_contrib + face_contrib + live_contrib + spoof_contrib + ble_contrib
    total_score = int(round(min(100.0, max(0.0, raw_total))))

    if total_score >= 90:
        grade = "A"
    elif total_score >= 75:
        grade = "B"
    elif total_score >= 60:
        grade = "C"
    elif total_score >= 50:
        grade = "D"
    else:
        grade = "F"

    # Explainable prose summary
    explanations: List[str] = []
    if geofence_passed:
        explanations.append(f"Classroom geofence verified ({loc_contrib:.1f}/25 pts)")
    else:
        explanations.append("Failed classroom proximity (0/25 pts)")

    if face_match_passed:
        explanations.append(f"Biometric face matched enrolled template ({face_contrib:.1f}/30 pts)")
    else:
        explanations.append("Face match confidence below threshold (0/30 pts)")

    if liveness_passed:
        explanations.append(f"Interactive challenge completed ({live_contrib:.1f}/25 pts)")
    else:
        explanations.append("Liveness challenge verification failed (0/25 pts)")

    if antispoof_passed:
        explanations.append(f"No presentation attack detected ({spoof_contrib:.1f}/15 pts)")
    else:
        explanations.append("Anti-spoof anomaly detected (0/15 pts)")

    if ble_verified:
        explanations.append("Classroom BLE beacon verified (+5 pts bonus)")

    summary_text = f"Grade {grade} ({total_score}/100) — " + "; ".join(explanations)

    return TrustScoreBreakdown(
        overall_score=total_score,
        grade=grade,
        location_score=round(loc_contrib, 1),
        face_match_score=round(face_contrib, 1),
        liveness_score=round(live_contrib, 1),
        antispoof_score=round(spoof_contrib, 1),
        ble_score=round(ble_contrib, 1),
        explanation=summary_text,
    )
