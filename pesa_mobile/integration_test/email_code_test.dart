import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';

/// Exercises the passwordless email-code sign-in end-to-end against the
/// live Next.js dev server. The dev server logs the plaintext code to
/// stdout in non-production (see app/api/mobile/auth/email-code/request),
/// which this test reads back from the redirected dev-server log file
/// instead of an inbox, since there's no test mailbox in this environment.
/// Requires `npm run dev > /tmp/pesa-dev.log 2>&1 &` running.
Future<String> _readCodeFromDevLog(String email) async {
  final file = File('/tmp/pesa-dev.log');
  final pattern = RegExp('mobile email-code for ${RegExp.escape(email)}: (\\d{6})');
  for (var attempt = 0; attempt < 20; attempt++) {
    if (file.existsSync()) {
      final match = pattern.firstMatch(await file.readAsString());
      if (match != null) return match.group(1)!;
    }
    await Future<void>.delayed(const Duration(milliseconds: 250));
  }
  throw StateError('Timed out waiting for the email code to appear in the dev log for $email');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('sign in via emailed one-time code, then logout', (tester) async {
    await TokenStorage().clear();

    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);

    await tester.tap(find.text('Sign in with an email code instead'));
    await tester.pumpAndSettle();

    final uniqueEmail = 'emailcode+${DateTime.now().microsecondsSinceEpoch}@pesa.dev';
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), uniqueEmail);
    await tester.tap(find.widgetWithText(FilledButton, 'Send code'));
    await tester.pumpAndSettle(const Duration(seconds: 10));

    expect(find.widgetWithText(TextFormField, 'Code'), findsOneWidget);

    final code = await _readCodeFromDevLog(uniqueEmail);
    await tester.enterText(find.widgetWithText(TextFormField, 'Code'), code);
    await tester.tap(find.widgetWithText(FilledButton, 'Verify'));
    await tester.pumpAndSettle(const Duration(seconds: 10));

    expect(
      find.byIcon(Icons.logout),
      findsOneWidget,
      reason: 'verifying the code should land on Home (auto-creating the account)',
    );

    await tester.tap(find.byIcon(Icons.logout));
    await tester.pumpAndSettle(const Duration(seconds: 10));

    expect(find.text('Sign in'), findsWidgets);
  });
}
