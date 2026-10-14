import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../format.dart';
import '../models/bucket.dart';
import '../theme/pesa_colors.dart';
import '../theme/pesa_metrics.dart';
import '../theme/pesa_theme.dart';

/// A dismissible banner that shows for [showFor] after it first appears,
/// remembered per [storageKey] on this device (the web uses localStorage).
class _TimedBanner extends StatefulWidget {
  const _TimedBanner({required this.storageKey, required this.showFor, required this.builder});

  final String storageKey;
  final Duration showFor;
  final Widget Function(VoidCallback dismiss) builder;

  @override
  State<_TimedBanner> createState() => _TimedBannerState();
}

class _TimedBannerState extends State<_TimedBanner> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    _decide();
  }

  @override
  void didUpdateWidget(_TimedBanner old) {
    super.didUpdateWidget(old);
    if (old.storageKey != widget.storageKey) _decide();
  }

  Future<void> _decide() async {
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now().millisecondsSinceEpoch;
    final stamp = prefs.getInt(widget.storageKey);
    var show = true;
    if (stamp == null) {
      await prefs.setInt(widget.storageKey, now); // first time: start the window
    } else {
      show = now - stamp <= widget.showFor.inMilliseconds;
    }
    if (mounted) setState(() => _visible = show);
  }

  Future<void> _dismiss() async {
    setState(() => _visible = false);
    final prefs = await SharedPreferences.getInstance();
    // Push the stamp past the window so it stays gone (a new key can still show).
    await prefs.setInt(
      widget.storageKey,
      DateTime.now().millisecondsSinceEpoch - widget.showFor.inMilliseconds - 1,
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: const Duration(milliseconds: 220),
      child: _visible ? widget.builder(_dismiss) : const SizedBox(width: double.infinity),
    );
  }
}

Widget _bannerCard({
  required Color bg,
  required Color fg,
  required IconData icon,
  required String title,
  required String subtitle,
  required VoidCallback onDismiss,
  bool serifTitle = false,
}) {
  return Padding(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
    child: Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 4, 12),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(PesaRadius.base)),
      child: Row(
        children: [
          Icon(icon, size: 18, color: fg),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: serifTitle
                      ? PesaTextStyles.serif(fontSize: 18, color: fg)
                      : TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: fg),
                ),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 12, color: fg.withValues(alpha: 0.8))),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Dismiss',
            onPressed: onDismiss,
            icon: Icon(LucideIcons.x, size: 16, color: fg),
          ),
        ],
      ),
    ),
  );
}

const _accumulating = {'future', 'emergency', 'debt'};

/// Ports pace-alert-banner.tsx: the spend-down pot most on track to blow
/// through its target this period (bills: by their due day). Shows for 3 days.
class PaceAlertBanner extends StatelessWidget {
  const PaceAlertBanner({super.key, required this.buckets, required this.currency});

  final List<Bucket> buckets;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final daysElapsed = now.day;
    final lastDay = DateTime(now.year, now.month + 1, 0).day;
    Bucket? worst;
    var worstRatio = 0.0;
    var worstOver = 0.0;
    for (final b in buckets) {
      if (_accumulating.contains(b.kind) || b.target <= 0 || b.spent <= 0) continue;
      final periodEnd = b.kind == 'bills' && b.dueDayOfMonth != null ? b.dueDayOfMonth! : lastDay;
      if (daysElapsed > periodEnd) continue; // period already over
      final projected = b.spent / daysElapsed * periodEnd;
      if (projected <= b.target) continue;
      final over = projected - b.target;
      if (over / b.target > worstRatio) {
        worstRatio = over / b.target;
        worstOver = over;
        worst = b;
      }
    }
    if (worst == null) return const SizedBox.shrink();
    final pot = worst;
    return _TimedBanner(
      storageKey: 'pesa.pace.${pot.id}.${now.year}-${now.month}',
      showFor: const Duration(days: 3),
      builder: (dismiss) => _bannerCard(
        bg: PesaColors.claySoft,
        fg: PesaColors.clayDeep,
        icon: LucideIcons.info,
        title: '${pot.name} is on pace to go over',
        subtitle: 'At this rate, about ${formatMoney(worstOver.round(), currency)} over target.',
        onDismiss: dismiss,
      ),
    );
  }
}

const _thresholds = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

/// Ports milestone-banner.tsx: the highest round-number milestone a savings
/// (or debt) pot's all-time balance has crossed. Shows for 7 days.
class MilestoneBanner extends StatelessWidget {
  const MilestoneBanner({super.key, required this.buckets, required this.currency});

  final List<Bucket> buckets;
  final String currency;

  @override
  Widget build(BuildContext context) {
    Bucket? best;
    var bestThreshold = 0;
    for (final b in buckets) {
      if (!_accumulating.contains(b.kind)) continue;
      final balance = b.projection?.lifetimeBalance ?? 0;
      var crossed = 0;
      for (final t in _thresholds) {
        if (balance >= t) {
          crossed = t;
        } else {
          break;
        }
      }
      if (crossed > bestThreshold) {
        bestThreshold = crossed;
        best = b;
      }
    }
    if (best == null) return const SizedBox.shrink();
    final pot = best;
    return _TimedBanner(
      storageKey: 'pesa.milestone.${pot.id}.$bestThreshold',
      showFor: const Duration(days: 7),
      builder: (dismiss) => _bannerCard(
        bg: PesaColors.greenTint,
        fg: PesaColors.greenDeep,
        icon: LucideIcons.sparkles,
        title:
            '${formatMoney(bestThreshold, currency)} ${pot.kind == 'debt' ? 'paid toward' : 'sent to'} ${pot.name}',
        subtitle: "Since you started. That's real.",
        serifTitle: true,
        onDismiss: dismiss,
      ),
    );
  }
}
