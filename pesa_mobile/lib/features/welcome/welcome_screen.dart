import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pot_painter.dart';
import 'welcome_illustrations.dart';
import 'welcome_seen.dart';

typedef _SceneBuilder = Widget Function(Animation<double> enter, Animation<double> float);

class _Slide {
  const _Slide({
    required this.background,
    required this.blob,
    required this.headline,
    required this.accent,
    required this.body,
    required this.scene,
  });

  final Color background;
  final Color blob;
  final String headline;

  /// The italic tail of the headline (the serif's brand flourish).
  final String accent;
  final String body;
  final _SceneBuilder scene;
}

final _slides = <_Slide>[
  _Slide(
    background: PesaColors.bgApp,
    blob: PesaColors.greenTint,
    headline: "Payday shouldn't vanish by the ",
    accent: '10th.',
    body: 'Pesa helps you decide where every cedi of your salary goes — before you spend it.',
    scene: (enter, float) => PaydayScene(enter: enter, float: float),
  ),
  _Slide(
    background: const Color(0xFFF1EEDC),
    blob: const Color(0xFFE3E8CF),
    headline: 'Give every cedi a ',
    accent: 'place to land.',
    body:
        'Split your salary into pots — Rent, Savings, Mom, Tithe — each with its own target. '
        'Then watch them fill.',
    scene: (enter, float) => PotsScene(enter: enter, float: float),
  ),
  _Slide(
    background: const Color(0xFFF7E6DA),
    blob: const Color(0xFFF0D2BF),
    headline: 'See where your money ',
    accent: 'really went.',
    body:
        'Insights, a financial health score and your monthly Wrap show how the month flowed '
        '— and how much you saved.',
    scene: (enter, float) => InsightsScene(enter: enter, float: float),
  ),
  _Slide(
    background: const Color(0xFFF3ECDA),
    blob: const Color(0xFFE6E9D6),
    headline: 'Private by design. ',
    accent: 'Always.',
    body:
        'Pesa is a planner, not a bank. It never asks for bank logins or PINs. '
        'No ads, no tracking — and you can delete everything any time.',
    scene: (enter, float) => PrivacyScene(enter: enter, float: float),
  ),
];

/// First-launch story (Revolut-style): segments fill and auto-advance; tap
/// the right/left of the illustration to skip forward/back, hold to pause,
/// or swipe. Ends on "Create my account" / "I already have an account".
/// The in-app tour still runs after the first sign-in.
class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});

  @override
  ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen> with TickerProviderStateMixin {
  static const _slideDuration = Duration(milliseconds: 6500);

  final _pages = PageController();
  late final AnimationController _story = AnimationController(vsync: this, duration: _slideDuration)
    ..addStatusListener(_onStoryStatus);
  late final AnimationController _enter = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  );
  late final AnimationController _float = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 4),
  );

  int _index = 0;
  double _page = 0;

  bool get _isLast => _index == _slides.length - 1;

  @override
  void initState() {
    super.initState();
    _pages.addListener(() => setState(() => _page = _pages.page ?? 0));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final reduceMotion = MediaQuery.disableAnimationsOf(context);
      if (reduceMotion) {
        _enter.value = 1;
      } else {
        _enter.forward();
        _float.repeat();
      }
      _story.forward();
    });
  }

  @override
  void dispose() {
    _pages.dispose();
    _story.dispose();
    _enter.dispose();
    _float.dispose();
    super.dispose();
  }

  void _onStoryStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed && !_isLast) _goTo(_index + 1);
  }

  void _goTo(int index) {
    if (index < 0 || index >= _slides.length) return;
    _pages.animateToPage(
      index,
      duration: const Duration(milliseconds: 650),
      curve: Curves.easeInOutCubic,
    );
  }

  void _onPageChanged(int index) {
    HapticFeedback.selectionClick();
    setState(() => _index = index);
    _story.forward(from: 0);
    if (!MediaQuery.disableAnimationsOf(context)) _enter.forward(from: 0);
  }

  Future<void> _finish(String route) async {
    await ref.read(welcomeSeenProvider.notifier).markSeen();
    if (mounted) context.go(route);
  }

  /// Background and blob blend smoothly between slides while swiping.
  Color _blend(Color Function(_Slide) pick) {
    final lower = _page.floor().clamp(0, _slides.length - 1);
    final upper = (lower + 1).clamp(0, _slides.length - 1);
    return Color.lerp(pick(_slides[lower]), pick(_slides[upper]), _page - lower)!;
  }

  @override
  Widget build(BuildContext context) {
    final bg = _blend((s) => s.background);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent),
      child: Scaffold(
        backgroundColor: bg,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                child: _Segments(story: _story, index: _index, count: _slides.length),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 8, 0),
                child: Row(
                  children: [
                    const _Brand(),
                    const Spacer(),
                    AnimatedOpacity(
                      opacity: _isLast ? 0 : 1,
                      duration: const Duration(milliseconds: 250),
                      child: TextButton(
                        onPressed: _isLast ? null : () => _goTo(_slides.length - 1),
                        style: TextButton.styleFrom(foregroundColor: PesaColors.ink2),
                        child: const Text('Skip'),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _pages,
                  itemCount: _slides.length,
                  onPageChanged: _onPageChanged,
                  itemBuilder: (context, i) => _buildPage(i),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: FilledButton(
                        onPressed: _isLast ? () => _finish('/register') : () => _goTo(_index + 1),
                        style: FilledButton.styleFrom(
                          backgroundColor: _isLast ? PesaColors.clay : PesaColors.green,
                          foregroundColor: PesaColors.bgApp,
                          shape: const StadiumBorder(),
                          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 250),
                          transitionBuilder: (child, a) => FadeTransition(
                            opacity: a,
                            child: SlideTransition(
                              position: Tween(
                                begin: const Offset(0, 0.4),
                                end: Offset.zero,
                              ).animate(a),
                              child: child,
                            ),
                          ),
                          child: Row(
                            key: ValueKey(_isLast),
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(_isLast ? 'Create my account' : 'Next'),
                              const SizedBox(width: 8),
                              Icon(
                                _isLast ? LucideIcons.sparkles : LucideIcons.arrowRight,
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextButton(
                      onPressed: () => _finish('/login'),
                      style: TextButton.styleFrom(foregroundColor: PesaColors.ink),
                      child: const Text.rich(
                        TextSpan(
                          text: 'I already have an account · ',
                          children: [
                            TextSpan(
                              text: 'Sign in',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPage(int i) {
    final slide = _slides[i];
    // How far this page is from settled (−1…1); drives the parallax.
    final delta = (_page - i).clamp(-1.0, 1.0);
    final width = MediaQuery.sizeOf(context).width;
    final enter = i == _index ? _enter.view : AlwaysStoppedAnimation<double>(i < _index ? 1 : 0);
    final textFade = (1 - delta.abs() * 1.6).clamp(0.0, 1.0);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapUp: (d) => d.localPosition.dx < width * 0.3 ? _goTo(_index - 1) : _goTo(_index + 1),
      onLongPressStart: (_) => _story.stop(),
      onLongPressEnd: (_) {
        if (!_story.isCompleted) _story.forward();
      },
      child: Column(
        children: [
          Expanded(
            child: Transform.translate(
              // The illustration lags the page, so it drifts in slower.
              offset: Offset(delta * width * 0.45, 0),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  _Blob(color: slide.blob, float: _float),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(28, 12, 28, 4),
                    child: slide.scene(enter, _float),
                  ),
                ],
              ),
            ),
          ),
          Opacity(
            opacity: textFade,
            child: Transform.translate(
              offset: Offset(delta * width * 0.15, 0),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text.rich(
                      TextSpan(
                        style: PesaTextStyles.serif(
                          fontSize: 38,
                          color: PesaColors.ink,
                        ).copyWith(height: 1.04),
                        children: [
                          TextSpan(text: slide.headline),
                          TextSpan(
                            text: slide.accent,
                            style: const TextStyle(
                              fontStyle: FontStyle.italic,
                              color: PesaColors.green,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      slide.body,
                      style: const TextStyle(fontSize: 15.5, height: 1.45, color: PesaColors.ink2),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Story progress: one segment per slide; the current one fills over time.
class _Segments extends StatelessWidget {
  const _Segments({required this.story, required this.index, required this.count});

  final Animation<double> story;
  final int index;
  final int count;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: story,
      builder: (context, _) => Row(
        children: [
          for (var i = 0; i < count; i++) ...[
            if (i > 0) const SizedBox(width: 5),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: LinearProgressIndicator(
                  value: i < index ? 1 : (i == index ? story.value : 0),
                  minHeight: 3.5,
                  backgroundColor: PesaColors.ink.withValues(alpha: 0.12),
                  valueColor: const AlwaysStoppedAnimation(PesaColors.ink),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 26,
          height: 26,
          child: CustomPaint(
            painter: PotPainter(
              t: 1,
              center: const Offset(13, 14),
              unit: 0.9,
              fromFill: 0.7,
              toFill: 0.7,
              sparkles: false,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text.rich(
          TextSpan(
            style: const TextStyle(fontSize: 14, color: PesaColors.ink2),
            children: [
              const TextSpan(text: 'Welcome to '),
              TextSpan(
                text: 'Pesa',
                style: PesaTextStyles.serif(fontSize: 20, color: PesaColors.ink),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Soft organic shape behind each illustration that slowly breathes.
class _Blob extends StatelessWidget {
  const _Blob({required this.color, required this.float});

  final Color color;
  final Animation<double> float;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: float,
      builder: (context, _) {
        // Seamless loop: everything is a sine of the same phase.
        final t = float.value * 2 * math.pi;
        double w(double phase) => math.sin(t + phase);
        return FractionallySizedBox(
          widthFactor: 0.86,
          heightFactor: 0.86,
          child: Transform.rotate(
            angle: 0.05 * w(0),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.elliptical(180 + 22 * w(0), 160 + 12 * w(1.3)),
                  topRight: Radius.elliptical(150 + 14 * w(2.1), 190 + 18 * w(0.7)),
                  bottomLeft: Radius.elliptical(170 + 12 * w(3.2), 150 + 18 * w(1.9)),
                  bottomRight: Radius.elliptical(190 + 16 * w(4.4), 170 + 12 * w(2.6)),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
