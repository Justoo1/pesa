import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../theme/pesa_colors.dart';

class _TabSpec {
  const _TabSpec({required this.icon, required this.label});

  final IconData icon;
  final String label;
}

/// Ports the web app's `.tabbar`/`.tab`/`.tab-fab` — a 7-column bar (Home,
/// Bank, [Disburse FAB], Insights, Projects, Wrap, More) with a raised
/// circular FAB in the 3rd slot (2 tabs before it, 4 after — matching the
/// web's actual, slightly-left-of-center layout, not a symmetric 3-3 split).
///
/// The active tab gets a raised clay badge in the FAB's style: it slides to
/// the tapped tab while that tab's icon rises into it and the old one drops
/// back into the bar.
class PesaBottomNav extends StatelessWidget {
  const PesaBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.onDisbursePressed,
  });

  /// Index into the 6 real destinations: Home, Bank, Insights, Projects,
  /// Wrap, More (the FAB is not a selectable index).
  final int currentIndex;
  final ValueChanged<int> onTap;
  final VoidCallback onDisbursePressed;

  static const _tabs = [
    _TabSpec(icon: LucideIcons.home, label: 'Home'),
    _TabSpec(icon: LucideIcons.wallet, label: 'Bank'),
    _TabSpec(icon: LucideIcons.trendingUp, label: 'Insights'),
    _TabSpec(icon: LucideIcons.flag, label: 'Projects'),
    _TabSpec(icon: LucideIcons.sparkles, label: 'Wrap'),
    _TabSpec(icon: LucideIcons.settings, label: 'More'),
  ];

  static const _fabSize = 56.0;
  static const _barHeight = 84.0;
  // 7 equal grid columns; the FAB sits in column index 2 (0-based), i.e.
  // 2 tabs before it and 4 after — ported as-is from the web's own layout.
  static const _gapColumnIndex = 2;
  static const _columnCount = 7;

  // Vertical geometry, in bar coordinates. The FAB is 56 tall at top -22, so
  // its centre is at y=6; the active badge shares that centre line. A resting
  // icon is centred at y=26 (bar padding 8 + the icon/label stack centred in
  // the 52px content box), so the active one lifts by 20.
  static const _badgeSize = 46.0;
  static const _raisedCenterY = 6.0;
  static const _iconLift = 20.0;

  static const _slide = Duration(milliseconds: 420);

  /// Grid column of tab [index] (the FAB owns column 2).
  static int _columnOf(int index) => index < _gapColumnIndex ? index : index + 1;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final slide = reduceMotion ? Duration.zero : _slide;

    // LayoutBuilder must wrap the Stack (not sit inside it) — Positioned
    // only takes effect as a *direct* child of Stack; nesting it one level
    // deeper inside LayoutBuilder makes Flutter silently ignore the
    // computed offset instead of erroring, which is easy to miss visually.
    return LayoutBuilder(
      builder: (context, constraints) {
        final columnWidth = (constraints.maxWidth - 8) / _columnCount;
        double columnCenterX(int column) => 4 + (column + 0.5) * columnWidth;

        return SizedBox(
          height: _barHeight,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // Frosted bar background.
              Positioned.fill(
                child: ClipRect(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: PesaColors.bgApp.withValues(alpha: 0.86),
                        border: const Border(top: BorderSide(color: PesaColors.line)),
                      ),
                    ),
                  ),
                ),
              ),
              // The sliding active badge (under the icons, so the lifted
              // icon sits inside it).
              AnimatedPositioned(
                duration: slide,
                curve: Curves.easeInOutCubic,
                top: _raisedCenterY - _badgeSize / 2,
                left: columnCenterX(_columnOf(currentIndex)) - _badgeSize / 2,
                child: IgnorePointer(child: _ActiveBadge(key: ValueKey(currentIndex))),
              ),
              Positioned.fill(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(4, 8, 4, 24),
                  child: Row(
                    children: [
                      _tabItem(0, slide),
                      _tabItem(1, slide),
                      const Expanded(child: SizedBox()),
                      _tabItem(2, slide),
                      _tabItem(3, slide),
                      _tabItem(4, slide),
                      _tabItem(5, slide),
                    ],
                  ),
                ),
              ),
              Positioned(
                top: -22,
                left: columnCenterX(_gapColumnIndex) - _fabSize / 2,
                child: _DisburseFab(onPressed: onDisbursePressed),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _tabItem(int index, Duration slide) {
    final spec = _tabs[index];
    final active = index == currentIndex;
    return Expanded(
      child: InkWell(
        onTap: () {
          if (!active) HapticFeedback.selectionClick();
          onTap(index);
        },
        child: TweenAnimationBuilder<double>(
          tween: Tween(end: active ? 1 : 0),
          // Rising overshoots a touch, like it pops into the badge; falling
          // back is a plain ease.
          duration: slide,
          curve: active ? Curves.easeOutBack : Curves.easeOutCubic,
          builder: (context, t, _) {
            final lift = t.clamp(0.0, 1.2);
            final iconColor = Color.lerp(PesaColors.ink3, PesaColors.bgApp, t.clamp(0.0, 1.0))!;
            final labelColor = Color.lerp(PesaColors.ink3, PesaColors.ink, t.clamp(0.0, 1.0))!;
            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Transform.translate(
                  offset: Offset(0, -_iconLift * lift),
                  child: Icon(spec.icon, size: 22, color: iconColor),
                ),
                const SizedBox(height: 4),
                Text(
                  spec.label.toUpperCase(),
                  style: GoogleFonts.geist(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.18,
                    color: labelColor,
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

/// The raised clay circle behind the active tab's icon. Keyed by the tab, so
/// each change replays a small pop: it squashes on arrival and settles.
class _ActiveBadge extends StatelessWidget {
  const _ActiveBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: reduceMotion ? 1 : 0.82, end: 1),
      duration: const Duration(milliseconds: 520),
      curve: Curves.elasticOut,
      builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
      child: Container(
        width: PesaBottomNav._badgeSize,
        height: PesaBottomNav._badgeSize,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: PesaColors.clay,
          border: Border.all(color: PesaColors.bgApp, width: 3),
          boxShadow: const [
            BoxShadow(color: Color(0x55C9714B), offset: Offset(0, 5), blurRadius: 14),
          ],
        ),
      ),
    );
  }
}

class _DisburseFab extends StatelessWidget {
  const _DisburseFab({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: PesaColors.green,
            border: Border.all(color: PesaColors.bgApp, width: 3),
            boxShadow: const [
              BoxShadow(color: Color(0x663D5234), offset: Offset(0, 6), blurRadius: 18),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: onPressed,
              child: const Icon(LucideIcons.send, color: PesaColors.bgApp, size: 24),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'DISBURSE',
          style: GoogleFonts.geist(
            fontSize: 9,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.18,
            color: PesaColors.ink,
          ),
        ),
      ],
    );
  }
}
