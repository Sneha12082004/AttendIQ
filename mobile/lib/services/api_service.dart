// lib/services/api_service.dart

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../models/attendance.dart';
import '../models/session.dart';
import '../models/user.dart';
import '../models/verification.dart';

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

class ApiService {
  late final Dio _dio;

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(_AuthInterceptor());
    _dio.interceptors.add(LogInterceptor(
      requestBody: false,
      responseBody: false,
      logPrint: (o) => debugPrint('[API] $o'),
    ));
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> login(String email, String password) async {
    if (AppConfig.demoMode) {
      return _demoLogin(email, password);
    }
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (_) {
      // Ignore logout errors — tokens cleared locally regardless
    }
  }

  Future<Student> getStudentProfile(String userId) async {
    if (AppConfig.demoMode) return _demoStudentProfile();
    final response = await _dio.get('/students/$userId/profile');
    return Student.fromJson(response.data as Map<String, dynamic>);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  Future<List<ClassSession>> getActiveSessions() async {
    if (AppConfig.demoMode) return _demoActiveSessions();
    final response = await _dio.get('/sessions/active');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => ClassSession.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  Future<VerificationResult> markAttendance(AttendanceRequest request) async {
    if (AppConfig.demoMode) return _demoMarkAttendance(request);
    final response = await _dio.post('/attendance/mark', data: request.toJson());
    return VerificationResult.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<AttendanceRecord>> getAttendanceHistory({
    String? studentId,
    DateTime? from,
    DateTime? to,
    int page = 1,
    int pageSize = 20,
  }) async {
    if (AppConfig.demoMode) return _demoAttendanceHistory();
    final response = await _dio.get('/attendance/history', queryParameters: {
      if (studentId != null) 'student_id': studentId,
      if (from != null) 'from': from.toIso8601String(),
      if (to != null) 'to': to.toIso8601String(),
      'page': page,
      'page_size': pageSize,
    });
    final list = response.data['records'] as List<dynamic>;
    return list
        .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ── Face Enrollment ───────────────────────────────────────────────────────

  Future<Map<String, dynamic>> enrollFace({
    required String studentId,
    required List<String> framesBase64,
  }) async {
    if (AppConfig.demoMode) {
      await Future.delayed(const Duration(seconds: 2));
      return {'success': true, 'message': 'Face enrolled successfully'};
    }
    final response = await _dio.post('/students/$studentId/enroll-face', data: {
      'frames_base64': framesBase64,
    });
    return response.data as Map<String, dynamic>;
  }

  // ── Liveness Challenge ────────────────────────────────────────────────────

  Future<LivenessChallenge> getLivenessChallenge(String sessionId) async {
    if (AppConfig.demoMode) return _demoLivenessChallenge();
    final response =
        await _dio.get('/sessions/$sessionId/liveness-challenge');
    return LivenessChallenge.fromJson(response.data as Map<String, dynamic>);
  }

  // ── Demo Implementations ──────────────────────────────────────────────────

  Future<Map<String, dynamic>> _demoLogin(
      String email, String password) async {
    await Future.delayed(const Duration(milliseconds: 800));

    final demo = AppConfig.demoCredentials.firstWhere(
      (c) => c['email'] == email,
      orElse: () => {},
    );

    if (demo.isEmpty || demo['password'] != password) {
      throw DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        error: 'Invalid credentials',
        response: Response(
          requestOptions: RequestOptions(path: '/auth/login'),
          statusCode: 401,
          data: {'detail': 'Invalid email or password'},
        ),
        type: DioExceptionType.badResponse,
      );
    }

    return {
      'access_token': 'demo_token_${DateTime.now().millisecondsSinceEpoch}',
      'token_type': 'bearer',
      'user': {
        'id': 'demo_user_001',
        'email': demo['email'],
        'name': demo['name'],
        'role': demo['role']!.toLowerCase(),
        'created_at': '2024-01-01T00:00:00Z',
      },
      'student': demo['role'] == 'Student'
          ? {
              'id': 'demo_student_001',
              'user_id': 'demo_user_001',
              'name': demo['name'],
              'email': demo['email'],
              'registration_number': demo['regNo'],
              'department': 'Computer Science',
              'section': 'A',
              'semester': 6,
              'is_face_enrolled': true,
              'overall_attendance_percentage': 82.5,
              'subject_attendance': {
                'Data Structures': 88.0,
                'Operating Systems': 79.0,
                'Database Management': 85.5,
                'Computer Networks': 76.0,
                'Software Engineering': 90.0,
              },
            }
          : null,
    };
  }

  Student _demoStudentProfile() {
    return Student.fromJson({
      'id': 'demo_student_001',
      'user_id': 'demo_user_001',
      'name': 'Rahul Sharma',
      'email': 'rahul.sharma@demo.attendiq.in',
      'registration_number': 'CS21B001',
      'department': 'Computer Science',
      'section': 'A',
      'semester': 6,
      'is_face_enrolled': true,
      'overall_attendance_percentage': 82.5,
      'subject_attendance': {
        'Data Structures': 88.0,
        'Operating Systems': 79.0,
        'Database Management': 85.5,
        'Computer Networks': 76.0,
        'Software Engineering': 90.0,
      },
    });
  }

  List<ClassSession> _demoActiveSessions() {
    final now = DateTime.now();
    return [
      ClassSession.fromJson({
        'id': 'session_001',
        'subject_name': 'Data Structures',
        'subject_code': 'CS301',
        'faculty_name': 'Dr. Meera Krishnan',
        'classroom_id': 'room_101',
        'classroom_name': 'CS Lab 101',
        'start_time': now.subtract(const Duration(minutes: 15)).toIso8601String(),
        'end_time': now.add(const Duration(minutes: 45)).toIso8601String(),
        'status': 'active',
        'beacon_id': 'BEACON_CS101',
        'enrolled_count': 45,
        'present_count': 32,
      }),
    ];
  }

  Future<VerificationResult> _demoMarkAttendance(
      AttendanceRequest request) async {
    await Future.delayed(const Duration(seconds: 2));
    return VerificationResult.fromJson({
      'success': true,
      'attendance_id': 'att_${DateTime.now().millisecondsSinceEpoch}',
      'trust_score': {
        'location_score': 0.95,
        'face_score': 0.92,
        'liveness_score': 0.88,
        'anti_spoofing_score': 0.94,
        'ble_score': 0.80,
        'overall_score': 0.918,
      },
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  LivenessChallenge _demoLivenessChallenge() {
    final challenges = [
      {
        'id': 'ch_001',
        'type': 'blinkTwice',
        'instruction': 'Please blink twice naturally',
        'timeout_seconds': 15,
      },
      {
        'id': 'ch_002',
        'type': 'turnHeadLeft',
        'instruction': 'Slowly turn your head to the left',
        'timeout_seconds': 15,
      },
      {
        'id': 'ch_003',
        'type': 'smile',
        'instruction': 'Please smile for the camera',
        'timeout_seconds': 15,
      },
    ];
    final idx = DateTime.now().second % challenges.length;
    return LivenessChallenge.fromJson(challenges[idx]);
  }

  List<AttendanceRecord> _demoAttendanceHistory() {
    final now = DateTime.now();
    return List.generate(10, (i) {
      final date = now.subtract(Duration(days: i * 2));
      final subjects = [
        'Data Structures',
        'Operating Systems',
        'Database Management',
        'Computer Networks',
        'Software Engineering'
      ];
      final codes = ['CS301', 'CS302', 'CS303', 'CS304', 'CS305'];
      final subject = subjects[i % subjects.length];
      final code = codes[i % codes.length];
      return AttendanceRecord.fromJson({
        'id': 'att_$i',
        'student_id': 'demo_student_001',
        'session_id': 'session_$i',
        'subject_name': subject,
        'subject_code': code,
        'faculty_name': 'Dr. Meera Krishnan',
        'classroom_name': 'CS Lab 101',
        'status': i % 5 == 0 ? 'absent' : 'present',
        'trust_score': i % 5 == 0 ? null : 0.85 + (i % 10) * 0.01,
        'marked_at': date.toIso8601String(),
      });
    });
  }
}

// ignore: avoid_print
void debugPrint(String msg) => print(msg);

class _AuthInterceptor extends Interceptor {
  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expired — handled by auth provider
    }
    handler.next(err);
  }
}
