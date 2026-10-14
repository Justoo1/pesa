import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/pesa_colors.dart';

/// A coin drop: when it starts falling, where it falls, and when it lands.
class _Coin {
  const _Coin(this.start, this.x);

  static const fallDuration = 0.13;

  final double start;
  final double x;

  double get lands => start + fallDuration;
}

/// Paints Pesa's pot logo (the same geometry as `app/icon.svg`, in its 32×32
/// SVG units scaled by [unit]) with coins dropping in and the savings fill
/// rising from [fromFill] to [toFill] (0 = empty, 1 = full) as [t] goes 0→1.
/// Used by the animated splash and the disburse "Landed safely" step.
class PotPainter extends CustomPainter {
  PotPainter({
    required this.t,
    required this.center,
    required this.unit,
    this.fromFill = 0,
    this.toFill = 1,
    this.sparkles = true,
  });

  final double t;
  final Offset center;
  final double unit;
  final double fromFill;
  final double toFill;

  /// Twinkles above the rim near the end (only drawn when the pot ends full).
  final bool sparkles;

  static const _coins = [_Coin(0.06, 13.6), _Coin(0.24, 18.4), _Coin(0.42, 15.8)];

  // SVG-unit geometry (viewBox 0 0 32 32), mirroring app/icon.svg.
  static final _body = RRect.fromLTRBAndCorners(
    6.5,
    8,
    25.5,
    27,
    topLeft: const Radius.circular(4),
    topRight: const Radius.circular(4),
    bottomLeft: const Radius.circular(4.5),
    bottomRight: const Radius.circular(4.5),
  );
  static final _inner = RRect.fromLTRBAndCorners(
    8.5,
    10.5,
    23.5,
    25.5,
    topLeft: const Radius.circular(1),
    topRight: const Radius.circular(1),
    bottomLeft: const Radius.circular(2.5),
    bottomRight: const Radius.circular(2.5),
  );
  static final _rim = RRect.fromLTRBR(5.5, 7, 26.5, 10.5, const Radius.circular(1.75));
  static const _emptyLevel = 25.5;
  static const _fullLevel = 16.5;

  static double _ease(double x, Curve c) => c.transform(x.clamp(0.0, 1.0));

  /// [fromFill] → [toFill]; each coin adds its share, rising with a soft
  /// overshoot just after it lands.
  double get _fill {
    var progress = 0.0;
    for (final coin in _coins) {
      progress += _ease((t - coin.lands) / 0.16, Curves.easeOutBack) / _coins.length;
    }
    return (fromFill + (toFill - fromFill) * progress).clamp(0.0, 1.04);
  }

  /// Brief squash of the pot each time a coin lands.
  double get _squash {
    var s = 0.0;
    for (final coin in _coins) {
      final x = (t - coin.lands) / 0.1;
      if (x > 0 && x < 1) s = math.max(s, math.sin(x * math.pi));
    }
    return s;
  }

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    // Squash anchored at the pot's base so it "settles" rather than shrinks.
    final squash = _squash;
    canvas.translate(center.dx, center.dy);
    canvas.translate(0, 10 * unit);
    canvas.scale(1 + 0.025 * squash, 1 - 0.035 * squash);
    canvas.translate(0, -10 * unit);
    canvas.scale(unit);
    canvas.translate(-16, -17); // pot center (16,17) → origin

    _paintCoins(canvas);
    canvas.drawRRect(_body, Paint()..color = PesaColors.clay);
    _paintLiquid(canvas);
    _paintRipples(canvas);
    canvas.drawRRect(_rim, Paint()..color = PesaColors.clayDeep);
    canvas.drawOval(
      Rect.fromCenter(center: const Offset(11, 14.5), width: 2.2, height: 4.4),
      Paint()..color = Colors.white.withValues(alpha: 0.3),
    );
    if (sparkles && toFill >= 1) _paintSparkles(canvas);
    canvas.restore();
  }

  void _paintCoins(Canvas canvas) {
    for (final coin in _coins) {
      final p = (t - coin.start) / _Coin.fallDuration;
      if (p <= 0 || p >= 1) continue;
      // Gravity-ish fall from above the screen into the pot mouth; painted
      // before the body so the pot hides it as it drops in.
      final y = -16 + 30 * Curves.easeIn.transform(p);
      final spin = math.cos(p * math.pi * 3); // coin flips as it falls
      final rect = Rect.fromCenter(
        center: Offset(coin.x, y),
        width: 3.4 * (0.35 + 0.65 * spin.abs()),
        height: 3.4,
      );
      canvas.drawOval(rect, Paint()..color = PesaColors.gold);
      canvas.drawOval(
        rect.deflate(0.55),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.28
          ..color = const Color(0xFF8E6418),
      );
      canvas.drawOval(
        Rect.fromCenter(
          center: rect.center.translate(-rect.width * 0.18, -0.7),
          width: rect.width * 0.22,
          height: 0.9,
        ),
        Paint()..color = Colors.white.withValues(alpha: 0.55),
      );
    }
  }

  void _paintLiquid(Canvas canvas) {
    final fill = _fill;
    if (fill <= 0.001) return;
    final level = _emptyLevel - (_emptyLevel - _fullLevel) * fill;
    // Waves are livelier right after each drop, then calm to a flat surface.
    final settle = _ease((t - 0.6) / 0.35, Curves.easeOut);
    final amplitude = 0.45 * (1 - settle) + 0.04;
    final phase = t * math.pi * 2 * 3.2;

    canvas.save();
    canvas.clipRRect(_inner);

    Path wave(double phaseOffset, double amp) {
      final path = Path()..moveTo(_inner.left, _inner.bottom);
      for (var x = _inner.left; x <= _inner.right + 0.01; x += 0.25) {
        path.lineTo(x, level + amp * math.sin(x * 0.9 + phase + phaseOffset));
      }
      return path
        ..lineTo(_inner.right, _inner.bottom)
        ..close();
    }

    // A lighter back wave for depth, then the main fill.
    canvas.drawPath(wave(1.9, amplitude * 1.2), Paint()..color = PesaColors.greenSoft);
    final front = wave(0, amplitude);
    canvas.drawPath(front, Paint()..color = PesaColors.green);

    // Meniscus highlight riding on the surface (as in the static logo).
    final surface = Path();
    for (var x = _inner.left + 1; x <= _inner.right - 1; x += 0.25) {
      final y = level + 0.4 + amplitude * math.sin(x * 0.9 + phase);
      x == _inner.left + 1 ? surface.moveTo(x, y) : surface.lineTo(x, y);
    }
    canvas.drawPath(
      surface,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.8
        ..strokeCap = StrokeCap.round
        ..color = Colors.white.withValues(alpha: 0.35 * _ease(fill * 1.5, Curves.easeIn)),
    );
    canvas.restore();
  }

  void _paintRipples(Canvas canvas) {
    final level = _emptyLevel - (_emptyLevel - _fullLevel) * _fill;
    canvas.save();
    canvas.clipRRect(_inner.inflate(0.6));
    for (final coin in _coins) {
      final p = (t - coin.lands) / 0.14;
      if (p <= 0 || p >= 1) continue;
      final r = 0.8 + 3.2 * Curves.easeOut.transform(p);
      canvas.drawOval(
        Rect.fromCenter(center: Offset(coin.x, level), width: r * 2, height: r * 0.55),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.35
          ..color = Colors.white.withValues(alpha: 0.6 * (1 - p)),
      );
    }
    canvas.restore();
  }

  /// Two small twinkles above the rim once the pot is full.
  void _paintSparkles(Canvas canvas) {
    const sparkles = [
      (Offset(8.2, 4.4), 0.0),
      (Offset(24.6, 3.2), 0.06),
      (Offset(20.8, 5.6), 0.11),
    ];
    for (final (pos, delay) in sparkles) {
      final p = (t - 0.6 - delay) / 0.22;
      if (p <= 0 || p >= 1) continue;
      final s = math.sin(p * math.pi) * 0.9;
      final paint = Paint()..color = PesaColors.gold.withValues(alpha: math.sin(p * math.pi));
      final star = Path()
        ..moveTo(pos.dx, pos.dy - s)
        ..quadraticBezierTo(pos.dx, pos.dy, pos.dx + s, pos.dy)
        ..quadraticBezierTo(pos.dx, pos.dy, pos.dx, pos.dy + s)
        ..quadraticBezierTo(pos.dx, pos.dy, pos.dx - s, pos.dy)
        ..quadraticBezierTo(pos.dx, pos.dy, pos.dx, pos.dy - s)
        ..close();
      canvas.drawPath(star, paint);
    }
  }

  @override
  bool shouldRepaint(PotPainter old) =>
      old.t != t || old.center != center || old.fromFill != fromFill || old.toFill != toFill;
}
