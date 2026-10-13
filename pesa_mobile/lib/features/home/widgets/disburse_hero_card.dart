import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/models/payday_draft.dart';
import '../../../core/theme/pesa_colors.dart';
import '../../../core/theme/pesa_metrics.dart';
import '../../../core/theme/pesa_theme.dart';
import '../../../core/widgets/pesa_button.dart';

/// Ports the web app's home-screen hero card: "left to disburse" (salary
/// minus what's already been sent to pots this month), with a progress bar
/// and the "Send to a pot" primary CTA.
class DisburseHeroCard extends StatelessWidget {
  const DisburseHeroCard({
    super.key,
    required this.currency,
    required this.salary,
    required this.disbursed,
    required this.filledPotCount,
    required this.totalPotCount,
    required this.paydayTemplate,
    required this.onSendToPot,
    required this.onReplayLastMonth,
  });

  final String currency;
  final int salary;
  final int disbursed;
  final int filledPotCount;
  final int totalPotCount;
  final List<PaydayDraft> paydayTemplate;
  final VoidCallback onSendToPot;
  final VoidCallback onReplayLastMonth;

  @override
  Widget build(BuildContext context) {
    final format = NumberFormat.decimalPattern();
    final leftToDisburse = (salary - disbursed).clamp(0, salary);
    final progress = salary > 0 ? (disbursed / salary).clamp(0, 1).toDouble() : 0.0;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 6),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PesaRadius.lg),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [PesaColors.greenDeep, PesaColors.green, PesaColors.greenHeroEnd],
          stops: [0, 0.7, 1],
        ),
      ),
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
              Text('LEFT TO DISBURSE', style: PesaTextStyles.eyebrow(color: PesaColors.greenTint)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                currency,
                style: PesaTextStyles.serif(fontSize: 18, color: PesaColors.greenTint),
              ),
              Text(
                format.format(leftToDisburse),
                style: PesaTextStyles.serif(fontSize: 64, color: PesaColors.bgApp),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(PesaRadius.pill),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: PesaColors.greenSoft.withValues(alpha: 0.25),
              valueColor: const AlwaysStoppedAnimation(PesaColors.clay),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text.rich(
                TextSpan(
                  style: TextStyle(fontSize: 12, color: PesaColors.greenTint),
                  children: [
                    TextSpan(text: '$currency${format.format(disbursed)}', style: PesaTextStyles.num(fontSize: 12, color: PesaColors.bgApp, fontWeight: FontWeight.w600)),
                    const TextSpan(text: ' sent of '),
                    TextSpan(text: '$currency${format.format(salary)}', style: PesaTextStyles.num(fontSize: 12, color: PesaColors.bgApp, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              Text(
                '$filledPotCount/$totalPotCount pots full',
                style: const TextStyle(fontSize: 12, color: PesaColors.greenTint),
              ),
            ],
          ),
          const SizedBox(height: 16),
          PesaButton(
            label: 'Send to a pot',
            variant: PesaButtonVariant.clay,
            expand: true,
            onPressed: onSendToPot,
          ),
          if (paydayTemplate.isNotEmpty) ...[
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: onReplayLastMonth,
                style: TextButton.styleFrom(foregroundColor: PesaColors.greenTint),
                child: Text('Replay last month · ${paydayTemplate.length} pots'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
