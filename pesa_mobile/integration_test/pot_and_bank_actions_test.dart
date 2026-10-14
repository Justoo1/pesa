import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/core/widgets/pesa_bottom_nav.dart';

import 'helpers/disburse.dart';
import 'helpers/tour.dart';

/// Exercises Phase 3's core-write flows end-to-end against the live dev
/// server: create a pot, disburse into it, spend from it, transfer to
/// another pot, add a second bank account, and transfer between accounts —
/// each step asserting the dashboard visibly reflects the change after the
/// automatic post-mutation refetch.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('pot and bank actions update the dashboard end-to-end', (tester) async {
    await TokenStorage().clear();

    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pumpAndSettle();

    final uniqueEmail = 'potbanktest+${DateTime.now().microsecondsSinceEpoch}@pesa.dev';
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Pot Bank Test');
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), uniqueEmail);
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pumpAndSettle(const Duration(seconds: 15));
    await tester.pumpAndSettle(const Duration(seconds: 15)); // bootstrap fetch
    await skipTourIfShown(tester);

    expect(find.text('Rent'), findsOneWidget);

    // --- Create a new pot (Home "Edit" → Pots & targets → Add pot) ---
    await tester.tap(find.text('Edit'));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.add));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Vacation');
    await tester.enterText(find.widgetWithText(TextFormField, 'Target'), '500');
    await tester.tap(find.widgetWithText(FilledButton, 'Create pot'));
    await tester.pumpAndSettle(const Duration(seconds: 15));
    await tester.pageBack();
    await tester.pumpAndSettle();

    // The new pot is appended at the end of a long list — the ListView's
    // sliver only builds elements for children near the viewport, so it
    // must be scrolled into view before `find` can see it.
    final homePotsList = find.byKey(const Key('home-pots-list'));
    await _scrollUntilFound(tester, homePotsList, find.text('Vacation'));
    expect(find.text('Vacation'), findsOneWidget);

    // Scroll back up — Rent (used by the next several steps) may have
    // scrolled out of the built range while finding Vacation.
    await _scrollUntilFound(tester, homePotsList, find.text('Rent'), delta: const Offset(0, 300));

    // --- Disburse into Rent ---
    await tester.tap(find.text('Rent'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Disburse into this pot'));
    await tester.pumpAndSettle();
    await disburseOnKeypad(tester, '500');

    expect(find.textContaining('500 / GH₵3,500'), findsOneWidget);

    // --- Spend from Rent ---
    await tester.tap(find.text('Rent'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Spend from this pot'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Amount'), '200');
    await tester.tap(find.widgetWithText(FilledButton, 'Spend'));
    await tester.pumpAndSettle(const Duration(seconds: 15));

    // Rent tile now reads "GH₵300 left of GH₵500" (web BucketCard parity).
    expect(find.textContaining('GH₵300 left of GH₵500'), findsOneWidget);

    // --- Transfer Rent -> Savings ---
    await tester.tap(find.text('Rent'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Transfer to another pot'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Savings').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Amount'), '100');
    await tester.tap(find.widgetWithText(FilledButton, 'Transfer'));
    await tester.pumpAndSettle(const Duration(seconds: 15));

    // Rent: 500 - 200 spent (doesn't touch allocated) - 100 transferred = 400 allocated.
    expect(find.textContaining('GH₵200 left of GH₵400'), findsOneWidget);

    // --- Bank tab: add a second account ---
    // Scoped to the bottom nav (whose labels render uppercase, "BANK") since
    // the seeded primary account is itself named "Bank" (see lib/seed.ts),
    // which would also match an unscoped find.text('Bank').
    final bankNavTab = find.descendant(of: find.byType(PesaBottomNav), matching: find.text('BANK'));
    await tester.tap(bankNavTab);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'New'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Travel Fund');
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pumpAndSettle(const Duration(seconds: 15));

    expect(find.text('Travel Fund'), findsOneWidget);

    // --- Transfer between bank accounts via the hero card's "Move" button,
    // which only appears once a second account exists ---
    await tester.tap(find.text('Move'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Travel Fund').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Amount'), '1000');
    await tester.tap(find.widgetWithText(FilledButton, 'Transfer'));
    await tester.pumpAndSettle(const Duration(seconds: 15));

    // Travel Fund's row in "Other accounts" now shows the moved balance.
    expect(find.text('GH₵1,000'), findsOneWidget);
  });
}

/// Drags [scrollable] until [target] appears in the widget tree, or gives up
/// after [maxAttempts]. Needed because ListView only builds elements for
/// children near the viewport — a widget can be genuinely present in the
/// data but not yet built, and `find` only sees built elements.
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
