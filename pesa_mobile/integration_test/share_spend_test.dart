import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/features/share/share_intake.dart';

import 'helpers/disburse.dart';
import 'helpers/tour.dart';

/// "Share → Log spend in Pesa": shared text (e.g. a MoMo SMS) opens a spend with
/// the amount and note pre-filled, once the user is signed in.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('shared text becomes a spend', (tester) async {
    await TokenStorage().clear();
    final container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const PesaApp()),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Share Test');
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'sharetest+${DateTime.now().microsecondsSinceEpoch}@pesa.dev',
    );
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pumpAndSettle(const Duration(seconds: 15));
    await tester.pumpAndSettle(const Duration(seconds: 15));
    await skipTourIfShown(tester);

    // Put money in Rent so there's something to spend from.
    await tester.tap(find.text('Rent'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Top up'));
    await tester.pumpAndSettle();
    await disburseOnKeypad(tester, '500');
    await tester.pageBack();
    await tester.pumpAndSettle();

    container.read(sharedTextProvider.notifier).receive('GH₵ 45 lunch at Papaye');
    await tester.pumpAndSettle();

    expect(find.text('Log a spend'), findsOneWidget);
    expect(find.widgetWithText(TextField, '45'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'lunch at Papaye'), findsOneWidget);

    await tester.tap(find.text('Rent'));
    await tester.pump();
    await tester.ensureVisible(find.text('Log spend'));
    await tester.tap(find.text('Log spend'));
    await tester.pumpAndSettle(const Duration(seconds: 10));

    expect(find.text('Log a spend'), findsNothing, reason: 'back on Home');
    expect(find.textContaining('GH₵455 left of GH₵500'), findsOneWidget);
  });
}
