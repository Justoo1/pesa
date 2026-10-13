class Env {
  Env._();

  // Android emulator reaches the host machine via 10.0.2.2; iOS simulator
  // and desktop targets use localhost; a physical device needs the host's
  // LAN IP passed via --dart-define=API_BASE_URL=http://<lan-ip>:3000.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );
}
