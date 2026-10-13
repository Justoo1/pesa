import 'dart:ui';

import 'package:flutter/material.dart';
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

  @override
  Widget build(BuildContext context) {
    // LayoutBuilder must wrap the Stack (not sit inside it) — Positioned
    // only takes effect as a *direct* child of Stack; nesting it one level
    // deeper inside LayoutBuilder makes Flutter silently ignore the
    // computed offset instead of erroring, which is easy to miss visually.
    return LayoutBuilder(
      builder: (context, constraints) {
        final columnWidth = constraints.maxWidth / _columnCount;
        final centerX = (_gapColumnIndex + 0.5) * columnWidth;

        return SizedBox(
          height: _barHeight,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned.fill(
                child: ClipRect(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                    child: Container(
                      decoration: BoxDecoration(
                        color: PesaColors.bgApp.withValues(alpha: 0.86),
                        border: const Border(top: BorderSide(color: PesaColors.line)),
                      ),
                      padding: const EdgeInsets.fromLTRB(4, 8, 4, 24),
                      child: Row(
                        children: [
                          _tabItem(0),
                          _tabItem(1),
                          const Expanded(child: SizedBox()),
                          _tabItem(2),
                          _tabItem(3),
                          _tabItem(4),
                          _tabItem(5),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                top: -22,
                left: centerX - _fabSize / 2,
                child: _DisburseFab(onPressed: onDisbursePressed),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _tabItem(int index) {
    final spec = _tabs[index];
    final active = index == currentIndex;
    final color = active ? PesaColors.ink : PesaColors.ink3;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(index),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(spec.icon, size: 22, color: color),
            const SizedBox(height: 4),
            Text(
              spec.label.toUpperCase(),
              style: GoogleFonts.geist(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.18,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active ? PesaColors.clay : Colors.transparent,
              ),
            ),
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
