import 'package:flutter/material.dart';

import '../theme/pesa_colors.dart';
import '../theme/pesa_metrics.dart';

/// Ports the web app's `.card` class: `bg-card`, 28px radius, soft shadow.
class PesaCard extends StatelessWidget {
  const PesaCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color,
    this.withShadow = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final bool withShadow;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? PesaColors.bgCard,
        borderRadius: BorderRadius.circular(PesaRadius.lg),
        boxShadow: withShadow ? PesaShadows.sm : null,
      ),
      child: child,
    );
  }
}

/// Ports the web app's `.card-line` class: `bg-card` with a 1px line border
/// instead of a shadow, 18px radius.
class PesaCardLine extends StatelessWidget {
  const PesaCardLine({super.key, required this.child, this.padding = const EdgeInsets.all(16)});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: PesaColors.bgCard,
        borderRadius: BorderRadius.circular(PesaRadius.base),
        border: Border.all(color: PesaColors.line),
      ),
      child: child,
    );
  }
}
