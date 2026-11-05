// lib/utils/haversine.dart

import 'dart:math' as math;

class Haversine {
  static const double _earthRadiusMeters = 6371000.0;

  /// Calculate the distance in meters between two geographic coordinates
  /// using the Haversine formula.
  static double calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    final dLat = _toRadians(lat2 - lat1);
    final dLon = _toRadians(lon2 - lon1);

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRadians(lat1)) *
            math.cos(_toRadians(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);

    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return _earthRadiusMeters * c;
  }

  /// Check if a point is within a geofence radius (in meters)
  static bool isWithinGeofence(
    double lat,
    double lon,
    double centerLat,
    double centerLon,
    double radiusMeters,
  ) {
    final distance = calculateDistance(lat, lon, centerLat, centerLon);
    return distance <= radiusMeters;
  }

  static double _toRadians(double degrees) => degrees * math.pi / 180;

  /// Cardinal direction from point 1 to point 2
  static String bearing(double lat1, double lon1, double lat2, double lon2) {
    final dLon = _toRadians(lon2 - lon1);
    final y = math.sin(dLon) * math.cos(_toRadians(lat2));
    final x = math.cos(_toRadians(lat1)) * math.sin(_toRadians(lat2)) -
        math.sin(_toRadians(lat1)) * math.cos(_toRadians(lat2)) * math.cos(dLon);
    final bearing = math.atan2(y, x) * 180 / math.pi;
    final normalised = (bearing + 360) % 360;

    if (normalised >= 337.5 || normalised < 22.5) return 'N';
    if (normalised < 67.5) return 'NE';
    if (normalised < 112.5) return 'E';
    if (normalised < 157.5) return 'SE';
    if (normalised < 202.5) return 'S';
    if (normalised < 247.5) return 'SW';
    if (normalised < 292.5) return 'W';
    return 'NW';
  }
}
