class MonthRow {
  const MonthRow({
    required this.month,
    required this.saved,
    required this.gave,
    required this.lived,
    required this.total,
  });

  factory MonthRow.fromJson(Map<String, dynamic> json) => MonthRow(
    month: json['month'] as String,
    saved: json['saved'] as int,
    gave: json['gave'] as int,
    lived: json['lived'] as int,
    total: json['total'] as int,
  );

  final String month;
  final int saved;
  final int gave;
  final int lived;
  final int total;

  Map<String, dynamic> toJson() => {
    'month': month,
    'saved': saved,
    'gave': gave,
    'lived': lived,
    'total': total,
  };
}
