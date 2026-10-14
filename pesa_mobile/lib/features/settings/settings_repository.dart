import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/api_exception.dart';
import '../auth/auth_provider.dart';

/// Writes for `app/api/mobile/{settings,income-sources}`. Reads come from
/// bootstrap (`profile`, `incomeSources`).
class SettingsRepository {
  SettingsRepository({required this._apiClient});

  final ApiClient _apiClient;

  Future<void> updateProfile({String? displayName, String? currency, String? monthLabel}) => _send(
    () => _apiClient.dio.patch<void>(
      '/api/mobile/settings/profile',
      data: {'displayName': ?displayName, 'currency': ?currency, 'monthLabel': ?monthLabel},
    ),
  );

  Future<void> setRoundUps({required bool enabled, int? step}) => _send(
    () => _apiClient.dio.patch<void>(
      '/api/mobile/settings/round-ups',
      data: {'enabled': enabled, 'step': ?step},
    ),
  );

  Future<void> setPayday({required bool enabled, int? dayOfMonth, bool? autoPayday}) => _send(
    () => _apiClient.dio.patch<void>(
      '/api/mobile/settings/payday',
      data: {'enabled': enabled, 'dayOfMonth': ?dayOfMonth, 'autoPayday': ?autoPayday},
    ),
  );

  Future<void> setAppLock(String pin) =>
      _send(() => _apiClient.dio.post<void>('/api/mobile/settings/app-lock', data: {'pin': pin}));

  Future<void> disableAppLock(String pin) =>
      _send(() => _apiClient.dio.delete<void>('/api/mobile/settings/app-lock', data: {'pin': pin}));

  /// Always verified server-side — there is no local PIN copy.
  Future<bool> verifyPin(String pin) async {
    try {
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        '/api/mobile/settings/app-lock/verify',
        data: {'pin': pin},
      );
      return (response.data!['data'] as Map<String, dynamic>)['ok'] == true;
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> resetMonth() =>
      _send(() => _apiClient.dio.post<void>('/api/mobile/settings/reset-month'));

  Future<void> deleteAccount(String confirmEmail) => _send(
    () => _apiClient.dio.post<void>(
      '/api/mobile/settings/delete-account',
      data: {'confirmEmail': confirmEmail},
    ),
  );

  Future<void> createIncomeSource({required String name, required int amount}) => _send(
    () => _apiClient.dio.post<void>(
      '/api/mobile/income-sources',
      data: {'name': name, 'amount': amount},
    ),
  );

  Future<void> updateIncomeSource({
    required String id,
    required String name,
    required int amount,
  }) => _send(
    () => _apiClient.dio.patch<void>(
      '/api/mobile/income-sources/$id',
      data: {'name': name, 'amount': amount},
    ),
  );

  Future<void> toggleIncomeSource({required String id, required bool active}) => _send(
    () => _apiClient.dio.post<void>(
      '/api/mobile/income-sources/$id/toggle',
      data: {'active': active},
    ),
  );

  Future<void> deleteIncomeSource(String id) =>
      _send(() => _apiClient.dio.delete<void>('/api/mobile/income-sources/$id'));

  Future<void> _send(Future<Response<void>> Function() request) async {
    try {
      await request();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository(apiClient: ref.watch(apiClientProvider));
});
