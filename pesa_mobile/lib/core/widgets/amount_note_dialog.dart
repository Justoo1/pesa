import 'package:flutter/material.dart';

class TargetOption {
  const TargetOption({required this.id, required this.label});

  final String id;
  final String label;
}

class AmountNoteResult {
  const AmountNoteResult({required this.amount, this.note, this.targetId});

  final int amount;
  final String? note;
  final String? targetId;
}

/// A single reusable dialog for every "amount (+ optional note, + optional
/// target picker)" action — disburse/spend (no target), transfer (target
/// required). Returns null if the user cancels.
Future<AmountNoteResult?> showAmountNoteDialog({
  required BuildContext context,
  required String title,
  required String submitLabel,
  List<TargetOption>? targetOptions,
  String? targetLabel,
}) {
  return showDialog<AmountNoteResult>(
    context: context,
    builder: (context) => _AmountNoteDialog(
      title: title,
      submitLabel: submitLabel,
      targetOptions: targetOptions,
      targetLabel: targetLabel ?? 'To',
    ),
  );
}

class _AmountNoteDialog extends StatefulWidget {
  const _AmountNoteDialog({
    required this.title,
    required this.submitLabel,
    required this.targetOptions,
    required this.targetLabel,
  });

  final String title;
  final String submitLabel;
  final List<TargetOption>? targetOptions;
  final String targetLabel;

  @override
  State<_AmountNoteDialog> createState() => _AmountNoteDialogState();
}

class _AmountNoteDialogState extends State<_AmountNoteDialog> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  String? _targetId;

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final amount = int.parse(_amountController.text.trim());
    Navigator.of(context).pop(
      AmountNoteResult(
        amount: amount,
        note: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
        targetId: _targetId,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final targetOptions = widget.targetOptions;

    return AlertDialog(
      title: Text(widget.title),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _amountController,
              decoration: const InputDecoration(labelText: 'Amount'),
              keyboardType: TextInputType.number,
              autofocus: true,
              validator: (value) {
                final n = int.tryParse(value?.trim() ?? '');
                if (n == null || n <= 0) return 'Enter a positive amount';
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _noteController,
              decoration: const InputDecoration(labelText: 'Note (optional)'),
            ),
            if (targetOptions != null) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _targetId,
                decoration: InputDecoration(labelText: widget.targetLabel),
                items: targetOptions
                    .map((o) => DropdownMenuItem(value: o.id, child: Text(o.label)))
                    .toList(),
                onChanged: (value) => setState(() => _targetId = value),
                validator: (value) => value == null ? 'Choose one' : null,
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        FilledButton(onPressed: _submit, child: Text(widget.submitLabel)),
      ],
    );
  }
}
