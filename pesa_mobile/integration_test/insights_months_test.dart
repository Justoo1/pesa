import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:intl/intl.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/core/widgets/pesa_bottom_nav.dart';

import 'helpers/disburse.dart';
import 'helpers/tour.dart';

/// Phase 4.2 acceptance against the live dev server: after one disbursement,
/// the Insights tab reflects it (from bootstrap data) and the Months history
/// screens (from `/api/mobile/months` + `/months/:ym`) list and drill into it.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Insights and Months history reflect a disbursement', (tester) async {
    await TokenStorage().clear();

    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pumpAndSettle();
    final uniqueEmail = 'insightstest+${DateTime.now().microsecondsSinceEpoch}@pesa.dev';
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Insights Test');
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), uniqueEmail);
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pumpAndSettle(const Duration(seconds: 15));
    await tester.pumpAndSettle(const Duration(seconds: 15)); // bootstrap fetch
    await skipTourIfShown(tester);

    // --- Disburse 500 into Rent (an "essential" pot → counts as Lived) ---
    await tester.tap(find.text('Rent'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Disburse into this pot'));
    await tester.pumpAndSettle();
    await disburseOnKeypad(tester, '500');

    // --- Insights tab ---
    await tester.tap(
      find.descendant(of: find.byType(PesaBottomNav), matching: find.text('INSIGHTS')),
    );
    await tester.pumpAndSettle();
    expect(find.text('Financial health'), findsOneWidget);

    final insightsList = find.byKey(const Key('insights-list'));
    await _scrollUntilFound(tester, insightsList, find.text('Where it went'));
    await _scrollUntilFound(
      tester,
      insightsList,
      find.text('Past months'),
      delta: const Offset(0, -200),
    );
    // "Where it went" lists Rent with the amount disbursed this month.
    expect(find.text('GH₵500'), findsWidgets);

    // --- Months history: list → current month detail ---
    await tester.tap(find.text('Past months'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    final monthLabel = DateFormat('MMMM yyyy').format(DateTime.now());
    expect(find.text(monthLabel), findsOneWidget);
    expect(find.textContaining('Lived GH₵500'), findsOneWidget);

    await tester.tap(find.text(monthLabel));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    expect(find.text('TOTAL DISBURSED'), findsOneWidget);
    expect(find.textContaining('Today · Rent'), findsOneWidget);
    expect(find.text('+GH₵500'), findsOneWidget);
  });
}

Future<void> _scrollUntilFound(
  WidgetTester tester,
  Finder scrollable,
  Finder target, {
  Offset delta = const Offset(0, -300),
  int maxAttempts = 15,
}) async {
  for (var i = 0; i < maxAttempts; i++) {
    if (target.evaluate().isNotEmpty) return;
    await tester.drag(scrollable, delta);
    await tester.pumpAndSettle();
  }
}
