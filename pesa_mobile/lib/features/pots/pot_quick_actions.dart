import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/bucket.dart';
import '../../core/widgets/amount_note_dialog.dart';
import '../home/bootstrap_provider.dart';
import 'pot_actions_provider.dart';

/// Spend from [bucket] (amount + note dialog), used by the pot detail screen.
Future<void> runPotSpend(BuildContext context, Bucket bucket) async {
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

/// Move money from [bucket] to another pot, used by the pot detail screen.
Future<void> runPotTransfer(BuildContext context, Bucket bucket, List<Bucket> allBuckets) async {
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
