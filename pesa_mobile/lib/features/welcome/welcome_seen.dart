import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Whether this device has been through the welcome screens. Shown once,
/// before the first sign-in; after that a signed-out app opens on Sign in.
class WelcomeSeen extends Notifier<bool> {
  static const prefsKey = 'pesa.welcomeSeen';

  /// Read from SharedPreferences in main() before the first frame, so the
  /// router can decide synchronously. Defaults to true so tests that pump
  /// PesaApp directly (without main) skip the welcome.
  static bool initial = true;

  @override
  bool build() => initial;

  Future<void> markSeen() async {
    state = true;
    initial = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(prefsKey, true);
  }
}

final welcomeSeenProvider = NotifierProvider<WelcomeSeen, bool>(WelcomeSeen.new);
