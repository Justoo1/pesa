import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/bank_account.dart';
import '../../core/widgets/amount_note_dialog.dart';
import '../home/bootstrap_provider.dart';
import 'bank_actions_provider.dart';

Future<void> showBankAccountActionSheet({
  required BuildContext context,
  required BankAccount account,
  required List<BankAccount> allAccounts,
}) {
  return showModalBottomSheet(
    context: context,
    // Named distinctly from the outer `context` on purpose: the sheet's own
    // context is disposed the instant it's popped below, so the follow-up
    // dialog/provider work must run against the caller's stable `context`.
    builder: (sheetContext) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.add),
            title: const Text('Add funds'),
            onTap: () {
              Navigator.of(sheetContext).pop();
              _runAddFunds(context, account);
            },
          ),
          ListTile(
            leading: const Icon(Icons.remove),
            title: const Text('Personal spend'),
            onTap: () {
              Navigator.of(sheetContext).pop();
              _runSpend(context, account);
            },
          ),
          if (allAccounts.length > 1)
            ListTile(
              leading: const Icon(Icons.swap_horiz),
              title: const Text('Transfer to another account'),
              onTap: () {
                Navigator.of(sheetContext).pop();
                _runTransfer(context, account, allAccounts);
              },
            ),
        ],
      ),
    ),
  );
}

Future<void> _runAddFunds(BuildContext context, BankAccount account) async {
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

Future<void> _runSpend(BuildContext context, BankAccount account) async {
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

Future<void> _runTransfer(
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
