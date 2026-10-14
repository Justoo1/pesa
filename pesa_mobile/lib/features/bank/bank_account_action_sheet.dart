import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/models/bank_account.dart';
import '../../core/models/bank_transaction.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/amount_note_dialog.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../home/bootstrap_provider.dart';
import 'bank_actions_provider.dart';
import 'bank_statement.dart';

/// Ports the web app's `AccountDetailSheet`: balance, the account's own
/// statement, quick actions, and (non-primary only) archive.
Future<void> showBankAccountDetailSheet({
  required BuildContext context,
  required BankAccount account,
  required List<BankAccount> allAccounts,
  required List<BankTransaction> ledger,
  required String currency,
}) {
  final format = NumberFormat.decimalPattern();
  final accountLedger = ledger.where((t) => t.accountId == account.id).toList();

  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: PesaColors.bgApp,
    // Named distinctly from the outer `context` on purpose: the sheet's own
    // context is disposed the instant it's popped below, so the follow-up
    // dialog/provider work must run against the caller's stable `context`.
    builder: (sheetContext) {
      void then(Future<void> Function(BuildContext) action) {
        Navigator.of(sheetContext).pop();
        action(context);
      }

      return FractionallySizedBox(
        heightFactor: 0.85,
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              Center(child: Text(account.name, style: PesaTextStyles.serif(fontSize: 24))),
              const SizedBox(height: 16),
              PesaCard(
                color: PesaColors.bgElev,
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    Text('BALANCE', style: PesaTextStyles.eyebrow()),
                    const SizedBox(height: 6),
                    Text(
                      '${account.balance < 0 ? '−' : ''}$currency${format.format(account.balance.abs())}',
                      style: PesaTextStyles.num(fontSize: 30, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  PesaButton(
                    label: 'Add funds',
                    icon: LucideIcons.plus,
                    variant: PesaButtonVariant.clay,
                    onPressed: () => then((c) => runAddFunds(c, account)),
                  ),
                  PesaButton(
                    label: 'Personal spend',
                    icon: LucideIcons.minus,
                    variant: PesaButtonVariant.soft,
                    onPressed: () => then((c) => runBankSpend(c, account)),
                  ),
                  if (allAccounts.length > 1)
                    PesaButton(
                      label: 'Transfer to another account',
                      icon: LucideIcons.arrowLeftRight,
                      variant: PesaButtonVariant.soft,
                      onPressed: () => then((c) => runBankTransfer(c, account, allAccounts)),
                    ),
                ],
              ),
              const SizedBox(height: 20),
              Text('Statement', style: PesaTextStyles.serif(fontSize: 20)),
              const SizedBox(height: 10),
              BankStatement(ledger: accountLedger, currency: currency),
              if (!account.isPrimary) ...[
                const SizedBox(height: 20),
                TextButton(
                  style: TextButton.styleFrom(foregroundColor: PesaColors.clayDeep),
                  onPressed: () => then((c) => _runArchive(c, account)),
                  child: const Text('Archive this account'),
                ),
              ],
            ],
          ),
        ),
      );
    },
  );
}

Future<void> runAddFunds(BuildContext context, BankAccount account) async {
  final result = await showAmountNoteDialog(
    context: context,
    title: 'Add funds to ${account.name}',
    submitLabel: 'Add',
  );
  if (result == null || !context.mounted) return;
  await _run(
    context,
    (container) => container
        .read(bankRepositoryProvider)
        .addFunds(accountId: account.id, amount: result.amount, note: result.note),
  );
}

Future<void> runBankSpend(BuildContext context, BankAccount account) async {
  final result = await showAmountNoteDialog(
    context: context,
    title: 'Spend from ${account.name}',
    submitLabel: 'Spend',
  );
  if (result == null || !context.mounted) return;
  await _run(
    context,
    (container) => container
        .read(bankRepositoryProvider)
        .spend(accountId: account.id, amount: result.amount, note: result.note),
  );
}

Future<void> runBankTransfer(
  BuildContext context,
  BankAccount account,
  List<BankAccount> allAccounts,
) async {
  final others = allAccounts.where((a) => a.id != account.id).toList();
  final result = await showAmountNoteDialog(
    context: context,
    title: 'Transfer from ${account.name}',
    submitLabel: 'Transfer',
    targetLabel: 'To account',
    targetOptions: others.map((a) => TargetOption(id: a.id, label: a.name)).toList(),
  );
  if (result == null || !context.mounted) return;
  await _run(
    context,
    (container) => container
        .read(bankRepositoryProvider)
        .transfer(
          fromAccountId: account.id,
          toAccountId: result.targetId!,
          amount: result.amount,
          note: result.note,
        ),
  );
}

Future<void> _runArchive(BuildContext context, BankAccount account) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text('Archive "${account.name}"?'),
      content: const Text('Its balance must be zero first.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(false),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(true),
          child: const Text('Archive'),
        ),
      ],
    ),
  );
  if (confirmed != true || !context.mounted) return;
  await _run(
    context,
    (container) => container.read(bankRepositoryProvider).archiveAccount(account.id),
  );
}

Future<void> _run(
  BuildContext context,
  Future<void> Function(ProviderContainer container) action,
) async {
  final container = ProviderScope.containerOf(context);
  final messenger = ScaffoldMessenger.of(context);
  try {
    await action(container);
  } catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    return;
  }
  container.invalidate(bootstrapProvider);
}
