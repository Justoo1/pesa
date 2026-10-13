import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Maps the web app's `IconName` strings (`components/pesa/types.ts`) to a
/// close Lucide-style equivalent. The web app hand-draws all 30 icons as
/// inline SVGs; porting each as a pixel-exact `CustomPainter` is out of
/// scope for this design-parity pass — `lucide_icons` shares the same
/// rounded-stroke line-icon aesthetic, so glyphs are visually close but not
/// pixel-identical.
IconData pesaIconFor(String name) {
  switch (name) {
    case 'home':
      return LucideIcons.home;
    case 'piggy':
      return LucideIcons.piggyBank;
    case 'heart':
      return LucideIcons.heart;
    case 'leaf':
      return LucideIcons.leaf;
    case 'shield':
      return LucideIcons.shield;
    case 'sun':
      return LucideIcons.sun;
    case 'broom':
      return LucideIcons.paintbrush;
    case 'wifi':
      return LucideIcons.wifi;
    case 'flame':
      return LucideIcons.flame;
    case 'bulb':
      return LucideIcons.lightbulb;
    case 'plus':
      return LucideIcons.plus;
    case 'minus':
      return LucideIcons.minus;
    case 'back':
      return LucideIcons.arrowLeft;
    case 'close':
      return LucideIcons.x;
    case 'check':
      return LucideIcons.check;
    case 'chevron':
      return LucideIcons.chevronRight;
    case 'more':
      return LucideIcons.moreHorizontal;
    case 'spark':
      return LucideIcons.sparkles;
    case 'trend':
      return LucideIcons.trendingUp;
    case 'wallet':
      return LucideIcons.wallet;
    case 'settings':
      return LucideIcons.settings;
    case 'calendar':
      return LucideIcons.calendar;
    case 'history':
      return LucideIcons.history;
    case 'edit':
      return LucideIcons.pencil;
    case 'send':
      return LucideIcons.send;
    case 'scan':
      return LucideIcons.scanLine;
    case 'info':
      return LucideIcons.info;
    case 'share':
      return LucideIcons.share2;
    case 'tag':
      return LucideIcons.tag;
    case 'logout':
      return LucideIcons.logOut;
    case 'help':
      return LucideIcons.helpCircle;
    case 'flag':
      return LucideIcons.flag;
    case 'lock':
      return LucideIcons.lock;
    default:
      return LucideIcons.circle;
  }
}
