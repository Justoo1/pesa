import 'package:flutter/material.dart';

import '../theme/pesa_colors.dart';

/// Throw from a form sheet's `onSubmit`/`onSave` to show [message] inline.
class FormSheetError implements Exception {
  const FormSheetError(this.message);

  final String message;

  @override
  String toString() => message;
}

/// One text field in a [showFormSheet] form.
class FormFieldSpec {
  const FormFieldSpec({
    required this.key,
    required this.label,
    this.initial = '',
    this.numeric = false,
    this.required = true,
    this.maxLength,
  });

  final String key;
  final String label;
  final String initial;

  /// Positive whole number (all money in this app is integer).
  final bool numeric;
  final bool required;
  final int? maxLength;
}

/// A secondary, destructive button under the submit button (e.g. Archive).
class FormSheetAction {
  const FormSheetAction({required this.label, required this.onPressed, this.confirm});

  final String label;
  final Future<void> Function() onPressed;

  /// When set, a confirm dialog with this message is shown first.
  final String? confirm;
}

/// A bottom-sheet form for simple create/edit flows. [onSubmit] gets the
/// trimmed values keyed by [FormFieldSpec.key]; throwing shows the error
/// inline and keeps the sheet open, returning closes it.
Future<void> showFormSheet({
  required BuildContext context,
  required String title,
  required List<FormFieldSpec> fields,
  required String submitLabel,
  required Future<void> Function(Map<String, String> values) onSubmit,
  FormSheetAction? destructive,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => _FormSheet(
      title: title,
      fields: fields,
      submitLabel: submitLabel,
      onSubmit: onSubmit,
      destructive: destructive,
    ),
  );
}

class _FormSheet extends StatefulWidget {
  const _FormSheet({
    required this.title,
    required this.fields,
    required this.submitLabel,
    required this.onSubmit,
    this.destructive,
  });

  final String title;
  final List<FormFieldSpec> fields;
  final String submitLabel;
  final Future<void> Function(Map<String, String> values) onSubmit;
  final FormSheetAction? destructive;

  @override
  State<_FormSheet> createState() => _FormSheetState();
}

class _FormSheetState extends State<_FormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final Map<String, TextEditingController> _controllers = {
    for (final f in widget.fields) f.key: TextEditingController(text: f.initial),
  };
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await _run(
      () => widget.onSubmit({for (final e in _controllers.entries) e.key: e.value.text.trim()}),
    );
  }

  Future<void> _destructive(FormSheetAction action) async {
    if (action.confirm != null) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          content: Text(action.confirm!),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(action.label),
            ),
          ],
        ),
      );
      if (ok != true) return;
    }
    await _run(action.onPressed);
  }

  String? _validate(FormFieldSpec f, String? raw) {
    final v = raw?.trim() ?? '';
    if (v.isEmpty) return f.required ? 'Required' : null;
    if (f.numeric) {
      final n = int.tryParse(v);
      if (n == null || n <= 0) return 'Enter a whole number above 0';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final destructive = widget.destructive;
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(widget.title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              for (final f in widget.fields) ...[
                TextFormField(
                  controller: _controllers[f.key],
                  decoration: InputDecoration(labelText: f.label),
                  keyboardType: f.numeric ? TextInputType.number : TextInputType.text,
                  maxLength: f.maxLength,
                  validator: (v) => _validate(f, v),
                ),
                const SizedBox(height: 12),
              ],
              if (_error != null) ...[
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                const SizedBox(height: 12),
              ],
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(widget.submitLabel),
              ),
              if (destructive != null) ...[
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _busy ? null : () => _destructive(destructive),
                  style: TextButton.styleFrom(foregroundColor: PesaColors.clayDeep),
                  child: Text(destructive.label),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
