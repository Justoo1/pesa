import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/income_source.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../home/bootstrap_provider.dart';
import 'settings_repository.dart';

/// Ports `components/pesa/screens/income-sources.tsx`: monthly income is the
/// sum of active sources (the server resyncs `User.salary` on every change).
class IncomeSourcesScreen extends ConsumerWidget {
  const IncomeSourcesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(bootstrapProvider).value;
    final currency = data?.profile.currency ?? '';
    final sources = data?.incomeSources ?? const <IncomeSource>[];

    Future<void> run(Future<void> Function(SettingsRepository repo) action) async {
      final messenger = ScaffoldMessenger.of(context);
      try {
        await action(ref.read(settingsRepositoryProvider));
        ref.invalidate(bootstrapProvider);
      } catch (e) {
        messenger.showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }

    void openForm([IncomeSource? existing]) {
      showFormSheet(
        context: context,
        title: existing == null ? 'New income source' : 'Edit income source',
        submitLabel: existing == null ? 'Add' : 'Save',
        fields: [
          FormFieldSpec(key: 'name', label: 'Name', initial: existing?.name ?? '', maxLength: 40),
          FormFieldSpec(
            key: 'amount',
            label: 'Monthly amount',
            initial: existing == null ? '' : '${existing.amount}',
            numeric: true,
          ),
        ],
        onSubmit: (v) async {
          final repo = ref.read(settingsRepositoryProvider);
          final amount = int.parse(v['amount']!);
          if (existing == null) {
            await repo.createIncomeSource(name: v['name']!, amount: amount);
          } else {
            await repo.updateIncomeSource(id: existing.id, name: v['name']!, amount: amount);
          }
          ref.invalidate(bootstrapProvider);
        },
        destructive: existing == null
            ? null
            : FormSheetAction(
                label: 'Delete',
                confirm: 'Delete "${existing.name}"?',
                onPressed: () async {
                  await ref.read(settingsRepositoryProvider).deleteIncomeSource(existing.id);
                  ref.invalidate(bootstrapProvider);
                },
              ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Income sources')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          PesaCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('MONTHLY INCOME', style: PesaTextStyles.eyebrow()),
                const SizedBox(height: 4),
                Text(
                  formatMoney(data?.profile.salary ?? 0, currency),
                  style: PesaTextStyles.num(fontSize: 26, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Sum of active sources — credited to your primary account each payday.',
                  style: TextStyle(fontSize: 12, color: PesaColors.ink3),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          PesaCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: sources.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(18),
                    child: Center(child: Text('No income sources yet.')),
                  )
                : Column(
                    children: [
                      for (final s in sources)
                        ListTile(
                          title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            formatMoney(s.amount, currency),
                            style: PesaTextStyles.num(fontSize: 12, color: PesaColors.ink3),
                          ),
                          onTap: () => openForm(s),
                          trailing: Switch(
                            value: s.active,
                            onChanged: (on) =>
                                run((repo) => repo.toggleIncomeSource(id: s.id, active: on)),
                          ),
                        ),
                    ],
                  ),
          ),
          const SizedBox(height: 14),
          PesaButton(
            label: 'Add income source',
            icon: LucideIcons.plus,
            variant: PesaButtonVariant.soft,
            expand: true,
            onPressed: openForm,
          ),
        ],
      ),
    );
  }
}
