import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/env.dart';
import 'features/splash/animated_splash.dart';

void main() {
  // Instrument Serif is bundled (assets/google_fonts) under the SIL OFL.
  LicenseRegistry.addLicense(() async* {
    final license = await rootBundle.loadString('assets/google_fonts/OFL.txt');
    yield LicenseEntryWithLineBreaks(const ['google_fonts'], license);
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
