import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router.dart';
import 'core/theme/pesa_theme.dart';
import 'features/auth/auth_provider.dart';

class PesaApp extends ConsumerWidget {
  const PesaApp({super.key});

  static final _theme = buildPesaTheme();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);

    if (authState.isLoading && !authState.hasValue) {
      return MaterialApp(
        title: 'Pesa',
        debugShowCheckedModeBanner: false,
        theme: _theme,
        home: const Scaffold(body: Center(child: CircularProgressIndicator())),
      );
    }

    return MaterialApp.router(
      title: 'Pesa',
      debugShowCheckedModeBanner: false,
      theme: _theme,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
