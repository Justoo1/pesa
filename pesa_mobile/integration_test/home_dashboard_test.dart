import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';

import 'helpers/tour.dart';

/// Exercises Phase 2's read-only dashboard end-to-end: register a fresh
/// (freshly-seeded) user against the live dev server, then confirm the Home
/// tab renders real data pulled from /api/mobile/bootstrap — not fixture/mock
/// data — matching what `seedNewUser` actually creates (10 starter pots, a
/// primary bank account credited with the seeded salary).
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Home tab shows real seeded pots and bank balance', (tester) async {
    await TokenStorage().clear();

    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pumpAndSettle();

    final uniqueEmail = 'dashboardtest+${DateTime.now().microsecondsSinceEpoch}@pesa.dev';
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Dashboard Test');
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), uniqueEmail);
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pumpAndSettle(const Duration(seconds: 15));

    // The bootstrap fetch is a second network round-trip after login/register
    // resolves, so give it its own settle window.
    await tester.pumpAndSettle(const Duration(seconds: 15));
    await skipTourIfShown(tester);

    // Seeded starter pots (components/pesa/data.ts `initialBuckets`).
    expect(find.text('Rent'), findsOneWidget);
    expect(find.text('Savings'), findsOneWidget);
    expect(find.text('Mom'), findsOneWidget);

    // Seeded primary bank account, credited with the default salary on payday.
    expect(find.textContaining('GH₵14,000'), findsWidgets);

    // Pull-to-refresh should trigger a fresh fetch without erroring.
    await tester.fling(find.byType(RefreshIndicator), const Offset(0, 300), 1000);
    await tester.pumpAndSettle(const Duration(seconds: 15));
    expect(find.text('Rent'), findsOneWidget);
  });
}
