import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

/// Saves welcome_test.dart screenshots (run with --dart-define=WELCOME_SHOTS=true).
Future<void> main() => integrationDriver(
  onScreenshot: (name, bytes, [args]) async {
    final dir = Platform.environment['WELCOME_SHOTS_DIR'] ?? 'build/welcome_shots';
    final file = File('$dir/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes);
    return true;
  },
);
