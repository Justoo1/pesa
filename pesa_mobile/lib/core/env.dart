import 'package:flutter/foundation.dart';

class Env {
  Env._();

  // Android emulator reaches the host machine via 10.0.2.2; iOS simulator
  // and desktop targets use localhost; a physical device needs the host's
  // LAN IP passed via --dart-define=API_BASE_URL=http://<lan-ip>:3000.
  // Release builds must pass the production https URL (see README.md).
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// Why this build can't talk to a real server, or null if it can. Release
  /// builds must use https: Android and iOS block cleartext anyway, and the
  /// localhost default would otherwise fail with only a vague network error.
  static String? get releaseConfigError {
    if (!kReleaseMode || apiBaseUrl.startsWith('https://')) return null;
    return 'This release build was made without a production API_BASE_URL '
        '(it points at $apiBaseUrl). Rebuild with '
        '--dart-define=API_BASE_URL=https://<your-domain>.';
  }
}
