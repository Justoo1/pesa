import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/mini_stat.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../../core/widgets/screen_header.dart';
import '../home/bootstrap_provider.dart';
import 'months_repository.dart';

Widget _asyncBody<T>(
  AsyncValue<T> value,
  Future<void> Function() onRefresh,
  Widget Function(T data) builder,
) {
  return RefreshIndicator(
    onRefresh: onRefresh,
    child: value.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => ListView(
        children: [
          const SizedBox(height: 120),
          Center(child: Text('Could not load data.\n$error', textAlign: TextAlign.center)),
        ],
      ),
      data: builder,
    ),
  );
}

/// Ports `app/months/page.tsx`: every month with activity, newest first.
class MonthsScreen extends ConsumerWidget {
  const MonthsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currency = ref.watch(bootstrapProvider).value?.profile.currency ?? '';
    final months = ref.watch(monthsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Past months')),
      body: _asyncBody(
        months,
        () => ref.refresh(monthsListProvider.future),
        (rows) => ListView(
          padding: const EdgeInsets.fromLTRB(0, 0, 0, 28),
          children: [
            const ScreenHeader(
              eyebrow: 'History',
              title: 'Where it went,',
              italic: 'month by month.',
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: PesaCard(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: rows.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(18),
                        child: Center(child: Text('No history yet.')),
                      )
                    : Column(
                        children: [
                          for (final m in rows)
                            ListTile(
                              leading: const Icon(LucideIcons.calendar, size: 18),
                              title: Text(
                                m.label,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                              ),
                              subtitle: Text(
                                'Saved ${formatMoney(m.saved, currency)} · '
                                'Gave ${formatMoney(m.gave, currency)} · '
                                'Lived ${formatMoney(m.lived, currency)}',
                                style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
                              ),
                              trailing: const Icon(LucideIcons.chevronRight, size: 14),
                              onTap: () => context.push('/months/${m.ym}'),
                            ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Ports `app/months/[ym]/page.tsx`: saved/gave/lived tiles, total, and
/// every pot transaction that month.
class MonthDetailScreen extends ConsumerWidget {
  const MonthDetailScreen({super.key, required this.ym});

  final String ym;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currency = ref.watch(bootstrapProvider).value?.profile.currency ?? '';
    final detail = ref.watch(monthDetailProvider(ym));

    return Scaffold(
      appBar: AppBar(title: Text(detail.value?.label ?? '')),
      body: _asyncBody(
        detail,
        () => ref.refresh(monthDetailProvider(ym).future),
        (d) => ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          children: [
            Row(
              children: [
                Expanded(
                  child: MiniStat(
                    label: 'Saved',
                    value: formatMoney(d.saved, currency),
                    tint: 'green',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: MiniStat(
                    label: 'Gave',
                    value: formatMoney(d.gave, currency),
                    tint: 'gold',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: MiniStat(
                    label: 'Lived',
                    value: formatMoney(d.lived, currency),
                    tint: 'clay',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            PesaCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('TOTAL DISBURSED', style: PesaTextStyles.eyebrow()),
                  const SizedBox(height: 4),
                  Text(
                    formatMoney(d.total, currency),
                    style: PesaTextStyles.num(fontSize: 22, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            PesaCard(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: d.transactions.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(18),
                      child: Center(child: Text('No transfers this month.')),
                    )
                  : Column(
                      children: [
                        for (final t in d.transactions)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            child: Row(
                              children: [
                                RowIconChip(
                                  color: t.bucketColor,
                                  icon: pesaIconFor(t.bucketIcon),
                                  size: 36,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        t.note,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        '${formatTxnDate(t.occurredAt)} · ${t.bucketName} · ${t.method}',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: PesaColors.ink3,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${t.amount >= 0 ? '+' : ''}${formatMoney(t.amount, currency)}',
                                  style: PesaTextStyles.num(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
