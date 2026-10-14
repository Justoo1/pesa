import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/milestone.dart';
import '../../core/models/project.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_ring.dart';
import '../home/bootstrap_provider.dart';
import 'fund_milestone_sheet.dart';
import 'projects_repository.dart';

/// Ports `components/pesa/screens/project-road.tsx`: the project header and
/// its milestone "road", read from bootstrap so it re-renders with the
/// server-computed statuses after every write.
class ProjectRoadScreen extends ConsumerWidget {
  const ProjectRoadScreen({super.key, required this.projectId});

  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(bootstrapProvider).value;
    final project = data?.projects.where((p) => p.id == projectId).firstOrNull;
    if (data == null || project == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: data == null
              ? const CircularProgressIndicator()
              : const Text('Project not found.'),
        ),
      );
    }

    final currency = data.profile.currency;
    final milestones = data.milestones.where((m) => m.projectId == projectId).toList()
      ..sort((a, b) => a.sequenceOrder.compareTo(b.sequenceOrder));
    final totalSaved = milestones.fold<int>(0, (s, m) => s + m.currentSaved);
    final pct = project.targetAmount > 0 ? totalSaved / project.targetAmount * 100 : 0;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(project.name, style: PesaTextStyles.serif(fontSize: 22)),
            Text(
              '${formatMoney(totalSaved, currency)} of ${formatMoney(project.targetAmount, currency)} saved',
              style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
            ),
          ],
        ),
        actions: [
          PesaRing(percent: pct, color: PesaColors.green, size: 36, stroke: 5),
          IconButton(
            icon: const Icon(LucideIcons.pencil, size: 18),
            tooltip: 'Edit project',
            onPressed: () => _editProject(context, ref, project),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(bootstrapProvider.future),
        child: ListView(
          padding: const EdgeInsets.only(top: 24, bottom: 28),
          children: [
            Center(
              child: _ProjectRoad(
                project: project,
                milestones: milestones,
                onSelect: (m) => showFundMilestoneSheet(context: context, milestoneId: m.id),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: PesaButton(
                label: 'Add milestone',
                icon: LucideIcons.plus,
                variant: PesaButtonVariant.soft,
                expand: true,
                onPressed: () => _newMilestone(context, ref),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _newMilestone(BuildContext context, WidgetRef ref) {
    showFormSheet(
      context: context,
      title: 'New milestone',
      submitLabel: 'Add milestone',
      fields: const [
        FormFieldSpec(key: 'title', label: 'Title', maxLength: 60),
        FormFieldSpec(key: 'target', label: 'Target amount', numeric: true),
        FormFieldSpec(key: 'fun', label: 'Fun detail (optional)', required: false, maxLength: 140),
      ],
      onSubmit: (v) async {
        await ref
            .read(projectsRepositoryProvider)
            .createMilestone(
              projectId: projectId,
              title: v['title']!,
              targetAmount: int.parse(v['target']!),
              funDetail: v['fun']!.isEmpty ? null : v['fun'],
            );
        ref.invalidate(bootstrapProvider);
      },
    );
  }

  void _editProject(BuildContext context, WidgetRef ref, PesaProject project) {
    final router = GoRouter.of(context);
    showFormSheet(
      context: context,
      title: 'Edit project',
      submitLabel: 'Save',
      fields: [
        FormFieldSpec(key: 'name', label: 'Name', initial: project.name, maxLength: 60),
        FormFieldSpec(
          key: 'target',
          label: 'Target amount',
          initial: '${project.targetAmount}',
          numeric: true,
        ),
      ],
      onSubmit: (v) async {
        await ref
            .read(projectsRepositoryProvider)
            .updateProject(
              projectId: project.id,
              name: v['name']!,
              targetAmount: int.parse(v['target']!),
              icon: project.icon,
              targetDate: project.targetDate,
            );
        ref.invalidate(bootstrapProvider);
      },
      destructive: FormSheetAction(
        label: 'Archive project',
        confirm: 'Archive "${project.name}" and all its milestones?',
        onPressed: () async {
          await ref.read(projectsRepositoryProvider).archiveProject(project.id);
          ref.invalidate(bootstrapProvider);
          router.pop();
        },
      ),
    );
  }
}

/// Layout constants ported from `components/pesa/project-road-svg.tsx`.
const _node = 56.0;
const _startNode = 44.0;
const _finalNode = 64.0;
const _spacing = 116.0;
const _padTop = 40.0;
const _padBottom = 40.0;
const _sideOffset = 74.0;
const _width = 342.0;

class _ProjectRoad extends StatelessWidget {
  const _ProjectRoad({required this.project, required this.milestones, required this.onSelect});

  final PesaProject project;
  final List<Milestone> milestones;
  final ValueChanged<Milestone> onSelect;

  @override
  Widget build(BuildContext context) {
    final totalNodes = milestones.length + 2; // start + milestones + finish
    final height = _padTop + _padBottom + (totalNodes - 1) * _spacing + _node;
    const centerX = _width / 2;
    double x(int i) {
      if (i == 0 || i == totalNodes - 1) return centerX;
      return (i - 1).isEven ? centerX - _sideOffset : centerX + _sideOffset;
    }

    double y(int i) => _padTop + _node / 2 + i * _spacing;
    final points = [for (var i = 0; i < totalNodes; i++) Offset(x(i), y(i))];

    // A segment is "reached" once the milestone it leads to is unlocked; the
    // last one only when the final milestone is completed.
    bool reached(int toIndex) {
      if (toIndex == totalNodes - 1) {
        return milestones.isNotEmpty && milestones.last.status == 'completed';
      }
      return milestones[toIndex - 1].status != 'locked';
    }

    final complete = milestones.isNotEmpty && milestones.every((m) => m.status == 'completed');

    return SizedBox(
      width: _width,
      height: height,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _RoadPainter(
                points: points,
                reached: [for (var i = 1; i < totalNodes; i++) reached(i)],
              ),
            ),
          ),
          _RoadNode(
            center: points.first,
            size: _startNode,
            state: _NodeState.completed,
            label: 'Start',
            child: const Icon(LucideIcons.flag, size: 18),
          ),
          for (var i = 0; i < milestones.length; i++)
            _RoadNode(
              center: points[i + 1],
              size: _node,
              state: switch (milestones[i].status) {
                'completed' => _NodeState.completed,
                'in_progress' => _NodeState.active,
                _ => _NodeState.locked,
              },
              label: milestones[i].title,
              onTap: () => onSelect(milestones[i]),
              child: switch (milestones[i].status) {
                'completed' => const Icon(LucideIcons.check, size: 20),
                'locked' => const Icon(LucideIcons.lock, size: 18),
                _ => Text(
                  '${i + 1}',
                  style: PesaTextStyles.num(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: PesaColors.bgApp,
                  ),
                ),
              },
            ),
          _RoadNode(
            center: points.last,
            size: _finalNode,
            state: complete ? _NodeState.completed : _NodeState.locked,
            label: project.name,
            child: Icon(pesaIconFor(project.icon), size: 26),
          ),
        ],
      ),
    );
  }
}

class _RoadPainter extends CustomPainter {
  _RoadPainter({required this.points, required this.reached});

  final List<Offset> points;
  final List<bool> reached;

  @override
  void paint(Canvas canvas, Size size) {
    for (var i = 1; i < points.length; i++) {
      final a = points[i - 1];
      final b = points[i];
      final midY = (a.dy + b.dy) / 2;
      final path = Path()
        ..moveTo(a.dx, a.dy)
        ..cubicTo(a.dx, midY, b.dx, midY, b.dx, b.dy);
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 5
          ..strokeCap = StrokeCap.round
          ..color = reached[i - 1] ? PesaColors.greenSoft : PesaColors.line,
      );
    }
  }

  @override
  bool shouldRepaint(_RoadPainter old) => old.points != points || old.reached != reached;
}

enum _NodeState { locked, active, completed }

class _RoadNode extends StatelessWidget {
  const _RoadNode({
    required this.center,
    required this.size,
    required this.state,
    required this.label,
    required this.child,
    this.onTap,
  });

  final Offset center;
  final double size;
  final _NodeState state;
  final String label;
  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (state) {
      _NodeState.locked => (PesaColors.line, PesaColors.ink3),
      _NodeState.active => (PesaColors.green, PesaColors.bgApp),
      _NodeState.completed => (PesaColors.greenDeep, PesaColors.bgApp),
    };
    const labelWidth = 110.0;
    return Positioned(
      left: center.dx - labelWidth / 2,
      top: center.dy - size / 2,
      width: labelWidth,
      child: Semantics(
        button: onTap != null,
        label: label,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: Column(
            children: [
              Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  color: bg,
                  shape: BoxShape.circle,
                  boxShadow: state == _NodeState.completed
                      ? const [BoxShadow(color: PesaColors.greenTint, spreadRadius: 6)]
                      : null,
                ),
                child: IconTheme(
                  data: IconThemeData(color: fg),
                  child: Center(child: child),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: PesaColors.ink2,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
