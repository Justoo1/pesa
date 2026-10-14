import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/bucket.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../home/bootstrap_provider.dart';
import 'pot_actions_provider.dart';

// Same choices as the web (components/pesa/screens/bucket-form.tsx).
const _icons = [
  'home', 'piggy', 'heart', 'leaf', 'shield', 'sun', //
  'broom', 'wifi', 'flame', 'bulb', 'wallet', 'tag',
];
const _colors = {
  'clay': ('Clay', PesaColors.clay),
  'green': ('Green', PesaColors.green),
  'gold': ('Gold', PesaColors.gold),
  'rose': ('Rose', PesaColors.rose),
  'sage': ('Sage', PesaColors.greenSoft),
};
const _kinds = {
  'essential': 'Essential',
  'bills': 'Bills',
  'future': 'Future',
  'emergency': 'Emergency',
  'debt': 'Debt',
  'give': 'Give',
  'people': 'People',
};
const _defaultIconByKind = {
  'essential': 'home',
  'bills': 'wifi',
  'future': 'piggy',
  'emergency': 'shield',
  'debt': 'flame',
  'give': 'sun',
  'people': 'heart',
};

/// Create a pot ([bucket] null) or edit one — the web's NewPot / EditPot
/// sheets: name, monthly target, icon, color, kind, bills due day,
/// carry-over, and (editing) archive.
Future<void> showPotEditorSheet(BuildContext context, {Bucket? bucket}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: PesaColors.bgApp,
    builder: (_) => FractionallySizedBox(heightFactor: 0.92, child: _PotEditor(bucket: bucket)),
  );
}

class _PotEditor extends ConsumerStatefulWidget {
  const _PotEditor({this.bucket});

  final Bucket? bucket;

  @override
  ConsumerState<_PotEditor> createState() => _PotEditorState();
}

class _PotEditorState extends ConsumerState<_PotEditor> {
  late final _name = TextEditingController(text: widget.bucket?.name ?? '');
  late final _target = TextEditingController(text: widget.bucket?.target.toString() ?? '');
  late final _dueDay = TextEditingController(text: widget.bucket?.dueDayOfMonth?.toString() ?? '');
  late String _kind = widget.bucket?.kind ?? 'essential';
  late String _icon = widget.bucket?.icon ?? _defaultIconByKind[_kind]!;
  late String _color = widget.bucket?.color ?? 'clay';
  late bool _carryOver = widget.bucket?.carryOver ?? false;
  bool _iconTouched = false;
  bool _busy = false;
  String? _error;

  bool get _editing => widget.bucket != null;

  @override
  void dispose() {
    _name.dispose();
    _target.dispose();
    _dueDay.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    final target = int.tryParse(_target.text.trim()) ?? 0;
    final dueDay = int.tryParse(_dueDay.text.trim());
    if (name.isEmpty) return setState(() => _error = 'Give the pot a name.');
    if (target <= 0) return setState(() => _error = 'Set a monthly target above 0.');
    if (_kind == 'bills' &&
        _dueDay.text.isNotEmpty &&
        (dueDay == null || dueDay < 1 || dueDay > 31)) {
      return setState(() => _error = 'Due day must be between 1 and 31.');
    }
    await _run(() async {
      final repo = ref.read(potRepositoryProvider);
      if (_editing) {
        await repo.update(
          bucketId: widget.bucket!.id,
          name: name,
          target: target,
          color: _color,
          icon: _icon,
          kind: _kind,
          carryOver: _carryOver,
          dueDayOfMonth: dueDay,
        );
      } else {
        await repo.create(name: name, target: target, color: _color, icon: _icon, kind: _kind);
      }
    });
  }

  Future<void> _archive() async {
    final b = widget.bucket!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Archive "${b.name}"?'),
        content: const Text(
          "It disappears from your pots and any money left in it goes back to your bank "
          'account. Past transactions stay on record.',
        ),
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
    if (confirmed != true) return;
    await _run(() => ref.read(potRepositoryProvider).archive(b.id));
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      ref.invalidate(bootstrapProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    Widget label(String text) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text.toUpperCase(), style: PesaTextStyles.eyebrow()),
    );
    Widget chip(String text, bool selected, VoidCallback onTap, {Color? dot}) => ChoiceChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot != null) ...[
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ],
          Text(text),
        ],
      ),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
      shape: const StadiumBorder(),
      side: BorderSide.none,
      backgroundColor: PesaColors.ink.withValues(alpha: 0.06),
      selectedColor: PesaColors.ink,
      labelStyle: TextStyle(
        fontWeight: FontWeight.w600,
        color: selected ? PesaColors.bgApp : PesaColors.ink,
      ),
    );

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          Text(_editing ? 'Edit pot' : 'New pot', style: PesaTextStyles.serif(fontSize: 26)),
          const SizedBox(height: 16),
          TextFormField(
            controller: _name,
            maxLength: 40,
            decoration: const InputDecoration(labelText: 'Name', counterText: ''),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _target,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(labelText: 'Target', helperText: 'Monthly target'),
          ),
          const SizedBox(height: 18),
          label('Icon'),
          GridView.count(
            crossAxisCount: 6,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
            children: [
              for (final i in _icons)
                Material(
                  color: i == _icon ? PesaColors.ink : PesaColors.bgCard,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: i == _icon ? BorderSide.none : const BorderSide(color: PesaColors.line),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => setState(() {
                      _icon = i;
                      _iconTouched = true;
                    }),
                    child: Icon(
                      pesaIconFor(i),
                      size: 18,
                      color: i == _icon ? PesaColors.bgApp : PesaColors.ink2,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 18),
          label('Color'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final e in _colors.entries)
                chip(
                  e.value.$1,
                  e.key == _color,
                  () => setState(() => _color = e.key),
                  dot: e.value.$2,
                ),
            ],
          ),
          const SizedBox(height: 18),
          label('Kind'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final e in _kinds.entries)
                chip(e.value, e.key == _kind, () {
                  setState(() {
                    _kind = e.key;
                    // Follow the kind's default icon until one is picked by hand.
                    if (!_editing && !_iconTouched) _icon = _defaultIconByKind[e.key]!;
                  });
                }),
            ],
          ),
          if (_kind == 'bills') ...[
            const SizedBox(height: 14),
            TextFormField(
              controller: _dueDay,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(labelText: 'Due day of month (optional)'),
            ),
          ],
          if (_editing) ...[
            const SizedBox(height: 10),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Carry over'),
              subtitle: const Text("Keep what's left in this pot when a new month starts"),
              value: _carryOver,
              onChanged: (v) => setState(() => _carryOver = v),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: PesaColors.clayDeep)),
          ],
          const SizedBox(height: 18),
          FilledButton(
            onPressed: _busy ? null : _save,
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
                : Text(_editing ? 'Save' : 'Create pot'),
          ),
          if (_editing) ...[
            const SizedBox(height: 8),
            TextButton(
              onPressed: _busy ? null : _archive,
              style: TextButton.styleFrom(foregroundColor: PesaColors.clayDeep),
              child: const Text('Archive this pot'),
            ),
          ],
          const SizedBox(height: PesaRadius.sm),
        ],
      ),
    );
  }
}
