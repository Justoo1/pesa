import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/widgets/async_data_view.dart';
import '../../core/format.dart';
import '../../core/models/bank_account.dart';
import '../../core/models/home_data.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_icons.dart';
import '../../core/theme/pesa_metrics.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/decor_rings.dart';
import '../../core/widgets/mini_stat.dart';
import '../../core/widgets/pesa_card.dart';
import '../../core/widgets/screen_header.dart';
import '../home/bootstrap_provider.dart';
import 'bank_account_action_sheet.dart';
import 'bank_account_form_sheet.dart';
import 'bank_statement.dart';

/// Ports `components/pesa/screens/bank.tsx` `BankScreen`.
class BankScreen extends ConsumerWidget {
  const BankScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(bootstrapProvider);

    return AsyncDataView(
      value: bootstrap,
      onRefresh: () => ref.refresh(bootstrapProvider.future),
      builder: (data) => _BankBody(data: data),
    );
  }
}

class _BankBody extends StatelessWidget {
  const _BankBody({required this.data});

  final HomeData data;

  @override
  Widget build(BuildContext context) {
    final currency = data.profile.currency;
    final accounts = data.bankAccounts;
    final primary = accounts.where((a) => a.isPrimary).firstOrNull ?? accounts.firstOrNull;
    final otherAccounts = accounts.where((a) => a.id != primary?.id).toList();
    final totalAllocated = data.buckets.fold<int>(0, (s, b) => s + b.sentThisMonth);
    final totalTarget = data.buckets.fold<int>(0, (s, b) => s + b.target);
    final totalBalance = accounts.fold<int>(0, (s, a) => s + a.balance);
    // Same derivation as the web: salary not earmarked to any pot target,
    // minus personal spends logged this cycle.
    final spendableRemaining = data.profile.salary - totalTarget - data.monthlyBankSpend;
    final primaryLedger = data.bankLedger.where((t) => t.accountId == primary?.id).toList();

    void openDetail(BankAccount account) => showBankAccountDetailSheet(
      context: context,
      account: account,
      allAccounts: accounts,
      ledger: data.bankLedger,
      currency: currency,
    );

    return ListView(
      key: const Key('bank-list'),
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        const ScreenHeader(eyebrow: 'Bank', title: 'Your', italic: 'balance.'),
        if (primary == null)
          const Padding(
            padding: EdgeInsets.all(32),
            child: Center(child: Text('No accounts yet.')),
          )
        else
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
            child: _BalanceHero(
              account: primary,
              currency: currency,
              totalAllocated: totalAllocated,
              totalBalance: totalBalance,
              accountCount: accounts.length,
              onAddFunds: () => runAddFunds(context, primary),
              onSpend: () => runBankSpend(context, primary),
              onMove: otherAccounts.isEmpty
                  ? null
                  : () => runBankTransfer(context, primary, accounts),
              onTap: () => openDetail(primary),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
          child: Row(
            children: [
              Expanded(
                child: MiniStat(
                  label: 'Spendable this cycle',
                  value: formatMoney(math.max(0, spendableRemaining), currency),
                  tint: spendableRemaining < 0 ? 'clay' : 'gold',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: MiniStat(
                  label: 'Spent this cycle',
                  value: formatMoney(data.monthlyBankSpend, currency),
                  tint: 'clay',
                ),
              ),
            ],
          ),
        ),
        _SectionTitle(
          title: 'Other accounts',
          trailing: TextButton.icon(
            onPressed: () => showCreateBankAccountSheet(context),
            icon: const Icon(LucideIcons.plus, size: 14),
            label: const Text('New'),
            style: TextButton.styleFrom(foregroundColor: PesaColors.ink2),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: otherAccounts.isEmpty
              ? const PesaCard(
                  child: Text(
                    'Add a Cash or MoMo account to track money outside your main bank account.',
                    textAlign: TextAlign.center,
                  ),
                )
              : PesaCard(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    children: [
                      for (final a in otherAccounts)
                        ListTile(
                          leading: Icon(pesaIconFor(a.icon), size: 18, color: PesaColors.ink2),
                          title: Text(
                            a.name,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                formatMoney(a.balance, currency),
                                style: PesaTextStyles.num(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(width: 4),
                              const Icon(LucideIcons.chevronRight, size: 14),
                            ],
                          ),
                          onTap: () => openDetail(a),
                        ),
                    ],
                  ),
                ),
        ),
        _SectionTitle(
          title: 'Statement',
          trailing: Text(
            '${primaryLedger.length} entr${primaryLedger.length == 1 ? 'y' : 'ies'}',
            style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: BankStatement(ledger: primaryLedger, currency: currency),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.trailing});

  final String title;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: PesaTextStyles.serif(fontSize: 22)),
          trailing,
        ],
      ),
    );
  }
}

class _BalanceHero extends StatelessWidget {
  const _BalanceHero({
    required this.account,
    required this.currency,
    required this.totalAllocated,
    required this.totalBalance,
    required this.accountCount,
    required this.onAddFunds,
    required this.onSpend,
    required this.onMove,
    required this.onTap,
  });

  final BankAccount account;
  final String currency;
  final int totalAllocated;
  final int totalBalance;
  final int accountCount;
  final VoidCallback onAddFunds;
  final VoidCallback onSpend;
  final VoidCallback? onMove;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final overdrawn = account.balance < 0;
    final translucent = PesaColors.bgApp.withValues(alpha: 0.1);

    // Compact pills: up to three share one row, so labels must be able to
    // shrink (FilledButton.icon wraps its label in a Flexible).
    Widget heroButton(
      String label,
      IconData icon,
      VoidCallback onPressed, {
      bool primary = false,
    }) => Expanded(
      child: FilledButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 16),
        label: Text(label, overflow: TextOverflow.ellipsis, maxLines: 1),
        style: FilledButton.styleFrom(
          backgroundColor: primary ? PesaColors.clay : translucent,
          foregroundColor: primary ? Colors.white : PesaColors.bgApp,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(PesaRadius.pill),
            side: primary
                ? BorderSide.none
                : BorderSide(color: PesaColors.bgApp.withValues(alpha: 0.2)),
          ),
        ),
      ),
    );

    return GestureDetector(
      key: const Key('bank-primary-card'),
      onTap: onTap,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(PesaRadius.lg),
          gradient: const LinearGradient(
            begin: Alignment(-0.6, -1),
            end: Alignment(0.6, 1),
            colors: [PesaColors.bankNavyStart, PesaColors.bankNavyMid, PesaColors.bankNavyEnd],
            stops: [0, 0.6, 1],
          ),
        ),
        child: Stack(
          children: [
            const Positioned(right: -40, top: -50, child: DecorRings(color: PesaColors.bankMist)),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: PesaColors.bankMist,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          overdrawn ? 'OVERDRAWN' : account.name.toUpperCase(),
                          style: PesaTextStyles.eyebrow(color: PesaColors.bankMistText),
                        ),
                      ),
                      const Icon(LucideIcons.wallet, size: 20, color: PesaColors.bgApp),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        '${overdrawn ? '−' : ''}$currency',
                        style: PesaTextStyles.serif(fontSize: 18, color: PesaColors.bankMistText),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            NumberFormat.decimalPattern().format(account.balance.abs()),
                            style: PesaTextStyles.serif(
                              fontSize: 64,
                              color: overdrawn ? PesaColors.bankOverdrawn : PesaColors.bgApp,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${formatMoney(totalAllocated, currency)} sent to pots this month'
                    '${accountCount > 1 ? ' · ${formatMoney(totalBalance, currency)} across $accountCount accounts' : ''}',
                    style: const TextStyle(fontSize: 12, color: PesaColors.bankMistText),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      heroButton('Add funds', LucideIcons.plus, onAddFunds, primary: true),
                      const SizedBox(width: 8),
                      heroButton('Log a spend', LucideIcons.minus, onSpend),
                      if (onMove != null) ...[
                        const SizedBox(width: 8),
                        heroButton('Move', LucideIcons.arrowLeftRight, onMove!),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
