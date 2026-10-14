import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/format.dart';
import '../../core/models/home_data.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pesa_card.dart';

const _savingsKinds = {'future', 'emergency', 'debt'};
const _goldInk = Color(0xFF6E4F12);
const _goldDeep = Color(0xFF3D2A07);

Color _dot(String color) => switch (color) {
  'clay' => PesaColors.clay,
  'gold' => PesaColors.gold,
  'rose' => PesaColors.rose,
  'sage' => PesaColors.greenSoft,
  _ => PesaColors.green,
};

/// Ports the web's NetWorthDetailSheet (net-worth-detail.tsx): the estimate,
/// money saved per month, and each savings pot's share of the total.
Future<void> showNetWorthSheet(BuildContext context, HomeData data, int avgSaved) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: PesaColors.bgApp,
    builder: (_) => FractionallySizedBox(
      heightFactor: 0.9,
      child: _NetWorth(data: data, avgSaved: avgSaved),
    ),
  );
}

class _NetWorth extends StatelessWidget {
  const _NetWorth({required this.data, required this.avgSaved});

  final HomeData data;
  final int avgSaved;

  @override
  Widget build(BuildContext context) {
    final currency = data.profile.currency;
    final contributors =
        data.buckets
            .where((b) => _savingsKinds.contains(b.kind))
            .map((b) => (bucket: b, balance: b.projection?.lifetimeBalance ?? 0))
            .where((c) => c.balance != 0)
            .toList()
          ..sort((a, b) => b.balance.compareTo(a.balance));
    final totalContributed = contributors.fold<int>(0, (s, c) => s + c.balance);
    final months = data.months;
    final monthMax = math.max(1, months.fold<int>(0, (m, r) => math.max(m, r.saved)));

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        Center(child: Text('Net worth', style: PesaTextStyles.serif(fontSize: 22))),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PesaRadius.lg),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [PesaColors.bgCard, Color(0xFFF1E1B8)],
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
        ),
        const SizedBox(height: 20),
        Text('What comes in each month', style: PesaTextStyles.serif(fontSize: 20)),
        const SizedBox(height: 4),
        const Text(
          'Money that landed in a Future, Emergency or Debt pot, by month.',
          style: TextStyle(fontSize: 13, color: PesaColors.ink2),
        ),
        const SizedBox(height: 10),
        PesaCard(
          child: months.every((m) => m.saved == 0)
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Center(child: Text('Nothing saved into these pots yet.')),
                )
              : SizedBox(
                  height: 150,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      for (var i = 0; i < months.length; i++)
                        Expanded(
                          child: Column(
                            children: [
                              Expanded(
                                child: Align(
                                  alignment: Alignment.bottomCenter,
                                  child: FractionallySizedBox(
                                    heightFactor: math.max(0, months[i].saved) / monthMax,
                                    widthFactor: 0.6,
                                    child: DecoratedBox(
                                      decoration: BoxDecoration(
                                        color: PesaColors.green.withValues(
                                          alpha: i == months.length - 1 ? 1 : 0.7,
                                        ),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                months[i].month,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: i == months.length - 1
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  color: i == months.length - 1 ? PesaColors.ink : PesaColors.ink3,
                                ),
                              ),
                              FittedBox(
                                child: Text(
                                  formatMoney(months[i].saved, currency),
                                  style: PesaTextStyles.num(fontSize: 9, color: PesaColors.ink3),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
        ),
        const SizedBox(height: 20),
        Text("What's contributing", style: PesaTextStyles.serif(fontSize: 20)),
        const SizedBox(height: 4),
        const Text(
          "Every savings pot's all-time balance.",
          style: TextStyle(fontSize: 13, color: PesaColors.ink2),
        ),
        const SizedBox(height: 10),
        PesaCard(
          child: contributors.isEmpty
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Center(child: Text('No savings pots with a balance yet.')),
                )
              : Column(
                  children: [
                    for (final c in contributors)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: _dot(c.bucket.color),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              width: 96,
                              child: Text(
                                c.bucket.name,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ),
                            Expanded(
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: FractionallySizedBox(
                                  widthFactor: totalContributed > 0
                                      ? math.max(0.06, c.balance / totalContributed)
                                      : 0.06,
                                  child: Container(
                                    height: 14,
                                    decoration: BoxDecoration(
                                      color: _dot(c.bucket.color),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              totalContributed > 0
                                  ? '${(c.balance / totalContributed * 100).round()}%'
                                  : '',
                              style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              formatMoney(c.balance, currency),
                              style: PesaTextStyles.num(fontSize: 12, color: PesaColors.ink2),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
        ),
      ],
    );
  }
}
