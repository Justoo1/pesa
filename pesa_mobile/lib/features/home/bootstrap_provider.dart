import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/home_data.dart';
import '../auth/auth_provider.dart';

final bootstrapProvider = FutureProvider<HomeData>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.dio.get<Map<String, dynamic>>('/api/mobile/bootstrap');
  final data = response.data!['data'] as Map<String, dynamic>;
  return HomeData.fromJson(data);
});
