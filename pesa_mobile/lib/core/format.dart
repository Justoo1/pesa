import 'package:intl/intl.dart';

final _thousands = NumberFormat.decimalPattern();

/// `GH₵1,234` — mirrors the web's `fmtMoney`; negatives get a real minus
/// sign in front of the currency (`−GH₵50`).
String formatMoney(int amount, String currency) =>
    '${amount < 0 ? '−' : ''}$currency${_thousands.format(amount.abs())}';

/// Ports the web's `fmtTxnDate` (`components/pesa/format.ts`): "Today",
/// "Yesterday", otherwise "Oct 03".
String formatTxnDate(String iso, {DateTime? now}) {
  final d = DateTime.parse(iso).toLocal();
  final today = now ?? DateTime.now();
  final dayDiff = DateTime(
    today.year,
    today.month,
    today.day,
  ).difference(DateTime(d.year, d.month, d.day)).inDays;
  if (dayDiff == 0) return 'Today';
  if (dayDiff == 1) return 'Yesterday';
  return DateFormat('MMM dd').format(d);
}
