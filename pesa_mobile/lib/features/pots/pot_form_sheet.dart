import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../home/bootstrap_provider.dart';
import 'pot_actions_provider.dart';

const _kinds = ['essential', 'future', 'people', 'give', 'bills', 'emergency', 'debt'];
const _colors = ['clay', 'green', 'gold', 'rose', 'sage'];

// A pot's icon is just a free-form string on the server (see
// createBucketSchema) — this app doesn't have an icon picker yet, so default
// to something sensible per kind rather than exposing raw icon-name entry.
const _defaultIconByKind = {
  'essential': 'home',
  'future': 'piggy',
  'people': 'heart',
  'give': 'sun',
  'bills': 'wifi',
  'emergency': 'shield',
  'debt': 'flame',
};

Future<void> showCreatePotSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _CreatePotSheet(),
  );
}

class _CreatePotSheet extends ConsumerStatefulWidget {
  const _CreatePotSheet();

  @override
  ConsumerState<_CreatePotSheet> createState() => _CreatePotSheetState();
}

class _CreatePotSheetState extends ConsumerState<_CreatePotSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _targetController = TextEditingController();
  String _kind = _kinds.first;
  String _color = _colors.first;
  bool _isSaving = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _targetController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isSaving = true;
      _error = null;
    });
    try {
      await ref
          .read(potRepositoryProvider)
          .create(
            name: _nameController.text.trim(),
            target: int.parse(_targetController.text.trim()),
            color: _color,
            icon: _defaultIconByKind[_kind]!,
            kind: _kind,
          );
      ref.invalidate(bootstrapProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('New pot', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Name'),
              validator: (v) => (v == null || v.isEmpty) ? 'Enter a name' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _targetController,
              decoration: const InputDecoration(labelText: 'Target'),
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse(v?.trim() ?? '');
                if (n == null || n < 0) return 'Enter a valid target';
                return null;
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _kind,
              decoration: const InputDecoration(labelText: 'Kind'),
              items: _kinds.map((k) => DropdownMenuItem(value: k, child: Text(k))).toList(),
              onChanged: (v) => setState(() => _kind = v!),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _color,
              decoration: const InputDecoration(labelText: 'Color'),
              items: _colors.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => _color = v!),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _isSaving ? null : _submit,
              child: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Create pot'),
            ),
          ],
        ),
      ),
    );
  }
}
