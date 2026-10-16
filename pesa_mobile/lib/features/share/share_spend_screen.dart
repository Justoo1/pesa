import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/bucket.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/async_data_view.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../home/bootstrap_provider.dart';
import '../pots/pot_actions_provider.dart';
import 'share_intake.dart';

/// Ports the web share target (share-landing.tsx): text shared from another
/// app — e.g. a MoMo SMS — becomes a spend from a pot, with the amount and
/// note pre-filled.
class ShareSpendScreen extends ConsumerStatefulWidget {
  const ShareSpendScreen({super.key, required this.sharedText});

  final String sharedText;

  @override
  ConsumerState<ShareSpendScreen> createState() => _ShareSpendScreenState();
}

class _ShareSpendScreenState extends ConsumerState<ShareSpendScreen> {
  late final _amount = TextEditingController(
    text: switch (parseSharedAmount(widget.sharedText)) {
      0 => '',
      final n => '$n',
    },
  );
  late final _note = TextEditingController(text: parseSharedNote(widget.sharedText));
  String? _bucketId;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _submit(List<Bucket> spendable, String currency) async {
    final amount = int.tryParse(_amount.text) ?? 0;
    final bucket = spendable.where((b) => b.id == _bucketId).firstOrNull;
    if (bucket == null) return setState(() => _error = 'Pick the pot this came out of.');
    if (amount <= 0) return setState(() => _error = 'Enter an amount above zero.');
    final available = bucket.allocated - bucket.spent;
    if (amount > available) {
      return setState(
        () => _error = 'Only ${formatMoney(available, currency)} left in ${bucket.name}.',
      );
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(potRepositoryProvider)
          .spend(
            bucketId: bucket.id,
            amount: amount,
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
          );
      ref.invalidate(bootstrapProvider);
      HapticFeedback.mediumImpact();
      messenger.showSnackBar(
        SnackBar(content: Text('Logged ${formatMoney(amount, currency)} from ${bucket.name}.')),
      );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final serif = PesaTextStyles.serif(fontSize: 30);
    return Scaffold(
      appBar: AppBar(title: const Text('Log a spend')),
      body: AsyncDataView(
        value: ref.watch(bootstrapProvider),
        onRefresh: () => ref.refresh(bootstrapProvider.future),
        builder: (data) {
          final currency = data.profile.currency;
          final spendable = data.buckets.where((b) => b.allocated - b.spent > 0).toList();
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
            children: [
              Text.rich(
                TextSpan(
                  style: serif,
                  children: [
                    const TextSpan(text: 'Where did it '),
                    TextSpan(
                      text: 'come from?',
                      style: serif.copyWith(fontStyle: FontStyle.italic),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: PesaColors.bgElev,
                  borderRadius: BorderRadius.circular(PesaRadius.base),
                  border: Border.all(color: PesaColors.line),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(LucideIcons.messageSquareText, size: 16, color: PesaColors.ink3),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.sharedText,
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, color: PesaColors.ink2),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _amount,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: PesaTextStyles.num(fontSize: 22, fontWeight: FontWeight.w600),
                decoration: InputDecoration(labelText: 'Amount', prefixText: '$currency '),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _note,
                maxLength: 200,
                decoration: const InputDecoration(labelText: 'Note', counterText: ''),
              ),
              const SizedBox(height: 18),
              Text('FROM POT', style: PesaTextStyles.eyebrow(color: PesaColors.ink3)),
              const SizedBox(height: 8),
              if (spendable.isEmpty)
                const Text(
                  'No pot has money left to spend yet. Send some salary to a pot first.',
                  style: TextStyle(color: PesaColors.ink2),
                )
              else
                for (final b in spendable)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _PotOption(
                      bucket: b,
                      currency: currency,
                      selected: b.id == _bucketId,
                      onTap: () => setState(() => _bucketId = b.id),
                    ),
                  ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(_error!, style: const TextStyle(color: PesaColors.clayDeep)),
                ),
              const SizedBox(height: 14),
              SizedBox(
                height: 52,
                child: FilledButton.icon(
                  onPressed: _busy || spendable.isEmpty ? null : () => _submit(spendable, currency),
                  style: FilledButton.styleFrom(
                    backgroundColor: PesaColors.clay,
                    shape: const StadiumBorder(),
                  ),
                  icon: const Icon(LucideIcons.minus, size: 16),
                  label: const Text('Log spend'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PotOption extends StatelessWidget {
  const _PotOption({
    required this.bucket,
    required this.currency,
    required this.selected,
    required this.onTap,
  });

  final Bucket bucket;
  final String currency;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? PesaColors.greenTint : PesaColors.bgCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(PesaRadius.base),
        side: BorderSide(color: selected ? PesaColors.green : PesaColors.line),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(PesaRadius.base),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              RowIconChip(color: bucket.color, icon: pesaIconFor(bucket.icon), size: 36),
              const SizedBox(width: 12),
              Expanded(
                child: Text(bucket.name, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              Text(
                '${formatMoney(bucket.allocated - bucket.spent, currency)} left',
                style: const TextStyle(fontSize: 12.5, color: PesaColors.ink3),
              ),
              if (selected) ...[
                const SizedBox(width: 8),
                const Icon(LucideIcons.circleCheck, size: 18, color: PesaColors.green),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
