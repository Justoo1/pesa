import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'env.dart';
import 'token_storage.dart';

/// Thrown when a request fails with 401 and the silent refresh-and-retry
/// also fails — the caller should treat the session as logged out.
class UnauthenticatedException implements Exception {}

class ApiClient {
  ApiClient({required this._tokenStorage, this._onUnauthenticated})
    : _dio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl)) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.readAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final isAuthEndpoint = error.requestOptions.path.startsWith('/api/mobile/auth/');
          if (error.response?.statusCode == 401 && !isAuthEndpoint) {
            final refreshed = await _refreshTokens();
            if (refreshed) {
              try {
                final retried = await _retry(error.requestOptions);
                return handler.resolve(retried);
              } catch (_) {
                // fall through to unauthenticated handling below
              }
            }
            await _tokenStorage.clear();
            _onUnauthenticated?.call();
            return handler.reject(
              DioException(requestOptions: error.requestOptions, error: UnauthenticatedException()),
            );
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStorage _tokenStorage;
  final VoidCallback? _onUnauthenticated;
  Future<bool>? _refreshInFlight;

  Dio get dio => _dio;

  Future<Response<dynamic>> _retry(RequestOptions requestOptions) {
    final options = Options(method: requestOptions.method, headers: requestOptions.headers);
    return _dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }

  Future<bool> _refreshTokens() {
    // Serialize concurrent 401s onto a single in-flight refresh attempt.
    return _refreshInFlight ??= _doRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
  }

  Future<bool> _doRefresh() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken == null) return false;
    try {
      final response = await Dio(BaseOptions(baseUrl: Env.apiBaseUrl)).post<Map<String, dynamic>>(
        '/api/mobile/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final accessToken = data?['accessToken'] as String?;
      final newRefreshToken = data?['refreshToken'] as String?;
      if (accessToken == null || newRefreshToken == null) return false;
      await _tokenStorage.save(accessToken: accessToken, refreshToken: newRefreshToken);
      return true;
    } catch (_) {
      return false;
    }
  }
}
