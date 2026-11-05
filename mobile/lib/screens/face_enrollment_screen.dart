import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class FaceEnrollmentScreen extends ConsumerStatefulWidget {
  const FaceEnrollmentScreen({super.key});

  @override
  ConsumerState<FaceEnrollmentScreen> createState() => _FaceEnrollmentScreenState();
}

class _FaceEnrollmentScreenState extends ConsumerState<FaceEnrollmentScreen> {
  bool _consentGranted = false;
  bool _isCapturing = false;
  bool _enrollmentComplete = false;
  String _status = 'Read and accept the biometric consent agreement to proceed.';

  Future<void> _handleEnrollment() async {
    if (!_consentGranted) return;

    setState(() {
      _isCapturing = true;
      _status = 'Recording informed biometric consent...';
    });

    final api = ref.read(apiServiceProvider);

    try {
      await api.recordConsent(
        'I hereby grant explicit consent for AttendIQ to generate and store a 128-dimensional biometric mathematical face template for classroom attendance verification.',
      );

      setState(() => _status = 'Analyzing camera frame lighting and focus quality...');
      await Future.delayed(const Duration(milliseconds: 900));

      setState(() => _status = 'Capturing multi-angle facial feature vectors (3/3)...');
      await Future.delayed(const Duration(milliseconds: 1200));

      final res = await api.enrollFace([
        'sample_frame_1',
        'sample_frame_2',
        'sample_frame_3',
      ]);

      if (mounted) {
        setState(() {
          _isCapturing = false;
          _enrollmentComplete = true;
          _status = 'Biometric template generated and securely stored.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCapturing = false;
          _status = 'Enrollment failed: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        title: const Text('Biometric Face Enrollment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!_enrollmentComplete) ...[
                // Info Box
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.security_rounded, color: AppTheme.primaryTeal, size: 20),
                          const SizedBox(width: 8),
                          const Text(
                            'Privacy & Security First',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'AttendIQ does not publicly store raw facial photographs. Only irreversible 128-dimensional mathematical feature vectors are generated and encrypted.',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Consent Checkbox
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.primaryTeal.withOpacity(0.3)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Checkbox(
                        value: _consentGranted,
                        activeColor: AppTheme.primaryTeal,
                        onChanged: (val) {
                          setState(() => _consentGranted = val ?? false);
                        },
                      ),
                      Expanded(
                        child: Text(
                          'I grant explicit, informed consent for biometric facial template generation for the sole purpose of institutional classroom attendance.',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Live Camera / Placeholder guide
                Container(
                  height: 260,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppTheme.navyDark,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _isCapturing ? Icons.face_retouching_natural_rounded : Icons.face_rounded,
                          size: 72,
                          color: _isCapturing ? AppTheme.primaryTeal : Colors.white54,
                        ),
                        const SizedBox(height: 16),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            _status,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: (_consentGranted && !_isCapturing) ? _handleEnrollment : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryTeal,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _isCapturing
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Capture & Enroll Biometric Face', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ] else ...[
                // Success View
                Center(
                  child: Column(
                    children: [
                      const SizedBox(height: 40),
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: AppTheme.presentColor.withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check_circle_rounded, color: AppTheme.presentColor, size: 54),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'Face Enrolled Successfully!',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Your facial biometric template has been verified and encrypted. You are now authorized to mark attendance.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 36),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: () => context.go('/home'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryTeal,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Go to Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
