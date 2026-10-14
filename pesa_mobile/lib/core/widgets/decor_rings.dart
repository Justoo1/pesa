import 'package:flutter/material.dart';

/// The concentric-circles decoration the web draws in the corner of its hero
/// cards (bank balance, wrap): two outlined rings around a filled dot.
class DecorRings extends StatelessWidget {
  const DecorRings({
    super.key,
    required this.color,
    this.size = 180,
    this.opacity = 0.18,
    this.dotOpacity = 0.6,
  });

  final Color color;
  final double size;
  final double opacity;
  final double dotOpacity;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: opacity,
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _RingsPainter(color: color, dotOpacity: dotOpacity),
        ),
      ),
    );
  }
}

class _RingsPainter extends CustomPainter {
  _RingsPainter({required this.color, required this.dotOpacity});

  final Color color;
  final double dotOpacity;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    canvas.drawCircle(center, r * 0.89, stroke);
    canvas.drawCircle(center, r * 0.62, stroke);
    canvas.drawCircle(center, r * 0.36, Paint()..color = color.withValues(alpha: dotOpacity));
  }

  @override
  bool shouldRepaint(_RingsPainter old) => old.color != color || old.dotOpacity != dotOpacity;
}
