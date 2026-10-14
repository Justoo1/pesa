import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../../core/api_exception.dart';
import '../../core/models/payday_draft.dart';

class ArchivedPot {
  const ArchivedPot({
    required this.id,
    required this.name,
    required this.color,
    required this.icon,
    required this.target,
    required this.txnCount,
    this.archivedAt,
  });

  factory ArchivedPot.fromJson(Map<String, dynamic> json) => ArchivedPot(
    id: json['id'] as String,
    name: json['name'] as String,
    color: json['color'] as String,
    icon: json['icon'] as String,
    target: json['target'] as int,
    txnCount: json['txnCount'] as int,
    archivedAt: json['archivedAt'] as String?,
  );

  final String id;
  final String name;
  final String color;
  final String icon;
  final int target;
  final int txnCount;
  final String? archivedAt;
}

class PotRepository {
  PotRepository({required this._apiClient});

  final ApiClient _apiClient;

  Future<void> create({
    required String name,
    required int target,
    required String color,
    required String icon,
    required String kind,
  }) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/buckets',
      data: {'name': name, 'target': target, 'color': color, 'icon': icon, 'kind': kind},
    ),
  );

  /// [occurredAt] backdates the entry into a past month (history only — it
  /// doesn't touch this month's pot balances).
  Future<void> disburse({
    required String bucketId,
    required int amount,
    String? note,
    String? method,
    DateTime? occurredAt,
  }) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/transactions/disburse',
      data: {
        'bucketId': bucketId,
        'amount': amount,
        'note': ?note,
        'method': ?method,
        'occurredAt': ?occurredAt?.toUtc().toIso8601String(),
      },
    ),
  );

  Future<void> update({
    required String bucketId,
    required String name,
    required int target,
    required String color,
    required String icon,
    required String kind,
    required bool carryOver,
    int? dueDayOfMonth,
  }) => _run(
    () => _apiClient.dio.patch<void>(
      '/api/mobile/buckets/$bucketId',
      data: {
        'name': name,
        'target': target,
        'color': color,
        'icon': icon,
        'kind': kind,
        'carryOver': carryOver,
        'dueDayOfMonth': kind == 'bills' ? dueDayOfMonth : null,
      },
    ),
  );

  Future<void> adjustTarget(String bucketId, int delta) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/buckets/$bucketId/adjust-target',
      data: {'delta': delta},
    ),
  );

  Future<void> reorder(List<String> bucketIds) => _run(
    () => _apiClient.dio.post<void>('/api/mobile/buckets/reorder', data: {'bucketIds': bucketIds}),
  );

  /// Archives a pot; any unspent money in it goes back to the primary account.
  Future<void> archive(String bucketId) =>
      _run(() => _apiClient.dio.post<void>('/api/mobile/buckets/$bucketId/archive'));

  Future<void> restore(String bucketId) =>
      _run(() => _apiClient.dio.post<void>('/api/mobile/buckets/$bucketId/restore'));

  /// Permanently deletes an archived pot and its history.
  Future<void> delete(String bucketId) =>
      _run(() => _apiClient.dio.delete<void>('/api/mobile/buckets/$bucketId'));

  Future<List<ArchivedPot>> listArchived() async {
    try {
      final res = await _apiClient.dio.get<Map<String, dynamic>>('/api/mobile/buckets/archived');
      return (res.data!['data'] as List)
          .map((e) => ArchivedPot.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> spend({required String bucketId, required int amount, String? note}) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/transactions/spend',
      data: {'bucketId': bucketId, 'amount': amount, 'note': ?note},
    ),
  );

  Future<void> transfer({
    required String fromBucketId,
    required String toBucketId,
    required int amount,
    String? note,
  }) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/transactions/transfer',
      data: {
        'fromBucketId': fromBucketId,
        'toBucketId': toBucketId,
        'amount': amount,
        'note': ?note,
      },
    ),
  );

  Future<void> applyPaydayTemplate(List<PaydayDraft> drafts) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/transactions/payday-template/apply',
      data: {
        'drafts': drafts.map((d) => {'bucketId': d.bucketId, 'amount': d.amount}).toList(),
      },
    ),
  );

  Future<void> _run(Future<Response<void>> Function() request) async {
    try {
      await request();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
