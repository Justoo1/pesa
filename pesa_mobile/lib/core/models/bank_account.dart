class BankAccount {
  const BankAccount({
    required this.id,
    required this.name,
    required this.icon,
    required this.isPrimary,
    required this.balance,
  });

  factory BankAccount.fromJson(Map<String, dynamic> json) => BankAccount(
    id: json['id'] as String,
    name: json['name'] as String,
    icon: json['icon'] as String,
    isPrimary: json['isPrimary'] as bool,
    balance: json['balance'] as int,
  );

  final String id;
  final String name;
  final String icon;
  final bool isPrimary;
  final int balance;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'icon': icon,
    'isPrimary': isPrimary,
    'balance': balance,
  };
}
