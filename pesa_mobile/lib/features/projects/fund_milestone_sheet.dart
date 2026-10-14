import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/milestone.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/pesa_ring.dart';
import '../home/bootstrap_provider.dart';
import 'projects_repository.dart';

/// Ports `components/pesa/screens/milestone-detail.tsx`. Watches bootstrap
/// by id so the ring, ledger and lock state refresh in place after funding.
Future<void> showFundMilestoneSheet({required BuildContext context, required String milestoneId}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: PesaColors.bgApp,
    builder: (_) => FractionallySizedBox(
      heightFactor: 0.86,
      child: _FundMilestoneSheet(milestoneId: milestoneId),
    ),
  );
}

class _FundMilestoneSheet extends ConsumerStatefulWidget {
  const _FundMilestoneSheet({required this.milestoneId});

  final String milestoneId;

  @override
  ConsumerState<_FundMilestoneSheet> createState() => _FundMilestoneSheetState();
}

class _FundMilestoneSheetState extends ConsumerState<_FundMilestoneSheet> {
  final _amountController = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _fund() async {
    final amount = int.tryParse(_amountController.text.trim()) ?? 0;
    if (amount <= 0) {
      setState(() => _error = 'Enter an amount above 0');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(projectsRepositoryProvider)
          .fundMilestone(milestoneId: widget.milestoneId, amount: amount);
      _amountController.clear();
      ref.invalidate(bootstrapProvider);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _edit(Milestone m) {
    final navigator = Navigator.of(context);
    showFormSheet(
      context: context,
      title: 'Edit milestone',
      submitLabel: 'Save',
      fields: [
        FormFieldSpec(key: 'title', label: 'Title', initial: m.title, maxLength: 60),
        FormFieldSpec(
          key: 'target',
          label: 'Target amount',
          initial: '${m.targetAmount}',
          numeric: true,
        ),
        FormFieldSpec(
          key: 'fun',
          label: 'Fun detail (optional)',
          initial: m.funDetail,
          required: false,
          maxLength: 140,
        ),
      ],
      onSubmit: (v) async {
        await ref
            .read(projectsRepositoryProvider)
            .updateMilestone(
              milestoneId: m.id,
              title: v['title']!,
              targetAmount: int.parse(v['target']!),
              funDetail: v['fun']!,
              targetDate: m.targetDate,
              bucketId: m.bucketId,
            );
        ref.invalidate(bootstrapProvider);
      },
      destructive: FormSheetAction(
        label: 'Archive milestone',
        confirm: 'Archive "${m.title}"?',
        onPressed: () async {
          await ref.read(projectsRepositoryProvider).archiveMilestone(m.id);
          ref.invalidate(bootstrapProvider);
          navigator.pop(); // also close this detail sheet
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(bootstrapProvider).value;
    final m = data?.milestones.where((x) => x.id == widget.milestoneId).firstOrNull;
    if (data == null || m == null) {
      return const Center(child: Text('Milestone not found.'));
    }
    final currency = data.profile.currency;
    final locked = m.status == 'locked';
    final pct = m.targetAmount > 0 ? (m.currentSaved / m.targetAmount * 100).clamp(0, 100) : 0;
    final ledger = data.milestoneLedger.where((t) => t.milestoneId == m.id).toList();
    final linkedPot = m.bucketId == null
        ? null
        : data.buckets.where((b) => b.id == m.bucketId).firstOrNull;

    return SafeArea(
      child: ListView(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(LucideIcons.x, size: 18),
                onPressed: () => Navigator.of(context).pop(),
              ),
              Expanded(
                child: Text(
                  m.title,
                  textAlign: TextAlign.center,
                  style: PesaTextStyles.serif(fontSize: 22),
                ),
              ),
              IconButton(
                icon: const Icon(LucideIcons.pencil, size: 18),
                tooltip: 'Edit milestone',
                onPressed: () => _edit(m),
              ),
            ],
          ),
          if (m.funDetail.isNotEmpty) ...[
            Text(m.funDetail, textAlign: TextAlign.center),
            const SizedBox(height: 16),
          ],
          Center(
            child: PesaRing(percent: pct, color: PesaColors.green, size: 96),
          ),
          const SizedBox(height: 10),
          Center(
            child: Text.rich(
              TextSpan(
                style: PesaTextStyles.num(fontSize: 22, fontWeight: FontWeight.w600),
                children: [
                  TextSpan(text: formatMoney(m.currentSaved, currency)),
                  TextSpan(
                    text: ' / ${formatMoney(m.targetAmount, currency)}',
                    style: const TextStyle(color: PesaColors.ink3),
                  ),
                ],
              ),
            ),
          ),
          Center(
            child: Text(
              '${pct.round()}% complete',
              style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
            ),
          ),
          if (linkedPot != null) ...[
            const SizedBox(height: 14),
            Center(
              child: Chip(
                avatar: const Icon(LucideIcons.tag, size: 12),
                label: Text('Linked to ${linkedPot.name}'),
                backgroundColor: PesaColors.greenTint,
              ),
            ),
          ],
          const SizedBox(height: 24),
          Text('Activity', style: PesaTextStyles.serif(fontSize: 18)),
          const SizedBox(height: 10),
          PesaCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: ledger.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(18),
                    child: Center(child: Text('No funds added toward this milestone yet.')),
                  )
                : Column(
                    children: [
                      for (final t in ledger)
                        ListTile(
                          leading: const Icon(LucideIcons.flag, size: 16),
                          title: Text(t.note, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(formatTxnDate(t.occurredAt)),
                          trailing: Text(
                            '+${formatMoney(t.amount, currency)}',
                            style: PesaTextStyles.num(
                              fontWeight: FontWeight.w600,
                              color: PesaColors.greenDeep,
                            ),
                          ),
                        ),
                    ],
                  ),
          ),
          const SizedBox(height: 24),
          if (locked) ...[
            const Text(
              'Complete the previous milestone to unlock this one.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: PesaColors.ink3),
            ),
            const SizedBox(height: 12),
            const PesaButton(
              label: 'Add funds',
              variant: PesaButtonVariant.green,
              expand: true,
              onPressed: null,
            ),
          ] else ...[
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: 'Add funds', hintText: '${currency}0'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: PesaColors.clayDeep, fontSize: 12)),
            ],
            const SizedBox(height: 12),
            PesaButton(
              label: 'Add funds',
              variant: PesaButtonVariant.green,
              expand: true,
              loading: _busy,
              onPressed: _fund,
            ),
          ],
        ],
      ),
    );
  }
}
