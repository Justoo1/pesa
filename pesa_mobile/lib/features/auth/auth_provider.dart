import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/token_storage.dart';
import 'auth_repository.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  return ApiClient(
    tokenStorage: tokenStorage,
    onUnauthenticated: () => ref.read(authControllerProvider.notifier).forceLogout(),
  );
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    apiClient: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

sealed class AuthState {
  const AuthState();
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

class AuthAuthenticated extends AuthState {
  const AuthAuthenticated({this.user});

  final AuthUser? user;
}

class AuthController extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final hasSession = await ref.watch(authRepositoryProvider).hasStoredSession();
    return hasSession ? const AuthAuthenticated() : const AuthUnauthenticated();
  }

  Future<void> login({required String email, required String password}) async {
    state = const AsyncLoading();
    final result = await AsyncValue.guard(() async {
      final user = await ref.read(authRepositoryProvider).login(email: email, password: password);
      return AuthAuthenticated(user: user);
    });
    // The router rebuilds a fresh GoRouter on every auth-state change, which
    // can dispose this notifier mid-flight — never assign state after an
    // await without confirming it's still mounted (see AsyncNotifier docs).
    if (!ref.mounted) return;
    state = result;
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    state = const AsyncLoading();
    final result = await AsyncValue.guard(() async {
      final user = await ref
          .read(authRepositoryProvider)
          .register(name: name, email: email, password: password);
      return AuthAuthenticated(user: user);
    });
    if (!ref.mounted) return;
    state = result;
  }

  /// Requests an email login code. Deliberately does not touch [state] —
  /// this is a transient side effect, not a session-state transition, so
  /// the calling screen manages its own local sent/error/loading UI.
  Future<void> requestLoginCode(String email) {
    return ref.read(authRepositoryProvider).requestLoginCode(email);
  }

  Future<void> verifyLoginCode({required String email, required String code}) async {
    state = const AsyncLoading();
    final result = await AsyncValue.guard(() async {
      final user = await ref
          .read(authRepositoryProvider)
          .verifyLoginCode(email: email, code: code);
      return AuthAuthenticated(user: user);
    });
    if (!ref.mounted) return;
    state = result;
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    if (!ref.mounted) return;
    state = const AsyncData(AuthUnauthenticated());
  }

  void forceLogout() {
    state = const AsyncData(AuthUnauthenticated());
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, AuthState>(
  AuthController.new,
);
