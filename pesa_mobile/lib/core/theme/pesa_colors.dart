import 'package:flutter/material.dart';

/// Design tokens ported verbatim from the web app's `app/globals.css`
/// `:root` block — this is the single warm/earthy palette Pesa uses; there
/// is no dark mode on the web app, so there isn't one here either.
class PesaColors {
  PesaColors._();

  static const bgCanvas = Color(0xFFE8DEC8);
  static const bgApp = Color(0xFFF4EBD9);
  static const bgCard = Color(0xFFFBF5E7);
  static const bgElev = Color(0xFFFFFAEC);

  static const ink = Color(0xFF211A12);
  static const ink2 = Color(0xFF4A3F31);
  static const ink3 = Color(0xFF8A7F6B);
  static const line = Color(0xFFE1D5B8);

  static const green = Color(0xFF3D5234);
  static const greenDeep = Color(0xFF2A3A22);
  static const greenSoft = Color(0xFFB5C29A);
  static const greenTint = Color(0xFFDDE5C8);

  static const clay = Color(0xFFC9714B);
  static const clayDeep = Color(0xFF9F5234);
  static const claySoft = Color(0xFFECC0A8);

  static const gold = Color(0xFFC8973A);
  static const rose = Color(0xFFD89280);

  // One-off literal used only by the home hero card gradient (not a
  // tokenized :root variable on the web either).
  static const greenHeroEnd = Color(0xFF4A6240);

  // Bank tab hero card — literals from `components/pesa/screens/bank.tsx`
  // (inline styles there, not :root tokens).
  static const bankNavyStart = Color(0xFF23283A);
  static const bankNavyMid = Color(0xFF333C57);
  static const bankNavyEnd = Color(0xFF454F72);
  static const bankMist = Color(0xFFC9CEE0);
  static const bankMistText = Color(0xFFDCE0F0);
  static const bankOverdrawn = Color(0xFFF3C9C0);

  /// (background, foreground) chip colors per `BucketColor`, ported from
  /// the `.row-icon.{color}` CSS classes. `sage` is visually identical to
  /// `green` as a flat chip — they only diverge in flow-bar gradients,
  /// which don't apply to a solid chip.
  static (Color bg, Color fg) chipColors(String bucketColor) {
    switch (bucketColor) {
      case 'clay':
        return (claySoft, clayDeep);
      case 'gold':
        return (const Color(0xFFF1E1B8), const Color(0xFF6E4F12));
      case 'rose':
        return (const Color(0xFFF4D8CE), const Color(0xFF8B3A1F));
      case 'sage':
        return (greenTint, green);
      case 'green':
      default:
        return (greenTint, greenDeep);
    }
  }
}
