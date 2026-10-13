import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_provider.dart';
import 'pot_repository.dart';

final potRepositoryProvider = Provider<PotRepository>((ref) {
  return PotRepository(apiClient: ref.watch(apiClientProvider));
});
