import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:pesa_mobile/core/models/home_data.dart';

void main() {
  test('HomeData.fromJson round-trips a real bootstrap response', () {
    final raw = File('test/fixtures/bootstrap_sample.json').readAsStringSync();
    final json = jsonDecode(raw) as Map<String, dynamic>;

    final data = HomeData.fromJson(json);

    expect(data.profile.currency, 'GH₵');
    expect(data.profile.salary, 14000);
    expect(data.buckets.length, 10);
    expect(data.buckets.first.name, 'Rent');
    expect(data.bankAccounts.single.isPrimary, isTrue);
    expect(data.bankAccounts.single.balance, 14000);
    expect(data.months.length, 6);
    expect(data.annualMonths.length, 12);
    expect(data.onboardedAt, isNull);

    // Round-trip through toJson/fromJson again to catch asymmetric mappings.
    final reparsed = HomeData.fromJson(data.toJson());
    expect(reparsed.buckets.length, data.buckets.length);
    expect(reparsed.profile.salary, data.profile.salary);
  });
}
