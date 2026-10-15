import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/core/widgets/pesa_bottom_nav.dart';

import 'helpers/disburse.dart';
import 'helpers/tour.dart';

/// The Wrap tab against the live dev server: after one disbursement the
/// month view's count-up settles on the real totals, highlights render, and
/// the Year toggle switches to the annual summary.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Wrap shows the month and year summaries', (tester) async {
    await TokenStorage().clear();
    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Wrap Test');
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'wraptest+${DateTime.now().microsecondsSinceEpoch}@pesa.dev',
    );
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pumpAndSettle(const Duration(seconds: 15));
    await tester.pumpAndSettle(const Duration(seconds: 15)); // bootstrap fetch
    await skipTourIfShown(tester);

    // Disburse 1,200 into Savings (a "future" pot → counts as Saved).
    await tester.tap(find.text('Savings'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Top up')); // pot detail screen
    await tester.pumpAndSettle();
    await disburseOnKeypad(tester, '1200');
    await tester.pageBack(); // back to Home
    await tester.pumpAndSettle();

    await tester.tap(find.descendant(of: find.byType(PesaBottomNav), matching: find.text('WRAP')));
    await tester.pumpAndSettle(); // lets the count-up and reveals finish

    expect(find.text('YOU DISBURSED'), findsOneWidget);
    expect(find.text('1,200'), findsOneWidget, reason: 'hero count-up settles on the total');
    expect(find.text('GH₵1,200'), findsWidgets, reason: 'Saved tile');
    expect(find.textContaining('Savings grew GH₵1,200'), findsOneWidget);

    await tester.tap(find.text('YEAR'));
    await tester.pumpAndSettle();
    expect(find.text('${DateTime.now().year} DISBURSED'), findsOneWidget);
    expect(find.text('By month'), findsOneWidget);

    await tester.tap(find.text('MONTH'));
    await tester.pumpAndSettle();
    expect(find.text('YOU DISBURSED'), findsOneWidget);
  });
}
