import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/bucket.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/pot_painter.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../home/bootstrap_provider.dart';
import 'pot_actions_provider.dart';

const _methods = ['MoMo', 'Transfer', 'Card', 'Cash'];

/// Ports the web's `DisburseFlow` (`components/pesa/screens/disburse.tsx`):
/// pick a pot → amount on an in-app keypad → confirm (method + note) →
/// "Landed safely". Pass [bucket] to start at the amount step (from a pot's
/// own action sheet). A pot can't be filled past its target — the keypad
/// blocks it here and the server enforces it too.
Future<void> showDisburseFlow(BuildContext context, {Bucket? bucket}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: PesaColors.bgApp,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(PesaRadius.lg)),
    ),
    builder: (_) => _DisburseFlow(initialBucket: bucket),
  );
}

enum _Step { pick, amount, confirm, success }

class _DisburseFlow extends ConsumerStatefulWidget {
  const _DisburseFlow({this.initialBucket});

  final Bucket? initialBucket;

  @override
  ConsumerState<_DisburseFlow> createState() => _DisburseFlowState();
}

class _DisburseFlowState extends ConsumerState<_DisburseFlow> {
  late _Step _step = widget.initialBucket == null ? _Step.pick : _Step.amount;
  late Bucket? _bucket = widget.initialBucket;
  late int _amount = widget.initialBucket == null ? 0 : _room(widget.initialBucket!);
  String _method = _methods.first;
  final _note = TextEditingController();
  bool _sending = false;
  String? _error;

  /// Snapshot of the pot before sending, for the success animation.
  Bucket? _sentTo;
  int _sentAmount = 0;

  static int _room(Bucket b) => math.max(0, b.target - b.allocated);

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  void _go(_Step step) => setState(() {
    _step = step;
    _error = null;
  });

  void _back() {
    switch (_step) {
      case _Step.pick:
      case _Step.success:
        Navigator.of(context).pop();
      case _Step.amount:
        // Opened straight on a pot: back closes, like the web's pot sheet.
        widget.initialBucket != null ? Navigator.of(context).pop() : _go(_Step.pick);
      case _Step.confirm:
        _go(_Step.amount);
    }
  }

  void _pick(Bucket b) {
    if (_room(b) == 0) return;
    setState(() {
      _bucket = b;
      _amount = _room(b);
      _step = _Step.amount;
    });
  }

  void _press(String key) {
    HapticFeedback.selectionClick();
    setState(() {
      if (key == 'back') {
        _amount ~/= 10;
      } else if (key == '00') {
        _amount = math.min(_amount * 100, 99999999);
      } else {
        _amount = math.min(_amount * 10 + int.parse(key), 99999999);
      }
    });
  }

  Future<void> _send() async {
    final bucket = _bucket!;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(potRepositoryProvider)
          .disburse(
            bucketId: bucket.id,
            amount: _amount,
            method: _method,
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
          );
      HapticFeedback.mediumImpact();
      ref.invalidate(bootstrapProvider);
      if (!mounted) return;
      setState(() {
        _sentTo = bucket;
        _sentAmount = _amount;
        _step = _Step.success;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(bootstrapProvider).value;
    final currency = data?.profile.currency ?? '';
    final height = MediaQuery.of(context).size.height;
    final heightFactor = switch (_step) {
      _Step.amount => 0.92,
      _Step.success => 0.66,
      _ => 0.8,
    };

    return AnimatedContainer(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      height: height * heightFactor,
      padding: EdgeInsets.fromLTRB(16, 10, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: PesaColors.line,
              borderRadius: BorderRadius.circular(PesaRadius.pill),
            ),
          ),
          const SizedBox(height: 8),
          _TopBar(step: _step, onBack: _back),
          const SizedBox(height: 4),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 240),
              switchInCurve: Curves.easeOutCubic,
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween(
                    begin: const Offset(0.06, 0),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              ),
              child: KeyedSubtree(
                key: ValueKey(_step),
                child: switch (_step) {
                  _Step.pick => _PickStep(
                    buckets: data?.buckets ?? const [],
                    remaining:
                        (data?.profile.salary ?? 0) -
                        (data?.buckets ?? const <Bucket>[]).fold<int>(0, (s, b) => s + b.allocated),
                    currency: currency,
                    onPick: _pick,
                  ),
                  _Step.amount => _AmountStep(
                    bucket: _bucket!,
                    amount: _amount,
                    stillNeeds: _room(_bucket!),
                    currency: currency,
                    onKey: _press,
                    onChip: (v) => setState(() => _amount = v),
                    onReview: () => _go(_Step.confirm),
                  ),
                  _Step.confirm => _ConfirmStep(
                    bucket: _bucket!,
                    amount: _amount,
                    currency: currency,
                    method: _method,
                    onMethod: (m) => setState(() => _method = m),
                    note: _note,
                    sending: _sending,
                    error: _error,
                    onSend: _send,
                  ),
                  _Step.success => _SuccessStep(
                    bucket: _sentTo!,
                    amount: _sentAmount,
                    currency: currency,
                    onDone: () => Navigator.of(context).pop(),
                  ),
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.step, required this.onBack});

  final _Step step;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    const dots = [_Step.pick, _Step.amount, _Step.confirm];
    return Row(
      children: [
        PesaIconButton(
          icon: step == _Step.pick ? LucideIcons.x : LucideIcons.chevronLeft,
          onPressed: onBack,
        ),
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < dots.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: step == dots[i] ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: step.index >= i ? PesaColors.ink : PesaColors.line,
                    borderRadius: BorderRadius.circular(PesaRadius.pill),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(width: 44),
      ],
    );
  }
}

class _PickStep extends StatelessWidget {
  const _PickStep({
    required this.buckets,
    required this.remaining,
    required this.currency,
    required this.onPick,
  });

  final List<Bucket> buckets;
  final int remaining;
  final String currency;
  final ValueChanged<Bucket> onPick;

  @override
  Widget build(BuildContext context) {
    final serif = PesaTextStyles.serif(fontSize: 28);
    final allFull = buckets.isNotEmpty && buckets.every((b) => b.allocated >= b.target);
    return ListView(
      padding: const EdgeInsets.only(top: 4),
      children: [
        Text.rich(
          TextSpan(
            style: serif,
            children: [
              const TextSpan(text: 'Which pot is this '),
              TextSpan(
                text: 'for?',
                style: serif.copyWith(fontStyle: FontStyle.italic),
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Text.rich(
          TextSpan(
            style: const TextStyle(fontSize: 13, color: PesaColors.ink2),
            children: [
              TextSpan(
                text: formatMoney(remaining, currency),
                style: PesaTextStyles.num(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const TextSpan(text: ' still to disburse this month.'),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (buckets.isEmpty)
          const PesaCard(child: Text('No pots yet — create one from Home first.'))
        else if (allFull)
          PesaCard(
            padding: const EdgeInsets.all(22),
            child: Column(
              children: [
                Text('Every pot is full', style: PesaTextStyles.serif(fontSize: 20)),
                const SizedBox(height: 4),
                const Text('Nothing left to fill this month. Nice work.'),
              ],
            ),
          ),
        if (allFull) const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 2.5,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            for (final b in buckets)
              Opacity(
                opacity: b.allocated >= b.target ? 0.55 : 1,
                child: Material(
                  color: PesaColors.bgCard,
                  borderRadius: BorderRadius.circular(PesaRadius.base),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: b.allocated >= b.target ? null : () => onPick(b),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          RowIconChip(color: b.color, icon: pesaIconFor(b.icon), size: 36),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  b.name,
                                  overflow: TextOverflow.ellipsis,
                                  style: PesaTextStyles.serif(fontSize: 17),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  b.allocated >= b.target
                                      ? 'Filled'
                                      : 'Needs ${formatMoney(b.target - b.allocated, currency)}',
                                  overflow: TextOverflow.ellipsis,
                                  style: PesaTextStyles.num(fontSize: 11, color: PesaColors.ink3),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _AmountStep extends StatelessWidget {
  const _AmountStep({
    required this.bucket,
    required this.amount,
    required this.stillNeeds,
    required this.currency,
    required this.onKey,
    required this.onChip,
    required this.onReview,
  });

  final Bucket bucket;
  final int amount;
  final int stillNeeds;
  final String currency;
  final ValueChanged<String> onKey;
  final ValueChanged<int> onChip;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    final overLimit = amount > stillNeeds;
    final chips = <int>{stillNeeds, 500, 1000}.where((v) => v > 0 && v <= stillNeeds).toList();

    return Column(
      children: [
        Row(
          children: [
            RowIconChip(color: bucket.color, icon: pesaIconFor(bucket.icon), size: 40),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(bucket.name, style: PesaTextStyles.serif(fontSize: 20)),
                  const SizedBox(height: 2),
                  Text(
                    stillNeeds == 0
                        ? '${bucket.name} is already full'
                        : 'Needs ${formatMoney(stillNeeds, currency)} to fill',
                    style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
                  ),
                ],
              ),
            ),
          ],
        ),
        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text("You're sending", style: TextStyle(fontSize: 11, color: PesaColors.ink3)),
              const SizedBox(height: 6),
              _Shake(
                trigger: overLimit,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      currency,
                      style: PesaTextStyles.serif(fontSize: 24, color: PesaColors.ink3),
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          NumberFormat.decimalPattern().format(amount),
                          key: const Key('disburse-amount'),
                          style: PesaTextStyles.serif(
                            fontSize: 72,
                            color: overLimit ? PesaColors.clayDeep : PesaColors.ink,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 6,
                children: [
                  for (final v in chips)
                    ActionChip(
                      label: Text(
                        v == stillNeeds ? 'Fill it' : formatMoney(v, currency),
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                      ),
                      onPressed: () => onChip(v),
                      backgroundColor: PesaColors.ink.withValues(alpha: 0.06),
                      side: BorderSide.none,
                      shape: const StadiumBorder(),
                    ),
                ],
              ),
              AnimatedSize(
                duration: const Duration(milliseconds: 180),
                child: overLimit
                    ? Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: Text(
                          stillNeeds == 0
                              ? '${bucket.name} is already full'
                              : 'Only ${formatMoney(stillNeeds, currency)} needed to fill ${bucket.name}',
                          key: const Key('disburse-over-limit'),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: PesaColors.clayDeep,
                          ),
                        ),
                      )
                    : const SizedBox(width: double.infinity),
              ),
            ],
          ),
        ),
        _Keypad(onKey: onKey),
        const SizedBox(height: 10),
        _GreenButton(
          label: 'Review',
          trailingIcon: LucideIcons.chevronRight,
          onPressed: amount > 0 && !overLimit ? onReview : null,
        ),
      ],
    );
  }
}

class _Keypad extends StatelessWidget {
  const _Keypad({required this.onKey});

  final ValueChanged<String> onKey;

  static const _keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'];

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 3,
      childAspectRatio: 2.1,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        for (final k in _keys)
          InkWell(
            key: Key('keypad-$k'),
            borderRadius: BorderRadius.circular(PesaRadius.base),
            onTap: () => onKey(k),
            child: Center(
              child: k == 'back'
                  ? const Icon(LucideIcons.chevronLeft, size: 24, color: PesaColors.ink)
                  : Text(k, style: PesaTextStyles.serif(fontSize: 30)),
            ),
          ),
      ],
    );
  }
}

class _ConfirmStep extends StatelessWidget {
  const _ConfirmStep({
    required this.bucket,
    required this.amount,
    required this.currency,
    required this.method,
    required this.onMethod,
    required this.note,
    required this.sending,
    required this.error,
    required this.onSend,
  });

  final Bucket bucket;
  final int amount;
  final String currency;
  final String method;
  final ValueChanged<String> onMethod;
  final TextEditingController note;
  final bool sending;
  final String? error;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    Widget row(String label, Widget value) => Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: PesaColors.ink3)),
        value,
      ],
    );
    const divider = Divider(height: 24, color: PesaColors.line);

    return ListView(
      padding: const EdgeInsets.only(top: 4),
      children: [
        Text('Confirm the move', style: PesaTextStyles.serif(fontSize: 26)),
        const SizedBox(height: 12),
        PesaCard(
          child: Column(
            children: [
              row(
                'Sending',
                Text(
                  formatMoney(amount, currency),
                  style: PesaTextStyles.num(fontSize: 22, fontWeight: FontWeight.w600),
                ),
              ),
              divider,
              row(
                'To pot',
                Row(
                  children: [
                    RowIconChip(color: bucket.color, icon: pesaIconFor(bucket.icon), size: 28),
                    const SizedBox(width: 8),
                    Text(bucket.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              divider,
              row(
                'After this',
                Text.rich(
                  TextSpan(
                    style: PesaTextStyles.num(fontWeight: FontWeight.w600),
                    children: [
                      TextSpan(text: formatMoney(bucket.allocated + amount, currency)),
                      TextSpan(
                        text: ' / ${formatMoney(bucket.target, currency)}',
                        style: const TextStyle(color: PesaColors.ink3, fontWeight: FontWeight.w400),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Text('METHOD', style: PesaTextStyles.eyebrow()),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final m in _methods)
              ChoiceChip(
                label: Text(m),
                selected: m == method,
                onSelected: (_) => onMethod(m),
                showCheckmark: false,
                shape: const StadiumBorder(),
                side: BorderSide.none,
                backgroundColor: PesaColors.ink.withValues(alpha: 0.06),
                selectedColor: PesaColors.ink,
                labelStyle: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: m == method ? PesaColors.bgApp : PesaColors.ink,
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        TextField(
          controller: note,
          maxLength: 200,
          decoration: const InputDecoration(hintText: 'Add a note (optional)', counterText: ''),
        ),
        if (error != null) ...[
          const SizedBox(height: 10),
          Text(error!, style: const TextStyle(color: PesaColors.clayDeep, fontSize: 13)),
        ],
        const SizedBox(height: 12),
        _GreenButton(
          label: 'Send ${formatMoney(amount, currency)}',
          leadingIcon: LucideIcons.send,
          loading: sending,
          onPressed: sending ? null : onSend,
        ),
      ],
    );
  }
}

class _SuccessStep extends StatefulWidget {
  const _SuccessStep({
    required this.bucket,
    required this.amount,
    required this.currency,
    required this.onDone,
  });

  final Bucket bucket;
  final int amount;
  final String currency;
  final VoidCallback onDone;

  @override
  State<_SuccessStep> createState() => _SuccessStepState();
}

class _SuccessStepState extends State<_SuccessStep> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1700),
  )..forward();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.bucket;
    double fill(int allocated) => b.target > 0 ? (allocated / b.target).clamp(0.0, 1.0) : 1.0;
    final serif = PesaTextStyles.serif(fontSize: 28);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = _controller.value;
        final textIn = Curves.easeOutCubic.transform(((t - 0.55) / 0.3).clamp(0.0, 1.0));
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 160,
              height: 150,
              child: CustomPaint(
                painter: PotPainter(
                  t: t,
                  center: const Offset(80, 82),
                  unit: 5,
                  fromFill: fill(b.allocated),
                  toFill: fill(b.allocated + widget.amount),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Opacity(
              opacity: textIn,
              child: Transform.translate(
                offset: Offset(0, 10 * (1 - textIn)),
                child: Column(
                  children: [
                    Text.rich(
                      TextSpan(
                        style: serif,
                        children: [
                          const TextSpan(text: 'Landed '),
                          TextSpan(
                            text: 'safely.',
                            style: serif.copyWith(fontStyle: FontStyle.italic),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text.rich(
                      textAlign: TextAlign.center,
                      TextSpan(
                        style: const TextStyle(fontSize: 15, color: PesaColors.ink2),
                        children: [
                          TextSpan(text: '${formatMoney(widget.amount, widget.currency)} sent to '),
                          TextSpan(
                            text: b.name,
                            style: const TextStyle(
                              color: PesaColors.ink,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const TextSpan(text: '.'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),
                    PesaButton(label: 'Done', onPressed: widget.onDone),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Full-width green pill (the web's `.btn-green.btn-block`).
class _GreenButton extends StatelessWidget {
  const _GreenButton({
    required this.label,
    required this.onPressed,
    this.leadingIcon,
    this.trailingIcon,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? leadingIcon;
  final IconData? trailingIcon;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: PesaColors.green,
          disabledBackgroundColor: PesaColors.green.withValues(alpha: 0.4),
          foregroundColor: PesaColors.bgApp,
          disabledForegroundColor: PesaColors.bgApp.withValues(alpha: 0.8),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: const StadiumBorder(),
        ),
        child: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: PesaColors.bgApp),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (leadingIcon != null) ...[
                    Icon(leadingIcon, size: 16),
                    const SizedBox(width: 8),
                  ],
                  Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  if (trailingIcon != null) ...[
                    const SizedBox(width: 6),
                    Icon(trailingIcon, size: 16),
                  ],
                ],
              ),
      ),
    );
  }
}

/// Shakes its child horizontally once each time [trigger] turns true.
class _Shake extends StatefulWidget {
  const _Shake({required this.trigger, required this.child});

  final bool trigger;
  final Widget child;

  @override
  State<_Shake> createState() => _ShakeState();
}

class _ShakeState extends State<_Shake> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 380),
  );

  @override
  void didUpdateWidget(_Shake old) {
    super.didUpdateWidget(old);
    if (widget.trigger && !old.trigger) {
      HapticFeedback.heavyImpact();
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = _controller.value;
        final dx = math.sin(t * math.pi * 6) * 10 * (1 - t);
        return Transform.translate(offset: Offset(dx, 0), child: child);
      },
      child: widget.child,
    );
  }
}
