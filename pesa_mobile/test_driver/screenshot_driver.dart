import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

/// Saves every `binding.takeScreenshot(name)` from
/// integration_test/store_screenshots_test.dart as
/// `../docs/store/assets/screenshots/android/<name>.png`.
Future<void> main() => integrationDriver(
  onScreenshot: (name, bytes, [args]) async {
    final file = File('../docs/store/assets/screenshots/android/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes);
    return true;
  },
);
