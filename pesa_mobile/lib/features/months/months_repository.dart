import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/api_exception.dart';
import '../auth/auth_provider.dart';

/// One row of `GET /api/mobile/months` (`AllTimeMonth` in `lib/insights.ts`).
class MonthSummary {
  const MonthSummary({
    required this.ym,
    required this.label,
    required this.saved,
    required this.gave,
    required this.lived,
    required this.total,
  });

  factory MonthSummary.fromJson(Map<String, dynamic> json) => MonthSummary(
    ym: json['ym'] as String,
    label: json['label'] as String,
    saved: json['saved'] as int,
    gave: json['gave'] as int,
    lived: json['lived'] as int,
    total: json['total'] as int,
  );

  final String ym;
  final String label;
  final int saved;
  final int gave;
  final int lived;
  final int total;
}

class MonthTransaction {
  const MonthTransaction({
    required this.id,
    required this.amount,
    required this.note,
    required this.method,
    required this.occurredAt,
    required this.bucketName,
    required this.bucketIcon,
    required this.bucketColor,
  });

  factory MonthTransaction.fromJson(Map<String, dynamic> json) {
    final bucket = json['bucket'] as Map<String, dynamic>;
    return MonthTransaction(
      id: json['id'] as String,
      amount: json['amount'] as int,
      note: json['note'] as String,
      method: json['method'] as String,
      occurredAt: json['occurredAt'] as String,
      bucketName: bucket['name'] as String,
      bucketIcon: bucket['icon'] as String,
      bucketColor: bucket['color'] as String,
    );
  }

  final String id;
  final int amount;
  final String note;
  final String method;
  final String occurredAt;
  final String bucketName;
  final String bucketIcon;
  final String bucketColor;
}

/// `GET /api/mobile/months/:ym` (`MonthDetail` in `lib/insights.ts`).
class MonthDetail {
  const MonthDetail({
    required this.ym,
    required this.label,
    required this.saved,
    required this.gave,
    required this.lived,
    required this.total,
    required this.transactions,
    this.isPastMonth = false,
  });

  factory MonthDetail.fromJson(Map<String, dynamic> json) => MonthDetail(
    ym: json['ym'] as String,
    label: json['label'] as String,
    saved: json['saved'] as int,
    gave: json['gave'] as int,
    lived: json['lived'] as int,
    total: json['total'] as int,
    isPastMonth: json['isPastMonth'] as bool? ?? false,
    transactions: (json['transactions'] as List)
        .map((e) => MonthTransaction.fromJson(e as Map<String, dynamic>))
        .toList(),
  );

  final String ym;
  final String label;
  final int saved;
  final int gave;
  final int lived;
  final int total;
  final List<MonthTransaction> transactions;
  final bool isPastMonth;
}

class MonthsRepository {
  MonthsRepository({required this._apiClient});

  final ApiClient _apiClient;

  Future<List<MonthSummary>> list() async {
    final data = await _get('/api/mobile/months') as List;
    return data.map((e) => MonthSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// `{ "YYYY-MM": { bucketId: filled } }` for greying out already-full pots.
  Future<Map<String, Map<String, int>>> filledByMonth() async {
    final data = await _get('/api/mobile/months/filled') as Map<String, dynamic>;
    return data.map(
      (ym, pots) =>
          MapEntry(ym, (pots as Map<String, dynamic>).map((id, v) => MapEntry(id, v as int))),
    );
  }

  /// Backdated batch disbursement into one past month (history only).
  Future<void> addPast({
    required Map<String, int> amounts,
    required DateTime occurredAt,
    required String method,
    String? note,
  }) async {
    try {
      await _apiClient.dio.post<void>(
        '/api/mobile/transactions/disburse-many',
        data: {
          'entries': [
            for (final e in amounts.entries) {'bucketId': e.key, 'amount': e.value},
          ],
          'occurredAt': occurredAt.toUtc().toIso8601String(),
          'method': method,
          'note': ?note,
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<MonthDetail> detail(String ym) async =>
      MonthDetail.fromJson(await _get('/api/mobile/months/$ym') as Map<String, dynamic>);

  Future<Object?> _get(String path) async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(path);
      return response.data!['data'];
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}

final monthsRepositoryProvider = Provider<MonthsRepository>((ref) {
  return MonthsRepository(apiClient: ref.watch(apiClientProvider));
});

final monthsListProvider = FutureProvider.autoDispose<List<MonthSummary>>(
  (ref) => ref.watch(monthsRepositoryProvider).list(),
);

final filledByMonthProvider = FutureProvider.autoDispose<Map<String, Map<String, int>>>(
  (ref) => ref.watch(monthsRepositoryProvider).filledByMonth(),
);

final monthDetailProvider = FutureProvider.autoDispose.family<MonthDetail, String>(
  (ref, ym) => ref.watch(monthsRepositoryProvider).detail(ym),
);
