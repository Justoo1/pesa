import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/core/widgets/pesa_bottom_nav.dart';

/// Phases 5.2 + 6.2 against the live dev server: build a two-milestone
/// project, confirm the server's sequential-unlock statuses drive the road
/// (locked → disabled fund; funding the first unlocks the second), then add
/// an income source, turn on the app lock, and sign out from More.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  Finder navTab(String label) =>
      find.descendant(of: find.byType(PesaBottomNav), matching: find.text(label));

  Future<void> fillForm(WidgetTester tester, Map<String, String> fields, String submit) async {
    for (final e in fields.entries) {
      await tester.enterText(find.widgetWithText(TextFormField, e.key), e.value);
    }
    // `.last` = the sheet's button, not a same-labelled one on the page behind it.
    await tester.tap(find.widgetWithText(FilledButton, submit).last);
    await tester.pumpAndSettle(const Duration(seconds: 10));
  }

  testWidgets('projects roadmap and settings flows', (tester) async {
    await TokenStorage().clear();
    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pumpAndSettle();
    await fillForm(tester, {
      'Name': 'Projects Test',
      'Email': 'projectstest+${DateTime.now().microsecondsSinceEpoch}@pesa.dev',
      'Password': 'password123',
    }, 'Create account');
    await tester.pumpAndSettle(const Duration(seconds: 15)); // bootstrap fetch

    // --- Projects: create a project with two milestones ---
    await tester.tap(navTab('PROJECTS'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('New project'));
    await tester.pumpAndSettle();
    await fillForm(tester, {'Name': 'House', 'Target amount': '5000'}, 'Create project');
    expect(find.text('0 of 0 milestones'), findsOneWidget);

    await tester.tap(find.text('House'));
    await tester.pumpAndSettle();
    for (final (title, target) in [('Land', '1000'), ('Roof', '500')]) {
      await tester.tap(find.text('Add milestone'));
      await tester.pumpAndSettle();
      await fillForm(tester, {'Title': title, 'Target amount': target}, 'Add milestone');
    }

    // Second milestone starts locked: no amount field, fund button disabled.
    await tester.tap(find.text('Roof'));
    await tester.pumpAndSettle();
    expect(find.text('Complete the previous milestone to unlock this one.'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Add funds'), findsNothing);
    await tester.tapAt(const Offset(20, 20)); // dismiss sheet
    await tester.pumpAndSettle();

    // Fund the first to target → completed; the second unlocks.
    await tester.tap(find.text('Land'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'Add funds'), '1000');
    await tester.tap(find.widgetWithText(FilledButton, 'Add funds'));
    await tester.pumpAndSettle(const Duration(seconds: 15));
    expect(find.text('100% complete'), findsOneWidget);
    await tester.tapAt(const Offset(20, 20));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Roof'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(TextField, 'Add funds'), findsOneWidget);
    await tester.tapAt(const Offset(20, 20));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('1 of 2 milestones'), findsOneWidget);

    // --- More: income source resyncs the salary ---
    await tester.tap(navTab('MORE'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Income sources'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Add income source'));
    await tester.pumpAndSettle();
    await fillForm(tester, {'Name': 'Side gig', 'Monthly amount': '2000'}, 'Add');
    expect(find.text('GH₵16,000'), findsOneWidget); // 14,000 seeded + 2,000
    await tester.pageBack();
    await tester.pumpAndSettle();

    // --- App lock on ---
    await tester.tap(find.text('App Lock (PIN)'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'New PIN (4–8 digits)'), '2468');
    await tester.enterText(find.widgetWithText(TextField, 'Confirm PIN'), '2468');
    await tester.tap(find.widgetWithText(FilledButton, 'Turn on'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    // Whoever just set it stays unlocked until the app is backgrounded.
    expect(find.text('Pesa is locked'), findsNothing);

    // --- Sign out returns to the sign-in screen ---
    final settingsList = find.byKey(const Key('settings-list'));
    await tester.drag(settingsList, const Offset(0, -800));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Sign out'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    expect(find.text("Don't have an account? Register"), findsOneWidget);
  });
}
