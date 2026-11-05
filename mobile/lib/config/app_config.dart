// lib/config/app_config.dart

class AppConfig {
  static const String appName = 'AttendIQ';
  static const String appVersion = '1.0.0';

  // API
  static const String baseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:8000');
  static const String apiVersion = 'v1';
  static String get apiBaseUrl => '$baseUrl/api/$apiVersion';

  // Demo mode
  static const bool demoMode = bool.fromEnvironment('DEMO_MODE', defaultValue: true);

  // Demo classroom coordinates (IIT Delhi — demo)
  static const double demoClassroomLat = 28.5450;
  static const double demoClassroomLng = 77.1926;
  static const double demoGeofenceRadius = 100.0; // meters

  // Demo credentials
  static const List<Map<String, String>> demoCredentials = [
    {
      'name': 'Rahul Sharma',
      'email': 'rahul.sharma@demo.attendiq.in',
      'password': 'Demo@123',
      'role': 'Student',
      'regNo': 'CS21B001',
    },
    {
      'name': 'Priya Patel',
      'email': 'priya.patel@demo.attendiq.in',
      'password': 'Demo@123',
      'role': 'Student',
      'regNo': 'CS21B042',
    },
    {
      'name': 'Dr. Meera Krishnan',
      'email': 'meera.krishnan@demo.attendiq.in',
      'password': 'Demo@123',
      'role': 'Faculty',
      'regNo': '',
    },
  ];

  // Attendance thresholds
  static const double minimumAttendancePercentage = 75.0;
  static const double warningAttendancePercentage = 80.0;

  // Trust score thresholds
  static const double minimumTrustScore = 0.60;

  // Liveness challenge timeout
  static const int livenessChallengeTimeoutSeconds = 15;

  // Offline queue
  static const int maxOfflineRetries = 3;

  // Camera
  static const double frameQualityThreshold = 0.5;
  static const int captureFrameCount = 3;
}
