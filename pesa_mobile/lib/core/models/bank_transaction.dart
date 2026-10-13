class BankTransaction {
  const BankTransaction({
    required this.id,
    required this.accountId,
    required this.amount,
    required this.kind,
    required this.note,
    required this.occurredAt,
  });

  factory BankTransaction.fromJson(Map<String, dynamic> json) => BankTransaction(
    id: json['id'] as String,
    accountId: json['accountId'] as String,
    amount: json['amount'] as int,
    kind: json['kind'] as String,
    note: json['note'] as String,
    occurredAt: json['occurredAt'] as String,
  );

  final String id;
  final String accountId;
  final int amount;
  final String kind;
  final String note;
  final String occurredAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'accountId': accountId,
    'amount': amount,
    'kind': kind,
    'note': note,
    'occurredAt': occurredAt,
  };
}
