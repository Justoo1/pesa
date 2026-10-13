class PaydayDraft {
  const PaydayDraft({
    required this.bucketId,
    required this.bucketName,
    required this.amount,
    required this.color,
    required this.icon,
    required this.kind,
    required this.alreadyThisMonth,
  });

  factory PaydayDraft.fromJson(Map<String, dynamic> json) => PaydayDraft(
    bucketId: json['bucketId'] as String,
    bucketName: json['bucketName'] as String,
    amount: json['amount'] as int,
    color: json['color'] as String,
    icon: json['icon'] as String,
    kind: json['kind'] as String,
    alreadyThisMonth: json['alreadyThisMonth'] as int,
  );

  final String bucketId;
  final String bucketName;
  final int amount;
  final String color;
  final String icon;
  final String kind;
  final int alreadyThisMonth;

  Map<String, dynamic> toJson() => {
    'bucketId': bucketId,
    'bucketName': bucketName,
    'amount': amount,
    'color': color,
    'icon': icon,
    'kind': kind,
    'alreadyThisMonth': alreadyThisMonth,
  };
}
