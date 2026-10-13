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
    final isFull = bucket.target > 0 && bucket.allocated >= bucket.target;
    final progress = bucket.target > 0
        ? (bucket.allocated / bucket.target).clamp(0, 1).toDouble()
        : 0.0;

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
                    RowIconChip(color: bucket.color, icon: pesaIconFor(bucket.icon), size: 36),
                    if (isFull)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: PesaColors.greenTint,
                          borderRadius: BorderRadius.circular(PesaRadius.pill),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(LucideIcons.check, size: 11, color: PesaColors.greenDeep),
                            const SizedBox(width: 3),
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
                const SizedBox(height: 10),
                Text(
                  bucket.name,
                  style: Theme.of(context).textTheme.titleMedium,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '$currency${format.format(bucket.allocated)} / $currency${format.format(bucket.target)}',
                  style: PesaTextStyles.num(fontSize: 12, color: PesaColors.ink3),
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(PesaRadius.pill),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 4,
                    backgroundColor: PesaColors.line,
                    valueColor: const AlwaysStoppedAnimation(PesaColors.green),
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
