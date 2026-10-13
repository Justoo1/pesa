import 'package:dio/dio.dart';

/// Thrown by feature repositories when a request fails — carries the exact
/// server-provided message (already user-safe; see lib/mobile/response.ts),
/// so screens can surface it verbatim instead of a generic error string.
class ApiException implements Exception {
  ApiException(this.message);

  factory ApiException.fromDioException(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['error'] is Map) {
      final message = (data['error'] as Map)['message'];
      if (message is String) return ApiException(message);
    }
    return ApiException('Something went wrong. Please try again.');
  }

  final String message;

  @override
  String toString() => message;
}
