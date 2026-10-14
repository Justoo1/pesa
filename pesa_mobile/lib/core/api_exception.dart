import 'package:dio/dio.dart';

/// Thrown by feature repositories when a request fails — carries the exact
/// server-provided message (already user-safe; see lib/mobile/response.ts),
/// so screens can surface it verbatim instead of a generic error string.
class ApiException implements Exception {
  ApiException(this.message, {this.isNetwork = false});

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
      final message = (data['error'] as Map)['message'];
      if (message is String) return ApiException(message);
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

  @override
  String toString() => message;
}
