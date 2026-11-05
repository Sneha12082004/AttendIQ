// lib/models/verification.dart

class TrustScoreBreakdown {
  final double locationScore;
  final double faceScore;
  final double livenessScore;
  final double antiSpoofingScore;
  final double bleScore;
  final double overallScore;

  const TrustScoreBreakdown({
    required this.locationScore,
    required this.faceScore,
    required this.livenessScore,
    required this.antiSpoofingScore,
    required this.bleScore,
    required this.overallScore,
  });

  factory TrustScoreBreakdown.fromJson(Map<String, dynamic> json) {
    return TrustScoreBreakdown(
      locationScore: (json['location_score'] as num?)?.toDouble() ?? 0.0,
      faceScore: (json['face_score'] as num?)?.toDouble() ?? 0.0,
      livenessScore: (json['liveness_score'] as num?)?.toDouble() ?? 0.0,
      antiSpoofingScore:
          (json['anti_spoofing_score'] as num?)?.toDouble() ?? 0.0,
      bleScore: (json['ble_score'] as num?)?.toDouble() ?? 0.0,
      overallScore: (json['overall_score'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'location_score': locationScore,
        'face_score': faceScore,
        'liveness_score': livenessScore,
        'anti_spoofing_score': antiSpoofingScore,
        'ble_score': bleScore,
        'overall_score': overallScore,
      };

  String get grade {
    if (overallScore >= 0.90) return 'A';
    if (overallScore >= 0.75) return 'B';
    if (overallScore >= 0.60) return 'C';
    return 'D';
  }
}

enum ChallengeType {
  blinkTwice,
  turnHeadLeft,
  turnHeadRight,
  nod,
  smile,
  openMouth,
}

class LivenessChallenge {
  final String id;
  final ChallengeType type;
  final String instruction;
  final int timeoutSeconds;

  const LivenessChallenge({
    required this.id,
    required this.type,
    required this.instruction,
    required this.timeoutSeconds,
  });

  factory LivenessChallenge.fromJson(Map<String, dynamic> json) {
    return LivenessChallenge(
      id: json['id'] as String,
      type: ChallengeType.values.firstWhere(
        (c) => c.name == json['type'],
        orElse: () => ChallengeType.blinkTwice,
      ),
      instruction: json['instruction'] as String,
      timeoutSeconds: (json['timeout_seconds'] as num?)?.toInt() ?? 15,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'instruction': instruction,
        'timeout_seconds': timeoutSeconds,
      };

  String get displayInstruction {
    switch (type) {
      case ChallengeType.blinkTwice:
        return 'BLINK TWICE';
      case ChallengeType.turnHeadLeft:
        return 'TURN HEAD LEFT';
      case ChallengeType.turnHeadRight:
        return 'TURN HEAD RIGHT';
      case ChallengeType.nod:
        return 'NOD YOUR HEAD';
      case ChallengeType.smile:
        return 'SMILE';
      case ChallengeType.openMouth:
        return 'OPEN YOUR MOUTH';
    }
  }

  String get icon {
    switch (type) {
      case ChallengeType.blinkTwice:
        return '👁️';
      case ChallengeType.turnHeadLeft:
        return '👈';
      case ChallengeType.turnHeadRight:
        return '👉';
      case ChallengeType.nod:
        return '⬆️';
      case ChallengeType.smile:
        return '😊';
      case ChallengeType.openMouth:
        return '😮';
    }
  }
}

class VerificationResult {
  final bool success;
  final String? attendanceId;
  final TrustScoreBreakdown? trustScore;
  final String? rejectionReason;
  final String? errorCode;
  final DateTime timestamp;

  const VerificationResult({
    required this.success,
    this.attendanceId,
    this.trustScore,
    this.rejectionReason,
    this.errorCode,
    required this.timestamp,
  });

  factory VerificationResult.fromJson(Map<String, dynamic> json) {
    return VerificationResult(
      success: json['success'] as bool,
      attendanceId: json['attendance_id'] as String?,
      trustScore: json['trust_score'] != null
          ? TrustScoreBreakdown.fromJson(
              json['trust_score'] as Map<String, dynamic>)
          : null,
      rejectionReason: json['rejection_reason'] as String?,
      errorCode: json['error_code'] as String?,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now(),
    );
  }

  factory VerificationResult.failure(String reason, {String? errorCode}) {
    return VerificationResult(
      success: false,
      rejectionReason: reason,
      errorCode: errorCode,
      timestamp: DateTime.now(),
    );
  }
}
