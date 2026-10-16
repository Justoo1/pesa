import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pot_painter.dart';

/// The four animated scenes of the welcome story. Each takes:
/// - [enter]: 0→1 as the slide arrives (elements pop in, fills rise);
/// - [float]: a repeating 0→1 loop for the idle motion (bobbing, coins).
///
/// All scenes are laid out in a 300×300 box and scale to fit.

double _iv(double t, double begin, double end, [Curve curve = Curves.easeOutCubic]) =>
    curve.transform(((t - begin) / (end - begin)).clamp(0.0, 1.0));

double _bob(double float, {double phase = 0, double amp = 6}) =>
    math.sin((float + phase) * 2 * math.pi) * amp;

/// Pops a child in: fades, rises and scales from 0.6 with a small overshoot.
class _Pop extends StatelessWidget {
  const _Pop({required this.t, required this.child});

  final double t;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final s = Curves.easeOutBack.transform(t.clamp(0.0, 1.0));
    return Opacity(
      opacity: t.clamp(0.0, 1.0),
      child: Transform.translate(
        offset: Offset(0, 18 * (1 - t)),
        child: Transform.scale(scale: 0.6 + 0.4 * s, child: child),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label, this.bg = Colors.white, this.fg});

  final IconData icon;
  final String label;
  final Color bg;
  final Color? fg;

  @override
  Widget build(BuildContext context) {
    final color = fg ?? PesaColors.ink;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [
          BoxShadow(color: Color(0x1A211A12), offset: Offset(0, 6), blurRadius: 16),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: color),
          ),
        ],
      ),
    );
  }
}

class _SceneBox extends StatelessWidget {
  const _SceneBox({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return FittedBox(
      child: SizedBox(
        width: 300,
        height: 300,
        child: Stack(clipBehavior: Clip.none, children: children),
      ),
    );
  }
}

class _Pot extends StatelessWidget {
  const _Pot({required this.fill, required this.size});

  final double fill;
  final double size;

  @override
  Widget build(BuildContext context) {
    final unit = size / 32;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: PotPainter(
          t: 1,
          center: Offset(size / 2, size / 2 + unit),
          unit: unit,
          fromFill: fill,
          toFill: fill,
          sparkles: false,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 1 — Payday: coins rain into a filling pot; the salary card floats nearby.
// ---------------------------------------------------------------------------

class PaydayScene extends StatelessWidget {
  const PaydayScene({super.key, required this.enter, required this.float});

  final Animation<double> enter;
  final Animation<double> float;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([enter, float]),
      builder: (context, _) {
        final e = enter.value;
        final f = float.value;
        return _SceneBox(
          children: [
            // Falling coins, behind the pot rim.
            for (var i = 0; i < 4; i++) _coin(i, f, e),
            Positioned(
              left: 60,
              top: 92 + _bob(f, amp: 3),
              child: _Pop(
                t: _iv(e, 0, 0.5),
                child: _Pot(fill: 0.12 + 0.68 * _iv(e, 0.25, 1, Curves.easeInOutCubic), size: 180),
              ),
            ),
            Positioned(
              left: 0,
              top: 30 + _bob(f, phase: 0.3),
              child: _Pop(
                t: _iv(e, 0.2, 0.7),
                child: Transform.rotate(
                  angle: -0.06,
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(14, 10, 16, 12),
                    decoration: BoxDecoration(
                      color: PesaColors.green,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: const [
                        BoxShadow(color: Color(0x332A3A22), offset: Offset(0, 10), blurRadius: 20),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('SALARY', style: PesaTextStyles.eyebrow(color: PesaColors.greenSoft)),
                        const SizedBox(height: 2),
                        Text(
                          'GH₵14,000',
                          style: PesaTextStyles.serif(fontSize: 24, color: PesaColors.bgApp),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 0,
              bottom: 26 + _bob(f, phase: 0.65, amp: 5),
              child: _Pop(
                t: _iv(e, 0.45, 0.95),
                child: const _Chip(
                  icon: LucideIcons.sparkles,
                  label: "It's payday!",
                  bg: PesaColors.gold,
                  fg: Colors.white,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  /// A gold coin dropping into the pot mouth on a loop, staggered by [i].
  Widget _coin(int i, double f, double e) {
    final p = (f * 2 + i / 4) % 1.0; // two drops per float cycle
    final y = 40 + 112 * Curves.easeIn.transform(p);
    final x = 128.0 + const [0, 22, -18, 10][i];
    final fade = p < 0.75 ? 1.0 : 1 - (p - 0.75) / 0.25;
    final spin = math.cos(p * math.pi * 3).abs();
    return Positioned(
      left: x,
      top: y,
      child: Opacity(
        opacity: (fade * _iv(e, 0.4, 0.8)).clamp(0.0, 1.0),
        child: Transform(
          alignment: Alignment.center,
          transform: Matrix4.diagonal3Values(0.35 + 0.65 * spin, 1, 1),
          child: Container(
            width: 26,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: PesaColors.gold,
              border: Border.all(color: const Color(0xFFE3B65A), width: 2),
            ),
            child: const Text(
              '₵',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 2 — Pots: four pots on a shelf fill to different levels.
// ---------------------------------------------------------------------------

class PotsScene extends StatelessWidget {
  const PotsScene({super.key, required this.enter, required this.float});

  final Animation<double> enter;
  final Animation<double> float;

  static const _pots = [
    ('Rent', LucideIcons.house, 1.0, PesaColors.clay),
    ('Savings', LucideIcons.piggyBank, 0.72, PesaColors.green),
    ('Mom', LucideIcons.heart, 0.9, PesaColors.rose),
    ('Tithe', LucideIcons.sun, 0.55, PesaColors.gold),
  ];

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([enter, float]),
      builder: (context, _) {
        final e = enter.value;
        final f = float.value;
        return _SceneBox(
          children: [
            Positioned(
              left: 0,
              right: 0,
              top: 6,
              child: Center(
                child: _Pop(
                  t: _iv(e, 0, 0.4),
                  child: const _Chip(icon: LucideIcons.split, label: 'Split GH₵14,000'),
                ),
              ),
            ),
            for (var i = 0; i < _pots.length; i++) _pot(i, e, f),
          ],
        );
      },
    );
  }

  Widget _pot(int i, double e, double f) {
    final (label, icon, level, color) = _pots[i];
    final col = i % 2;
    final row = i ~/ 2;
    final start = 0.12 + i * 0.12;
    return Positioned(
      left: 22 + col * 140.0,
      top: 58 + row * 118.0 + _bob(f, phase: i * 0.23, amp: 4),
      child: _Pop(
        t: _iv(e, start, start + 0.35),
        child: Column(
          children: [
            _Pot(fill: level * _iv(e, start + 0.15, start + 0.65, Curves.easeInOutCubic), size: 92),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 12, color: color),
                  const SizedBox(width: 4),
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: PesaColors.ink,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 3 — Insights: a flow chart grows and a savings ring sweeps round.
// ---------------------------------------------------------------------------

class InsightsScene extends StatelessWidget {
  const InsightsScene({super.key, required this.enter, required this.float});

  final Animation<double> enter;
  final Animation<double> float;

  // (saved, gave, lived) per month, as fractions of the bar height.
  static const _months = [
    (0.22, 0.12, 0.38),
    (0.26, 0.12, 0.36),
    (0.2, 0.14, 0.42),
    (0.3, 0.12, 0.34),
    (0.28, 0.13, 0.36),
    (0.36, 0.12, 0.32),
  ];

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([enter, float]),
      builder: (context, _) {
        final e = enter.value;
        final f = float.value;
        return _SceneBox(
          children: [
            Positioned(
              left: 8,
              top: 60 + _bob(f, amp: 3),
              child: _Pop(t: _iv(e, 0, 0.4), child: _chartCard(e)),
            ),
            Positioned(
              right: 4,
              top: 14 + _bob(f, phase: 0.4, amp: 5),
              child: _Pop(t: _iv(e, 0.3, 0.7), child: _ring(_iv(e, 0.4, 1, Curves.easeOutCubic))),
            ),
            Positioned(
              left: 0,
              bottom: 8 + _bob(f, phase: 0.75, amp: 4),
              child: _Pop(
                t: _iv(e, 0.6, 1),
                child: const _Chip(
                  icon: LucideIcons.trendingUp,
                  label: 'Saved more than last month',
                  bg: PesaColors.green,
                  fg: PesaColors.bgApp,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _chartCard(double e) {
    return Container(
      width: 230,
      height: 170,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(color: Color(0x1A211A12), offset: Offset(0, 12), blurRadius: 24),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('6-MONTH FLOW', style: PesaTextStyles.eyebrow(color: PesaColors.ink3)),
          const SizedBox(height: 10),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                for (var i = 0; i < _months.length; i++)
                  _bar(
                    _months[i],
                    _iv(e, 0.15 + i * 0.07, 0.55 + i * 0.07),
                    i == _months.length - 1,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bar((double, double, double) m, double g, bool current) {
    const h = 100.0;
    Widget seg(double frac, Color c) => Container(height: h * frac * g, color: c);
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: SizedBox(
        width: 22,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            seg(m.$3, current ? PesaColors.claySoft : const Color(0xFFF1DCCD)),
            seg(m.$2, current ? PesaColors.gold : const Color(0xFFE8D3A5)),
            seg(m.$1, current ? PesaColors.green : const Color(0xFF8FA07F)),
          ],
        ),
      ),
    );
  }

  Widget _ring(double sweep) {
    return Container(
      width: 104,
      height: 104,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: Color(0x1A211A12), offset: Offset(0, 10), blurRadius: 22)],
      ),
      child: CustomPaint(
        painter: _RingPainter(sweep * 0.28),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${(28 * sweep).round()}%',
                style: PesaTextStyles.serif(fontSize: 26, color: PesaColors.ink),
              ),
              const Text('saved', style: TextStyle(fontSize: 10.5, color: PesaColors.ink3)),
            ],
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.fraction);

  final double fraction;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final r = rect.deflate(12);
    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..color = PesaColors.line;
    final arc = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round
      ..color = PesaColors.green;
    canvas.drawArc(r, 0, 2 * math.pi, false, track);
    canvas.drawArc(r, -math.pi / 2, 2 * math.pi * fraction, false, arc);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.fraction != fraction;
}

// ---------------------------------------------------------------------------
// 4 — Privacy: a shield draws a tick; privacy promises float around it.
// ---------------------------------------------------------------------------

class PrivacyScene extends StatelessWidget {
  const PrivacyScene({super.key, required this.enter, required this.float});

  final Animation<double> enter;
  final Animation<double> float;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([enter, float]),
      builder: (context, _) {
        final e = enter.value;
        final f = float.value;
        return _SceneBox(
          children: [
            Positioned(
              left: 75,
              top: 52 + _bob(f, amp: 4),
              child: _Pop(
                t: _iv(e, 0, 0.45),
                child: SizedBox(
                  width: 150,
                  height: 172,
                  child: CustomPaint(painter: _ShieldPainter(_iv(e, 0.35, 0.85))),
                ),
              ),
            ),
            Positioned(
              left: 0,
              top: 26 + _bob(f, phase: 0.2, amp: 5),
              child: _Pop(
                t: _iv(e, 0.45, 0.8),
                child: const _Chip(icon: LucideIcons.landmark, label: 'No bank logins'),
              ),
            ),
            Positioned(
              right: 0,
              top: 120 + _bob(f, phase: 0.5, amp: 5),
              child: _Pop(
                t: _iv(e, 0.55, 0.9),
                child: const _Chip(icon: LucideIcons.ban, label: 'No ads'),
              ),
            ),
            Positioned(
              left: 14,
              bottom: 14 + _bob(f, phase: 0.8, amp: 5),
              child: _Pop(
                t: _iv(e, 0.65, 1),
                child: const _Chip(icon: LucideIcons.eyeOff, label: 'No tracking'),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ShieldPainter extends CustomPainter {
  _ShieldPainter(this.tick);

  /// 0→1: how much of the tick is drawn.
  final double tick;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final shield = Path()
      ..moveTo(w / 2, 0)
      ..cubicTo(w * 0.72, h * 0.08, w * 0.88, h * 0.1, w, h * 0.12)
      ..lineTo(w, h * 0.46)
      ..cubicTo(w, h * 0.74, w * 0.72, h * 0.9, w / 2, h)
      ..cubicTo(w * 0.28, h * 0.9, 0, h * 0.74, 0, h * 0.46)
      ..lineTo(0, h * 0.12)
      ..cubicTo(w * 0.12, h * 0.1, w * 0.28, h * 0.08, w / 2, 0)
      ..close();
    canvas.drawShadow(shield, const Color(0x552A3A22), 14, false);
    canvas.drawPath(
      shield,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [PesaColors.greenHeroEnd, PesaColors.greenDeep],
        ).createShader(Offset.zero & size),
    );
    // Inner rim.
    canvas.drawPath(
      shield.shift(Offset.zero),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = PesaColors.greenSoft.withValues(alpha: 0.35),
    );

    if (tick <= 0) return;
    final check = Path()
      ..moveTo(w * 0.3, h * 0.5)
      ..lineTo(w * 0.45, h * 0.64)
      ..lineTo(w * 0.72, h * 0.36);
    final metric = check.computeMetrics().first;
    canvas.drawPath(
      metric.extractPath(0, metric.length * tick),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 11
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = PesaColors.bgApp,
    );
  }

  @override
  bool shouldRepaint(_ShieldPainter old) => old.tick != tick;
}
