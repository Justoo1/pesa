import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/milestone.dart';
import '../../core/models/project.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../../core/widgets/screen_header.dart';
import '../home/bootstrap_provider.dart';
import 'projects_repository.dart';

/// Ports `components/pesa/screens/projects.tsx`: one card per project, tap
/// through to its milestone road.
class ProjectsScreen extends ConsumerWidget {
  const ProjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(bootstrapProvider);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(bootstrapProvider.future),
      child: bootstrap.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => ListView(
          children: [
            const SizedBox(height: 120),
            Center(child: Text('Could not load data.\n$error', textAlign: TextAlign.center)),
          ],
        ),
        data: (data) {
          final currency = data.profile.currency;
          return ListView(
            key: const Key('projects-list'),
            padding: const EdgeInsets.only(bottom: 28),
            children: [
              const ScreenHeader(eyebrow: 'Projects', title: 'Your', italic: 'savings journey.'),
              const SizedBox(height: 12),
              if (data.projects.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  child: PesaCard(
                    padding: EdgeInsets.all(20),
                    child: Text(
                      'Set a big goal — a house, a car, anything worth a roadmap — and break it into fundable milestones.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              else
                for (final p in data.projects)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: _ProjectCard(
                      project: p,
                      milestones: data.milestones.where((m) => m.projectId == p.id).toList(),
                      currency: currency,
                      onTap: () => context.push('/projects/${p.id}'),
                    ),
                  ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                child: PesaButton(
                  label: 'New project',
                  icon: LucideIcons.plus,
                  variant: PesaButtonVariant.soft,
                  expand: true,
                  onPressed: () => _newProject(context, ref),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _newProject(BuildContext context, WidgetRef ref) {
    showFormSheet(
      context: context,
      title: 'New project',
      submitLabel: 'Create project',
      fields: const [
        FormFieldSpec(key: 'name', label: 'Name', maxLength: 60),
        FormFieldSpec(key: 'target', label: 'Target amount', numeric: true),
      ],
      onSubmit: (v) async {
        await ref
            .read(projectsRepositoryProvider)
            .createProject(name: v['name']!, targetAmount: int.parse(v['target']!));
        ref.invalidate(bootstrapProvider);
      },
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({
    required this.project,
    required this.milestones,
    required this.currency,
    required this.onTap,
  });

  final PesaProject project;
  final List<Milestone> milestones;
  final String currency;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final totalSaved = milestones.fold<int>(0, (s, m) => s + m.currentSaved);
    final complete = milestones.isNotEmpty && milestones.every((m) => m.status == 'completed');
    final done = milestones.where((m) => m.status == 'completed').length;
    final fraction = project.targetAmount > 0
        ? (totalSaved / project.targetAmount).clamp(0, 1).toDouble()
        : 0.0;

    return Material(
      color: PesaColors.bgCard,
      borderRadius: BorderRadius.circular(PesaRadius.lg),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  RowIconChip(color: 'green', icon: pesaIconFor(project.icon), size: 32),
                  if (complete)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: PesaColors.greenTint,
                        borderRadius: BorderRadius.circular(PesaRadius.pill),
                      ),
                      child: const Text(
                        '✓ Complete',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: PesaColors.greenDeep,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(project.name, style: PesaTextStyles.serif(fontSize: 20)),
              const SizedBox(height: 4),
              Text(
                '${formatMoney(totalSaved, currency)} / ${formatMoney(project.targetAmount, currency)}',
                style: PesaTextStyles.num(fontSize: 12, color: PesaColors.ink3),
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(PesaRadius.pill),
                child: LinearProgressIndicator(
                  value: fraction,
                  minHeight: 6,
                  backgroundColor: PesaColors.line,
                  valueColor: AlwaysStoppedAnimation(complete ? PesaColors.green : PesaColors.clay),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                '$done of ${milestones.length} milestones',
                style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
