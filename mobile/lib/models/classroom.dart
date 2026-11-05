// lib/models/classroom.dart

class Classroom {
  final String id;
  final String name;
  final String building;
  final String floor;
  final double latitude;
  final double longitude;
  final double geofenceRadius; // in meters
  final String? beaconId;
  final int capacity;

  const Classroom({
    required this.id,
    required this.name,
    required this.building,
    required this.floor,
    required this.latitude,
    required this.longitude,
    required this.geofenceRadius,
    this.beaconId,
    required this.capacity,
  });

  factory Classroom.fromJson(Map<String, dynamic> json) {
    return Classroom(
      id: json['id'] as String,
      name: json['name'] as String,
      building: json['building'] as String? ?? '',
      floor: json['floor'] as String? ?? '',
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      geofenceRadius: (json['geofence_radius'] as num?)?.toDouble() ?? 50.0,
      beaconId: json['beacon_id'] as String?,
      capacity: (json['capacity'] as num?)?.toInt() ?? 60,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'building': building,
        'floor': floor,
        'latitude': latitude,
        'longitude': longitude,
        'geofence_radius': geofenceRadius,
        'beacon_id': beaconId,
        'capacity': capacity,
      };

  String get displayName => '$name, $building';
}
