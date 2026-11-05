import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/session.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/session_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  ClassSession? _activeSession;
  Map<String, dynamic>? _stats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    final api = ref.read(apiServiceProvider);
    try {
      final sessions = await api.getActiveSessions();
      final stats = await api.getStudentAttendanceStats('stud-001');

      if (mounted) {
        setState(() {
          _activeSession = sessions.isNotEmpty ? sessions.first : null;
          _stats = stats;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final overallPct = (_stats?['overall_percentage'] as num?)?.toDouble() ?? 88.5;

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboardData,
          color: AppTheme.primaryTeal,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Good day,',
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                        ),
                        Text(
                          user?.fullName ?? 'Arjun Patel',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'CS2024001 • Semester 4',
                          style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.person_outline_rounded, color: AppTheme.textPrimary),
                      onPressed: () => context.push('/profile'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Attendance Overview Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.navyDark,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      // Progress Ring
                      SizedBox(
                        width: 72,
                        height: 72,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            CircularProgressIndicator(
                              value: overallPct / 100.0,
                              strokeWidth: 8,
                              backgroundColor: Colors.white.withOpacity(0.12),
                              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryTeal),
                            ),
                            Center(
                              child: Text(
                                '${overallPct.toInt()}%',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Overall Attendance',
                              style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              overallPct >= 75.0 ? 'Eligible for Examinations' : 'Defaulter Warning (<75%)',
                              style: TextStyle(
                                color: overallPct >= 75.0 ? AppTheme.presentColor : AppTheme.warningColor,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${_stats?['total_classes_attended'] ?? 24} of ${_stats?['total_classes_held'] ?? 28} sessions verified',
                              style: const TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Active Class Session Banner
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    const Text(
                      'Live Class Session',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    ),
                    if (_activeSession != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.presentColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Happening Now', style: TextStyle(color: AppTheme.presentColor, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
                const SizedBox(height: 12),

                if (_activeSession != null)
                  SessionCard(
                    session: _activeSession!,
                    onMarkAttendance: () => context.push('/mark-attendance'),
                  )
                else
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.schedule_outlined, size: 36, color: Colors.grey.shade400),
                        const SizedBox(height: 8),
                        const Text(
                          'No Active Session Right Now',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'When your professor starts an attendance session in the classroom, it will appear here immediately.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 28),

                // Subject-wise Breakdown
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    const Text(
                      'Subject Attendance',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    ),
                    TextButton(
                      onPressed: () => context.push('/attendance-history'),
                      child: const Text('View Full History', style: TextStyle(fontSize: 12, color: AppTheme.primaryTeal)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                _buildSubjectItem('Data Structures', 'CS301', 92.0, 23, 25),
                _buildSubjectItem('Operating Systems', 'CS401', 85.0, 17, 20),
                _buildSubjectItem('Database Management', 'CS402', 88.0, 22, 25),
                _buildSubjectItem('Machine Learning', 'CS601', 78.0, 14, 18),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        backgroundColor: Colors.white,
        elevation: 4,
        onDestinationSelected: (idx) {
          if (idx == 1) context.push('/mark-attendance');
          if (idx == 2) context.push('/attendance-history');
          if (idx == 3) context.push('/profile');
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_filled), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.camera_alt_outlined), label: 'Mark Attendance'),
          NavigationDestination(icon: Icon(Icons.history_rounded), label: 'History'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildSubjectItem(String name, String code, double pct, int attended, int total) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.between,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
              const SizedBox(height: 2),
              Text('$code • $attended / $total sessions', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
            ],
          ),
          Text(
            '${pct.toInt()}%',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: pct >= 75.0 ? AppTheme.presentColor : AppTheme.warningColor,
            ),
          ),
        ],
      ),
    );
  }
}
