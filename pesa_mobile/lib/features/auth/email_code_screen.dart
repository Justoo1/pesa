import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_provider.dart';

class EmailCodeScreen extends ConsumerStatefulWidget {
  const EmailCodeScreen({super.key});

  @override
  ConsumerState<EmailCodeScreen> createState() => _EmailCodeScreenState();
}

class _EmailCodeScreenState extends ConsumerState<EmailCodeScreen> {
  final _emailFormKey = GlobalKey<FormState>();
  final _codeFormKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();

  bool _codeSent = false;
  bool _isSending = false;
  String? _sendError;

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    if (!_emailFormKey.currentState!.validate()) return;
    setState(() {
      _isSending = true;
      _sendError = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .requestLoginCode(_emailController.text.trim());
      if (mounted) setState(() => _codeSent = true);
    } catch (e) {
      if (mounted) setState(() => _sendError = e.toString());
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _verifyCode() async {
    if (!_codeFormKey.currentState!.validate()) return;
    await ref
        .read(authControllerProvider.notifier)
        .verifyLoginCode(email: _emailController.text.trim(), code: _codeController.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Sign in with a code')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _codeSent ? _buildCodeStep(context, authState) : _buildEmailStep(context),
      ),
    );
  }

  Widget _buildEmailStep(BuildContext context) {
    return Form(
      key: _emailFormKey,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _emailController,
            decoration: const InputDecoration(labelText: 'Email'),
            keyboardType: TextInputType.emailAddress,
            validator: (value) => (value == null || value.isEmpty) ? 'Enter your email' : null,
          ),
          const SizedBox(height: 24),
          if (_sendError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                _sendError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
                textAlign: TextAlign.center,
              ),
            ),
          FilledButton(
            onPressed: _isSending ? null : _sendCode,
            child: _isSending
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Send code'),
          ),
        ],
      ),
    );
  }

  Widget _buildCodeStep(BuildContext context, AsyncValue<AuthState> authState) {
    return Form(
      key: _codeFormKey,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Enter the code sent to ${_emailController.text.trim()}',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _codeController,
            decoration: const InputDecoration(labelText: 'Code'),
            keyboardType: TextInputType.number,
            maxLength: 6,
            validator: (value) =>
                (value == null || value.length != 6) ? 'Enter the 6-digit code' : null,
          ),
          if (authState.hasError)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                authState.error.toString(),
                style: TextStyle(color: Theme.of(context).colorScheme.error),
                textAlign: TextAlign.center,
              ),
            ),
          FilledButton(
            onPressed: authState.isLoading ? null : _verifyCode,
            child: authState.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Verify'),
          ),
          TextButton(
            onPressed: () => setState(() {
              _codeSent = false;
              _codeController.clear();
            }),
            child: const Text('Use a different email'),
          ),
        ],
      ),
    );
  }
}
