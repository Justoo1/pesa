import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Drives the disburse flow (`lib/features/pots/disburse_flow.dart`) once it
/// is open on the amount step: clears the pre-filled "fill it" amount, types
/// [amount] on the in-app keypad, reviews, sends, and dismisses the
/// "Landed safely" screen.
Future<void> disburseOnKeypad(WidgetTester tester, String amount) async {
  for (var i = 0; i < 9; i++) {
    await tester.tap(find.byKey(const Key('keypad-back')));
  }
  for (final digit in amount.split('')) {
    await tester.tap(find.byKey(Key('keypad-$digit')));
  }
  await tester.pumpAndSettle();
  await tester.tap(find.text('Review'));
  await tester.pumpAndSettle();
  await tester.tap(find.textContaining('Send GH₵'));
  await tester.pumpAndSettle(const Duration(seconds: 15));
  expect(find.text('Done'), findsOneWidget, reason: 'the "Landed safely" step');
  await tester.tap(find.text('Done'));
  await tester.pumpAndSettle(const Duration(seconds: 10));
}
