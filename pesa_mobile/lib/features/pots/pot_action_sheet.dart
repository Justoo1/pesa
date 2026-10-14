import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/bucket.dart';
import '../../core/widgets/amount_note_dialog.dart';
import '../home/bootstrap_provider.dart';
import 'disburse_flow.dart';
import 'pot_actions_provider.dart';

Future<void> showPotActionSheet({
  required BuildContext context,
  required Bucket bucket,
  required List<Bucket> allBuckets,
}) {
  return showModalBottomSheet(
    context: context,
    // Named distinctly from the outer `context` on purpose: the sheet's own
    // context is disposed the instant it's popped below, so the follow-up
    // dialog/provider work must run against the caller's stable `context`,
    // not this one.
    builder: (sheetContext) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.arrow_downward),
            title: const Text('Disburse into this pot'),
            onTap: () {
              Navigator.of(sheetContext).pop();
              showDisburseFlow(context, bucket: bucket);
            },
          ),
          ListTile(
            leading: const Icon(Icons.remove_circle_outline),
            title: const Text('Spend from this pot'),
            onTap: () {
              Navigator.of(sheetContext).pop();
              _runSpend(context, bucket);
            },
          ),
          ListTile(
            leading: const Icon(Icons.swap_horiz),
            title: const Text('Transfer to another pot'),
            onTap: () {
              Navigator.of(sheetContext).pop();
              _runTransfer(context, bucket, allBuckets);
            },
          ),
        ],
      ),
    ),
  );
}

Future<void> _runSpend(BuildContext context, Bucket bucket) async {
  final result = await showAmountNoteDialog(
    context: context,
    title: 'Spend from ${bucket.name}',
    submitLabel: 'Spend',
  );
  if (result == null || !context.mounted) return;
  await _run(
    context,
    (container) => container
        .read(potRepositoryProvider)
        .spend(bucketId: bucket.id, amount: result.amount, note: result.note),
  );
}

Future<void> _runTransfer(BuildContext context, Bucket bucket, List<Bucket> allBuckets) async {
  final others = allBuckets.where((b) => b.id != bucket.id).toList();
  final result = await showAmountNoteDialog(
    context: context,
    title: 'Transfer from ${bucket.name}',
    submitLabel: 'Transfer',
    targetLabel: 'To pot',
    targetOptions: others.map((b) => TargetOption(id: b.id, label: b.name)).toList(),
  );
  if (result == null || !context.mounted) return;
  await _run(
    context,
    (container) => container
        .read(potRepositoryProvider)
        .transfer(
          fromBucketId: bucket.id,
          toBucketId: result.targetId!,
          amount: result.amount,
          note: result.note,
        ),
  );
}

/// Runs an action, invalidates the dashboard on success, and surfaces the
/// server's exact error message on failure via a SnackBar.
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
