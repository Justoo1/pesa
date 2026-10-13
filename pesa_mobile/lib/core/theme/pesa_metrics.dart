import 'package:flutter/material.dart';

/// Radius/shadow tokens ported from `app/globals.css` (`--radius-*`,
/// `--shadow-*`).
class PesaRadius {
  PesaRadius._();

  static const sm = 10.0;
  static const base = 18.0;
  static const lg = 28.0;
  static const xl = 36.0;
  static const pill = 999.0;
}

class PesaShadows {
  PesaShadows._();

  static const sm = [
    BoxShadow(color: Color(0x0A211A12), offset: Offset(0, 1)),
    BoxShadow(color: Color(0x0D211A12), offset: Offset(0, 2), blurRadius: 4),
  ];

  static const base = [
    BoxShadow(color: Color(0x0A211A12), offset: Offset(0, 2)),
    BoxShadow(color: Color(0x14211A12), offset: Offset(0, 8), blurRadius: 24),
  ];
}
