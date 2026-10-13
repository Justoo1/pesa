class PesaTransaction {
  const PesaTransaction({
    required this.id,
    required this.bucketId,
    required this.amount,
    required this.note,
    required this.method,
    required this.occurredAt,
    required this.transferId,
  });

  factory PesaTransaction.fromJson(Map<String, dynamic> json) => PesaTransaction(
    id: json['id'] as String,
    bucketId: json['bucketId'] as String,
    amount: json['amount'] as int,
    note: json['note'] as String,
    method: json['method'] as String,
    occurredAt: json['occurredAt'] as String,
    transferId: json['transferId'] as String?,
  );

  final String id;
  final String bucketId;
  final int amount;
  final String note;
  final String method;
  final String occurredAt;
  final String? transferId;

  Map<String, dynamic> toJson() => {
    'id': id,
    'bucketId': bucketId,
    'amount': amount,
    'note': note,
    'method': method,
    'occurredAt': occurredAt,
    'transferId': transferId,
  };
}
