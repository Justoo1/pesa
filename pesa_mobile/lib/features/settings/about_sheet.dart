import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../core/links.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/pot_painter.dart';

/// Ports components/pesa/screens/about.tsx: what Pesa is, the version, and
/// the policy links.
Future<void> showAboutPesaSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: PesaColors.bgApp,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(PesaRadius.lg)),
    ),
    builder: (_) => const _AboutSheet(),
  );
}

class _AboutSheet extends StatelessWidget {
  const _AboutSheet();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: PesaColors.line,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              SizedBox(
                width: 56,
                height: 56,
                child: CustomPaint(
                  painter: PotPainter(
                    t: 1,
                    center: const Offset(28, 30),
                    unit: 1.9,
                    fromFill: 0.7,
                    toFill: 0.7,
                    sparkles: false,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('About Pesa', style: PesaTextStyles.serif(fontSize: 26)),
                  FutureBuilder<PackageInfo>(
                    future: PackageInfo.fromPlatform(),
                    builder: (context, snap) => Text(
                      snap.hasData
                          ? 'Version ${snap.data!.version} (${snap.data!.buildNumber})'
                          : ' ',
                      style: const TextStyle(fontSize: 12, color: PesaColors.ink3),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          PesaCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Every cedi, a place to land.',
                  style: PesaTextStyles.serif(fontSize: 24, color: PesaColors.ink),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Move your salary into pots — Rent, Mom, Savings, Tithe — and watch each one '
                  "fill. Pesa tracks what's left to disburse, what's already where it should be, "
                  'and how it all adds up over months.',
                  style: TextStyle(color: PesaColors.ink2, height: 1.45),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Pesa is a planner: it never holds or moves real money, and never connects to '
                  'your bank.',
                  style: TextStyle(color: PesaColors.ink3, fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final (label, uri) in [
                ('Privacy policy', PesaLinks.privacy),
                ('Terms of use', PesaLinks.terms),
                ('Support', PesaLinks.support),
                ('Website', PesaLinks.page('')),
              ])
                ActionChip(
                  label: Text(label),
                  onPressed: () => openLink(context, uri),
                  backgroundColor: PesaColors.bgCard,
                  side: const BorderSide(color: PesaColors.line),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
