import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'env.dart';
import 'token_storage.dart';

/// Thrown when a request fails with 401 and the silent refresh-and-retry
/// also fails — the caller should treat the session as logged out.
class UnauthenticatedException implements Exception {}

/// Outcome of a token refresh attempt.
enum _RefreshResult { refreshed, rejected, networkError }

const _retriedKey = 'pesa.retried';

BaseOptions _baseOptions() => BaseOptions(
  baseUrl: Env.apiBaseUrl,
  connectTimeout: const Duration(seconds: 15),
  receiveTimeout: const Duration(seconds: 30),
  sendTimeout: const Duration(seconds: 30),
);

class ApiClient {
  ApiClient({required this._tokenStorage, this._onUnauthenticated}) : _dio = Dio(_baseOptions()) {
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
          final options = error.requestOptions;
          final isAuthEndpoint = options.path.startsWith('/api/mobile/auth/');
          // Only one refresh-and-retry per request: a retried request that
          // 401s again means the session really is gone, not a stale token.
          final alreadyRetried = options.extra[_retriedKey] == true;
          if (error.response?.statusCode == 401 && !isAuthEndpoint && !alreadyRetried) {
            final result = await _refreshTokens();
            if (result == _RefreshResult.networkError) {
              // Couldn't reach the server to refresh — keep the stored
              // session and surface the original failure instead of logging
              // the user out over a flaky connection.
              return handler.next(error);
            }
            if (result == _RefreshResult.refreshed) {
              try {
                return handler.resolve(await _retry(options));
              } on DioException catch (retryError) {
                if (retryError.response?.statusCode != 401) return handler.next(retryError);
              }
            }
            await _tokenStorage.clear();
            _onUnauthenticated?.call();
            return handler.reject(
              DioException(requestOptions: options, error: UnauthenticatedException()),
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
  Future<_RefreshResult>? _refreshInFlight;

  Dio get dio => _dio;

  Future<Response<dynamic>> _retry(RequestOptions requestOptions) {
    // Drop the stale Authorization header so onRequest attaches the new
    // token, and mark the request so a second 401 isn't refreshed again.
    final headers = Map<String, dynamic>.of(requestOptions.headers)..remove('Authorization');
    final options = Options(
      method: requestOptions.method,
      headers: headers,
      extra: {...requestOptions.extra, _retriedKey: true},
    );
    return _dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }

  Future<_RefreshResult> _refreshTokens() {
    // Serialize concurrent 401s onto a single in-flight refresh attempt.
    return _refreshInFlight ??= _doRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
  }

  Future<_RefreshResult> _doRefresh() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken == null) return _RefreshResult.rejected;
    try {
      final response = await Dio(_baseOptions()).post<Map<String, dynamic>>(
        '/api/mobile/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final accessToken = data?['accessToken'] as String?;
      final newRefreshToken = data?['refreshToken'] as String?;
      if (accessToken == null || newRefreshToken == null) return _RefreshResult.rejected;
      await _tokenStorage.save(accessToken: accessToken, refreshToken: newRefreshToken);
      return _RefreshResult.refreshed;
    } on DioException catch (e) {
      // The server answered (401/400…): the refresh token is no good.
      // No answer at all (offline, timeout, 5xx gateway): try again later.
      final status = e.response?.statusCode;
      if (status != null && status >= 400 && status < 500) return _RefreshResult.rejected;
      return _RefreshResult.networkError;
    }
  }
}
