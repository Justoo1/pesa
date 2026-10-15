import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app.dart';
import 'core/env.dart';
import 'core/push/push_service.dart';
import 'features/splash/animated_splash.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Every screen is laid out for portrait phones (iOS is iPhone-only too).
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  // Phone push is optional: stays off until Firebase config is added.
  await PushService.init();
  // Every font is bundled (assets/google_fonts, SIL OFL), so the app never
  // fetches fonts from Google at runtime: works offline, and no third-party
  // request the privacy policy doesn't mention.
  GoogleFonts.config.allowRuntimeFetching = false;
  LicenseRegistry.addLicense(() async* {
    for (final (family, file) in const [
      ('Instrument Serif', 'OFL.txt'),
      ('Geist', 'OFL-Geist.txt'),
      ('JetBrains Mono', 'OFL-JetBrainsMono.txt'),
    ]) {
      final license = await rootBundle.loadString('assets/google_fonts/$file');
      yield LicenseEntryWithLineBreaks([family], license);
    }
  });
  final configError = Env.releaseConfigError;
  if (configError != null) {
    // Fail loudly and readably instead of every request timing out.
    runApp(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: Padding(padding: const EdgeInsets.all(32), child: Text(configError)),
          ),
        ),
      ),
    );
    return;
  }
  runApp(const ProviderScope(child: SplashHost(child: PesaApp())));
}
