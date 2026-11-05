"""
app/utils/suspicious.py
───────────────────────
Feature B: Suspicious Attempt Intelligence & Pattern Recognition Engine.

Detects anomalous attendance patterns:
- REPEATED_FACE_MISMATCH: Multiple failed biometric comparisons in short interval
- RAPID_LOCATION_CHANGE: Impossible velocity between sequential attempts (> 90 km/h)
- REUSED_CHALLENGE: Challenge token already consumed or nonce mismatch
- MULTIPLE_DEVICES: Student submitting from distinct device fingerprints
- HIGH_FREQUENCY_ATTEMPTS: Brute-force submission burst (> 3 attempts / minute)
- MOCK_LOCATION_SUSPECTED: Device reports mock location provider enabled
"""

import threading
import time
from typing import Dict, Any, List, Optional
from app.models import SuspiciousFlag


class SuspiciousAttemptDetector:
    """Thread-safe behavioral anomaly detector with sliding window history."""

    def __init__(self):
        self._lock = threading.RLock()
        # student_id -> list of attempt metadata dicts
        self._history: Dict[str, List[Dict[str, Any]]] = {}

    def analyze_attempt(
        self,
        student_id: str,
        session_id: str,
        device_id: Optional[str],
        face_match_passed: bool,
        geofence_passed: bool,
        lat: Optional[float],
        lon: Optional[float],
        is_mock_location: bool,
        challenge_reused: bool = False
    ) -> List[str]:
        """Evaluates attempt against recent history and returns list of triggered flags."""
        with self._lock:
            now = time.time()
            flags: List[str] = []

            # 1. Mock location check
            if is_mock_location:
                flags.append(SuspiciousFlag.MOCK_LOCATION_SUSPECTED.value)

            # 2. Challenge reuse
            if challenge_reused:
                flags.append(SuspiciousFlag.REUSED_CHALLENGE.value)

            user_attempts = self._history.setdefault(student_id, [])
            # Filter history to last 15 minutes
            recent = [a for a in user_attempts if (now - a["timestamp"]) <= 900]
            self._history[student_id] = recent

            # 3. Repeated face mismatch (e.g. proxy attempting friend's account)
            recent_face_failures = [a for a in recent if not a.get("face_match_passed", True)]
            if not face_match_passed and len(recent_face_failures) >= 2:
                flags.append(SuspiciousFlag.REPEATED_FACE_MISMATCH.value)

            # 4. High frequency bursts (potential automated bot / replay script)
            attempts_last_60s = [a for a in recent if (now - a["timestamp"]) <= 60]
            if len(attempts_last_60s) >= 3:
                flags.append(SuspiciousFlag.HIGH_FREQUENCY_ATTEMPTS.value)

            # 5. Multiple devices detected for same student within 15 mins
            if device_id:
                distinct_devices = {a.get("device_id") for a in recent if a.get("device_id")}
                if distinct_devices and (device_id not in distinct_devices):
                    flags.append(SuspiciousFlag.MULTIPLE_DEVICES.value)

            # 6. Rapid location change (teleportation / GPS spoofing)
            if lat is not None and lon is not None and recent:
                last_with_loc = next((a for a in reversed(recent) if a.get("lat") is not None), None)
                if last_with_loc:
                    time_diff = now - last_with_loc["timestamp"]
                    if time_diff > 1.0:
                        from app.utils.geofence import haversine_distance
                        dist = haversine_distance(last_with_loc["lat"], last_with_loc["lon"], lat, lon)
                        speed_mps = dist / time_diff
                        if speed_mps > 25.0:  # > 90 km/h
                            flags.append(SuspiciousFlag.RAPID_LOCATION_CHANGE.value)

            # Record this attempt into history
            user_attempts.append({
                "session_id": session_id,
                "device_id": device_id,
                "face_match_passed": face_match_passed,
                "geofence_passed": geofence_passed,
                "lat": lat,
                "lon": lon,
                "timestamp": now,
                "flags": flags,
            })

            return flags


# Global detector instance
suspicious_detector = SuspiciousAttemptDetector()
