import 'package:flutter_test/flutter_test.dart';

import 'package:pesa_mobile/features/share/share_intake.dart';

/// "Share → Log spend in Pesa" reads the amount and note out of shared text, the
/// same way the web share target does.
void main() {
  test('finds the first amount, with currency and separators', () {
    expect(parseSharedAmount('GH₵ 30 for lunch'), 30);
    expect(parseSharedAmount('Paid 1,200.00 to Kofi'), 1200);
    expect(parseSharedAmount('Transport 30.50'), 31);
    expect(parseSharedAmount('no amount here'), 0);
  });

  test('note drops the leading amount', () {
    expect(parseSharedNote('GH₵ 30 lunch at Papaye'), 'lunch at Papaye');
    expect(parseSharedNote('Paid electricity'), 'Paid electricity');
    expect(parseSharedNote('45'), '45');
  });
}
