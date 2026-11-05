import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/offline_queue.dart';

class OfflineQueueService {
  static const String _queueKey = 'attendiq_offline_queue';

  /// Adds an unverified offline attendance attempt to local persistence.
  Future<void> enqueueAttempt(OfflineAttendanceAttempt attempt) async {
    final prefs = await SharedPreferences.getInstance();
    final currentList = await getPendingAttempts();
    currentList.add(attempt);

    final rawJsonList = currentList.map((a) => jsonEncode(a.toJson())).toList();
    await prefs.setStringList(_queueKey, rawJsonList);
  }

  /// Retrieves list of queued attempts awaiting connectivity.
  Future<List<OfflineAttendanceAttempt>> getPendingAttempts() async {
    final prefs = await SharedPreferences.getInstance();
    final rawList = prefs.getStringList(_queueKey) ?? [];

    return rawList.map((str) {
      final map = jsonDecode(str) as Map<String, dynamic>;
      return OfflineAttendanceAttempt.fromJson(map);
    }).toList();
  }

  /// Purges processed items.
  Future<void> clearQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_queueKey);
  }

  /// Returns count of pending offline records.
  Future<int> getPendingCount() async {
    final list = await getPendingAttempts();
    return list.length;
  }
}

final offlineQueueServiceProvider = Provider<OfflineQueueService>((ref) => OfflineQueueService());
