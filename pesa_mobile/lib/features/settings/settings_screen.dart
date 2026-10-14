import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/widgets/async_data_view.dart';
import '../../core/format.dart';
import '../../core/push/push_service.dart';
import '../../core/models/user_profile.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/screen_header.dart';
import '../auth/auth_provider.dart';
import '../home/bootstrap_provider.dart';
import '../help/help_and_tour.dart';
import 'app_lock.dart';
import 'settings_repository.dart';

/// Ports the web More tab's Settings panel (`components/pesa/screens/more.tsx`).
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(bootstrapProvider);
    return AsyncDataView(
      value: bootstrap,
      onRefresh: () => ref.refresh(bootstrapProvider.future),
      builder: (data) => _SettingsBody(profile: data.profile),
    );
  }
}

class _SettingsBody extends ConsumerWidget {
  const _SettingsBody({required this.profile});

  final UserProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = profile;
    void editProfile() => showFormSheet(
      context: context,
      title: 'Edit profile',
      submitLabel: 'Save',
      fields: [
        FormFieldSpec(key: 'name', label: 'Name', initial: p.displayName, maxLength: 60),
        FormFieldSpec(key: 'currency', label: 'Currency', initial: p.currency, maxLength: 8),
        FormFieldSpec(key: 'month', label: 'Month label', initial: p.monthLabel, maxLength: 40),
      ],
      onSubmit: (v) async {
        await ref
            .read(settingsRepositoryProvider)
            .updateProfile(displayName: v['name'], currency: v['currency'], monthLabel: v['month']);
        ref.invalidate(bootstrapProvider);
      },
    );

    return ListView(
      key: const Key('settings-list'),
      padding: const EdgeInsets.only(bottom: 28),
      children: [
        const ScreenHeader(eyebrow: 'More', title: 'Tune your', italic: 'setup.'),
        _Group(
          children: [
            _Row(icon: LucideIcons.heart, label: 'Name', value: p.displayName, onTap: editProfile),
            if (p.email != null) _Row(icon: LucideIcons.send, label: 'Email', value: p.email),
            _Row(
              icon: LucideIcons.piggyBank,
              label: 'Pots & targets',
              onTap: () => context.push('/pots'),
            ),
            _Row(
              icon: LucideIcons.wallet,
              label: 'Income sources',
              value: formatMoney(p.salary, p.currency),
              onTap: () => context.push('/settings/income-sources'),
            ),
            _Row(icon: LucideIcons.tag, label: 'Currency', value: p.currency, onTap: editProfile),
            _Row(
              icon: LucideIcons.calendar,
              label: 'Month',
              value: p.monthLabel,
              onTap: editProfile,
            ),
          ],
        ),
        _Group(
          children: [
            _Row(
              icon: LucideIcons.sparkles,
              label: 'Round-ups to Savings',
              value: !p.hasSavingsBucket
                  ? 'Needs Future pot'
                  : p.roundUpsEnabled
                  ? 'On · ${p.currency} ${p.roundUpStep}'
                  : 'Off',
              onTap: () => _roundUpsSheet(context, ref, p),
            ),
            _Row(
              icon: LucideIcons.calendarClock,
              label: 'Payday',
              value: p.paydayRemindersOn && p.paydayDayOfMonth != null
                  ? 'Day ${p.paydayDayOfMonth}${p.autoPaydayOn ? ' · auto' : ''}'
                  : 'Off',
              onTap: () => _paydaySheet(context, ref, p),
            ),
            _Row(
              icon: LucideIcons.lock,
              label: 'App Lock (PIN)',
              value: p.appLockEnabled ? 'On' : 'Off',
              onTap: () => showAppLockSheet(context, enabled: p.appLockEnabled),
            ),
            _Row(
              icon: LucideIcons.bell,
              label: 'Push notifications',
              value: PushService.available ? null : 'Not set up',
              onTap: () => _pushSheet(context, ref, p),
            ),
          ],
        ),
        _Group(
          children: [
            _Row(
              icon: LucideIcons.history,
              label: 'View past months',
              onTap: () => context.push('/months'),
            ),
            _Row(
              icon: LucideIcons.circleHelp,
              label: 'Help & tutorials',
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (helpContext) => HelpScreen(
                    onReplayTour: () {
                      Navigator.of(helpContext).pop();
                      ref.read(tourProvider.notifier).start();
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
        _Group(
          children: [
            _Row(
              icon: LucideIcons.rotateCcw,
              label: 'Reset this month',
              danger: true,
              onTap: () => _resetMonth(context, ref),
            ),
            _Row(
              icon: LucideIcons.x,
              label: 'Delete my account',
              danger: true,
              onTap: () => _deleteAccount(context, ref, p.email),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
          child: PesaButton(
            label: 'Sign out',
            variant: PesaButtonVariant.soft,
            expand: true,
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ),
      ],
    );
  }

  Future<void> _resetMonth(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Reset this month?'),
        content: const Text('This clears every transaction this month and zeros each pot.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(settingsRepositoryProvider).resetMonth();
      ref.invalidate(bootstrapProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  void _deleteAccount(BuildContext context, WidgetRef ref, String? email) {
    showFormSheet(
      context: context,
      title: 'Delete my account',
      submitLabel: 'Delete everything',
      fields: [FormFieldSpec(key: 'email', label: 'Type ${email ?? 'your email'} to confirm')],
      onSubmit: (v) async {
        if (email == null || v['email']!.toLowerCase() != email.toLowerCase()) {
          throw const FormSheetError('Email did not match.');
        }
        await ref.read(settingsRepositoryProvider).deleteAccount(v['email']!);
        await ref.read(authControllerProvider.notifier).logout();
      },
    );
  }

  void _pushSheet(BuildContext context, WidgetRef ref, UserProfile p) {
    if (!PushService.available) {
      showModalBottomSheet(
        context: context,
        builder: (_) => const Padding(
          padding: EdgeInsets.fromLTRB(24, 24, 24, 32),
          child: Text(
            "Phone notifications aren't set up for this build yet. They switch on once the "
            'app is built with its Firebase configuration.',
          ),
        ),
      );
      return;
    }
    var payday = p.pushPaydayOn;
    var bucketHit = p.pushBucketHitOn;
    var wrap = p.pushWrapOn;
    var billsDue = p.pushBillsDueOn;
    _settingsSheet(
      context,
      title: 'Push notifications',
      builder: (setState) => [
        const Text(
          'Turning these on asks for notification permission and registers this phone.',
          style: TextStyle(color: PesaColors.ink3),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text("It's payday"),
          value: payday,
          onChanged: (v) => setState(() => payday = v),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('A pot is full'),
          value: bucketHit,
          onChanged: (v) => setState(() => bucketHit = v),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Your monthly wrap'),
          value: wrap,
          onChanged: (v) => setState(() => wrap = v),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Bills coming due'),
          value: billsDue,
          onChanged: (v) => setState(() => billsDue = v),
        ),
      ],
      onSave: () async {
        if (payday || bucketHit || wrap || billsDue) {
          final granted = await PushService.enable(ref.read(apiClientProvider));
          if (!granted) {
            throw const FormSheetError(
              'Notifications are blocked — allow them in system settings.',
            );
          }
        }
        await ref
            .read(settingsRepositoryProvider)
            .setPushPrefs(payday: payday, bucketHit: bucketHit, wrap: wrap, billsDue: billsDue);
        ref.invalidate(bootstrapProvider);
      },
    );
  }

  void _roundUpsSheet(BuildContext context, WidgetRef ref, UserProfile p) {
    var enabled = p.roundUpsEnabled;
    final step = TextEditingController(text: '${p.roundUpStep}');
    _settingsSheet(
      context,
      title: 'Round-ups to Savings',
      builder: (setState) => [
        if (!p.hasSavingsBucket)
          const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: Text(
              'Round-ups need a Future (savings) pot to land in.',
              style: TextStyle(color: PesaColors.ink3),
            ),
          ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Round each disbursement up'),
          value: enabled,
          onChanged: (v) => setState(() => enabled = v),
        ),
        TextField(
          controller: step,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(labelText: 'Round up to the nearest (${p.currency})'),
        ),
      ],
      onSave: () async {
        await ref
            .read(settingsRepositoryProvider)
            .setRoundUps(enabled: enabled, step: int.tryParse(step.text.trim()));
        ref.invalidate(bootstrapProvider);
      },
    );
  }

  void _paydaySheet(BuildContext context, WidgetRef ref, UserProfile p) {
    var enabled = p.paydayRemindersOn;
    var auto = p.autoPaydayOn;
    final day = TextEditingController(text: p.paydayDayOfMonth?.toString() ?? '');
    _settingsSheet(
      context,
      title: 'Payday',
      builder: (setState) => [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Payday reminders'),
          value: enabled,
          onChanged: (v) => setState(() => enabled = v),
        ),
        TextField(
          controller: day,
          enabled: enabled,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Day of month (1–31)'),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Auto-disburse on payday'),
          subtitle: const Text("Replays last month's pot amounts"),
          value: auto,
          onChanged: enabled ? (v) => setState(() => auto = v) : null,
        ),
      ],
      onSave: () async {
        final d = int.tryParse(day.text.trim());
        if (enabled && (d == null || d < 1 || d > 31)) {
          throw const FormSheetError('Pick a day between 1 and 31.');
        }
        await ref
            .read(settingsRepositoryProvider)
            .setPayday(enabled: enabled, dayOfMonth: d, autoPayday: auto);
        ref.invalidate(bootstrapProvider);
      },
    );
  }
}

/// A small bottom sheet with stateful controls and a Save button; throwing
/// from [onSave] shows the message inline.
void _settingsSheet(
  BuildContext context, {
  required String title,
  required List<Widget> Function(StateSetter setState) builder,
  required Future<void> Function() onSave,
}) {
  String? error;
  var busy = false;
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) => StatefulBuilder(
      builder: (sheetContext, setState) => Padding(
        padding: EdgeInsets.fromLTRB(
          24,
          24,
          24,
          MediaQuery.of(sheetContext).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(sheetContext).textTheme.titleLarge),
            const SizedBox(height: 12),
            ...builder(setState),
            if (error != null) ...[
              const SizedBox(height: 12),
              Text(error!, style: const TextStyle(color: PesaColors.clayDeep)),
            ],
            const SizedBox(height: 20),
            PesaButton(
              label: 'Save',
              variant: PesaButtonVariant.green,
              expand: true,
              loading: busy,
              onPressed: () async {
                setState(() {
                  busy = true;
                  error = null;
                });
                try {
                  await onSave();
                  if (sheetContext.mounted) Navigator.of(sheetContext).pop();
                } catch (e) {
                  setState(() => error = e.toString());
                } finally {
                  if (sheetContext.mounted) setState(() => busy = false);
                }
              },
            ),
          ],
        ),
      ),
    ),
  );
}

class _Group extends StatelessWidget {
  const _Group({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      child: PesaCard(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(children: children),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.label,
    this.value,
    this.onTap,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final String? value;
  final VoidCallback? onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? PesaColors.clayDeep : PesaColors.ink;
    return ListTile(
      leading: Icon(icon, size: 18, color: color),
      title: Text(
        label,
        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: color),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (value != null)
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 160),
              child: Text(
                value!,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, color: PesaColors.ink3),
              ),
            ),
          if (onTap != null) ...[
            const SizedBox(width: 4),
            const Icon(LucideIcons.chevronRight, size: 14, color: PesaColors.ink3),
          ],
        ],
      ),
      onTap: onTap,
    );
  }
}
