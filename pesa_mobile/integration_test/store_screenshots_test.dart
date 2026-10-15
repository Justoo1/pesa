import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/core/widgets/pesa_bottom_nav.dart';

import 'helpers/tour.dart';

/// Store screenshots of a seeded demo account (scripts/seed-demo.mjs).
/// Not part of the regular suite — run through the screenshot driver:
///
///   flutter drive -d emulator-5554 \
///     --driver=test_driver/screenshot_driver.dart \
///     --target=integration_test/store_screenshots_test.dart \
///     --dart-define=API_BASE_URL=http://10.0.2.2:3000 \
///     --dart-define=DEMO_EMAIL=… --dart-define=DEMO_PASSWORD=…
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const email = String.fromEnvironment('DEMO_EMAIL');
  const password = String.fromEnvironment('DEMO_PASSWORD');

  Finder nav(String label) =>
      find.descendant(of: find.byType(PesaBottomNav), matching: find.text(label));

  Future<void> shot(WidgetTester tester, String name) async {
    await tester.pumpAndSettle(const Duration(seconds: 2));
    await binding.takeScreenshot(name);
  }

  testWidgets('store screenshots', (tester) async {
    expect(email, isNotEmpty, reason: 'pass --dart-define=DEMO_EMAIL=…');
    await binding.convertFlutterSurfaceToImage();
    await TokenStorage().clear();
    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), password);
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    await tester.pumpAndSettle(const Duration(seconds: 10)); // bootstrap
    await skipTourIfShown(tester);

    await shot(tester, '01-home');

    final homeList = find.byType(Scrollable).first;
    await tester.scrollUntilVisible(find.text('House keep'), 300, scrollable: homeList);
    await tester.tap(find.text('House keep'));
    await tester.pumpAndSettle();
    await shot(tester, '02-pot-detail');
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Send to a pot'), -300, scrollable: homeList);

    await tester.tap(find.text('Send to a pot'));
    await tester.pumpAndSettle();
    await shot(tester, '03-disburse');
    await tester.tapAt(const Offset(20, 60)); // dismiss the sheet
    await tester.pumpAndSettle();

    await tester.tap(nav('INSIGHTS'));
    await shot(tester, '04-insights');

    await tester.tap(nav('WRAP'));
    await shot(tester, '05-wrap');

    await tester.tap(nav('BANK'));
    await shot(tester, '06-bank');

    await tester.tap(nav('PROJECTS'));
    await shot(tester, '07-projects');
  });
}
