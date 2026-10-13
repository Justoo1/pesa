import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_provider.dart';
import 'bank_repository.dart';

final bankRepositoryProvider = Provider<BankRepository>((ref) {
  return BankRepository(apiClient: ref.watch(apiClientProvider));
});
