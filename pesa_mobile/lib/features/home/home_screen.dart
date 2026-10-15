import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/push/push_service.dart';
import '../../core/models/payday_draft.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/async_data_view.dart';
import '../../core/widgets/mini_stat.dart';
import '../../core/widgets/nudge_banners.dart';
import '../../core/widgets/pesa_bottom_nav.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../auth/auth_provider.dart';
import '../bank/bank_screen.dart';
import '../help/help_and_tour.dart';
import '../insights/insights_screen.dart';
import '../pots/disburse_flow.dart';
import '../pots/pot_actions_provider.dart';
import '../pots/pot_editor_sheet.dart';
import '../projects/projects_screen.dart';
import '../settings/settings_screen.dart';
import '../wrap/wrap_screen.dart';
import 'bootstrap_provider.dart';
import 'widgets/disburse_hero_card.dart';
import 'widgets/pot_grid_tile.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> with FirstRunTour {
  int _tabIndex = 0;

  @override
  void initState() {
    super.initState();
    // Signed in: keep this phone's push token registered (no-op without Firebase).
    PushService.syncIfPermitted(ref.read(apiClientProvider));
  }

  void _goTo(int index) => setState(() => _tabIndex = index);

  @override
  Widget build(BuildContext context) {
    // The first-run tour walks across tabs: follow it.
    ref.listen<int?>(tourProvider, (_, step) {
      if (step != null) _goTo(tourSteps[step].tab);
    });
    if (ref.watch(bootstrapProvider).hasValue) maybeStartTour();

    return Scaffold(
      // Every tab renders its own web-style header; no AppBar.
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: IndexedStack(
                index: _tabIndex,
                children: [
                  _HomeTab(onOpenWrap: () => _goTo(4)),
                  const BankScreen(),
                  const InsightsScreen(),
                  const ProjectsScreen(),
                  WrapScreen(active: _tabIndex == 4),
                  const SettingsScreen(),
                ],
              ),
            ),
            const Positioned(left: 0, right: 0, bottom: 0, child: TourCard()),
          ],
        ),
      ),
      bottomNavigationBar: PesaBottomNav(
        currentIndex: _tabIndex,
        onTap: _goTo,
        onDisbursePressed: () => showDisburseFlow(context),
      ),
    );
  }
}

String _greetingFor(int hour) {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 22) return 'Evening';
  return 'Night';
}

/// Ports `components/pesa/screens/home.tsx`.
class _HomeTab extends ConsumerWidget {
  const _HomeTab({required this.onOpenWrap});

  final VoidCallback onOpenWrap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AsyncDataView(
      value: ref.watch(bootstrapProvider),
      onRefresh: () => ref.refresh(bootstrapProvider.future),
      builder: (data) {
        final currency = data.profile.currency;
        final buckets = data.buckets;
        final salary = data.profile.salary;
        final disbursed = buckets.fold<int>(0, (sum, b) => sum + b.sentThisMonth);
        final totalTarget = buckets.fold<int>(0, (sum, b) => sum + b.target);
        final filledCount = buckets.where((b) => b.allocated >= b.target).length;
        final serif = PesaTextStyles.serif(fontSize: 30);

        return CustomScrollView(
          key: const Key('home-pots-list'),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${data.profile.monthLabel} · Disbursement'.toUpperCase(),
                            style: PesaTextStyles.eyebrow(),
                          ),
                          const SizedBox(height: 4),
                          Text.rich(
                            TextSpan(
                              style: serif,
                              children: [
                                TextSpan(text: '${_greetingFor(DateTime.now().hour)}, '),
                                TextSpan(
                                  text: '${data.profile.displayName}.',
                                  style: serif.copyWith(fontStyle: FontStyle.italic),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    PesaIconButton(
                      // Material's logout glyph (the auth tests look for it).
                      icon: Icons.logout,
                      onPressed: () => ref.read(authControllerProvider.notifier).logout(),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: PaceAlertBanner(buckets: buckets, currency: currency),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
                child: DisburseHeroCard(
                  currency: currency,
                  salary: salary,
                  disbursed: disbursed,
                  filledPotCount: filledCount,
                  totalPotCount: buckets.length,
                  paydayTemplateSize: data.paydayTemplate.length,
                  onSendToPot: () => showDisburseFlow(context),
                  onOpenWrap: onOpenWrap,
                  onReplayLastMonth: () => _replayLastMonth(context, ref, data.paydayTemplate),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: MiniStat(
                          label: 'Salary',
                          value: formatMoney(salary, currency),
                          tint: 'green',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MiniStat(
                          label: 'Disbursed',
                          value: formatMoney(disbursed, currency),
                          tint: 'clay',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MiniStat(
                          label: 'Spendable',
                          value: formatMoney(math.max(0, salary - totalTarget), currency),
                          tint: 'gold',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 12, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Your pots', style: PesaTextStyles.serif(fontSize: 22)),
                    TextButton.icon(
                      // Like the web's "Edit": opens Pots & targets (add, edit,
                      // reorder, archive).
                      onPressed: () => context.push('/pots'),
                      icon: const Icon(LucideIcons.pencil, size: 14),
                      label: const Text('Edit'),
                      style: TextButton.styleFrom(
                        foregroundColor: PesaColors.ink2,
                        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (buckets.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                  child: PesaCard(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      children: [
                        Text('No pots yet', style: PesaTextStyles.serif(fontSize: 22)),
                        const SizedBox(height: 8),
                        const Text(
                          'Create your first pot to start carving up your salary.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 14),
                        PesaButton(
                          label: 'Create a pot',
                          icon: LucideIcons.plus,
                          variant: PesaButtonVariant.green,
                          onPressed: () => showPotEditorSheet(context),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.35,
                  ),
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final bucket = buckets[index];
                    return PotGridTile(
                      bucket: bucket,
                      currency: currency,
                      onTap: () => context.push('/pots/${bucket.id}'),
                    );
                  }, childCount: buckets.length),
                ),
              ),
          ],
        );
      },
    );
  }

  Future<void> _replayLastMonth(
    BuildContext context,
    WidgetRef ref,
    List<PaydayDraft> paydayTemplate,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    if (paydayTemplate.isEmpty) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Nothing to replay yet — last month had no disbursements.')),
      );
      return;
    }
    try {
      await ref.read(potRepositoryProvider).applyPaydayTemplate(paydayTemplate);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
      return;
    }
    ref.invalidate(bootstrapProvider);
  }
}
