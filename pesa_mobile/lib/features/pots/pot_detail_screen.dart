import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/bucket.dart';
import '../../core/models/transaction.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/async_data_view.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/pot_painter.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../home/bootstrap_provider.dart';
import 'disburse_flow.dart';
import 'pot_quick_actions.dart';
import 'pot_editor_sheet.dart';

/// Ports components/pesa/screens/bucket-detail.tsx: the pot's fill, its
/// due/projection badges, savings/debt/cushion cards, In/Spent/Left, the
/// Top up / Spend / Move actions and this month's entries.
class PotDetailScreen extends ConsumerWidget {
  const PotDetailScreen({super.key, required this.bucketId});

  final String bucketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: AsyncDataView(
          value: ref.watch(bootstrapProvider),
          onRefresh: () => ref.refresh(bootstrapProvider.future),
          builder: (data) {
            final bucket = data.buckets.where((b) => b.id == bucketId).firstOrNull;
            if (bucket == null) return const _PotGone();
            final now = DateTime.now();
            final monthStart = DateTime(now.year, now.month);
            final ledger = data.ledger
                .where(
                  (t) =>
                      t.bucketId == bucketId &&
                      !DateTime.parse(t.occurredAt).toLocal().isBefore(monthStart),
                )
                .toList();
            return _PotDetailBody(
              bucket: bucket,
              allBuckets: data.buckets,
              ledger: ledger,
              currency: data.profile.currency,
              avgEssentialsPerMonth: data.avgEssentialsPerMonth,
            );
          },
        ),
      ),
    );
  }
}

class _PotGone extends StatelessWidget {
  const _PotGone();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('This pot is no longer here — it may have been archived.'),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.of(context).maybePop(),
              child: const Text('Back'),
            ),
          ],
        ),
      ),
    );
  }
}

enum _Tone { ok, warn, muted }

class _PotDetailBody extends StatelessWidget {
  const _PotDetailBody({
    required this.bucket,
    required this.allBuckets,
    required this.ledger,
    required this.currency,
    required this.avgEssentialsPerMonth,
  });

  final Bucket bucket;
  final List<Bucket> allBuckets;
  final List<PesaTransaction> ledger;
  final String currency;
  final int avgEssentialsPerMonth;

  String money(int v) => formatMoney(v, currency);

  (String, _Tone)? get _dueBadge {
    final due = bucket.dueDayOfMonth;
    if (bucket.kind != 'bills' || due == null) return null;
    if (bucket.allocated >= bucket.target) return ('Paid · was due day $due', _Tone.ok);
    final diff = due - DateTime.now().day;
    if (diff < 0) return ('Overdue by ${-diff}d', _Tone.warn);
    if (diff == 0) return ('Due today', _Tone.warn);
    if (diff <= 3) return ('Due in ${diff}d', _Tone.warn);
    return ('Due day $due', _Tone.muted);
  }

  bool get _isDebt => bucket.kind == 'debt';

  (String, _Tone)? get _projectionBadge {
    if (bucket.kind != 'future' && bucket.kind != 'emergency' && !_isDebt) return null;
    final p = bucket.projection;
    if (p == null) return null;
    if (p.goalReached) return (_isDebt ? 'Paid off' : 'Goal reached', _Tone.ok);
    if (p.etaIso != null && p.monthsToGoal != null) {
      final month = DateFormat('MMM y').format(DateTime.parse(p.etaIso!).toLocal());
      return (
        '${money(p.avgPerMonth)}/mo · ${_isDebt ? 'payoff by' : 'hit by'} $month',
        _Tone.muted,
      );
    }
    if (p.avgPerMonth > 0) return ('${money(p.avgPerMonth)}/mo', _Tone.muted);
    return (_isDebt ? 'No payments in 3 mo' : 'No deposits in 3 mo', _Tone.warn);
  }

  @override
  Widget build(BuildContext context) {
    final pct = bucket.target > 0 ? bucket.allocated / bucket.target : 0.0;
    final remaining = (bucket.target - bucket.allocated).clamp(0, 1 << 31);
    final left = (bucket.allocated - bucket.spent).clamp(0, 1 << 31);
    final projection = bucket.projection;
    final due = _dueBadge;
    final proj = _projectionBadge;

    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 28),
      children: [
        Row(
          children: [
            IconButton(
              tooltip: 'Back',
              onPressed: () => Navigator.of(context).maybePop(),
              icon: const Icon(LucideIcons.arrowLeft, size: 20),
            ),
            Expanded(
              child: Wrap(
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 4,
                children: [
                  Text(
                    'POT · ${bucket.kind.toUpperCase()}',
                    style: PesaTextStyles.eyebrow(color: PesaColors.ink3),
                  ),
                  if (due != null) _Badge(text: due.$1, tone: due.$2),
                  if (proj != null) _Badge(text: proj.$1, tone: proj.$2),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Edit pot',
              onPressed: () => showPotEditorSheet(context, bucket: bucket),
              icon: const Icon(LucideIcons.ellipsis, size: 20),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Column(
            children: [
              const SizedBox(height: 4),
              SizedBox(
                width: 150,
                height: 150,
                child: CustomPaint(
                  painter: PotPainter(
                    t: 1,
                    center: const Offset(75, 78),
                    unit: 4.6,
                    fromFill: pct.clamp(0.0, 1.0),
                    toFill: pct.clamp(0.0, 1.0),
                    sparkles: false,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                bucket.name,
                textAlign: TextAlign.center,
                style: PesaTextStyles.serif(fontSize: 36),
              ),
              const SizedBox(height: 2),
              Text.rich(
                TextSpan(
                  style: const TextStyle(fontSize: 13, color: PesaColors.ink3),
                  children: [
                    TextSpan(
                      text: money(bucket.allocated),
                      style: const TextStyle(color: PesaColors.ink, fontWeight: FontWeight.w600),
                    ),
                    TextSpan(text: ' of ${money(bucket.target)} · ${(pct * 100).round()}%'),
                  ],
                ),
              ),
              if ((bucket.kind == 'future' || bucket.kind == 'emergency') &&
                  projection != null &&
                  projection.lifetimeBalance > 0)
                _InfoCard(
                  icon: LucideIcons.piggyBank,
                  tint: true,
                  children: [
                    TextSpan(
                      text: money(projection.lifetimeBalance),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const TextSpan(text: ' saved over all months'),
                    if (bucket.target > 0 && !projection.goalReached)
                      TextSpan(
                        text:
                            ' · ${money((bucket.target - projection.lifetimeBalance).clamp(0, 1 << 31))} to goal',
                      ),
                    const TextSpan(text: '.'),
                  ],
                ),
              if (_isDebt && projection != null)
                _InfoCard(
                  icon: LucideIcons.wallet,
                  tint: true,
                  children: [
                    TextSpan(
                      text: money(projection.lifetimeBalance),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    TextSpan(text: ' paid of ${money(bucket.target)}'),
                    if (!projection.goalReached)
                      TextSpan(
                        text:
                            ' · ${money((bucket.target - projection.lifetimeBalance).clamp(0, 1 << 31))} still owed',
                      ),
                    const TextSpan(text: '.'),
                  ],
                ),
              if (bucket.kind == 'emergency' && projection != null)
                _InfoCard(
                  icon: LucideIcons.shield,
                  children: avgEssentialsPerMonth <= 0
                      ? const [
                          TextSpan(text: 'Log a few months of essentials to size this cushion.'),
                        ]
                      : [
                          TextSpan(
                            text:
                                '${(projection.lifetimeBalance / avgEssentialsPerMonth).toStringAsFixed(1)} months',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const TextSpan(text: ' of essentials covered '),
                          TextSpan(
                            text: '· ${money(avgEssentialsPerMonth)}/mo burn',
                            style: const TextStyle(color: PesaColors.ink3),
                          ),
                        ],
                ),
              if (bucket.spent > 0) ...[
                const SizedBox(height: 14),
                Row(
                  children: [
                    _StatCell(label: 'In', value: money(bucket.allocated), color: PesaColors.ink),
                    const SizedBox(width: 8),
                    _StatCell(
                      label: 'Spent',
                      value: money(bucket.spent),
                      color: PesaColors.clayDeep,
                    ),
                    const SizedBox(width: 8),
                    _StatCell(label: 'Left', value: money(left), color: PesaColors.greenDeep),
                  ],
                ),
              ],
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _ActionButton(
                      label: _isDebt ? 'Make a payment' : 'Top up',
                      icon: LucideIcons.send,
                      bg: PesaColors.green,
                      fg: PesaColors.bgApp,
                      onPressed: () => showDisburseFlow(context, bucket: bucket),
                    ),
                  ),
                  if (!_isDebt) ...[
                    const SizedBox(width: 8),
                    Expanded(
                      child: _ActionButton(
                        label: 'Spend',
                        icon: LucideIcons.minus,
                        bg: PesaColors.clay,
                        fg: PesaColors.bgApp,
                        onPressed: left <= 0 ? null : () => runPotSpend(context, bucket),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _ActionButton(
                        label: 'Move',
                        icon: LucideIcons.arrowLeftRight,
                        bg: PesaColors.greenTint,
                        fg: PesaColors.greenDeep,
                        onPressed: left <= 0 || allBuckets.length < 2
                            ? null
                            : () => runPotTransfer(context, bucket, allBuckets),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 4),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () => showPotEditorSheet(context, bucket: bucket, focusTarget: true),
                  style: TextButton.styleFrom(foregroundColor: PesaColors.ink2),
                  icon: const Icon(LucideIcons.pencil, size: 14),
                  label: const Text('Adjust target'),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 14, 8, 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Expanded(child: Text('This month', style: PesaTextStyles.serif(fontSize: 22))),
              Text(
                '${ledger.length} entr${ledger.length == 1 ? 'y' : 'ies'}',
                style: const TextStyle(fontSize: 12, color: PesaColors.ink3),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: PesaCard(
            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
            child: ledger.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(18),
                    child: Center(child: Text('No activity yet for ${bucket.name}.')),
                  )
                : Column(
                    children: [
                      for (final t in ledger) _LedgerRow(txn: t, bucket: bucket, money: money),
                    ],
                  ),
          ),
        ),
        if (remaining > 0)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: _InfoCard(
              icon: LucideIcons.info,
              tint: true,
              children: [
                TextSpan(
                  text: money(remaining),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const TextSpan(text: ' still needed to fill this pot.'),
              ],
            ),
          ),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.text, required this.tone});

  final String text;
  final _Tone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      _Tone.warn => (PesaColors.claySoft, PesaColors.clayDeep),
      _Tone.ok => (PesaColors.greenTint, PesaColors.greenDeep),
      _Tone.muted => (PesaColors.ink.withValues(alpha: 0.06), PesaColors.ink2),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg, letterSpacing: 0.4),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.icon, required this.children, this.tint = false});

  final IconData icon;
  final List<InlineSpan> children;
  final bool tint;

  @override
  Widget build(BuildContext context) {
    final fg = tint ? PesaColors.greenDeep : PesaColors.ink;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: tint ? PesaColors.greenTint : PesaColors.bgElev,
        borderRadius: BorderRadius.circular(PesaRadius.base),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: fg),
          const SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(
                style: TextStyle(fontSize: 14, color: fg, height: 1.35),
                children: children,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: PesaCard(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
        child: Column(
          children: [
            Text(label.toUpperCase(), style: PesaTextStyles.eyebrow(color: PesaColors.ink3)),
            const SizedBox(height: 2),
            FittedBox(
              child: Text(
                value,
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: color),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.icon,
    required this.bg,
    required this.fg,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final Color bg;
  final Color fg;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: bg,
        foregroundColor: fg,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      ),
      icon: Icon(icon, size: 14),
      label: FittedBox(child: Text(label)),
    );
  }
}

class _LedgerRow extends StatelessWidget {
  const _LedgerRow({required this.txn, required this.bucket, required this.money});

  final PesaTransaction txn;
  final Bucket bucket;
  final String Function(int) money;

  @override
  Widget build(BuildContext context) {
    final outflow = txn.amount < 0;
    final icon = outflow
        ? (txn.transferId != null ? LucideIcons.arrowLeftRight : LucideIcons.minus)
        : pesaIconFor(bucket.icon);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      child: Row(
        children: [
          RowIconChip(color: bucket.color, icon: icon, size: 36),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  txn.note,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                Text(
                  '${formatTxnDate(txn.occurredAt)} · ${txn.method}',
                  style: const TextStyle(fontSize: 12, color: PesaColors.ink3),
                ),
              ],
            ),
          ),
          Text(
            '${outflow ? '−' : '+'}${money(txn.amount.abs())}',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: outflow ? PesaColors.clayDeep : PesaColors.ink,
            ),
          ),
        ],
      ),
    );
  }
}
