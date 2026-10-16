import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:pesa_mobile/app.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/features/welcome/welcome_seen.dart';

/// First launch: the welcome story shows, steps through its four slides,
/// and "I already have an account" lands on Sign in (and stays dismissed).
///
/// The story loops its idle animations forever, so this test pumps fixed
/// durations instead of pumpAndSettle.
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const shots = bool.fromEnvironment('WELCOME_SHOTS');

  Future<void> wait(WidgetTester tester, int ms) async {
    for (var i = 0; i < ms ~/ 50; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
  }

  testWidgets('welcome story on first launch', (tester) async {
    if (shots) await binding.convertFlutterSurfaceToImage();
    await TokenStorage().clear();
    WelcomeSeen.initial = false;
    await tester.pumpWidget(const ProviderScope(child: PesaApp()));
    // Auth resolves, the router redirects, then the first scene animates in.
    for (var i = 0; i < 100 && find.textContaining('vanish by the').evaluate().isEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    await wait(tester, 1500);

    if (shots) await binding.takeScreenshot('welcome-1');
    expect(find.textContaining('vanish by the'), findsOneWidget);

    for (final (i, text) in [
      (2, 'Give every cedi'),
      (3, 'See where your money'),
      (4, 'Private by design'),
    ]) {
      await tester.tap(find.text('Next'));
      await wait(tester, 1900);
      expect(find.textContaining(text), findsOneWidget);
      if (shots) await binding.takeScreenshot('welcome-$i');
    }

    expect(find.text('Create my account'), findsOneWidget);
    await tester.tap(find.text('I already have an account · Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Email'), findsOneWidget, reason: 'lands on Sign in');
    expect(WelcomeSeen.initial, isTrue, reason: 'remembered as seen');
  });
}
