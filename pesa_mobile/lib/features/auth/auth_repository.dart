import 'package:dio/dio.dart';

import '../../core/api_client.dart';
import '../../core/push/push_service.dart';
import '../../core/token_storage.dart';

class AuthUser {
  AuthUser({required this.id, required this.email, this.name});

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
    id: json['id'] as String,
    email: json['email'] as String,
    name: json['name'] as String?,
  );

  final String id;
  final String email;
  final String? name;
}

class AuthException implements Exception {
  AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AuthRepository {
  AuthRepository({required this._apiClient, required this._tokenStorage});

  final ApiClient _apiClient;
  final TokenStorage _tokenStorage;

  Future<AuthUser> register({
    required String name,
    required String email,
    required String password,
  }) {
    return _postAndPersist('/api/mobile/auth/register', {
      'name': name,
      'email': email,
      'password': password,
    });
  }

  Future<AuthUser> login({required String email, required String password}) {
    return _postAndPersist('/api/mobile/auth/login', {'email': email, 'password': password});
  }

  Future<AuthUser> _postAndPersist(String path, Map<String, dynamic> body) async {
    try {
      final response = await _apiClient.dio.post<Map<String, dynamic>>(path, data: body);
      final data = response.data!['data'] as Map<String, dynamic>;
      await _tokenStorage.save(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );
      return AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw AuthException(_extractMessage(e));
    }
  }

  Future<void> requestLoginCode(String email) async {
    try {
      await _apiClient.dio.post<void>(
        '/api/mobile/auth/email-code/request',
        data: {'email': email},
      );
    } on DioException catch (e) {
      throw AuthException(_extractMessage(e));
    }
  }

  Future<AuthUser> verifyLoginCode({required String email, required String code}) {
    return _postAndPersist('/api/mobile/auth/email-code/verify', {'email': email, 'code': code});
  }

  Future<void> logout() async {
    // Stop this phone receiving the account's pushes before the session ends.
    await PushService.unregister(_apiClient);
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken != null) {
      try {
        await _apiClient.dio.post<void>(
          '/api/mobile/auth/logout',
          data: {'refreshToken': refreshToken},
        );
      } catch (_) {
        // Best-effort server-side revocation — local tokens are cleared regardless.
      }
    }
    await _tokenStorage.clear();
  }

  Future<bool> hasStoredSession() async {
    final token = await _tokenStorage.readAccessToken();
    return token != null;
  }

  String _extractMessage(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['error'] is Map) {
      final message = (data['error'] as Map)['message'];
      if (message is String) return message;
    }
    return 'Something went wrong. Please try again.';
  }
}
