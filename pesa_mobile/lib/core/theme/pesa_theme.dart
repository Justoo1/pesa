import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'pesa_colors.dart';
import 'pesa_metrics.dart';

/// Ad-hoc text styles for the two utility classes the web app applies
/// outside its base type scale: `.serif` (Instrument Serif, used for
/// display numbers/headlines) and `.num` (JetBrains Mono tabular figures,
/// used for every money amount).
class PesaTextStyles {
  PesaTextStyles._();

  static TextStyle serif({double fontSize = 16, Color? color, FontStyle? fontStyle}) =>
      GoogleFonts.instrumentSerif(
        fontSize: fontSize,
        color: color ?? PesaColors.ink,
        fontStyle: fontStyle,
        letterSpacing: -0.005 * fontSize,
        height: 1.0,
      );

  static TextStyle num({double fontSize = 15, Color? color, FontWeight? fontWeight}) =>
      GoogleFonts.jetBrainsMono(
        fontSize: fontSize,
        color: color ?? PesaColors.ink,
        fontWeight: fontWeight ?? FontWeight.w500,
        fontFeatures: const [FontFeature.tabularFigures()],
      );

  static TextStyle eyebrow({Color? color}) => GoogleFonts.geist(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.32, // 0.12em @ 11px
    color: color ?? PesaColors.ink3,
  );
}

ThemeData buildPesaTheme() {
  final base = GoogleFonts.geistTextTheme();

  final textTheme = base
      .copyWith(
        displayLarge: GoogleFonts.instrumentSerif(
          fontSize: 72,
          height: 0.95,
          letterSpacing: -1.44,
          color: PesaColors.ink,
        ),
        displayMedium: GoogleFonts.instrumentSerif(
          fontSize: 56,
          height: 0.95,
          letterSpacing: -1.12,
          color: PesaColors.ink,
        ),
        displaySmall: GoogleFonts.instrumentSerif(
          fontSize: 40,
          height: 1.0,
          letterSpacing: -0.6,
          color: PesaColors.ink,
        ),
        headlineSmall: GoogleFonts.instrumentSerif(
          fontSize: 28,
          height: 1.05,
          letterSpacing: -0.28,
          color: PesaColors.ink,
        ),
        titleLarge: GoogleFonts.geist(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: PesaColors.ink,
        ),
        titleMedium: GoogleFonts.geist(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: PesaColors.ink,
        ),
        bodyLarge: GoogleFonts.geist(fontSize: 15, height: 1.45, color: PesaColors.ink2),
        bodyMedium: GoogleFonts.geist(fontSize: 15, height: 1.45, color: PesaColors.ink2),
        bodySmall: GoogleFonts.geist(fontSize: 13, height: 1.4, color: PesaColors.ink3),
        labelSmall: GoogleFonts.geist(fontSize: 11, height: 1.3, color: PesaColors.ink3),
      )
      .apply(bodyColor: PesaColors.ink, displayColor: PesaColors.ink);

  final colorScheme =
      ColorScheme.fromSeed(seedColor: PesaColors.green, brightness: Brightness.light).copyWith(
        primary: PesaColors.green,
        onPrimary: PesaColors.bgApp,
        secondary: PesaColors.clay,
        onSecondary: PesaColors.bgApp,
        surface: PesaColors.bgCard,
        onSurface: PesaColors.ink,
        error: const Color(0xFFB3261E),
      );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: PesaColors.bgApp,
    textTheme: textTheme,
    dividerColor: PesaColors.line,
    appBarTheme: AppBarTheme(
      backgroundColor: PesaColors.bgApp,
      foregroundColor: PesaColors.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      titleTextStyle: GoogleFonts.geist(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: PesaColors.ink,
      ),
    ),
    cardTheme: CardThemeData(
      color: PesaColors.bgCard,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(PesaRadius.lg)),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: PesaColors.bgElev,
      contentPadding: const EdgeInsets.all(14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: PesaColors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: PesaColors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: PesaColors.green, width: 2),
      ),
      labelStyle: GoogleFonts.geist(color: PesaColors.ink3),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: PesaColors.ink,
        foregroundColor: PesaColors.bgApp,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(PesaRadius.pill)),
        textStyle: GoogleFonts.geist(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: PesaColors.ink2,
        textStyle: GoogleFonts.geist(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
