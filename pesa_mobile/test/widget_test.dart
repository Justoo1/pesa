import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/features/auth/auth_provider.dart';

/// In-memory stand-in for [TokenStorage] so tests never touch the real
/// flutter_secure_storage platform channel (unavailable in the test binding).
class _FakeTokenStorage extends TokenStorage {
  final Map<String, String> _store = {};

  @override
  Future<void> save({required String accessToken, required String refreshToken}) async {
    _store['access'] = accessToken;
    _store['refresh'] = refreshToken;
  }

  @override
  Future<String?> readAccessToken() async => _store['access'];

  @override
  Future<String?> readRefreshToken() async => _store['refresh'];

  @override
  Future<void> clear() async => _store.clear();
}

void main() {
  testWidgets('with no stored session, shows the sign-in screen', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [tokenStorageProvider.overrideWithValue(_FakeTokenStorage())],
        child: const PesaApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
  });
}
