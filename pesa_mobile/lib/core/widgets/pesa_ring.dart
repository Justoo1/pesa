import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Ports the web app's `Ring` (`components/pesa/ui.tsx`): a circular
/// progress arc with round caps over a faint track, with [child] centered
/// inside it.
class PesaRing extends StatelessWidget {
  const PesaRing({
    super.key,
    required this.percent,
    required this.color,
    this.size = 80,
    this.stroke = 10,
    this.child,
  });

  /// 0–100.
  final num percent;
  final Color color;
  final double size;
  final double stroke;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RingPainter(
          fraction: (percent / 100).clamp(0, 1).toDouble(),
          color: color,
          stroke: stroke,
        ),
        child: Center(child: child),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.fraction, required this.color, required this.stroke});

  final double fraction;
  final Color color;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final arcRect = rect.deflate(stroke / 2);
    final base = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    canvas.drawArc(arcRect, 0, 2 * math.pi, false, base..color = const Color(0x14211A12));
    if (fraction <= 0) return;
    canvas.drawArc(
      arcRect,
      -math.pi / 2,
      2 * math.pi * fraction,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.fraction != fraction || old.color != color || old.stroke != stroke;
}
