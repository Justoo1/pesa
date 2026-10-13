import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';

/// Exercises the real Phase 1 auth flow end-to-end against the live Next.js
/// dev server at http://localhost:3000, using the real flutter_secure_storage
/// (Linux/libsecret) backend — not a mock. Requires `npm run dev` running.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('register, persist across a fresh app start, then logout', (tester) async {
    // Clean slate: wipe any token left over from a previous run.
    await TokenStorage().clear();

    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets, reason: 'should boot to sign-in with no session');
    expect(find.text('Email'), findsOneWidget);

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pumpAndSettle();

    final uniqueEmail = 'mobiletest+${DateTime.now().microsecondsSinceEpoch}@pesa.dev';
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'Integration Test');
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), uniqueEmail);
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');

    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pumpAndSettle(const Duration(seconds: 15));

    expect(
      find.byIcon(Icons.logout),
      findsOneWidget,
      reason: 'registration should land on Home with a logout icon',
    );
    expect(find.text('Sign in'), findsNothing);

    // Simulate a fresh app start (new provider container == new process):
    // if the token truly persisted via the OS keyring, this fresh tree
    // should skip sign-in entirely. The short delay gives the platform's
    // secure-storage channel (Keystore-backed on Android) time to settle
    // after the old provider tree's disposal before the new one reads it.
    await tester.pumpWidget(Container());
    await tester.pumpAndSettle();
    await Future<void>.delayed(const Duration(milliseconds: 500));
    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle(const Duration(seconds: 15));

    expect(
      find.byIcon(Icons.logout),
      findsOneWidget,
      reason: 'a fresh app start should stay signed in via the persisted token',
    );

    await tester.tap(find.byIcon(Icons.logout));
    await tester.pumpAndSettle(const Duration(seconds: 15));

    expect(find.text('Sign in'), findsWidgets, reason: 'logout should return to sign-in');
  });
}
