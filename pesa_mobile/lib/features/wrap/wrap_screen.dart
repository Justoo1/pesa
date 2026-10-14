import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/format.dart';
import '../../core/models/home_data.dart';
import '../../core/models/month_row.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/async_data_view.dart';
import '../../core/widgets/decor_rings.dart';
import '../../core/widgets/pesa_button.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/row_icon_chip.dart';
import '../home/bootstrap_provider.dart';

const _savedKinds = {'future', 'emergency', 'debt'};
const _gaveKinds = {'give', 'people'};
const _livedKinds = {'essential', 'bills'};

/// Ports `components/pesa/screens/wrap.tsx`: this month (or year) as a
/// celebratory summary. Everything derives from bootstrap data.
///
/// [active] is whether the Wrap tab is on screen: the tab shell keeps every
/// tab mounted, so the entrance animations are replayed each time the tab is
/// opened rather than playing once, invisibly, at app start.
class WrapScreen extends ConsumerStatefulWidget {
  const WrapScreen({super.key, required this.active});

  final bool active;

  @override
  ConsumerState<WrapScreen> createState() => _WrapScreenState();
}

class _WrapScreenState extends ConsumerState<WrapScreen> {
  bool _yearView = false;
  int _revealGeneration = 0;

  @override
  void didUpdateWidget(WrapScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) setState(() => _revealGeneration++);
  }

  void _setView(bool year) {
    if (year == _yearView) return;
    setState(() {
      _yearView = year;
      _revealGeneration++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AsyncDataView(
      value: ref.watch(bootstrapProvider),
      onRefresh: () => ref.refresh(bootstrapProvider.future),
      builder: (data) {
        // Nothing animates while the tab is hidden; the generation bump on
        // activation rebuilds the reveals so they play when seen.
        final play = widget.active;
        final sections = _yearView ? _yearSections(data, play) : _monthSections(data, play);
        return ListView(
          key: ValueKey('wrap-$_revealGeneration-$_yearView'),
          padding: const EdgeInsets.only(bottom: 28),
          children: [
            _Header(monthLabel: data.profile.monthLabel, yearView: _yearView, onChanged: _setView),
            for (var i = 0; i < sections.length; i++)
              _Reveal(index: i, play: play, child: sections[i]),
          ],
        );
      },
    );
  }

  List<Widget> _monthSections(HomeData data, bool play) {
    final currency = data.profile.currency;
    final buckets = data.buckets;
    int sumOf(Set<String> kinds) =>
        buckets.where((b) => kinds.contains(b.kind)).fold(0, (s, b) => s + b.allocated);
    final total = buckets.fold<int>(0, (s, b) => s + b.allocated);
    final saved = sumOf(_savedKinds);
    final gave = sumOf(_gaveKinds);
    final lived = sumOf(_livedKinds);
    final fullCount = buckets.where((b) => b.allocated >= b.target).length;

    return [
      _Pad(
        top: 14,
        child: _HeroCard(
          gradient: const [PesaColors.clay, PesaColors.clayDeep],
          eyebrow: 'You disbursed',
          currency: currency,
          amount: total,
          play: play,
          foreground: const Color(0xFFFFF8EB),
          footer: [
            const TextSpan(text: 'across '),
            TextSpan(
              text: '${buckets.length} pots',
              style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white),
            ),
            const TextSpan(text: ', with '),
            TextSpan(
              text: '$fullCount',
              style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white),
            ),
            const TextSpan(text: ' filled to the brim. 🍯'),
          ],
        ),
      ),
      _Pad(
        top: 12,
        child: _StatRow(
          currency: currency,
          play: play,
          saved: saved,
          gave: gave,
          lived: lived,
          savedCaption: 'for tomorrow',
        ),
      ),
      if (data.filledStreak >= 2) _Pad(top: 12, child: _StreakCard(months: data.filledStreak)),
      _Pad(
        top: 16,
        child: _HighlightsCard(
          name: data.profile.displayName,
          highlights: _highlights(data, saved),
        ),
      ),
      _Pad(
        top: 16,
        child: Row(
          children: [
            Expanded(
              child: PesaButton(
                label: 'Share my wrap',
                icon: LucideIcons.share2,
                expand: true,
                onPressed: () => _share(
                  data,
                  total: total,
                  saved: saved,
                  gave: gave,
                  lived: lived,
                  fullCount: fullCount,
                ),
              ),
            ),
            const SizedBox(width: 8),
            PesaIconButton(
              icon: LucideIcons.history,
              background: PesaColors.bgCard,
              onPressed: () => context.push('/months'),
            ),
          ],
        ),
      ),
    ];
  }

  List<Widget> _yearSections(HomeData data, bool play) {
    final currency = data.profile.currency;
    final now = DateTime.now();
    final months = data.annualMonths;
    final elapsed = months.take(now.month).toList();
    final saved = elapsed.fold<int>(0, (s, m) => s + m.saved);
    final gave = elapsed.fold<int>(0, (s, m) => s + m.gave);
    final lived = elapsed.fold<int>(0, (s, m) => s + m.lived);
    final total = elapsed.fold<int>(0, (s, m) => s + m.total);
    final active = elapsed.where((m) => m.total > 0).length;

    return [
      _Pad(
        top: 14,
        child: _HeroCard(
          gradient: const [PesaColors.green, PesaColors.greenDeep],
          eyebrow: '${now.year} disbursed',
          currency: currency,
          amount: total,
          play: play,
          foreground: PesaColors.bgApp,
          footer: [
            const TextSpan(text: 'over '),
            TextSpan(
              text: '$active',
              style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white),
            ),
            TextSpan(text: ' month${active == 1 ? '' : 's'} of activity.'),
          ],
        ),
      ),
      _Pad(
        top: 12,
        child: _StatRow(
          currency: currency,
          play: play,
          saved: saved,
          gave: gave,
          lived: lived,
          savedCaption: 'put away',
        ),
      ),
      _Pad(
        top: 16,
        child: _ByMonthCard(
          months: months,
          currentIndex: now.month - 1,
          currency: currency,
          play: play,
        ),
      ),
      _Pad(
        top: 16,
        child: PesaButton(
          label: 'See every month',
          icon: LucideIcons.history,
          variant: PesaButtonVariant.soft,
          expand: true,
          onPressed: () => context.push('/months'),
        ),
      ),
    ];
  }

  /// Same three highlight rules as the web wrap, in the same order.
  List<_Highlight> _highlights(HomeData data, int saved) {
    final currency = data.profile.currency;
    final out = <_Highlight>[];
    final now = DateTime.now();
    final monthStart = DateTime(now.year, now.month);
    final monthTxns = data.ledger
        .where((t) => !DateTime.parse(t.occurredAt).toLocal().isBefore(monthStart))
        .toList();

    // 1. The earliest day this month a now-full pot received money.
    final full = data.buckets.where((b) => b.allocated >= b.target).toList();
    final fullIds = {for (final b in full) b.id};
    final fullTxns = monthTxns.where((t) => fullIds.contains(t.bucketId)).toList()
      ..sort((a, b) => a.occurredAt.compareTo(b.occurredAt));
    if (fullTxns.isNotEmpty) {
      final first = fullTxns.first;
      final pot = full.firstWhere((b) => b.id == first.bucketId);
      out.add(
        _Highlight(
          icon: LucideIcons.sparkles,
          tone: 'sage',
          title: 'You hit ${pot.name} on day ${DateTime.parse(first.occurredAt).toLocal().day}',
          subtitle: 'Filling pots early is the dream. ✨',
        ),
      );
    }

    // 2. This month's savings against the best earlier month in the window.
    final prior = data.months.take(math.max(0, data.months.length - 1));
    final bestPrior = prior.fold<int>(0, (m, r) => math.max(m, r.saved));
    if (saved > 0) {
      out.add(
        _Highlight(
          icon: LucideIcons.trendingUp,
          tone: 'gold',
          title: 'Savings grew ${formatMoney(saved, currency)}',
          subtitle: saved >= bestPrior && bestPrior > 0
              ? 'Your best savings month in the window.'
              : bestPrior > 0
              ? 'Still ${formatMoney(bestPrior - saved, currency)} short of your best month.'
              : 'First savings on the board.',
        ),
      );
    }

    // 3. Every give/people pot funded in full.
    final givePots = data.buckets.where((b) => _gaveKinds.contains(b.kind)).toList();
    if (givePots.isNotEmpty && givePots.every((b) => b.allocated >= b.target)) {
      out.add(
        _Highlight(
          icon: LucideIcons.heart,
          tone: 'rose',
          title: '${givePots.take(2).map((b) => b.name).join(' & ')}: on time',
          subtitle: "Same week, every month — that's consistency.",
        ),
      );
    }

    if (out.isEmpty) {
      out.add(
        const _Highlight(
          icon: LucideIcons.sparkles,
          tone: 'sage',
          title: 'Add a few transfers to see your highlights',
          subtitle: 'Your wrap fills up as the month unfolds.',
        ),
      );
    }
    return out.take(3).toList();
  }

  Future<void> _share(
    HomeData data, {
    required int total,
    required int saved,
    required int gave,
    required int lived,
    required int fullCount,
  }) async {
    final c = data.profile.currency;
    final text =
        'My Pesa ${data.profile.monthLabel} wrap:\n'
        '· Disbursed ${formatMoney(total, c)}\n'
        '· Saved ${formatMoney(saved, c)}, gave ${formatMoney(gave, c)}, '
        'lived ${formatMoney(lived, c)}\n'
        '· $fullCount/${data.buckets.length} pots full';
    final box = context.findRenderObject() as RenderBox?;
    await SharePlus.instance.share(
      ShareParams(
        text: text,
        subject: 'My Pesa wrap',
        // iPad needs an anchor rect for the share popover.
        sharePositionOrigin: box == null ? null : box.localToGlobal(Offset.zero) & box.size,
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.monthLabel, required this.yearView, required this.onChanged});

  final String monthLabel;
  final bool yearView;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isFinalDay = now.day == DateTime(now.year, now.month + 1, 0).day;
    final serif = PesaTextStyles.serif(fontSize: 30);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (yearView
                          ? '${now.year} · Year so far'
                          : '$monthLabel · ${isFinalDay ? 'The Wrap' : 'Month so far'}')
                      .toUpperCase(),
                  style: PesaTextStyles.eyebrow(),
                ),
                const SizedBox(height: 4),
                Text.rich(
                  TextSpan(
                    style: serif,
                    children: [
                      TextSpan(text: yearView ? 'Your year, ' : 'Your month, '),
                      TextSpan(
                        text: 'in flow.',
                        style: serif.copyWith(fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          _RangeToggle(yearView: yearView, onChanged: onChanged),
        ],
      ),
    );
  }
}

/// The web's MONTH / YEAR pill toggle, with a sliding ink thumb.
class _RangeToggle extends StatelessWidget {
  const _RangeToggle({required this.yearView, required this.onChanged});

  final bool yearView;
  final ValueChanged<bool> onChanged;

  static const _segment = Size(64, 30);

  @override
  Widget build(BuildContext context) {
    Widget label(String text, bool selected, bool year) => GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => onChanged(year),
      child: SizedBox.fromSize(
        size: _segment,
        child: Center(
          child: AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: selected ? PesaColors.bgApp : PesaColors.ink2,
            ),
            child: Text(text),
          ),
        ),
      ),
    );

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: PesaColors.ink.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(PesaRadius.pill),
      ),
      child: Stack(
        children: [
          AnimatedPositioned(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            left: yearView ? _segment.width : 0,
            top: 0,
            width: _segment.width,
            height: _segment.height,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: PesaColors.ink,
                borderRadius: BorderRadius.circular(PesaRadius.pill),
              ),
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [label('MONTH', !yearView, false), label('YEAR', yearView, true)],
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.gradient,
    required this.eyebrow,
    required this.currency,
    required this.amount,
    required this.play,
    required this.foreground,
    required this.footer,
  });

  final List<Color> gradient;
  final String eyebrow;
  final String currency;
  final int amount;
  final bool play;
  final Color foreground;
  final List<InlineSpan> footer;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PesaRadius.lg),
        gradient: LinearGradient(
          begin: const Alignment(-0.4, -1),
          end: const Alignment(0.4, 1),
          colors: gradient,
        ),
        boxShadow: PesaShadows.base,
      ),
      child: Stack(
        children: [
          const Positioned(
            right: -50,
            bottom: -60,
            child: DecorRings(color: Colors.white, size: 200, dotOpacity: 1),
          ),
          Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eyebrow.toUpperCase(),
                  style: PesaTextStyles.eyebrow(color: foreground.withValues(alpha: 0.8)),
                ),
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(currency, style: PesaTextStyles.serif(fontSize: 18, color: foreground)),
                    const SizedBox(width: 4),
                    Flexible(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: _CountUp(
                          value: amount,
                          play: play,
                          style: PesaTextStyles.serif(fontSize: 56, color: foreground),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text.rich(
                  TextSpan(children: footer),
                  style: TextStyle(fontSize: 15, color: foreground.withValues(alpha: 0.9)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({
    required this.currency,
    required this.play,
    required this.saved,
    required this.gave,
    required this.lived,
    required this.savedCaption,
  });

  final String currency;
  final bool play;
  final int saved;
  final int gave;
  final int lived;
  final String savedCaption;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: _WrapStat(
              label: 'Saved',
              value: saved,
              caption: savedCaption,
              tint: 'green',
              currency: currency,
              play: play,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _WrapStat(
              label: 'Gave',
              value: gave,
              caption: 'to people & faith',
              tint: 'gold',
              currency: currency,
              play: play,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _WrapStat(
              label: 'Lived',
              value: lived,
              caption: 'on essentials',
              tint: 'clay',
              currency: currency,
              play: play,
            ),
          ),
        ],
      ),
    );
  }
}

class _WrapStat extends StatelessWidget {
  const _WrapStat({
    required this.label,
    required this.value,
    required this.caption,
    required this.tint,
    required this.currency,
    required this.play,
  });

  final String label;
  final int value;
  final String caption;
  final String tint;
  final String currency;
  final bool play;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = PesaColors.chipColors(tint);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
              color: fg.withValues(alpha: 0.8),
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: _CountUp(
              value: value,
              play: play,
              prefix: currency,
              style: PesaTextStyles.num(fontSize: 17, fontWeight: FontWeight.w700, color: fg),
            ),
          ),
          const SizedBox(height: 4),
          Text(caption, style: TextStyle(fontSize: 11, color: fg.withValues(alpha: 0.7))),
        ],
      ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  const _StreakCard({required this.months});

  final int months;

  @override
  Widget build(BuildContext context) {
    return PesaCard(
      color: PesaColors.greenTint,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          const RowIconChip(color: 'sage', icon: LucideIcons.sparkles, size: 36),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$months month${months == 1 ? '' : 's'} in a row, every pot full',
                  style: PesaTextStyles.serif(fontSize: 18, color: PesaColors.greenDeep),
                ),
                const SizedBox(height: 2),
                Text(
                  'Quiet consistency — keep going.',
                  style: TextStyle(
                    fontSize: 11,
                    color: PesaColors.greenDeep.withValues(alpha: 0.75),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Highlight {
  const _Highlight({
    required this.icon,
    required this.tone,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String tone;
  final String title;
  final String subtitle;
}

class _HighlightsCard extends StatelessWidget {
  const _HighlightsCard({required this.name, required this.highlights});

  final String name;
  final List<_Highlight> highlights;

  @override
  Widget build(BuildContext context) {
    final serif = PesaTextStyles.serif(fontSize: 20);
    return PesaCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text.rich(
            TextSpan(
              style: serif,
              children: [
                const TextSpan(text: 'Highlights for '),
                TextSpan(
                  text: name,
                  style: serif.copyWith(fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          for (final h in highlights)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  RowIconChip(color: h.tone, icon: h.icon, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          h.title,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                        Text(
                          h.subtitle,
                          style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ByMonthCard extends StatelessWidget {
  const _ByMonthCard({
    required this.months,
    required this.currentIndex,
    required this.currency,
    required this.play,
  });

  final List<MonthRow> months;
  final int currentIndex;
  final String currency;
  final bool play;

  @override
  Widget build(BuildContext context) {
    final elapsed = months.take(currentIndex + 1).toList();
    MonthRow? best;
    for (final m in elapsed) {
      if (best == null || m.saved > best.saved) best = m;
    }
    final max = math.max(1, months.fold<int>(0, (m, r) => math.max(m, r.total)));

    return PesaCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('By month', style: PesaTextStyles.serif(fontSize: 20)),
          if (best != null && best.saved > 0) ...[
            const SizedBox(height: 4),
            Text.rich(
              TextSpan(
                style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
                children: [
                  const TextSpan(text: 'Best for savings: '),
                  TextSpan(
                    text: best.month,
                    style: const TextStyle(color: PesaColors.ink, fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: ' · ${formatMoney(best.saved, currency)}.'),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            height: 96,
            child: TweenAnimationBuilder<double>(
              // Bars grow from the baseline when the card is revealed.
              tween: Tween(begin: play ? 0 : 1, end: 1),
              duration: const Duration(milliseconds: 900),
              curve: Curves.easeOutCubic,
              builder: (context, grow, _) => Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (var i = 0; i < months.length; i++)
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Tooltip(
                          message: '${months[i].month}: ${formatMoney(months[i].total, currency)}',
                          child: FractionallySizedBox(
                            heightFactor:
                                grow *
                                (months[i].total > 0 ? math.max(months[i].total / max, 0.04) : 0),
                            alignment: Alignment.bottomCenter,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: i == currentIndex ? PesaColors.clay : PesaColors.greenSoft,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              for (final m in months)
                Expanded(
                  child: Text(
                    m.month.isEmpty ? '' : m.month[0],
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Animates a money figure from 0 up to [value] (thousands-separated).
class _CountUp extends StatelessWidget {
  const _CountUp({required this.value, required this.play, required this.style, this.prefix = ''});

  final int value;
  final bool play;
  final TextStyle style;
  final String prefix;

  static final _format = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: play ? 0 : value.toDouble(), end: value.toDouble()),
      duration: const Duration(milliseconds: 1100),
      curve: Curves.easeOutCubic,
      builder: (context, v, _) => Text('$prefix${_format.format(v.round())}', style: style),
    );
  }
}

/// Staggered fade + rise for each section of the wrap.
class _Reveal extends StatefulWidget {
  const _Reveal({required this.index, required this.play, required this.child});

  final int index;
  final bool play;
  final Widget child;

  @override
  State<_Reveal> createState() => _RevealState();
}

class _RevealState extends State<_Reveal> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 520),
    value: widget.play ? 0 : 1,
  );

  @override
  void initState() {
    super.initState();
    if (widget.play) {
      Future.delayed(Duration(milliseconds: 80 * widget.index), () {
        if (mounted) _controller.forward();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final curve = CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
    return FadeTransition(
      opacity: curve,
      child: SlideTransition(
        position: Tween(begin: const Offset(0, 0.08), end: Offset.zero).animate(curve),
        child: widget.child,
      ),
    );
  }
}

class _Pad extends StatelessWidget {
  const _Pad({required this.child, this.top = 16});

  final Widget child;
  final double top;

  @override
  Widget build(BuildContext context) =>
      Padding(padding: EdgeInsets.fromLTRB(20, top, 20, 0), child: child);
}
