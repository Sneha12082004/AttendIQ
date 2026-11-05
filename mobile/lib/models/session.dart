// lib/models/session.dart

enum SessionStatus {
  scheduled,
  active,
  completed,
  cancelled,
}

class ClassSession {
  final String id;
  final String subjectName;
  final String subjectCode;
  final String facultyName;
  final String classroomId;
  final String classroomName;
  final DateTime startTime;
  final DateTime endTime;
  final SessionStatus status;
  final String? beaconId;
  final String? qrCode;
  final int enrolledCount;
  final int presentCount;

  const ClassSession({
    required this.id,
    required this.subjectName,
    required this.subjectCode,
    required this.facultyName,
    required this.classroomId,
    required this.classroomName,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.beaconId,
    this.qrCode,
    required this.enrolledCount,
    required this.presentCount,
  });

  factory ClassSession.fromJson(Map<String, dynamic> json) {
    return ClassSession(
      id: json['id'] as String,
      subjectName: json['subject_name'] as String,
      subjectCode: json['subject_code'] as String? ?? '',
      facultyName: json['faculty_name'] as String? ?? '',
      classroomId: json['classroom_id'] as String,
      classroomName: json['classroom_name'] as String? ?? '',
      startTime: DateTime.parse(json['start_time'] as String),
      endTime: DateTime.parse(json['end_time'] as String),
      status: SessionStatus.values.firstWhere(
        (s) => s.name == (json['status'] as String).toLowerCase(),
        orElse: () => SessionStatus.scheduled,
      ),
      beaconId: json['beacon_id'] as String?,
      qrCode: json['qr_code'] as String?,
      enrolledCount: (json['enrolled_count'] as num?)?.toInt() ?? 0,
      presentCount: (json['present_count'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'subject_name': subjectName,
        'subject_code': subjectCode,
        'faculty_name': facultyName,
        'classroom_id': classroomId,
        'classroom_name': classroomName,
        'start_time': startTime.toIso8601String(),
        'end_time': endTime.toIso8601String(),
        'status': status.name,
        'beacon_id': beaconId,
        'qr_code': qrCode,
        'enrolled_count': enrolledCount,
        'present_count': presentCount,
      };

  Duration get timeRemaining {
    final now = DateTime.now();
    if (now.isAfter(endTime)) return Duration.zero;
    return endTime.difference(now);
  }

  String get timeRemainingLabel {
    final remaining = timeRemaining;
    if (remaining == Duration.zero) return 'Ended';
    final hours = remaining.inHours;
    final minutes = remaining.inMinutes % 60;
    if (hours > 0) return '${hours}h ${minutes}m remaining';
    return '${minutes}m remaining';
  }

  bool get isActive => status == SessionStatus.active;
}
