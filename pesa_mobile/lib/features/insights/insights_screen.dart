import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/widgets/async_data_view.dart';
import '../../core/format.dart';
import '../../core/models/home_data.dart';
import '../../core/models/month_row.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/pesa_ring.dart';
import '../../core/widgets/screen_header.dart';
import '../home/bootstrap_provider.dart';

const _gold = Color(0xFFF1E1B8);
const _goldInk = Color(0xFF6E4F12);
const _goldDeep = Color(0xFF3D2A07);

/// Ports `components/pesa/screens/insights.tsx`. Everything here is derived
/// from bootstrap data (`months`, `buckets[].projection`, `netWorth`,
/// `avgEssentialsPerMonth`) — no extra network call.
class InsightsScreen extends ConsumerWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(bootstrapProvider);
    return AsyncDataView(
      value: bootstrap,
      onRefresh: () => ref.refresh(bootstrapProvider.future),
      builder: (data) => _InsightsBody(data: data),
    );
  }
}

/// The derived figures, computed exactly as the web screen does.
class _Stats {
  _Stats(HomeData data) {
    const empty = MonthRow(month: '', saved: 0, gave: 0, lived: 0, total: 0);
    final months = data.months;
    noData = months.every((m) => m.total == 0);
    final priorWithData = months
        .take(math.max(0, months.length - 1))
        .where((m) => m.saved > 0)
        .toList();
    avgSaved = priorWithData.isEmpty
        ? 0
        : (priorWithData.fold<int>(0, (s, m) => s + m.saved) / priorWithData.length).round();
    final curr = months.isNotEmpty ? months.last : empty;
    final prev = months.length >= 2 ? months[months.length - 2] : empty;
    currTotal = curr.total;
    savingsRate = curr.total > 0 ? (curr.saved / curr.total * 100).round() : 0;
    trendDelta = curr.saved - prev.saved;

    int clamp(num n) => n.round().clamp(0, 100);
    savingsScore = clamp(savingsRate);
    final emergencyBalance = data.buckets
        .where((b) => b.kind == 'emergency')
        .fold<int>(0, (s, b) => s + (b.projection?.lifetimeBalance ?? 0));
    cushionScore = clamp(
      data.avgEssentialsPerMonth > 0 ? emergencyBalance / data.avgEssentialsPerMonth / 6 * 100 : 0,
    );
    final debtBuckets = data.buckets.where((b) => b.kind == 'debt').toList();
    final remainingDebt = debtBuckets.fold<int>(
      0,
      (s, b) => s + math.max(0, b.target - (b.projection?.lifetimeBalance ?? 0)),
    );
    debtScore = debtBuckets.isEmpty
        ? 100
        : clamp(100 - remainingDebt / math.max(1, data.profile.salary) * 100);
    healthScore = clamp((savingsScore + cushionScore + debtScore) / 3);
  }

  late final bool noData;
  late final int avgSaved;
  late final int currTotal;
  late final int savingsRate;
  late final int trendDelta;
  late final int savingsScore;
  late final int cushionScore;
  late final int debtScore;
  late final int healthScore;
}

class _InsightsBody extends StatelessWidget {
  const _InsightsBody({required this.data});

  final HomeData data;

  @override
  Widget build(BuildContext context) {
    final currency = data.profile.currency;
    final stats = _Stats(data);
    final firstMonth = stats.currTotal == 0 && stats.noData;
    final flows = data.buckets.where((b) => b.allocated > 0).toList()
      ..sort((a, b) => b.allocated.compareTo(a.allocated));

    return ListView(
      key: const Key('insights-list'),
      padding: const EdgeInsets.only(bottom: 28),
      children: [
        firstMonth
            ? const ScreenHeader(eyebrow: 'Insights', title: 'Your', italic: 'first month.')
            : const ScreenHeader(eyebrow: 'Insights', title: "You're", italic: 'growing.'),
        if (firstMonth)
          _Padded(
            child: PesaCard(
              color: PesaColors.greenTint,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Disburse a transfer to start the chart.',
                    style: PesaTextStyles.serif(fontSize: 20, color: PesaColors.greenDeep),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Move some salary into a pot on Home. Insights, trends and the wrap fill in as the month unfolds.',
                    style: TextStyle(fontSize: 13, color: PesaColors.greenDeep),
                  ),
                ],
              ),
            ),
          ),
        _Padded(
          child: _RingCard(
            percent: stats.savingsRate,
            color: PesaColors.green,
            centerValue: '${stats.savingsRate}%',
            centerLabel: 'saved',
            title: "This month's savings rate",
            subtitle: Text.rich(
              TextSpan(
                style: const TextStyle(fontSize: 13, color: PesaColors.ink2),
                children: [
                  TextSpan(
                    text: stats.trendDelta >= 0
                        ? '↑ ${formatMoney(stats.trendDelta, currency)}'
                        : '↓ ${formatMoney(stats.trendDelta.abs(), currency)}',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: stats.trendDelta >= 0 ? PesaColors.greenDeep : PesaColors.clayDeep,
                    ),
                  ),
                  const TextSpan(text: ' vs. last month'),
                ],
              ),
            ),
          ),
        ),
        _Padded(
          child: _RingCard(
            percent: stats.healthScore,
            color: stats.healthScore >= 70
                ? PesaColors.green
                : stats.healthScore >= 40
                ? PesaColors.gold
                : PesaColors.clay,
            centerValue: '${stats.healthScore}',
            centerLabel: 'health',
            title: 'Financial health',
            subtitle: Text(
              'Savings ${stats.savingsScore} · Cushion ${stats.cushionScore} · Debt ${stats.debtScore}',
              style: const TextStyle(fontSize: 13, color: PesaColors.ink2),
            ),
          ),
        ),
        _Padded(
          top: 20,
          child: _FlowChart(months: data.months, noData: stats.noData),
        ),
        _Padded(
          top: 20,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Where it went', style: PesaTextStyles.serif(fontSize: 22)),
              const SizedBox(height: 10),
              PesaCard(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: flows.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Center(child: Text('No disbursements yet this month.')),
                      )
                    : Column(
                        children: [
                          for (final b in flows.take(6))
                            _FlowRow(
                              name: b.name,
                              color: b.color,
                              fraction: math.max(0.08, b.allocated / flows.first.allocated),
                              amount: formatMoney(b.allocated, currency),
                            ),
                        ],
                      ),
              ),
            ],
          ),
        ),
        _Padded(
          top: 20,
          child: _NetWorthCard(data: data, avgSaved: stats.avgSaved),
        ),
        _Padded(
          top: 12,
          child: PesaCard(
            padding: EdgeInsets.zero,
            child: ListTile(
              leading: const Icon(LucideIcons.history, size: 18),
              title: const Text('Past months', style: TextStyle(fontWeight: FontWeight.w600)),
              subtitle: const Text('Every month, one tap deep'),
              trailing: const Icon(LucideIcons.chevronRight, size: 14),
              onTap: () => context.push('/months'),
            ),
          ),
        ),
      ],
    );
  }
}

class _Padded extends StatelessWidget {
  const _Padded({required this.child, this.top = 16});

  final Widget child;
  final double top;

  @override
  Widget build(BuildContext context) =>
      Padding(padding: EdgeInsets.fromLTRB(20, top, 20, 0), child: child);
}

class _RingCard extends StatelessWidget {
  const _RingCard({
    required this.percent,
    required this.color,
    required this.centerValue,
    required this.centerLabel,
    required this.title,
    required this.subtitle,
  });

  final int percent;
  final Color color;
  final String centerValue;
  final String centerLabel;
  final String title;
  final Widget subtitle;

  @override
  Widget build(BuildContext context) {
    return PesaCard(
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          PesaRing(
            percent: percent,
            color: color,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  centerValue,
                  style: PesaTextStyles.num(fontSize: 20, fontWeight: FontWeight.w600),
                ),
                Text(centerLabel, style: const TextStyle(fontSize: 11, color: PesaColors.ink3)),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: PesaTextStyles.serif(fontSize: 18)),
                const SizedBox(height: 6),
                subtitle,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FlowChart extends StatefulWidget {
  const _FlowChart({required this.months, required this.noData});

  final List<MonthRow> months;
  final bool noData;

  @override
  State<_FlowChart> createState() => _FlowChartState();
}

class _FlowChartState extends State<_FlowChart> {
  bool _savedOnly = false;

  @override
  Widget build(BuildContext context) {
    final months = widget.months;
    final max = math.max(
      1,
      months.fold<int>(0, (m, r) => math.max(m, _savedOnly ? r.saved : r.total)),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('6-month flow', style: PesaTextStyles.serif(fontSize: 22)),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: true, label: Text('Saved')),
                ButtonSegment(value: false, label: Text('All')),
              ],
              selected: {_savedOnly},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _savedOnly = s.first),
              style: SegmentedButton.styleFrom(
                visualDensity: VisualDensity.compact,
                textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        PesaCard(
          child: Column(
            children: [
              if (widget.noData)
                const Padding(
                  padding: EdgeInsets.fromLTRB(4, 4, 4, 12),
                  child: Text(
                    'Disburse a few transfers to see your trends.',
                    textAlign: TextAlign.center,
                  ),
                ),
              SizedBox(
                height: 130,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    for (var i = 0; i < months.length; i++)
                      Expanded(
                        child: _Bar(
                          row: months[i],
                          max: max,
                          savedOnly: _savedOnly,
                          isCurrent: i == months.length - 1,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Row(
                children: [
                  _Legend(color: PesaColors.green, label: 'Saved'),
                  SizedBox(width: 12),
                  _Legend(color: PesaColors.gold, label: 'Gave'),
                  SizedBox(width: 12),
                  _Legend(color: PesaColors.claySoft, label: 'Lived'),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({
    required this.row,
    required this.max,
    required this.savedOnly,
    required this.isCurrent,
  });

  final MonthRow row;
  final int max;
  final bool savedOnly;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    final opacity = isCurrent ? 1.0 : 0.7;
    Widget segment(int value, Color color, BorderRadius radius) => Flexible(
      flex: value,
      child: Container(
        decoration: BoxDecoration(
          color: color.withValues(alpha: opacity),
          borderRadius: radius,
        ),
      ),
    );

    // Each segment's flex is its value; an invisible spacer on top takes
    // the rest of `max`, so every bar shares a baseline. Values are clamped
    // at zero since transfer halves can make a month's kind total negative.
    final saved = math.max(0, row.saved);
    final gave = savedOnly ? 0 : math.max(0, row.gave);
    final lived = savedOnly ? 0 : math.max(0, row.lived);
    final rest = math.max(0, max - saved - gave - lived);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 5),
      child: Column(
        children: [
          Expanded(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 32),
                child: Column(
                  children: [
                    if (rest > 0 || saved + gave + lived == 0) Spacer(flex: math.max(1, rest)),
                    if (lived > 0)
                      segment(
                        lived,
                        PesaColors.claySoft,
                        const BorderRadius.vertical(top: Radius.circular(4)),
                      ),
                    if (gave > 0) segment(gave, PesaColors.gold, BorderRadius.zero),
                    if (saved > 0)
                      segment(
                        saved,
                        PesaColors.green,
                        savedOnly
                            ? BorderRadius.circular(4)
                            : const BorderRadius.vertical(bottom: Radius.circular(4)),
                      ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            row.month,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
              color: isCurrent ? PesaColors.ink : PesaColors.ink3,
            ),
          ),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: PesaColors.ink3)),
      ],
    );
  }
}

/// `.flow-bar.{color}` gradients from `app/globals.css`.
(Color, Color) _flowGradient(String color) {
  switch (color) {
    case 'clay':
      return (PesaColors.claySoft, PesaColors.clay);
    case 'gold':
      return (_gold, PesaColors.gold);
    case 'rose':
      return (const Color(0xFFF4D8CE), PesaColors.rose);
    case 'sage':
      return (PesaColors.greenTint, PesaColors.greenSoft);
    default:
      return (PesaColors.greenSoft, PesaColors.green);
  }
}

class _FlowRow extends StatelessWidget {
  const _FlowRow({
    required this.name,
    required this.color,
    required this.fraction,
    required this.amount,
  });

  final String name;
  final String color;
  final double fraction;
  final String amount;

  @override
  Widget build(BuildContext context) {
    final (start, end) = _flowGradient(color);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 92,
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(color: end, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    name,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Align(
              alignment: Alignment.centerLeft,
              child: FractionallySizedBox(
                widthFactor: fraction.clamp(0, 1).toDouble(),
                child: Container(
                  height: 18,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6),
                    gradient: LinearGradient(colors: [start, end]),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(amount, style: PesaTextStyles.num(fontSize: 12, color: PesaColors.ink2)),
        ],
      ),
    );
  }
}

class _NetWorthCard extends StatelessWidget {
  const _NetWorthCard({required this.data, required this.avgSaved});

  final HomeData data;
  final int avgSaved;

  @override
  Widget build(BuildContext context) {
    final currency = data.profile.currency;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PesaRadius.lg),
        boxShadow: PesaShadows.sm,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [PesaColors.bgCard, _gold],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ESTIMATED NET WORTH', style: PesaTextStyles.eyebrow(color: _goldInk)),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(currency, style: PesaTextStyles.serif(fontSize: 14, color: _goldInk)),
              const SizedBox(width: 6),
              Text(
                NumberFormat.decimalPattern().format(data.netWorth),
                style: PesaTextStyles.serif(fontSize: 38, color: _goldDeep),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            avgSaved > 0
                ? '↑ ${formatMoney(avgSaved, currency)}/mo on average'
                : 'Build up savings to see a trend.',
            style: const TextStyle(fontSize: 13, color: _goldInk),
          ),
        ],
      ),
    );
  }
}
