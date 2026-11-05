// lib/models/offline_queue.dart

enum OfflineAttemptStatus {
  pending,
  syncing,
  synced,
  failed,
}

class OfflineAttendanceAttempt {
  final String id;
  final String studentId;
  final String sessionId;
  final DateTime timestamp;
  final String locationDataJson; // JSON string of location data
  final String? challengeId;
  final List<String> framesBase64;
  final OfflineAttemptStatus status;
  final int retryCount;
  final DateTime createdAt;
  final String? errorMessage;

  const OfflineAttendanceAttempt({
    required this.id,
    required this.studentId,
    required this.sessionId,
    required this.timestamp,
    required this.locationDataJson,
    this.challengeId,
    required this.framesBase64,
    required this.status,
    required this.retryCount,
    required this.createdAt,
    this.errorMessage,
  });

  factory OfflineAttendanceAttempt.fromMap(Map<String, dynamic> map) {
    return OfflineAttendanceAttempt(
      id: map['id'] as String,
      studentId: map['student_id'] as String,
      sessionId: map['session_id'] as String,
      timestamp: DateTime.parse(map['timestamp'] as String),
      locationDataJson: map['location_data'] as String,
      challengeId: map['challenge_id'] as String?,
      framesBase64: (map['frames_base64'] as String).split('||'),
      status: OfflineAttemptStatus.values.firstWhere(
        (s) => s.name == map['status'],
        orElse: () => OfflineAttemptStatus.pending,
      ),
      retryCount: (map['retry_count'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.parse(map['created_at'] as String),
      errorMessage: map['error_message'] as String?,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'student_id': studentId,
        'session_id': sessionId,
        'timestamp': timestamp.toIso8601String(),
        'location_data': locationDataJson,
        'challenge_id': challengeId,
        'frames_base64': framesBase64.join('||'),
        'status': status.name,
        'retry_count': retryCount,
        'created_at': createdAt.toIso8601String(),
        'error_message': errorMessage,
      };

  OfflineAttendanceAttempt copyWith({
    OfflineAttemptStatus? status,
    int? retryCount,
    String? errorMessage,
  }) {
    return OfflineAttendanceAttempt(
      id: id,
      studentId: studentId,
      sessionId: sessionId,
      timestamp: timestamp,
      locationDataJson: locationDataJson,
      challengeId: challengeId,
      framesBase64: framesBase64,
      status: status ?? this.status,
      retryCount: retryCount ?? this.retryCount,
      createdAt: createdAt,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  bool get canRetry => retryCount < 3;

  Duration get nextRetryDelay {
    // Exponential backoff: 30s, 2m, 8m
    final seconds = 30 * (1 << retryCount);
    return Duration(seconds: seconds);
  }
}
