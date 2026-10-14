import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/api_exception.dart';
import '../auth/auth_provider.dart';

/// Writes for projects & milestones (`app/api/mobile/{projects,milestones}`).
/// Reads come from bootstrap; milestone statuses are always the server's
/// `computeStatuses` result, never recomputed here.
class ProjectsRepository {
  ProjectsRepository({required this._apiClient});

  final ApiClient _apiClient;

  Future<void> createProject({required String name, required int targetAmount, String? icon}) =>
      _run(
        () => _apiClient.dio.post<void>(
          '/api/mobile/projects',
          data: {'name': name, 'targetAmount': targetAmount, 'icon': ?icon},
        ),
      );

  Future<void> updateProject({
    required String projectId,
    required String name,
    required int targetAmount,
    required String icon,
    String? targetDate,
  }) => _run(
    () => _apiClient.dio.patch<void>(
      '/api/mobile/projects/$projectId',
      data: {'name': name, 'targetAmount': targetAmount, 'icon': icon, 'targetDate': targetDate},
    ),
  );

  Future<void> archiveProject(String projectId) =>
      _run(() => _apiClient.dio.post<void>('/api/mobile/projects/$projectId/archive'));

  Future<void> createMilestone({
    required String projectId,
    required String title,
    required int targetAmount,
    String? funDetail,
  }) => _run(
    () => _apiClient.dio.post<void>(
      '/api/mobile/milestones',
      data: {
        'projectId': projectId,
        'title': title,
        'targetAmount': targetAmount,
        'funDetail': ?funDetail,
      },
    ),
  );

  Future<void> updateMilestone({
    required String milestoneId,
    required String title,
    required int targetAmount,
    required String funDetail,
    String? targetDate,
    String? bucketId,
  }) => _run(
    () => _apiClient.dio.patch<void>(
      '/api/mobile/milestones/$milestoneId',
      data: {
        'title': title,
        'targetAmount': targetAmount,
        'funDetail': funDetail,
        'targetDate': targetDate,
        'bucketId': bucketId,
      },
    ),
  );

  Future<void> archiveMilestone(String milestoneId) =>
      _run(() => _apiClient.dio.post<void>('/api/mobile/milestones/$milestoneId/archive'));

  Future<void> fundMilestone({required String milestoneId, required int amount, String? note}) =>
      _run(
        () => _apiClient.dio.post<void>(
          '/api/mobile/milestones/$milestoneId/fund',
          data: {'amount': amount, 'note': ?note},
        ),
      );

  Future<void> _run(Future<Response<void>> Function() request) async {
    try {
      await request();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}

final projectsRepositoryProvider = Provider<ProjectsRepository>((ref) {
  return ProjectsRepository(apiClient: ref.watch(apiClientProvider));
});
