import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/app_config.dart';
import '../models/attendance.dart';
import '../models/verification.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../widgets/face_overlay_painter.dart';
import '../widgets/trust_score_widget.dart';

enum AttendanceStep {
  checkingLocation,
  cameraPreview,
  livenessChallenge,
  processing,
  resultSuccess,
  resultFailure,
}

class MarkAttendanceScreen extends ConsumerStatefulWidget {
  const MarkAttendanceScreen({super.key});

  @override
  ConsumerState<MarkAttendanceScreen> createState() => _MarkAttendanceScreenState();
}

class _MarkAttendanceScreenState extends ConsumerState<MarkAttendanceScreen> {
  AttendanceStep _currentStep = AttendanceStep.checkingLocation;

  // Verification telemetry state
  String _statusMessage = 'Connecting to GPS satellites & verifying classroom perimeter...';
  double? _distanceMeters;
  bool _geofencePassed = false;
  String? _challengeInstruction;
  String? _challengeId;
  String? _challengeNonce;
  int _challengeCountdown = 15;
  Timer? _countdownTimer;

  // Final outcome state
  AttendanceRecord? _finalRecord;
  String? _failureReason;
  TrustScoreBreakdown? _trustScore;

  @override
  void initState() {
    super.initState();
    _startAttendancePipeline();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _startAttendancePipeline() async {
    // ── Phase 1: Classroom Geo-Verification ──────────────────────────────────
    setState(() {
      _currentStep = AttendanceStep.checkingLocation;
      _statusMessage = 'Verifying classroom proximity & mock-location integrity...';
    });

    try {
      final locService = ref.read(locationServiceProvider);
      final position = await locService.getCurrentLocation();

      final locResult = locService.verifyClassroomProximity(
        position: position,
        classroomLat: AppConfig.demoClassroomLat,
        classroomLon: AppConfig.demoClassroomLon,
        radiusMeters: AppConfig.demoClassroomRadius,
      );

      _distanceMeters = locResult.distanceMeters;
      _geofencePassed = locResult.isWithin;

      if (!_geofencePassed) {
        setState(() {
          _currentStep = AttendanceStep.resultFailure;
          _failureReason = locResult.statusMessage;
        });
        return;
      }

      // Geo passed — transition to Camera Face View
      await Future.delayed(const Duration(milliseconds: 900));
      if (!mounted) return;

      setState(() {
        _currentStep = AttendanceStep.cameraPreview;
        _statusMessage = 'Align your face inside the guide frame';
      });

      // Request liveness challenge from backend
      final api = ref.read(apiServiceProvider);
      final challenge = await api.requestLivenessChallenge('sess-cs301-live');
      _challengeId = challenge.challengeId;
      _challengeNonce = challenge.nonce;
      _challengeInstruction = challenge.instruction;

      await Future.delayed(const Duration(milliseconds: 1400));
      if (!mounted) return;

      // ── Phase 2: Active Liveness Challenge ─────────────────────────────────
      setState(() {
        _currentStep = AttendanceStep.livenessChallenge;
        _challengeCountdown = 15;
      });

      _startChallengeTimer();
    } catch (e) {
      if (mounted) {
        setState(() {
          _currentStep = AttendanceStep.resultFailure;
          _failureReason = 'Location error: ${e.toString().replaceAll('Exception:', '')}';
        });
      }
    }
  }

  void _startChallengeTimer() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        if (_challengeCountdown > 1) {
          _challengeCountdown--;
        } else {
          timer.cancel();
          _evaluateFinalAttendance();
        }
      });
    });

    // Automatically simulate user completing the random challenge after 3.5s
    Future.delayed(const Duration(milliseconds: 3500), () {
      if (_currentStep == AttendanceStep.livenessChallenge && mounted) {
        _countdownTimer?.cancel();
        _evaluateFinalAttendance();
      }
    });
  }

  Future<void> _evaluateFinalAttendance() async {
    setState(() {
      _currentStep = AttendanceStep.processing;
      _statusMessage = 'Running Multi-Layer Verification Pipeline...';
    });

    try {
      final api = ref.read(apiServiceProvider);
      // Mark attendance via backend
      final result = await api.markAttendance(
        sessionId: 'sess-cs301-live',
        challengeId: _challengeId ?? 'chal-demo-01',
        challengeNonce: _challengeNonce ?? 'nonce-demo-01',
        latitude: AppConfig.demoClassroomLat,
        longitude: AppConfig.demoClassroomLon,
        accuracy: 8.5,
        faceImageBase64: 'sample_frame_data',
        deviceId: 'device-android-pixel-01',
      );

      final isSuccess = result.status == AttendanceStatus.present;

      if (mounted) {
        setState(() {
          _trustScore = result.trustScore;
          if (isSuccess) {
            _currentStep = AttendanceStep.resultSuccess;
            _statusMessage = 'Verified & Logged Present';
          } else {
            _currentStep = AttendanceStep.resultFailure;
            _failureReason = result.rejectionReasons.isNotEmpty
                ? result.rejectionReasons.first
                : 'Biometric verification threshold not satisfied';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _currentStep = AttendanceStep.resultFailure;
          _failureReason = e.toString().replaceAll('Exception:', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white, size: 20),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Biometric Verification',
          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Camera / Viewport Area
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Simulated camera background
                  Container(
                    color: const Color(0xFF1E293B),
                    child: Center(
                      child: Icon(
                        Icons.person_rounded,
                        size: 160,
                        color: Colors.white.withOpacity(0.12),
                      ),
                    ),
                  ),

                  // Face Oval Guide Overlay
                  if (_currentStep == AttendanceStep.cameraPreview ||
                      _currentStep == AttendanceStep.livenessChallenge)
                    CustomPaint(
                      painter: FaceOverlayPainter(
                        faceDetected: true,
                        isLive: _currentStep == AttendanceStep.livenessChallenge,
                      ),
                    ),

                  // Top Verification Status Badge
                  Positioned(
                    top: 16,
                    left: 20,
                    right: 20,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.7),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.15)),
                      ),
                      child: Row(
                        children: [
                          if (_currentStep == AttendanceStep.checkingLocation ||
                              _currentStep == AttendanceStep.processing)
                            const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(color: AppTheme.primaryTeal, strokeWidth: 2),
                            )
                          else if (_currentStep == AttendanceStep.resultSuccess)
                            const Icon(Icons.check_circle, color: AppTheme.presentColor, size: 16)
                          else
                            const Icon(Icons.info_outline, color: AppTheme.primaryTeal, size: 16),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _statusMessage,
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Active Challenge Instruction Overlay
                  if (_currentStep == AttendanceStep.livenessChallenge)
                    Positioned(
                      bottom: 24,
                      left: 24,
                      right: 24,
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: AppTheme.navyDark,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.primaryTeal, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryTeal.withOpacity(0.3),
                              blurRadius: 20,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  '⚡ ACTIVE LIVENESS CHALLENGE',
                                  style: TextStyle(
                                    color: AppTheme.primaryTeal,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1,
                                  ),
                                ),
                                Text(
                                  '${_challengeCountdown}s',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _challengeInstruction ?? 'Blink your eyes twice naturally',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Server-randomized anti-spoofing challenge',
                              style: TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Final Outcome Card
                  if (_currentStep == AttendanceStep.resultSuccess ||
                      _currentStep == AttendanceStep.resultFailure)
                    Container(
                      color: Colors.black.withOpacity(0.85),
                      padding: const EdgeInsets.all(24),
                      child: Center(
                        child: SingleChildScrollView(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  color: _currentStep == AttendanceStep.resultSuccess
                                      ? AppTheme.presentColor.withOpacity(0.2)
                                      : AppTheme.absentColor.withOpacity(0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _currentStep == AttendanceStep.resultSuccess
                                      ? Icons.check_circle_rounded
                                      : Icons.cancel_rounded,
                                  color: _currentStep == AttendanceStep.resultSuccess
                                      ? AppTheme.presentColor
                                      : AppTheme.absentColor,
                                  size: 48,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _currentStep == AttendanceStep.resultSuccess
                                    ? 'Attendance Verified & Marked!'
                                    : 'Verification Rejected',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _currentStep == AttendanceStep.resultSuccess
                                    ? 'Authenticated for Data Structures (CS301) at Room 101'
                                    : (_failureReason ?? 'Failed required security check'),
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.7),
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 24),

                              if (_trustScore != null)
                                TrustScoreWidget(trustScore: _trustScore!),

                              const SizedBox(height: 28),
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
                                  child: const Text('Return to Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
