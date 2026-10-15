class IncomeSource {
  const IncomeSource({
    required this.id,
    required this.name,
    required this.amount,
    required this.active,
  });

  factory IncomeSource.fromJson(Map<String, dynamic> json) => IncomeSource(
    id: json['id'] as String,
    name: json['name'] as String,
    amount: json['amount'] as int,
    active: json['active'] as bool,
  );

  final String id;
  final String name;
  final int amount;
  final bool active;

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'amount': amount, 'active': active};
}
