import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/format.dart';
import '../../core/models/bank_transaction.dart';
import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';
import '../../core/widgets/pesa_card.dart';

IconData _iconForKind(String kind) {
  switch (kind) {
    case 'income':
      return LucideIcons.wallet;
    case 'manual':
      return LucideIcons.plus;
    case 'spend':
      return LucideIcons.minus;
    case 'milestone':
      return LucideIcons.flag;
    case 'disburse':
    default:
      return LucideIcons.send;
  }
}

/// Ports the web app's bank `Statement` card: one `.row` per ledger entry
/// with a kind icon, note, relative date and a signed, colored amount.
class BankStatement extends StatelessWidget {
  const BankStatement({super.key, required this.ledger, required this.currency});

  final List<BankTransaction> ledger;
  final String currency;

  @override
  Widget build(BuildContext context) {
    if (ledger.isEmpty) {
      return const PesaCard(
        padding: EdgeInsets.all(18),
        child: Center(child: Text('No activity on this account yet.')),
      );
    }
    return PesaCard(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        children: [
          for (final t in ledger)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: PesaColors.bgElev,
                      borderRadius: BorderRadius.circular(11),
                      border: Border.all(color: PesaColors.line),
                    ),
                    child: Icon(_iconForKind(t.kind), size: 16, color: PesaColors.ink2),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t.note,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: PesaColors.ink,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          formatTxnDate(t.occurredAt),
                          style: const TextStyle(fontSize: 11, color: PesaColors.ink3),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${t.amount < 0 ? '−' : '+'}${formatMoney(t.amount.abs(), currency)}',
                    style: PesaTextStyles.num(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: t.amount < 0 ? PesaColors.clayDeep : PesaColors.greenDeep,
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
