import 'package:flutter/material.dart';

import '../theme/pesa_colors.dart';
import '../theme/pesa_theme.dart';

/// Ports the web app's `MiniStat` (`components/pesa/ui.tsx`): a small tinted
/// tile with an uppercase label over a mono value. [tint] is `green`,
/// `clay` or `gold` — same pairs as the pot color chips.
class MiniStat extends StatelessWidget {
  const MiniStat({super.key, required this.label, required this.value, required this.tint});

  final String label;
  final String value;
  final String tint;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = PesaColors.chipColors(tint);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
              color: fg.withValues(alpha: 0.75),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: PesaTextStyles.num(fontSize: 16, fontWeight: FontWeight.w600, color: fg),
          ),
        ],
      ),
    );
  }
}
