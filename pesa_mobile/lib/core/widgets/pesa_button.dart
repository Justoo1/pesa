import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/pesa_colors.dart';
import '../theme/pesa_metrics.dart';

/// Ports the web app's `.btn` variants (`btn-primary`, `btn-green`,
/// `btn-clay`, `btn-ghost`, `btn-soft`) — always a fully-round pill.
enum PesaButtonVariant { primary, green, clay, ghost, soft }

class PesaButton extends StatelessWidget {
  const PesaButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = PesaButtonVariant.primary,
    this.icon,
    this.expand = false,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final PesaButtonVariant variant;
  final IconData? icon;
  final bool expand;
  final bool loading;

  (Color bg, Color fg, BorderSide side) _colors() {
    switch (variant) {
      case PesaButtonVariant.primary:
        return (PesaColors.ink, PesaColors.bgApp, BorderSide.none);
      case PesaButtonVariant.green:
        return (PesaColors.green, PesaColors.bgApp, BorderSide.none);
      case PesaButtonVariant.clay:
        return (PesaColors.clay, Colors.white, BorderSide.none);
      case PesaButtonVariant.ghost:
        return (Colors.black.withValues(alpha: 0.06), PesaColors.ink, BorderSide.none);
      case PesaButtonVariant.soft:
        return (PesaColors.bgCard, PesaColors.ink, const BorderSide(color: PesaColors.line));
    }
  }

  @override
  Widget build(BuildContext context) {
    final (bg, fg, side) = _colors();

    final child = loading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: fg),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[Icon(icon, size: 18, color: fg), const SizedBox(width: 8)],
              Text(
                label,
                style: GoogleFonts.geist(fontSize: 15, fontWeight: FontWeight.w600, color: fg),
              ),
            ],
          );

    final button = FilledButton(
      onPressed: loading ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: bg,
        disabledBackgroundColor: bg.withValues(alpha: 0.6),
        foregroundColor: fg,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(PesaRadius.pill),
          side: side,
        ),
        elevation: 0,
      ),
      child: child,
    );

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}

/// A circular 44×44 icon-only button (`.btn-icon` on the web).
class PesaIconButton extends StatelessWidget {
  const PesaIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.background,
    this.foreground,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final Color? background;
  final Color? foreground;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 44,
      height: 44,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: background ?? Colors.black.withValues(alpha: 0.06),
          foregroundColor: foreground ?? PesaColors.ink,
          shape: const CircleBorder(),
          padding: EdgeInsets.zero,
          elevation: 0,
        ),
        child: Icon(icon, size: 20),
      ),
    );
  }
}
