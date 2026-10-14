import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/format.dart';
import '../../../core/theme/pesa_colors.dart';
import '../../../core/theme/pesa_metrics.dart';
import '../../../core/theme/pesa_theme.dart';
import '../../../core/widgets/decor_rings.dart';

/// Ports the web Home hero (`components/pesa/screens/home.tsx`): "left to
/// disburse" (salary minus what's already been sent to pots this month) with
/// a counting number, clay progress bar, the "Send to a pot" CTA beside a
/// round shortcut to the Wrap, and "Replay last month".
class DisburseHeroCard extends StatelessWidget {
  const DisburseHeroCard({
    super.key,
    required this.currency,
    required this.salary,
    required this.disbursed,
    required this.filledPotCount,
    required this.totalPotCount,
    required this.paydayTemplateSize,
    required this.onSendToPot,
    required this.onOpenWrap,
    required this.onReplayLastMonth,
  });

  final String currency;
  final int salary;
  final int disbursed;
  final int filledPotCount;
  final int totalPotCount;
  final int paydayTemplateSize;
  final VoidCallback onSendToPot;
  final VoidCallback onOpenWrap;
  final VoidCallback onReplayLastMonth;

  @override
  Widget build(BuildContext context) {
    final leftToDisburse = (salary - disbursed).clamp(0, salary);
    final progress = salary > 0 ? (disbursed / salary).clamp(0, 1).toDouble() : 0.0;
    final translucent = PesaColors.bgApp.withValues(alpha: 0.1);

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PesaRadius.lg),
        boxShadow: PesaShadows.base,
        gradient: const LinearGradient(
          begin: Alignment(-0.4, -1),
          end: Alignment(0.4, 1),
          colors: [PesaColors.greenDeep, PesaColors.green, PesaColors.greenHeroEnd],
          stops: [0, 0.7, 1],
        ),
      ),
      child: Stack(
        children: [
          const Positioned(right: -40, top: -50, child: DecorRings(color: PesaColors.greenSoft)),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: PesaColors.greenSoft,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'LEFT TO DISBURSE',
                      style: PesaTextStyles.eyebrow(color: PesaColors.greenTint),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      currency,
                      style: PesaTextStyles.serif(fontSize: 18, color: PesaColors.greenTint),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: _Counter(
                          value: leftToDisburse,
                          style: PesaTextStyles.serif(fontSize: 64, color: PesaColors.bgApp),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                ClipRRect(
                  borderRadius: BorderRadius.circular(PesaRadius.pill),
                  child: SizedBox(
                    height: 6,
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: ColoredBox(color: PesaColors.greenSoft.withValues(alpha: 0.25)),
                        ),
                        TweenAnimationBuilder<double>(
                          tween: Tween(end: progress),
                          duration: const Duration(milliseconds: 600),
                          curve: Curves.easeOutCubic,
                          builder: (context, value, _) => FractionallySizedBox(
                            widthFactor: value,
                            heightFactor: 1,
                            child: const DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [PesaColors.claySoft, PesaColors.clay],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Text.rich(
                        TextSpan(
                          style: const TextStyle(fontSize: 12, color: PesaColors.greenTint),
                          children: [
                            TextSpan(
                              text: formatMoney(disbursed, currency),
                              style: PesaTextStyles.num(
                                fontSize: 12,
                                color: PesaColors.bgApp,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            TextSpan(text: ' sent of ${formatMoney(salary, currency)}'),
                          ],
                        ),
                      ),
                    ),
                    Text(
                      '$filledPotCount/$totalPotCount pots full',
                      style: const TextStyle(fontSize: 12, color: PesaColors.greenTint),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: onSendToPot,
                        icon: const Icon(LucideIcons.send, size: 16),
                        label: const Text('Send to a pot'),
                        style: FilledButton.styleFrom(
                          backgroundColor: PesaColors.clay,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                          shape: const StadiumBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 48,
                      height: 48,
                      child: IconButton(
                        tooltip: 'Monthly wrap',
                        onPressed: onOpenWrap,
                        icon: const Icon(LucideIcons.sparkles, size: 18),
                        style: IconButton.styleFrom(
                          backgroundColor: translucent,
                          foregroundColor: PesaColors.bgApp,
                          shape: CircleBorder(
                            side: BorderSide(color: PesaColors.bgApp.withValues(alpha: 0.2)),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Center(
                  child: TextButton.icon(
                    onPressed: onReplayLastMonth,
                    icon: const Icon(LucideIcons.history, size: 13),
                    label: Text(
                      paydayTemplateSize > 0
                          ? 'Replay last month · $paydayTemplateSize pot${paydayTemplateSize == 1 ? '' : 's'}'
                          : 'Replay last month',
                    ),
                    style: TextButton.styleFrom(
                      foregroundColor: PesaColors.greenTint,
                      textStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The web's `Counter`: eases from the previous value to the new one.
class _Counter extends StatelessWidget {
  const _Counter({required this.value, required this.style});

  final int value;
  final TextStyle style;

  static final _format = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(end: value.toDouble()),
      duration: const Duration(milliseconds: 700),
      curve: Curves.easeOutCubic,
      builder: (context, v, _) => Text(_format.format(v.round()), style: style),
    );
  }
}
