class MilestoneTransaction {
  const MilestoneTransaction({
    required this.id,
    required this.milestoneId,
    required this.amount,
    required this.note,
    required this.occurredAt,
  });

  factory MilestoneTransaction.fromJson(Map<String, dynamic> json) => MilestoneTransaction(
    id: json['id'] as String,
    milestoneId: json['milestoneId'] as String,
    amount: json['amount'] as int,
    note: json['note'] as String,
    occurredAt: json['occurredAt'] as String,
  );

  final String id;
  final String milestoneId;
  final int amount;
  final String note;
  final String occurredAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'milestoneId': milestoneId,
    'amount': amount,
    'note': note,
    'occurredAt': occurredAt,
  };
}
