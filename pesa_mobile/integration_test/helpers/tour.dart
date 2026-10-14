import 'package:flutter_test/flutter_test.dart';

/// Fresh accounts get the first-run tour; dismiss it so it doesn't cover the
/// widgets a test wants to tap.
Future<void> skipTourIfShown(WidgetTester tester) async {
  await tester.pumpAndSettle();
  final skip = find.text('Skip tour');
  if (skip.evaluate().isNotEmpty) {
    await tester.tap(skip);
    await tester.pumpAndSettle(const Duration(seconds: 5));
  }
}
