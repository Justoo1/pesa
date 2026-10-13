import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/bucket.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/widgets/amount_note_dialog.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../home/bootstrap_provider.dart';
import 'pot_actions_provider.dart';

/// The bottom nav's center "Disburse" FAB: pick a pot, then an amount —
/// the mobile equivalent of the web's "Send to a pot" hero CTA.
Future<void> showDisbursePickerSheet(BuildContext context, List<Bucket> buckets) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) => SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Send to a pot', style: Theme.of(context).textTheme.titleLarge),
            ),
            if (buckets.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text('No pots yet — create one from the Home tab first.'),
              )
            else
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    for (final bucket in buckets)
                      ListTile(
                        leading: RowIconChip(color: bucket.color, icon: pesaIconFor(bucket.icon), size: 36),
                        title: Text(bucket.name),
                        subtitle: Text('${bucket.allocated} / ${bucket.target}'),
                        onTap: () {
                          Navigator.of(sheetContext).pop();
                          _runDisburse(context, bucket);
                        },
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

Future<void> _runDisburse(BuildContext context, Bucket bucket) async {
  final result = await showAmountNoteDialog(
    context: context,
    title: 'Disburse into ${bucket.name}',
    submitLabel: 'Disburse',
  );
  if (result == null || !context.mounted) return;

  final container = ProviderScope.containerOf(context);
  final messenger = ScaffoldMessenger.of(context);
  try {
    await container
        .read(potRepositoryProvider)
        .disburse(bucketId: bucket.id, amount: result.amount, note: result.note);
  } catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    return;
  }
  container.invalidate(bootstrapProvider);
}
