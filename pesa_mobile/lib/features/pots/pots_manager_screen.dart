import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/bucket.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/async_data_view.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../home/bootstrap_provider.dart';
import 'pot_actions_provider.dart';
import 'pot_editor_sheet.dart';
import 'pot_repository.dart';

/// Ports the web More tab's "Pots & targets" panel: target total vs salary,
/// drag to reorder, ±100 target nudges, tap to edit, add, archived pots.
class PotsManagerScreen extends ConsumerStatefulWidget {
  const PotsManagerScreen({super.key});

  @override
  ConsumerState<PotsManagerScreen> createState() => _PotsManagerScreenState();
}

class _PotsManagerScreenState extends ConsumerState<PotsManagerScreen> {
  /// Optimistic order while a reorder is saving.
  List<Bucket>? _order;

  Future<void> _run(Future<void> Function() action) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await action();
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    }
    ref.invalidate(bootstrapProvider);
  }

  void _onReorder(List<Bucket> buckets, int from, int to) {
    final next = [...buckets];
    final moved = next.removeAt(from);
    next.insert(to, moved); // onReorderItem already adjusts for the removal
    setState(() => _order = next);
    _run(() => ref.read(potRepositoryProvider).reorder(next.map((b) => b.id).toList()))
        .whenComplete(() {
          if (mounted) setState(() => _order = null);
        });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pots & targets')),
      body: AsyncDataView(
        value: ref.watch(bootstrapProvider),
        onRefresh: () => ref.refresh(bootstrapProvider.future),
        builder: (data) {
          final buckets = _order ?? data.buckets;
          final currency = data.profile.currency;
          final totalTarget = buckets.fold<int>(0, (s, b) => s + b.target);
          final buffer = data.profile.salary - totalTarget;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            children: [
              PesaCard(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('TOTAL OF TARGETS', style: PesaTextStyles.eyebrow()),
                        const SizedBox(height: 2),
                        Text.rich(
                          TextSpan(
                            style: PesaTextStyles.num(fontSize: 18, fontWeight: FontWeight.w600),
                            children: [
                              TextSpan(text: formatMoney(totalTarget, currency)),
                              TextSpan(
                                text: ' / ${formatMoney(data.profile.salary, currency)}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w400,
                                  color: PesaColors.ink3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('BUFFER', style: PesaTextStyles.eyebrow()),
                        const SizedBox(height: 2),
                        Text(
                          '${buffer >= 0 ? '+' : ''}${formatMoney(buffer, currency)}',
                          style: PesaTextStyles.num(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: buffer >= 0 ? PesaColors.greenDeep : PesaColors.clayDeep,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              PesaCard(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: ReorderableListView(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  buildDefaultDragHandles: false,
                  onReorderItem: (from, to) => _onReorder(buckets, from, to),
                  children: [
                    for (var i = 0; i < buckets.length; i++)
                      _PotRow(
                        key: ValueKey(buckets[i].id),
                        index: i,
                        bucket: buckets[i],
                        currency: currency,
                        onEdit: () => showPotEditorSheet(context, bucket: buckets[i]),
                        onNudge: (delta) => _run(
                          () => ref.read(potRepositoryProvider).adjustTarget(buckets[i].id, delta),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              PesaButton(
                label: 'Add pot',
                icon: Icons.add,
                variant: PesaButtonVariant.soft,
                expand: true,
                onPressed: () => showPotEditorSheet(context),
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: () => context.push('/pots/archived'),
                icon: const Icon(LucideIcons.archive, size: 16),
                label: const Text('Archived pots'),
                style: TextButton.styleFrom(foregroundColor: PesaColors.ink2),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PotRow extends StatelessWidget {
  const _PotRow({
    super.key,
    required this.index,
    required this.bucket,
    required this.currency,
    required this.onEdit,
    required this.onNudge,
  });

  final int index;
  final Bucket bucket;
  final String currency;
  final VoidCallback onEdit;
  final ValueChanged<int> onNudge;

  @override
  Widget build(BuildContext context) {
    Widget nudge(IconData icon, int delta, String tip) => IconButton(
      tooltip: tip,
      visualDensity: VisualDensity.compact,
      onPressed: bucket.target + delta < 0 ? null : () => onNudge(delta),
      icon: Icon(icon, size: 16),
    );
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onEdit,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            children: [
              ReorderableDragStartListener(
                index: index,
                child: const Padding(
                  padding: EdgeInsets.all(6),
                  child: Icon(LucideIcons.gripVertical, size: 16, color: PesaColors.ink3),
                ),
              ),
              RowIconChip(color: bucket.color, icon: pesaIconFor(bucket.icon), size: 34),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bucket.name,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    Text(
                      formatMoney(bucket.target, currency),
                      style: PesaTextStyles.num(fontSize: 12, color: PesaColors.ink3),
                    ),
                  ],
                ),
              ),
              nudge(LucideIcons.minus, -100, 'Lower target by 100'),
              nudge(LucideIcons.plus, 100, 'Raise target by 100'),
            ],
          ),
        ),
      ),
    );
  }
}

/// Archived pots: restore, or delete for good (history included).
class ArchivedPotsScreen extends ConsumerStatefulWidget {
  const ArchivedPotsScreen({super.key});

  @override
  ConsumerState<ArchivedPotsScreen> createState() => _ArchivedPotsScreenState();
}

class _ArchivedPotsScreenState extends ConsumerState<ArchivedPotsScreen> {
  late Future<List<ArchivedPot>> _future = ref.read(potRepositoryProvider).listArchived();

  void _reload() => setState(() {
    _future = ref.read(potRepositoryProvider).listArchived();
  });

  Future<void> _act(Future<void> Function() action) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await action();
      ref.invalidate(bootstrapProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    }
    _reload();
  }

  Future<void> _delete(ArchivedPot pot) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Delete "${pot.name}" for good?'),
        content: Text(
          pot.txnCount == 0
              ? 'This pot has no history.'
              : 'Its ${pot.txnCount} transaction${pot.txnCount == 1 ? '' : 's'} will be removed '
                    'from your history too. This can\'t be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(foregroundColor: PesaColors.clayDeep),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true) await _act(() => ref.read(potRepositoryProvider).delete(pot.id));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Archived pots')),
      body: FutureBuilder<List<ArchivedPot>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return ListView(
              padding: const EdgeInsets.all(32),
              children: [ErrorState(error: snap.error!, onRetry: () async => _reload())],
            );
          }
          final pots = snap.data!;
          final serif = PesaTextStyles.serif(fontSize: 24);
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            children: [
              Text.rich(
                TextSpan(
                  style: serif,
                  children: [
                    const TextSpan(text: "Pots you've "),
                    TextSpan(
                      text: 'tucked away.',
                      style: serif.copyWith(fontStyle: FontStyle.italic),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Restore one to use it again, or remove it for good.',
                style: TextStyle(color: PesaColors.ink2),
              ),
              const SizedBox(height: 14),
              PesaCard(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: pots.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(18),
                        child: Center(child: Text('No archived pots.')),
                      )
                    : Column(
                        children: [
                          for (final p in pots)
                            ListTile(
                              leading: RowIconChip(
                                color: p.color,
                                icon: pesaIconFor(p.icon),
                                size: 34,
                              ),
                              title: Text(
                                p.name,
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              subtitle: Text(
                                '${p.txnCount} transaction${p.txnCount == 1 ? '' : 's'}',
                                style: const TextStyle(fontSize: 12),
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  TextButton(
                                    onPressed: () =>
                                        _act(() => ref.read(potRepositoryProvider).restore(p.id)),
                                    child: const Text('Restore'),
                                  ),
                                  IconButton(
                                    tooltip: 'Delete for good',
                                    onPressed: () => _delete(p),
                                    icon: const Icon(LucideIcons.trash2, size: 18),
                                    color: PesaColors.clayDeep,
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
