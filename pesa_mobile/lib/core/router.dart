import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_provider.dart';
import '../features/auth/email_code_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/home/home_screen.dart';
import '../features/months/months_screen.dart';
import '../features/pots/pot_detail_screen.dart';
import '../features/pots/pots_manager_screen.dart';
import '../features/projects/project_road_screen.dart';
import '../features/settings/app_lock.dart';
import '../features/share/share_spend_screen.dart';
import '../features/settings/income_sources_screen.dart';
import '../features/welcome/welcome_screen.dart';
import '../features/welcome/welcome_seen.dart';

const _authRoutes = {'/welcome', '/login', '/register', '/login/email-code'};

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
    if (!isAuthenticated) {
      // First launch: the welcome story, before anything else.
      if (!ref.read(welcomeSeenProvider) && state.matchedLocation != '/welcome') {
        return '/welcome';
      }
      if (!isAuthRoute) return '/login';
      return null;
    }
    if (isAuthenticated && isAuthRoute) return '/';
    return null;
  }

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refreshNotifier,
    redirect: redirect,
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const AppLockGate(child: HomeScreen()),
      ),
      GoRoute(
        path: '/projects/:id',
        builder: (context, state) => ProjectRoadScreen(projectId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/pots', builder: (context, state) => const PotsManagerScreen()),
      GoRoute(path: '/pots/archived', builder: (context, state) => const ArchivedPotsScreen()),
      GoRoute(
        path: '/pots/:id',
        builder: (context, state) => PotDetailScreen(bucketId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/settings/income-sources',
        builder: (context, state) => const IncomeSourcesScreen(),
      ),
      GoRoute(
        path: '/share',
        builder: (context, state) => ShareSpendScreen(sharedText: state.extra as String? ?? ''),
      ),
      GoRoute(path: '/months', builder: (context, state) => const MonthsScreen()),
      GoRoute(
        path: '/months/:ym',
        builder: (context, state) => MonthDetailScreen(ym: state.pathParameters['ym']!),
      ),
      GoRoute(path: '/welcome', builder: (context, state) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/login/email-code', builder: (context, state) => const EmailCodeScreen()),
    ],
  );
});
