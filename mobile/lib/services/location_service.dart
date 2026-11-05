import 'dart:math' as math;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../config/app_config.dart';

class LocationCheckResult {
  final bool isWithin;
  final double distanceMeters;
  final double accuracyMeters;
  final bool isMockLocation;
  final String statusMessage;

  LocationCheckResult({
    required this.isWithin,
    required this.distanceMeters,
    required this.accuracyMeters,
    required this.isMockLocation,
    required this.statusMessage,
  });
}

class LocationService {
  /// Computes great-circle distance between two GPS coordinates using the Haversine formula.
  static double computeDistance(double lat1, double lon1, double lat2, double lon2) {
    const double earthRadiusMeters = 6371000.0;
    final double phi1 = lat1 * (math.pi / 180.0);
    final double phi2 = lat2 * (math.pi / 180.0);
    final double deltaPhi = (lat2 - lat1) * (math.pi / 180.0);
    final double deltaLambda = (lon2 - lon1) * (math.pi / 180.0);

    final double a = math.sin(deltaPhi / 2.0) * math.sin(deltaPhi / 2.0) +
        math.cos(phi1) * math.cos(phi2) * (math.sin(deltaLambda / 2.0) * math.sin(deltaLambda / 2.0));
    final double c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(math.max(0.0, 1.0 - a)));

    return earthRadiusMeters * c;
  }

  /// Obtains current GPS position with fallback to Demo coordinates when in simulator/demo mode.
  Future<Position> getCurrentLocation() async {
    if (AppConfig.demoMode) {
      // Return configured demo classroom coordinates
      return Position(
        latitude: AppConfig.demoClassroomLat,
        longitude: AppConfig.demoClassroomLon,
        timestamp: DateTime.now(),
        accuracy: 8.5,
        altitude: 12.0,
        altitudeAccuracy: 1.0,
        heading: 0.0,
        headingAccuracy: 0.0,
        speed: 0.0,
        speedAccuracy: 0.0,
        isMocked: false,
      );
    }

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled on device');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permissions denied');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permissions permanently denied');
    }

    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 10),
    );
  }

  /// Verifies if device is within classroom perimeter.
  LocationCheckResult verifyClassroomProximity({
    required Position position,
    required double classroomLat,
    required double classroomLon,
    required double radiusMeters,
  }) {
    final distance = computeDistance(
      position.latitude,
      position.longitude,
      classroomLat,
      classroomLon,
    );

    final isWithin = distance <= (radiusMeters + math.min(15.0, position.accuracy * 0.5));
    final isMock = position.isMocked;

    String msg;
    if (isMock) {
      msg = 'Mock location provider detected';
    } else if (isWithin) {
      msg = 'Verified within classroom (${distance.toStringAsFixed(1)}m <= ${radiusMeters.toInt()}m)';
    } else {
      msg = 'Outside classroom boundary (${distance.toStringAsFixed(1)}m > ${radiusMeters.toInt()}m)';
    }

    return LocationCheckResult(
      isWithin: isWithin && !isMock,
      distanceMeters: distance,
      accuracyMeters: position.accuracy,
      isMockLocation: isMock,
      statusMessage: msg,
    );
  }
}

final locationServiceProvider = Provider<LocationService>((ref) => LocationService());
