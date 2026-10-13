class PesaProject {
  const PesaProject({
    required this.id,
    required this.name,
    required this.targetAmount,
    required this.targetDate,
    required this.icon,
  });

  factory PesaProject.fromJson(Map<String, dynamic> json) => PesaProject(
    id: json['id'] as String,
    name: json['name'] as String,
    targetAmount: json['targetAmount'] as int,
    targetDate: json['targetDate'] as String?,
    icon: json['icon'] as String,
  );

  final String id;
  final String name;
  final int targetAmount;
  final String? targetDate;
  final String icon;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'targetAmount': targetAmount,
    'targetDate': targetDate,
    'icon': icon,
  };
}
