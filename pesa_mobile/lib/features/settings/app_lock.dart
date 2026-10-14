import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pesa_button.dart';
import '../auth/auth_provider.dart';
import '../home/bootstrap_provider.dart';
import 'settings_repository.dart';

/// In-memory unlock flag: starts locked on every cold start and is re-locked
/// whenever the app goes to the background. Never persisted.
class AppUnlocked extends Notifier<bool> {
  @override
  bool build() => false;

  void unlock() => state = true;
  void lock() => state = false;
}

final appUnlockedProvider = NotifierProvider<AppUnlocked, bool>(AppUnlocked.new);

/// Shows a PIN screen over [child] while the user has app lock enabled and
/// hasn't unlocked this session. Like the web's `LockGate`, this is a
/// privacy screen in the client — the API itself doesn't require unlocking.
class AppLockGate extends ConsumerStatefulWidget {
  const AppLockGate({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends ConsumerState<AppLockGate> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) ref.read(appUnlockedProvider.notifier).lock();
  }

  @override
  Widget build(BuildContext context) {
    final lockEnabled = ref.watch(bootstrapProvider).value?.profile.appLockEnabled ?? false;
    final unlocked = ref.watch(appUnlockedProvider);
    return Stack(
      children: [
        widget.child,
        if (lockEnabled && !unlocked) const Positioned.fill(child: _LockScreen()),
      ],
    );
  }
}

class _LockScreen extends ConsumerStatefulWidget {
  const _LockScreen();

  @override
  ConsumerState<_LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<_LockScreen> {
  final _controller = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final pin = _controller.text.trim();
    if (pin.length < 4) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ok = await ref.read(settingsRepositoryProvider).verifyPin(pin);
      if (ok) {
        ref.read(appUnlockedProvider.notifier).unlock();
      } else if (mounted) {
        setState(() => _error = 'Wrong PIN.');
        _controller.clear();
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: PesaColors.bgApp,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(LucideIcons.lock, size: 36, color: PesaColors.green),
              const SizedBox(height: 16),
              Text('Pesa is locked', style: PesaTextStyles.serif(fontSize: 30)),
              const SizedBox(height: 8),
              const Text('Enter your PIN to continue.', style: TextStyle(color: PesaColors.ink2)),
              const SizedBox(height: 24),
              _PinField(controller: _controller, onSubmitted: (_) => _verify(), autofocus: true),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: PesaColors.clayDeep)),
              ],
              const SizedBox(height: 16),
              PesaButton(
                label: 'Unlock',
                variant: PesaButtonVariant.green,
                expand: true,
                loading: _busy,
                onPressed: _verify,
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.read(authControllerProvider.notifier).logout(),
                child: const Text('Sign out instead'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PinField extends StatelessWidget {
  const _PinField({required this.controller, this.onSubmitted, this.autofocus = false, this.label});

  final TextEditingController controller;
  final ValueChanged<String>? onSubmitted;
  final bool autofocus;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      autofocus: autofocus,
      obscureText: true,
      keyboardType: TextInputType.number,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(8),
      ],
      textAlign: TextAlign.center,
      style: PesaTextStyles.num(fontSize: 24, fontWeight: FontWeight.w600),
      decoration: InputDecoration(labelText: label ?? 'PIN', counterText: ''),
      onSubmitted: onSubmitted,
    );
  }
}

/// Settings entry point: set a new PIN (entered twice) when the lock is off,
/// or turn it off (current PIN required) when it's on.
Future<void> showAppLockSheet(BuildContext context, {required bool enabled}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (_) => _AppLockSheet(enabled: enabled),
  );
}

class _AppLockSheet extends ConsumerStatefulWidget {
  const _AppLockSheet({required this.enabled});

  final bool enabled;

  @override
  ConsumerState<_AppLockSheet> createState() => _AppLockSheetState();
}

class _AppLockSheetState extends ConsumerState<_AppLockSheet> {
  final _pin = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _pin.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final pin = _pin.text.trim();
    if (pin.length < 4) {
      setState(() => _error = 'PIN must be 4–8 digits.');
      return;
    }
    if (!widget.enabled && pin != _confirm.text.trim()) {
      setState(() => _error = "PINs don't match.");
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repo = ref.read(settingsRepositoryProvider);
      if (widget.enabled) {
        await repo.disableAppLock(pin);
      } else {
        await repo.setAppLock(pin);
        // The person who just chose the PIN shouldn't be locked out by it
        // until the app next goes to the background.
        ref.read(appUnlockedProvider.notifier).unlock();
      }
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
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.enabled ? 'Turn off app lock' : 'Set an app lock PIN',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          _PinField(
            controller: _pin,
            autofocus: true,
            label: widget.enabled ? 'Current PIN' : 'New PIN (4–8 digits)',
          ),
          if (!widget.enabled) ...[
            const SizedBox(height: 12),
            _PinField(controller: _confirm, label: 'Confirm PIN'),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: PesaColors.clayDeep)),
          ],
          const SizedBox(height: 20),
          PesaButton(
            label: widget.enabled ? 'Turn off' : 'Turn on',
            variant: widget.enabled ? PesaButtonVariant.soft : PesaButtonVariant.green,
            expand: true,
            loading: _busy,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
