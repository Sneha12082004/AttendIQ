// lib/models/user.dart

enum UserRole { student, faculty, admin }

class User {
  final String id;
  final String email;
  final String name;
  final UserRole role;
  final String? avatarUrl;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.avatarUrl,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      role: UserRole.values.firstWhere(
        (r) => r.name == (json['role'] as String).toLowerCase(),
        orElse: () => UserRole.student,
      ),
      avatarUrl: json['avatar_url'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role.name,
        'avatar_url': avatarUrl,
        'created_at': createdAt.toIso8601String(),
      };

  User copyWith({
    String? id,
    String? email,
    String? name,
    UserRole? role,
    String? avatarUrl,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      role: role ?? this.role,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class Student {
  final String id;
  final String userId;
  final String name;
  final String email;
  final String registrationNumber;
  final String department;
  final String section;
  final int semester;
  final bool isFaceEnrolled;
  final double overallAttendancePercentage;
  final Map<String, double> subjectAttendance;

  const Student({
    required this.id,
    required this.userId,
    required this.name,
    required this.email,
    required this.registrationNumber,
    required this.department,
    required this.section,
    required this.semester,
    required this.isFaceEnrolled,
    required this.overallAttendancePercentage,
    required this.subjectAttendance,
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    final subjectMap = <String, double>{};
    final raw = json['subject_attendance'] as Map<String, dynamic>? ?? {};
    for (final entry in raw.entries) {
      subjectMap[entry.key] = (entry.value as num).toDouble();
    }

    return Student(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      registrationNumber: json['registration_number'] as String,
      department: json['department'] as String,
      section: json['section'] as String,
      semester: (json['semester'] as num).toInt(),
      isFaceEnrolled: json['is_face_enrolled'] as bool? ?? false,
      overallAttendancePercentage:
          (json['overall_attendance_percentage'] as num?)?.toDouble() ?? 0.0,
      subjectAttendance: subjectMap,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'name': name,
        'email': email,
        'registration_number': registrationNumber,
        'department': department,
        'section': section,
        'semester': semester,
        'is_face_enrolled': isFaceEnrolled,
        'overall_attendance_percentage': overallAttendancePercentage,
        'subject_attendance': subjectAttendance,
      };

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}
