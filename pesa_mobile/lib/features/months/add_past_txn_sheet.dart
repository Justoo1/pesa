import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/format.dart';
import '../../core/models/bucket.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../home/bootstrap_provider.dart';
import 'months_repository.dart';

const _methods = ['MoMo', 'Transfer', 'Card', 'Cash'];

String _ymOf(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}';

/// Ports the web's "Add to a past month" sheet (add-past-txn.tsx): pick a
/// month (locked when [ym] is given), toggle pots with suggested amounts
/// (what was left to fill that month), date, method, note — recorded as
/// history only; this month's pot balances aren't touched.
Future<void> showAddPastTxnSheet(BuildContext context, {String? ym}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: PesaColors.bgApp,
    builder: (_) => FractionallySizedBox(heightFactor: 0.9, child: _AddPastTxn(lockedYm: ym)),
  );
}

class _AddPastTxn extends ConsumerStatefulWidget {
  const _AddPastTxn({this.lockedYm});

  final String? lockedYm;

  @override
  ConsumerState<_AddPastTxn> createState() => _AddPastTxnState();
}

class _AddPastTxnState extends ConsumerState<_AddPastTxn> {
  // Last 12 months, newest first; default to last month like the web.
  late final List<DateTime> _months = List.generate(12, (i) {
    final now = DateTime.now();
    return DateTime(now.year, now.month - i);
  });
  late String _ym = widget.lockedYm ?? _ymOf(_months[1]);
  late DateTime _date = _lastDayOf(_ym);
  final Map<String, int> _selected = {};
  final Map<String, TextEditingController> _amounts = {};
  String _method = _methods.first;
  final _note = TextEditingController();
  bool _busy = false;
  String? _error;

  static DateTime _lastDayOf(String ym) {
    final parts = ym.split('-').map(int.parse).toList();
    return DateTime(parts[0], parts[1] + 1, 0, 12); // noon avoids TZ rollover
  }

  @override
  void dispose() {
    for (final c in _amounts.values) {
      c.dispose();
    }
    _note.dispose();
    super.dispose();
  }

  void _setMonth(String ym) => setState(() {
    _ym = ym;
    _date = _lastDayOf(ym);
    _selected.clear(); // a pot full in one month may not be in another
  });

  ({bool full, int suggested}) _fill(Bucket b, Map<String, int> filled) {
    final got = filled[b.id] ?? 0;
    final remaining = math.max(0, b.target - got);
    return (full: b.target > 0 && got >= b.target, suggested: remaining > 0 ? remaining : b.target);
  }

  void _toggle(Bucket b, int suggested) => setState(() {
    if (_selected.containsKey(b.id)) {
      _selected.remove(b.id);
    } else {
      _selected[b.id] = suggested;
      (_amounts[b.id] ??= TextEditingController()).text = '$suggested';
    }
  });

  Future<void> _submit() async {
    final entries = {
      for (final e in _selected.entries)
        if (e.value > 0) e.key: e.value,
    };
    if (entries.isEmpty) return setState(() => _error = 'Pick at least one pot.');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(monthsRepositoryProvider)
          .addPast(
            amounts: entries,
            occurredAt: _date,
            method: _method,
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
          );
      ref
        ..invalidate(monthsListProvider)
        ..invalidate(monthDetailProvider(_ym))
        ..invalidate(filledByMonthProvider)
        ..invalidate(bootstrapProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(bootstrapProvider).value;
    final filled = ref.watch(filledByMonthProvider).value?[_ym] ?? const <String, int>{};
    final currency = data?.profile.currency ?? '';
    final buckets = data?.buckets ?? const <Bucket>[];
    final total = _selected.values.fold<int>(0, (s, v) => s + v);
    final serif = PesaTextStyles.serif(fontSize: 26);
    final ymDate = _lastDayOf(_ym);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          Text.rich(
            TextSpan(
              style: serif,
              children: [
                const TextSpan(text: 'Add to a '),
                TextSpan(
                  text: 'past month.',
                  style: serif.copyWith(fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            "Catch up on something you forgot to log. It goes into that month's history "
            "and doesn't change this month's pots.",
            style: TextStyle(color: PesaColors.ink2, fontSize: 13),
          ),
          const SizedBox(height: 14),
          if (widget.lockedYm == null)
            DropdownButtonFormField<String>(
              initialValue: _ym,
              decoration: const InputDecoration(labelText: 'Month'),
              items: [
                for (final m in _months)
                  DropdownMenuItem(value: _ymOf(m), child: Text(DateFormat('MMMM yyyy').format(m))),
              ],
              onChanged: (v) => _setMonth(v!),
            ),
          const SizedBox(height: 12),
          InputDecorator(
            decoration: const InputDecoration(labelText: 'Date'),
            child: InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _date,
                  firstDate: DateTime(ymDate.year, ymDate.month, 1),
                  lastDate: ymDate,
                );
                if (picked != null) {
                  setState(() => _date = DateTime(picked.year, picked.month, picked.day, 12));
                }
              },
              child: Text(DateFormat('EEE d MMMM yyyy').format(_date)),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('POTS', style: PesaTextStyles.eyebrow()),
              TextButton(
                onPressed: () => setState(() {
                  for (final b in buckets) {
                    final f = _fill(b, filled);
                    if (f.full) continue;
                    _selected[b.id] = f.suggested;
                    (_amounts[b.id] ??= TextEditingController()).text = '${f.suggested}';
                  }
                }),
                child: const Text('Fill all'),
              ),
            ],
          ),
          PesaCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                for (final b in buckets)
                  Builder(
                    builder: (context) {
                      final f = _fill(b, filled);
                      final on = _selected.containsKey(b.id);
                      return Opacity(
                        opacity: f.full ? 0.5 : 1,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          child: Row(
                            children: [
                              Checkbox(
                                value: on,
                                onChanged: f.full ? null : (_) => _toggle(b, f.suggested),
                              ),
                              RowIconChip(color: b.color, icon: pesaIconFor(b.icon), size: 30),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      b.name,
                                      style: const TextStyle(fontWeight: FontWeight.w600),
                                    ),
                                    Text(
                                      f.full
                                          ? 'Already full that month'
                                          : 'Filled ${formatMoney(filled[b.id] ?? 0, currency)} of ${formatMoney(b.target, currency)}',
                                      style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
                                    ),
                                  ],
                                ),
                              ),
                              if (on)
                                SizedBox(
                                  width: 96,
                                  child: TextField(
                                    controller: _amounts[b.id],
                                    keyboardType: TextInputType.number,
                                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                    textAlign: TextAlign.right,
                                    decoration: InputDecoration(
                                      isDense: true,
                                      prefixText: currency,
                                    ),
                                    onChanged: (v) =>
                                        setState(() => _selected[b.id] = int.tryParse(v) ?? 0),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text('METHOD', style: PesaTextStyles.eyebrow()),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            children: [
              for (final m in _methods)
                ChoiceChip(
                  label: Text(m),
                  selected: m == _method,
                  onSelected: (_) => setState(() => _method = m),
                  showCheckmark: false,
                  shape: const StadiumBorder(),
                  side: BorderSide.none,
                  backgroundColor: PesaColors.ink.withValues(alpha: 0.06),
                  selectedColor: PesaColors.ink,
                  labelStyle: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: m == _method ? PesaColors.bgApp : PesaColors.ink,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _note,
            maxLength: 200,
            decoration: const InputDecoration(hintText: 'Add a note (optional)', counterText: ''),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: PesaColors.clayDeep)),
          ],
          const SizedBox(height: 14),
          FilledButton(
            onPressed: _busy || total <= 0 ? null : _submit,
            style: FilledButton.styleFrom(
              backgroundColor: PesaColors.green,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const StadiumBorder(),
            ),
            child: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: PesaColors.bgApp),
                  )
                : Text(
                    'Add ${formatMoney(total, currency)} to ${DateFormat('MMMM').format(ymDate)}',
                  ),
          ),
        ],
      ),
    );
  }
}
