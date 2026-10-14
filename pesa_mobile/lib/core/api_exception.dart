import 'package:dio/dio.dart';

/// Thrown by feature repositories when a request fails — carries the exact
/// server-provided message (already user-safe; see lib/mobile/response.ts),
/// so screens can surface it verbatim instead of a generic error string.
class ApiException implements Exception {
  ApiException(this.message, {this.isNetwork = false, this.code});

  factory ApiException.fromDioException(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionError:
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          "Can't reach Pesa right now. Check your connection and try again.",
          isNetwork: true,
        );
      default:
        break;
    }
    final data = e.response?.data;
    if (data is Map && data['error'] is Map) {
      final error = data['error'] as Map;
      final message = error['message'];
      if (message is String) return ApiException(message, code: error['code'] as String?);
    }
    return ApiException('Something went wrong. Please try again.');
  }

  /// Wraps anything a request can throw into an [ApiException].
  factory ApiException.from(Object error) => switch (error) {
    ApiException() => error,
    DioException() => ApiException.fromDioException(error),
    _ => ApiException('Something went wrong. Please try again.'),
  };

  final String message;

  /// True when the server couldn't be reached at all (offline, timeout) —
  /// as opposed to the server answering with an error.
  final bool isNetwork;

  /// The server's error code (`VALIDATION_ERROR`, `LOCKED`, `RATE_LIMITED`…).
  final String? code;

  /// The session is app-locked server-side until the PIN is verified.
  bool get isLocked => code == 'LOCKED';

  @override
  String toString() => message;
}
