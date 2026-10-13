import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../../core/api_exception.dart';

class BankRepository {
  BankRepository({required this._apiClient});

  final ApiClient _apiClient;

  Future<void> createAccount({required String name}) => _run(
    () => _apiClient.dio.post<void>('/api/mobile/bank/accounts', data: {'name': name}),
  );

  Future<void> transfer({
    required String fromAccountId,
    required String toAccountId,
    required int amount,
    String? note,
  }) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/bank/transfer',
      data: {
        'fromAccountId': fromAccountId,
        'toAccountId': toAccountId,
        'amount': amount,
        'note': ?note,
      },
    ),
  );

  Future<void> addFunds({required String accountId, required int amount, String? note}) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/bank/add-funds',
      data: {'accountId': accountId, 'amount': amount, 'note': ?note},
    ),
  );

  Future<void> spend({required String accountId, required int amount, String? note}) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/bank/spend',
      data: {'accountId': accountId, 'amount': amount, 'note': ?note},
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
