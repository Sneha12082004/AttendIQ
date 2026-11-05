// lib/models/attendance.dart

enum AttendanceStatus {
  present,
  absent,
  late,
  excused,
  pending,
}

class AttendanceRecord {
  final String id;
  final String studentId;
  final String sessionId;
  final String subjectName;
  final String subjectCode;
  final String facultyName;
  final String classroomName;
  final AttendanceStatus status;
  final double? trustScore;
  final DateTime markedAt;
  final String? rejectionReason;
  final Map<String, dynamic>? verificationDetails;

  const AttendanceRecord({
    required this.id,
    required this.studentId,
    required this.sessionId,
    required this.subjectName,
    required this.subjectCode,
    required this.facultyName,
    required this.classroomName,
    required this.status,
    this.trustScore,
    required this.markedAt,
    this.rejectionReason,
    this.verificationDetails,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] as String,
      studentId: json['student_id'] as String,
      sessionId: json['session_id'] as String,
      subjectName: json['subject_name'] as String,
      subjectCode: json['subject_code'] as String? ?? '',
      facultyName: json['faculty_name'] as String? ?? '',
      classroomName: json['classroom_name'] as String? ?? '',
      status: AttendanceStatus.values.firstWhere(
        (s) => s.name == (json['status'] as String).toLowerCase(),
        orElse: () => AttendanceStatus.pending,
      ),
      trustScore: (json['trust_score'] as num?)?.toDouble(),
      markedAt: DateTime.parse(json['marked_at'] as String),
      rejectionReason: json['rejection_reason'] as String?,
      verificationDetails:
          json['verification_details'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'student_id': studentId,
        'session_id': sessionId,
        'subject_name': subjectName,
        'subject_code': subjectCode,
        'faculty_name': facultyName,
        'classroom_name': classroomName,
        'status': status.name,
        'trust_score': trustScore,
        'marked_at': markedAt.toIso8601String(),
        'rejection_reason': rejectionReason,
        'verification_details': verificationDetails,
      };

  String get statusLabel {
    switch (status) {
      case AttendanceStatus.present:
        return 'Present';
      case AttendanceStatus.absent:
        return 'Absent';
      case AttendanceStatus.late:
        return 'Late';
      case AttendanceStatus.excused:
        return 'Excused';
      case AttendanceStatus.pending:
        return 'Pending';
    }
  }

  String get trustScoreGrade {
    if (trustScore == null) return '—';
    if (trustScore! >= 0.90) return 'A';
    if (trustScore! >= 0.75) return 'B';
    if (trustScore! >= 0.60) return 'C';
    return 'D';
  }
}

class AttendanceRequest {
  final String sessionId;
  final String studentId;
  final double latitude;
  final double longitude;
  final double locationAccuracy;
  final String? challengeId;
  final List<String> framesBase64;
  final String deviceId;
  final DateTime timestamp;

  const AttendanceRequest({
    required this.sessionId,
    required this.studentId,
    required this.latitude,
    required this.longitude,
    required this.locationAccuracy,
    this.challengeId,
    required this.framesBase64,
    required this.deviceId,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'session_id': sessionId,
        'student_id': studentId,
        'latitude': latitude,
        'longitude': longitude,
        'location_accuracy': locationAccuracy,
        'challenge_id': challengeId,
        'frames_base64': framesBase64,
        'device_id': deviceId,
        'timestamp': timestamp.toIso8601String(),
      };
}
