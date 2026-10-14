import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/env.dart';
import 'package:pesa_mobile/core/token_storage.dart';

/// Exercises the passwordless email-code sign-in end-to-end against the
/// live Next.js dev server. There's no test mailbox, so the code is fetched
/// from the dev server's dev-only endpoint (`/api/mobile/dev/last-code`,
/// 404 in production) — this works from an emulator, unlike reading the
/// server's log file. Requires `npm run dev` running.
Future<String> _readCodeFromDevServer(String email) async {
  final dio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl));
  for (var attempt = 0; attempt < 20; attempt++) {
    try {
      final res = await dio.get<Map<String, dynamic>>(
        '/api/mobile/dev/last-code',
        queryParameters: {'email': email},
      );
      return (res.data!['data'] as Map<String, dynamic>)['code'] as String;
    } on DioException {
      await Future<void>.delayed(const Duration(milliseconds: 250));
    }
  }
  throw StateError('Timed out waiting for the dev server to issue a code for $email');
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

    final code = await _readCodeFromDevServer(uniqueEmail);
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
