import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';

import 'helpers/tour.dart';

/// The web-parity disburse flow against the live dev server: pick → keypad
/// (pre-filled with what the pot needs) → confirm with a method → "Landed
/// safely", and the rule that a pot can't be filled past its target.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('disburse flow fills a pot but never overfills it', (tester) async {
    await TokenStorage().clear();
    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Flow Test');
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'flowtest+${DateTime.now().microsecondsSinceEpoch}@pesa.dev',
    );
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pumpAndSettle(const Duration(seconds: 15));
    await tester.pumpAndSettle(const Duration(seconds: 15)); // bootstrap fetch
    await skipTourIfShown(tester);

    // --- Pick step from the hero CTA ---
    await tester.tap(find.text('Send to a pot'));
    await tester.pumpAndSettle();
    expect(find.text('Needs GH₵3,500'), findsOneWidget, reason: 'Rent card');
    await tester.tap(find.text('Needs GH₵3,500'));
    await tester.pumpAndSettle();

    // --- Amount step: pre-filled with exactly what Rent needs ---
    final amount = find.byKey(const Key('disburse-amount'));
    expect(tester.widget<Text>(amount).data, '3,500');
    expect(find.text('Fill it'), findsOneWidget);

    // One more digit → 35,000: blocked, with the limit spelled out.
    await tester.tap(find.byKey(const Key('keypad-0')));
    await tester.pumpAndSettle();
    expect(tester.widget<Text>(amount).data, '35,000');
    expect(find.byKey(const Key('disburse-over-limit')), findsOneWidget);
    final review = find.ancestor(of: find.text('Review'), matching: find.byType(FilledButton));
    expect(tester.widget<FilledButton>(review).onPressed, isNull);

    // "Fill it" snaps back to the allowed maximum.
    await tester.tap(find.text('Fill it'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('disburse-over-limit')), findsNothing);
    await tester.tap(find.text('Review'));
    await tester.pumpAndSettle();

    // --- Confirm step ---
    expect(find.text('Confirm the move'), findsOneWidget);
    await tester.tap(find.text('Cash'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Send GH₵3,500'));
    await tester.pumpAndSettle(const Duration(seconds: 15));

    // --- Landed ---
    expect(find.text('Done'), findsOneWidget);
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    expect(find.textContaining('GH₵3,500 / GH₵3,500'), findsOneWidget, reason: 'Rent tile');

    // --- A full pot can't be picked again ---
    await tester.tap(find.text('Send to a pot'));
    await tester.pumpAndSettle();
    expect(find.text('Filled'), findsOneWidget);
    await tester.tap(find.text('Filled'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('disburse-amount')), findsNothing, reason: 'still on pick');
  });
}
