import 'package:flutter/material.dart';
import '../models/verification.dart';
import '../theme/app_theme.dart';

class TrustScoreWidget extends StatelessWidget {
  final TrustScoreBreakdown trustScore;

  const TrustScoreWidget({super.key, required this.trustScore});

  Color _getGradeColor(String grade) {
    switch (grade) {
      case 'A':
        return AppTheme.presentColor;
      case 'B':
        return AppTheme.primaryTeal;
      case 'C':
        return AppTheme.warningColor;
      default:
        return AppTheme.absentColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    final gradeColor = _getGradeColor(trustScore.grade);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              const Text(
                'Attendance Trust Score',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: gradeColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: gradeColor.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    Text(
                      'Grade ${trustScore.grade}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: gradeColor,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '(${trustScore.overallScore}/100)',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: gradeColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Explainable progress indicator
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: trustScore.overallScore / 100.0,
              backgroundColor: Colors.grey.shade100,
              valueColor: AlwaysStoppedAnimation<Color>(gradeColor),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 14),
          // Signal contributions breakdown
          _buildSignalRow('📍 Geofence Proximity', '${trustScore.locationScore.toStringAsFixed(1)} / 25 pts'),
          const SizedBox(height: 6),
          _buildSignalRow('👤 Biometric Match', '${trustScore.faceMatchScore.toStringAsFixed(1)} / 30 pts'),
          const SizedBox(height: 6),
          _buildSignalRow('⚡ Active Liveness', '${trustScore.livenessScore.toStringAsFixed(1)} / 25 pts'),
          const SizedBox(height: 6),
          _buildSignalRow('🛡 Passive Anti-Spoof PAD', '${trustScore.antispoofScore.toStringAsFixed(1)} / 15 pts'),
        ],
      ),
    );
  }

  Widget _buildSignalRow(String label, String points) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.between,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
        ),
        Text(
          points,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
        ),
      ],
    );
  }
}
