import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../../core/api_exception.dart';
import '../../core/models/payday_draft.dart';

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

  Future<void> disburse({required String bucketId, required int amount, String? note}) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/transactions/disburse',
      data: {'bucketId': bucketId, 'amount': amount, 'note': ?note},
    ),
  );

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
        'drafts': drafts
            .map((d) => {'bucketId': d.bucketId, 'amount': d.amount})
            .toList(),
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
