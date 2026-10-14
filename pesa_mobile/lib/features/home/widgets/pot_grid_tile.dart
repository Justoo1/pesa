import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/models/bucket.dart';
import '../../../core/theme/pesa_colors.dart';
import '../../../core/theme/pesa_icons.dart';
import '../../../core/theme/pesa_metrics.dart';
import '../../../core/theme/pesa_theme.dart';
import '../../../core/widgets/row_icon_chip.dart';

/// Ports the web app's `BucketCard` grid tile: icon chip, a "Full" pill once
/// the pot has hit its target, name, allocated/target, and a thin progress
/// bar — laid out 2-per-row in a `GridView` on the Home tab.
class PotGridTile extends StatelessWidget {
  const PotGridTile({super.key, required this.bucket, required this.currency, this.onTap});

  final Bucket bucket;
  final String currency;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final format = NumberFormat.decimalPattern();
    String money(int v) => '$currency${format.format(v)}';
    // Same rules as the web's BucketCard: "Full" only while nothing has been
    // spent; once there's spending, show what's left of the allocation and
    // overlay the spent share on the bar.
    final isFull = bucket.allocated >= bucket.target && bucket.spent == 0;
    final hasSpend = bucket.spent > 0;
    final left = (bucket.allocated - bucket.spent).clamp(0, bucket.allocated);
    double share(int v) => bucket.target > 0 ? (v / bucket.target).clamp(0, 1).toDouble() : 0.0;
    final faded = PesaTextStyles.num(fontSize: 12, color: PesaColors.ink3.withValues(alpha: 0.5));

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PesaRadius.lg),
        boxShadow: PesaShadows.sm,
      ),
      child: Material(
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
                    RowIconChip(color: bucket.color, icon: pesaIconFor(bucket.icon), size: 32),
                    if (isFull)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: PesaColors.greenTint,
                          borderRadius: BorderRadius.circular(PesaRadius.pill),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.check, size: 11, color: PesaColors.greenDeep),
                            SizedBox(width: 3),
                            Text(
                              'Full',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: PesaColors.greenDeep,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const Spacer(),
                Text(
                  bucket.name,
                  style: PesaTextStyles.serif(fontSize: 20),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text.rich(
                  TextSpan(
                    style: PesaTextStyles.num(fontSize: 12, color: PesaColors.ink3),
                    children: hasSpend
                        ? [
                            TextSpan(text: '${money(left)} left '),
                            TextSpan(text: 'of ${money(bucket.allocated)}', style: faded),
                          ]
                        : [
                            TextSpan(text: '${money(bucket.allocated)} '),
                            TextSpan(text: '/ ${money(bucket.target)}', style: faded),
                          ],
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(PesaRadius.pill),
                  child: SizedBox(
                    height: 6,
                    child: Stack(
                      children: [
                        const Positioned.fill(child: ColoredBox(color: PesaColors.line)),
                        FractionallySizedBox(
                          widthFactor: share(bucket.allocated),
                          heightFactor: 1,
                          child: ColoredBox(color: isFull ? PesaColors.green : PesaColors.clay),
                        ),
                        if (hasSpend)
                          FractionallySizedBox(
                            widthFactor: share(bucket.spent),
                            heightFactor: 1,
                            child: const ColoredBox(color: Color(0x2E211A12)),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
