import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/payday_draft.dart';
import '../../core/widgets/pesa_bottom_nav.dart';
import '../auth/auth_provider.dart';
import '../bank/bank_screen.dart';
import '../pots/disburse_picker_sheet.dart';
import '../pots/pot_action_sheet.dart';
import '../pots/pot_actions_provider.dart';
import '../pots/pot_form_sheet.dart';
import 'bootstrap_provider.dart';
import 'widgets/disburse_hero_card.dart';
import 'widgets/pot_grid_tile.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

const _tabTitles = ['Home', 'Bank', 'Insights', 'Projects', 'Wrap', 'More'];

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final buckets = ref.watch(bootstrapProvider).value?.buckets ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Text(_tabTitles[_tabIndex]),
        actions: _tabIndex == 0
            ? [
                IconButton(
                  icon: const Icon(Icons.logout),
                  tooltip: 'Log out',
                  onPressed: () => ref.read(authControllerProvider.notifier).logout(),
                ),
              ]
            : null,
      ),
      body: IndexedStack(
        index: _tabIndex,
        children: const [
          _HomeTab(),
          BankScreen(),
          _PlaceholderTab(label: 'Insights — coming soon'),
          _PlaceholderTab(label: 'Projects — coming soon'),
          _PlaceholderTab(label: 'Wrap — coming soon'),
          _PlaceholderTab(label: 'More — coming soon'),
        ],
      ),
      bottomNavigationBar: PesaBottomNav(
        currentIndex: _tabIndex,
        onTap: (index) => setState(() => _tabIndex = index),
        onDisbursePressed: () => showDisbursePickerSheet(context, buckets),
      ),
    );
  }
}

class _PlaceholderTab extends StatelessWidget {
  const _PlaceholderTab({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Center(child: Text(label));
}

class _HomeTab extends ConsumerWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(bootstrapProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(bootstrapProvider.future),
        child: bootstrap.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) => ListView(
            children: [
              const SizedBox(height: 120),
              Center(child: Text('Could not load data.\n$error', textAlign: TextAlign.center)),
            ],
          ),
          data: (data) {
            final currency = data.profile.currency;
            final activeBuckets = data.buckets;
            final disbursed = activeBuckets.fold<int>(0, (sum, b) => sum + b.allocated);
            final filledCount = activeBuckets
                .where((b) => b.target > 0 && b.allocated >= b.target)
                .length;

            return CustomScrollView(
              key: const Key('home-pots-list'),
              slivers: [
                SliverToBoxAdapter(
                  child: DisburseHeroCard(
                    currency: currency,
                    salary: data.profile.salary,
                    disbursed: disbursed,
                    filledPotCount: filledCount,
                    totalPotCount: activeBuckets.length,
                    paydayTemplate: data.paydayTemplate,
                    onSendToPot: () => showDisbursePickerSheet(context, activeBuckets),
                    onReplayLastMonth: () => _replayLastMonth(context, ref, data.paydayTemplate),
                  ),
                ),
                if (activeBuckets.isEmpty)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(child: Text('No pots yet.')),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 1.15,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final bucket = activeBuckets[index];
                          return PotGridTile(
                            bucket: bucket,
                            currency: currency,
                            onTap: () => showPotActionSheet(
                              context: context,
                              bucket: bucket,
                              allBuckets: activeBuckets,
                            ),
                          );
                        },
                        childCount: activeBuckets.length,
                      ),
                    ),
                  ),
                const SliverToBoxAdapter(child: SizedBox(height: 80)),
              ],
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'home-add-pot-fab',
        onPressed: () => showCreatePotSheet(context),
        tooltip: 'Add pot',
        child: const Icon(Icons.add),
      ),
    );
  }

  Future<void> _replayLastMonth(
    BuildContext context,
    WidgetRef ref,
    List<PaydayDraft> paydayTemplate,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(potRepositoryProvider).applyPaydayTemplate(paydayTemplate);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
      return;
    }
    ref.invalidate(bootstrapProvider);
  }
}
