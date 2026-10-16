import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/payday_draft.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../home/bootstrap_provider.dart';
import 'pot_actions_provider.dart';

/// Ports components/pesa/screens/payday-review.tsx: "Replay last month"
/// opens last month's amounts per pot to edit or skip, then sends them all.
Future<void> showPaydayReviewSheet(
  BuildContext context, {
  required List<PaydayDraft> template,
  required String currency,
  required int remainingToDisburse,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: PesaColors.bgApp,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(PesaRadius.lg)),
    ),
    builder: (_) => FractionallySizedBox(
      heightFactor: 0.92,
      child: _PaydayReview(
        template: template,
        currency: currency,
        remainingToDisburse: remainingToDisburse,
      ),
    ),
  );
}

class _Line {
  _Line(this.draft) : amount = TextEditingController(text: '${draft.amount}');

  final PaydayDraft draft;
  final TextEditingController amount;
  bool include = true;

  int get value => int.tryParse(amount.text) ?? 0;
}

class _PaydayReview extends ConsumerStatefulWidget {
  const _PaydayReview({
    required this.template,
    required this.currency,
    required this.remainingToDisburse,
  });

  final List<PaydayDraft> template;
  final String currency;
  final int remainingToDisburse;

  @override
  ConsumerState<_PaydayReview> createState() => _PaydayReviewState();
}

class _PaydayReviewState extends ConsumerState<_PaydayReview> {
  late final _lines = [for (final d in widget.template) _Line(d)];
  bool _busy = false;
  String? _error;

  int get _total => _lines.fold(0, (s, l) => l.include ? s + l.value : s);

  @override
  void dispose() {
    for (final l in _lines) {
      l.amount.dispose();
    }
    super.dispose();
  }

  Future<void> _send() async {
    final drafts = [
      for (final l in _lines)
        if (l.include && l.value > 0)
          PaydayDraft(
            bucketId: l.draft.bucketId,
            bucketName: l.draft.bucketName,
            amount: l.value,
            color: l.draft.color,
            icon: l.draft.icon,
            kind: l.draft.kind,
            alreadyThisMonth: l.draft.alreadyThisMonth,
          ),
    ];
    if (drafts.isEmpty) return Navigator.of(context).pop();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(potRepositoryProvider).applyPaydayTemplate(drafts);
      ref.invalidate(bootstrapProvider);
      HapticFeedback.mediumImpact();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final serif = PesaTextStyles.serif(fontSize: 28);
    final total = _total;
    final over = widget.remainingToDisburse > 0 && total > widget.remainingToDisburse;
    String money(int v) => formatMoney(v, widget.currency);

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Close',
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(LucideIcons.x, size: 20),
              ),
              const Spacer(),
              Text('PAYDAY', style: PesaTextStyles.eyebrow(color: PesaColors.ink3)),
              const Spacer(),
              const SizedBox(width: 48),
            ],
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text.rich(
              TextSpan(
                style: serif,
                children: [
                  const TextSpan(text: "Replay last month's "),
                  TextSpan(
                    text: 'moves.',
                    style: serif.copyWith(fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(4, 6, 4, 10),
            child: Text(
              'Edit any amount, tap a pot to skip it, then send them all at once.',
              style: TextStyle(color: PesaColors.ink2),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
            decoration: const BoxDecoration(
              border: Border.symmetric(horizontal: BorderSide(color: PesaColors.line)),
            ),
            child: Row(
              children: [
                Text('TOTAL', style: PesaTextStyles.eyebrow(color: PesaColors.ink2)),
                const Spacer(),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: Text(
                    money(total),
                    key: ValueKey(total),
                    style: PesaTextStyles.num(fontSize: 22, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.separated(
              itemCount: _lines.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) => _row(_lines[i], money),
            ),
          ),
          if (over)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Center(
                child: Text(
                  "Total is more than what's left to disburse this month.",
                  style: TextStyle(color: PesaColors.clayDeep),
                ),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(_error!, style: const TextStyle(color: PesaColors.clayDeep)),
            ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton.icon(
              onPressed: _busy || total <= 0 ? null : _send,
              style: FilledButton.styleFrom(
                backgroundColor: PesaColors.green,
                shape: const StadiumBorder(),
              ),
              icon: _busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: PesaColors.bgApp),
                    )
                  : const Icon(LucideIcons.send, size: 16),
              label: Text('Send ${money(total)}'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(_Line line, String Function(int) money) {
    final d = line.draft;
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 180),
      opacity: line.include ? 1 : 0.45,
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 8, 12, 8),
        decoration: BoxDecoration(
          color: PesaColors.bgCard,
          borderRadius: BorderRadius.circular(PesaRadius.base),
        ),
        child: Row(
          children: [
            InkWell(
              customBorder: const CircleBorder(),
              onTap: () => setState(() => line.include = !line.include),
              child: Stack(
                children: [
                  RowIconChip(color: d.color, icon: pesaIconFor(d.icon), size: 38),
                  if (!line.include)
                    const Positioned.fill(
                      child: Center(child: Icon(LucideIcons.x, size: 22, color: PesaColors.ink)),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(d.bucketName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(
                    d.alreadyThisMonth > 0
                        ? '${money(d.alreadyThisMonth)} already this month'
                        : (line.include ? 'Last month' : 'Skipped'),
                    style: const TextStyle(fontSize: 12, color: PesaColors.ink3),
                  ),
                ],
              ),
            ),
            SizedBox(
              width: 104,
              child: TextField(
                controller: line.amount,
                enabled: line.include,
                textAlign: TextAlign.right,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: (_) => setState(() {}),
                style: PesaTextStyles.num(fontSize: 16, fontWeight: FontWeight.w600),
                decoration: const InputDecoration(
                  isDense: true,
                  prefixText: '₵ ',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
