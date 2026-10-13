import 'package:flutter/material.dart';

import '../theme/pesa_colors.dart';

/// Ports the web app's `.row-icon.{color}` chip: a rounded-square icon
/// swatch whose background/foreground pair depends on the bucket's
/// `BucketColor` (clay/green/gold/rose/sage).
class RowIconChip extends StatelessWidget {
  const RowIconChip({super.key, required this.color, required this.icon, this.size = 40});

  final String color;
  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = PesaColors.chipColors(color);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(size * 0.3)),
      child: Icon(icon, color: fg, size: size * 0.5),
    );
  }
}
