"""
app/utils/geofence.py
─────────────────────
Multi-layer classroom geo-verification utilities.
Uses the Haversine formula for spherical distance calculation on Earth.
Includes location accuracy verification, jump detection, and demo classroom presets.
"""

import math
from typing import Dict, Any, Optional

EARTH_RADIUS_METERS = 6371000.0  # Mean radius of Earth in meters


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes the great-circle distance between two GPS coordinates using the Haversine formula.
    
    Formula:
        a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
        c = 2 * atan2(√a, √(1-a))
        d = R * c
    where R = 6,371,000 meters.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    distance = EARTH_RADIUS_METERS * c
    return round(distance, 2)


def is_accuracy_sufficient(accuracy_meters: Optional[float], min_acceptable: float = 35.0) -> bool:
    """
    Validates that reported GPS horizontal accuracy is fine enough to trust for classroom proximity.
    Indoor GPS can degrade to > 50-100m. Attempts with accuracy worse than min_acceptable are rejected or flagged.
    """
    if accuracy_meters is None or accuracy_meters <= 0:
        return False
    return accuracy_meters <= min_acceptable


def detect_location_jump(
    prev_lat: float, prev_lon: float, prev_time_s: float,
    curr_lat: float, curr_lon: float, curr_time_s: float,
    max_speed_mps: float = 25.0  # ~90 km/h impossible student running speed on campus
) -> bool:
    """
    Detects physically implausible velocity between two consecutive attendance attempts.
    Returns True if an impossible jump occurred (suggests GPS spoofing/mock provider).
    """
    time_diff = abs(curr_time_s - prev_time_s)
    if time_diff <= 0.01:
        return True  # Zero time elapsed between separate readings
    dist = haversine_distance(prev_lat, prev_lon, curr_lat, curr_lon)
    speed = dist / time_diff
    return speed > max_speed_mps


def check_geofence(
    student_lat: float,
    student_lon: float,
    classroom_lat: float,
    classroom_lon: float,
    radius_meters: float,
    reported_accuracy_meters: Optional[float] = 10.0,
    is_mock_location: bool = False
) -> Dict[str, Any]:
    """
    Evaluates multi-layer classroom geofence criteria:
    1. Check for declared mock location
    2. Check reported GPS accuracy
    3. Check distance vs allowed classroom radius
    """
    if is_mock_location:
        return {
            "is_within": False,
            "distance_meters": 0.0,
            "accuracy_ok": False,
            "mock_location_detected": True,
            "detail": "Mock location provider detected on device",
        }

    distance = haversine_distance(student_lat, student_lon, classroom_lat, classroom_lon)
    accuracy_ok = is_accuracy_sufficient(reported_accuracy_meters)

    # In classroom environments, GPS margin of error buffer is permitted up to 15m
    effective_allowed_radius = radius_meters + min(15.0, (reported_accuracy_meters or 10.0) * 0.5)
    is_within = distance <= effective_allowed_radius

    detail_message = (
        f"Verified within classroom boundary ({distance:.1f}m <= {radius_meters:.0f}m)"
        if is_within else
        f"Outside classroom geofence ({distance:.1f}m > {radius_meters:.0f}m allowed)"
    )

    if not accuracy_ok:
        acc_str = f"{reported_accuracy_meters:.1f}m" if reported_accuracy_meters is not None else "Unknown"
        detail_message += f" [Warning: Poor GPS accuracy: {acc_str}]"

    return {
        "is_within": is_within,
        "distance_meters": distance,
        "accuracy_ok": accuracy_ok,
        "reported_accuracy_meters": reported_accuracy_meters,
        "mock_location_detected": False,
        "detail": detail_message,
    }


def calculate_trust_contribution_location(
    is_within: bool,
    distance_meters: float,
    radius_meters: float,
    accuracy_meters: Optional[float]
) -> float:
    """
    Computes a normalised 0.0-1.0 location trust signal based on proximity and signal precision.
    """
    if not is_within:
        return 0.0
    
    # Distance proximity factor (closer to center = higher score)
    ratio = max(0.0, 1.0 - (distance_meters / max(1.0, radius_meters)))
    prox_score = 0.5 + (0.5 * ratio)

    # Accuracy factor
    acc = accuracy_meters if accuracy_meters is not None else 15.0
    if acc <= 10.0:
        acc_score = 1.0
    elif acc <= 25.0:
        acc_score = 0.85
    elif acc <= 35.0:
        acc_score = 0.65
    else:
        acc_score = 0.3

    return round(prox_score * acc_score, 3)
