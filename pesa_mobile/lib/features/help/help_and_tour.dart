import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../auth/auth_provider.dart';
import '../home/bootstrap_provider.dart';

// ---------------------------------------------------------------------------
// First-run tour (ports components/pesa/tour/tour.tsx)
// ---------------------------------------------------------------------------

/// One stop on the tour: which tab it shows and what it says. Tab indexes
/// follow the bottom nav: 0 Home, 1 Bank, 2 Insights, 3 Projects, 4 Wrap, 5 More.
class TourStep {
  const TourStep(this.tab, this.title, this.body);

  final int tab;
  final String title;
  final String body;
}

const tourSteps = [
  TourStep(
    0,
    'This is your payday card',
    'It shows how much of your salary is still left to send to pots this month.',
  ),
  TourStep(
    0,
    'Your pots',
    "Tap any pot to top it up, spend from it, or see how it's tracking toward its target.",
  ),
  TourStep(
    1,
    'The Bank tab',
    'Your salary lands here automatically on payday. You can also add funds or log a personal spend any time.',
  ),
  TourStep(
    2,
    'Insights',
    'See your savings rate, financial health score, and net worth over time here.',
  ),
  TourStep(
    5,
    'More',
    'Set up pots, income sources, and payday reminders here — and come back to Help any time you need a refresher.',
  ),
];

/// The running tour's step index, or null when not running.
class TourController extends Notifier<int?> {
  @override
  int? build() => null;

  void start() => state = 0;

  void next() => state = (state ?? 0) + 1 >= tourSteps.length ? null : (state ?? 0) + 1;

  void stop() => state = null;
}

final tourProvider = NotifierProvider<TourController, int?>(TourController.new);

/// Starts the tour automatically the first time a user lands on Home, and
/// records completion on the server (finished or skipped) so it never
/// returns on its own — Help can replay it.
mixin FirstRunTour<T extends ConsumerStatefulWidget> on ConsumerState<T> {
  bool _autoStarted = false;

  void maybeStartTour() {
    if (_autoStarted) return;
    final profile = ref.read(bootstrapProvider).value?.profile;
    if (profile == null || profile.tourCompleted) return;
    _autoStarted = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(tourProvider.notifier).start();
    });
  }
}

Future<void> markTourDone(WidgetRef ref) async {
  try {
    await ref.read(apiClientProvider).dio.post<void>('/api/mobile/settings/tour-complete');
    ref.invalidate(bootstrapProvider);
  } catch (_) {
    // Best effort: worst case the tour offers itself again next launch.
  }
}

/// The coach card shown above the bottom nav while the tour runs.
class TourCard extends ConsumerWidget {
  const TourCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(tourProvider);
    if (index == null) return const SizedBox.shrink();
    final step = tourSteps[index];
    final last = index == tourSteps.length - 1;

    void finish() {
      ref.read(tourProvider.notifier).stop();
      markTourDone(ref);
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Material(
        color: PesaColors.ink,
        elevation: 8,
        borderRadius: BorderRadius.circular(PesaRadius.lg),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 12, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Text(
                    'STEP ${index + 1} OF ${tourSteps.length}',
                    style: PesaTextStyles.eyebrow(color: PesaColors.greenSoft),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(step.title, style: PesaTextStyles.serif(fontSize: 22, color: PesaColors.bgApp)),
              const SizedBox(height: 4),
              Text(
                step.body,
                style: TextStyle(fontSize: 13, color: PesaColors.bgApp.withValues(alpha: 0.85)),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: finish,
                    style: TextButton.styleFrom(foregroundColor: PesaColors.greenSoft),
                    child: const Text('Skip tour'),
                  ),
                  const SizedBox(width: 4),
                  FilledButton(
                    onPressed: last ? finish : () => ref.read(tourProvider.notifier).next(),
                    style: FilledButton.styleFrom(
                      backgroundColor: PesaColors.clay,
                      shape: const StadiumBorder(),
                    ),
                    child: Text(last ? 'Done' : 'Next'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Help (ports components/pesa/screens/help.tsx)
// ---------------------------------------------------------------------------

const _topics = [
  (
    'Pots & kinds',
    "A pot is a place for a slice of your salary to land — Rent, Mom, Savings, Tithe. Each pot has a target (its goal), an allocated amount (what's landed in it so far this month), and spent (what you've taken back out of it). Kinds shape how a pot behaves: Essential and Bills are things you spend down each month; Future and Emergency build up savings over time; Debt tracks a balance you're paying off; Give and People are for money that goes to others. A pot can't be filled past its target.",
  ),
  (
    'Payday & the bank',
    'Add your income sources in More — their total becomes your salary. On your payday (set it in More → Payday), that amount is credited to your Bank balance automatically. Sending money to a pot debits the bank; adding funds or logging a personal spend on the Bank tab moves money too. Archiving a pot returns whatever is left in it to the bank.',
  ),
  (
    'Debt pots',
    'Create a pot with kind "Debt" and set its target to the total you owe. Every payment you send to it counts toward paying it off — the pot shows how much you\'ve paid and how much is still owed.',
  ),
  (
    'Carry-over',
    "By default, a pot's progress resets to zero at the start of each month. Turn on \"Carry over\" when editing a pot to keep any unspent balance instead — useful for a pot where you don't always spend the full amount. Carried money doesn't count against this month's salary.",
  ),
  (
    'Insights & financial health score',
    "The Insights tab shows your savings rate, a 6-month flow chart, and a financial health score — a 0–100 blend of your savings rate, how many months of essentials your Emergency pot could cover, and how much debt you're carrying relative to your salary.",
  ),
  (
    'Net worth',
    "Net worth adds up the all-time balance of every Future, Emergency, and Debt pot — tap the net worth card on Insights to see what's contributing and how much has come in each month.",
  ),
  (
    'More things worth knowing',
    'Round-ups send the spare change from a top-up into your first Future pot. "Replay last month" on Home re-sends last month\'s amounts to the same pots in one tap. Past months can be filled in from Insights → Past months. "Reset this month" clears this month\'s transactions and pot progress — it can\'t be undone.',
  ),
];

class HelpScreen extends ConsumerWidget {
  const HelpScreen({super.key, required this.onReplayTour});

  final VoidCallback onReplayTour;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final serif = PesaTextStyles.serif(fontSize: 28);
    return Scaffold(
      appBar: AppBar(title: const Text('Help')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Text.rich(
            TextSpan(
              style: serif,
              children: [
                const TextSpan(text: 'How Pesa '),
                TextSpan(
                  text: 'works.',
                  style: serif.copyWith(fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          PesaCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                for (final (title, body) in _topics)
                  ExpansionTile(
                    shape: const Border(),
                    title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                    children: [
                      Text(body, style: const TextStyle(color: PesaColors.ink2, height: 1.4)),
                    ],
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          PesaButton(
            label: 'Replay the tour',
            icon: LucideIcons.compass,
            variant: PesaButtonVariant.soft,
            expand: true,
            onPressed: onReplayTour,
          ),
        ],
      ),
    );
  }
}
