import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/core/widgets/pesa_bottom_nav.dart';

/// Phase 9.6 web-parity features against the live dev server: the first-run
/// tour, Pots & targets (edit, archive, restore), net-worth detail, Help.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  Finder nav(String label) =>
      find.descendant(of: find.byType(PesaBottomNav), matching: find.text(label));

  Finder sheetList() =>
      find.descendant(of: find.byType(BottomSheet), matching: find.byType(Scrollable)).first;

  testWidgets('tour, pot manager, archived pots, net worth and help', (tester) async {
    await TokenStorage().clear();
    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Parity Test');
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'paritytest+${DateTime.now().microsecondsSinceEpoch}@pesa.dev',
    );
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pumpAndSettle(const Duration(seconds: 15));
    await tester.pumpAndSettle(const Duration(seconds: 15)); // bootstrap fetch

    // --- First-run tour walks across tabs ---
    expect(find.text('This is your payday card'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('The Bank tab'), findsOneWidget);
    expect(find.text('Other accounts'), findsOneWidget, reason: 'the Bank tab is showing');
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle(const Duration(seconds: 5));
    expect(find.text('Skip tour'), findsNothing);

    // --- Pots & targets: rename a pot ---
    await tester.tap(nav('HOME'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Edit'));
    await tester.pumpAndSettle();
    expect(find.text('TOTAL OF TARGETS'), findsOneWidget);
    await tester.tap(find.text('Gas'));
    await tester.pumpAndSettle();
    expect(find.text('Edit pot'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Gas & fuel');
    FocusManager.instance.primaryFocus?.unfocus(); // drop the keyboard off the button
    await tester.pumpAndSettle(const Duration(seconds: 1));
    // The editor sheet's own list (it also contains a non-scrolling icon grid).
    await tester.scrollUntilVisible(
      find.widgetWithText(FilledButton, 'Save'),
      200,
      scrollable: sheetList(),
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    expect(find.text('Gas & fuel'), findsOneWidget);

    // --- Archive it, find it in Archived pots, restore it ---
    await tester.tap(find.text('Gas & fuel'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Archive this pot'), 200, scrollable: sheetList());
    await tester.tap(find.text('Archive this pot'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Archive'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    expect(find.text('Gas & fuel'), findsNothing);
    // The manager's outer list (the reorderable pot list inside it doesn't scroll).
    await tester.scrollUntilVisible(
      find.text('Archived pots'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Archived pots'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    expect(find.text('Gas & fuel'), findsOneWidget);
    await tester.tap(find.text('Restore'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    expect(find.text('No archived pots.'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle(const Duration(seconds: 5));
    expect(find.text('Gas & fuel'), findsOneWidget, reason: 'restored to the pot list');
    await tester.pageBack();
    await tester.pumpAndSettle();

    // --- Net worth detail from Insights ---
    await tester.tap(nav('INSIGHTS'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('ESTIMATED NET WORTH'), 300);
    await tester.tap(find.text('ESTIMATED NET WORTH'));
    await tester.pumpAndSettle();
    expect(find.text("What's contributing"), findsOneWidget);
    await tester.tapAt(const Offset(20, 20));
    await tester.pumpAndSettle();

    // --- Help from More ---
    await tester.tap(nav('MORE'));
    await tester.pumpAndSettle();
    // Scroll it well clear of the bottom nav, which overlaps the list's end.
    await tester.scrollUntilVisible(find.text('About Pesa'), 200);
    await tester.tap(find.text('Help & tutorials'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Carry-over'));
    await tester.pumpAndSettle();
    expect(find.textContaining("Carried money doesn't count"), findsOneWidget);
  });
}
