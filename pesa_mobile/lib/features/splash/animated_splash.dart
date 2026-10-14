import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pot_painter.dart';
import '../auth/auth_provider.dart';
import '../home/bootstrap_provider.dart';

/// Wraps the whole app and plays the animated splash over it on cold start.
///
/// The native splash (flutter_native_splash) shows an *empty* clay pot; the
/// first Flutter frame draws that same pot at the same size and position,
/// then three coins drop in, the savings fill rises, and the wordmark
/// appears. The overlay fades away once the animation has finished AND the
/// app is ready underneath (auth resolved and, when signed in, the first
/// dashboard fetch settled — capped so a slow network never traps the user).
class SplashHost extends ConsumerStatefulWidget {
  const SplashHost({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<SplashHost> createState() => _SplashHostState();
}

class _SplashHostState extends ConsumerState<SplashHost> with TickerProviderStateMixin {
  static const _maxExtraWait = Duration(seconds: 3);

  late final AnimationController _intro = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2600),
  );
  late final AnimationController _exit = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  );
  bool _introDone = false;
  bool _waitedLongEnough = false;
  bool _gone = false;
  Timer? _capTimer;

  @override
  void initState() {
    super.initState();
    _intro.addStatusListener((status) {
      if (status != AnimationStatus.completed) return;
      setState(() => _introDone = true);
      _capTimer = Timer(_maxExtraWait, () {
        if (mounted) setState(() => _waitedLongEnough = true);
      });
    });
    _exit.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) setState(() => _gone = true);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_intro.isAnimating || _intro.isCompleted) return;
    // Respect the OS "reduce motion" setting: skip straight to the end frame.
    final reduceMotion = MediaQueryData.fromView(View.of(context)).disableAnimations;
    if (reduceMotion) {
      _intro.value = 1;
      _introDone = true;
      _waitedLongEnough = true;
    } else {
      _intro.forward();
    }
  }

  @override
  void dispose() {
    _capTimer?.cancel();
    _intro.dispose();
    _exit.dispose();
    super.dispose();
  }

  bool _appReady() {
    final auth = ref.watch(authControllerProvider);
    if (!auth.hasValue || auth.isLoading) return false;
    if (auth.value is! AuthAuthenticated) return true;
    // Signed in: hold the splash until the dashboard's first load settles
    // (success or failure) so Home appears with data, not a spinner.
    final bootstrap = ref.watch(bootstrapProvider);
    return bootstrap.hasValue || bootstrap.hasError;
  }

  @override
  Widget build(BuildContext context) {
    if (_gone) return widget.child;

    final ready = _appReady() || _waitedLongEnough;
    if (_introDone && ready && _exit.isDismissed) {
      // Start the fade after this frame — never kick off animations mid-build.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _exit.isDismissed) _exit.forward();
      });
    }

    return Directionality(
      textDirection: TextDirection.ltr,
      child: Stack(
        children: [
          widget.child,
          Positioned.fill(
            child: MediaQuery.fromView(
              view: View.of(context),
              child: AnimatedBuilder(
                animation: Listenable.merge([_intro, _exit]),
                builder: (context, _) {
                  final out = Curves.easeInCubic.transform(_exit.value);
                  return IgnorePointer(
                    ignoring: _exit.value > 0.5,
                    child: Opacity(
                      opacity: 1 - out,
                      child: Transform.scale(
                        scale: 1 + 0.08 * out,
                        child: SplashFrame(t: _intro.value),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// One frame of the intro at progress [t] (0–1). Public so frames can be
/// rendered deterministically in tests.
@visibleForTesting
class SplashFrame extends StatelessWidget {
  const SplashFrame({super.key, required this.t});

  final double t;

  /// Size of one SVG unit on screen. The native splash image is 1152px shown
  /// at 288dp with the pot drawn at 20px/unit → 5dp per unit; matching it
  /// makes the first Flutter frame identical to the native one.
  static const _unit = 5.0;

  static double _phase(double t, double start, double end, [Curve curve = Curves.linear]) =>
      curve.transform(((t - start) / (end - start)).clamp(0.0, 1.0));

  @override
  Widget build(BuildContext context) {
    // The pot rises to make room for the wordmark once it's full.
    final lift = _phase(t, 0.62, 0.84, Curves.easeInOutCubic);
    final text = _phase(t, 0.68, 0.92, Curves.easeOutCubic);
    final tagline = _phase(t, 0.76, 1.0, Curves.easeOutCubic);

    return ColoredBox(
      color: PesaColors.bgApp,
      // The splash sits outside MaterialApp/Material, so give text an
      // explicit base style (no inherited debug underline, ever).
      child: DefaultTextStyle(
        style: const TextStyle(decoration: TextDecoration.none),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final center = Offset(constraints.maxWidth / 2, constraints.maxHeight / 2);
            final potCenter = center.translate(0, -44 * lift);
            return Stack(
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: PotPainter(t: t, center: potCenter, unit: _unit),
                  ),
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  top: center.dy + 70 - 44 * lift,
                  child: Column(
                    children: [
                      Opacity(
                        opacity: text,
                        child: Transform.translate(
                          offset: Offset(0, 14 * (1 - text)),
                          child: Text(
                            'Pesa',
                            style: PesaTextStyles.serif(fontSize: 52, color: PesaColors.ink),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Opacity(
                        opacity: tagline,
                        child: Transform.translate(
                          offset: Offset(0, 10 * (1 - tagline)),
                          child: Text(
                            'Every cedi, a place to land.',
                            style: PesaTextStyles.serif(
                              fontSize: 19,
                              color: PesaColors.green,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
