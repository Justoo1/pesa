import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_provider.dart';
import '../features/auth/email_code_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/home/home_screen.dart';

const _authRoutes = {'/login', '/register', '/login/email-code'};

/// Bridges Riverpod's [authControllerProvider] to go_router's
/// [GoRouter.refreshListenable], so a settled auth-status change (not every
/// AsyncLoading blip) re-evaluates redirects in place — without recreating
/// the GoRouter itself, which would tear down and rebuild the whole
/// Navigator subtree mid-flight and could dispose a screen's own in-flight
/// async work (e.g. the register/login call that triggered the change).
class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(Ref ref) {
    ref.listen(authControllerProvider, (previous, next) {
      final wasAuthenticated = previous?.value is AuthAuthenticated;
      final isAuthenticated = next.value is AuthAuthenticated;
      if (previous == null || wasAuthenticated != isAuthenticated) {
        notifyListeners();
      }
    });
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = _AuthRefreshNotifier(ref);
  ref.onDispose(refreshNotifier.dispose);

  String? redirect(BuildContext context, GoRouterState state) {
    final authState = ref.read(authControllerProvider);
    if (authState.isLoading) return null;
    final isAuthenticated = authState.value is AuthAuthenticated;
    final isAuthRoute = _authRoutes.contains(state.matchedLocation);
    if (!isAuthenticated && !isAuthRoute) return '/login';
    if (isAuthenticated && isAuthRoute) return '/';
    return null;
  }

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refreshNotifier,
    redirect: redirect,
    routes: [
      GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(
        path: '/login/email-code',
        builder: (context, state) => const EmailCodeScreen(),
      ),
    ],
  );
});
