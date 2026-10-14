import 'pot_projection.dart';

class Bucket {
  const Bucket({
    required this.id,
    required this.name,
    required this.target,
    required this.allocated,
    required this.spent,
    required this.color,
    required this.icon,
    required this.priority,
    required this.kind,
    required this.dueDayOfMonth,
    required this.carryOver,
    this.carriedIn = 0,
    required this.projection,
  });

  factory Bucket.fromJson(Map<String, dynamic> json) => Bucket(
    id: json['id'] as String,
    name: json['name'] as String,
    target: json['target'] as int,
    allocated: json['allocated'] as int,
    spent: json['spent'] as int,
    color: json['color'] as String,
    icon: json['icon'] as String,
    priority: json['priority'] as int,
    kind: json['kind'] as String,
    dueDayOfMonth: json['dueDayOfMonth'] as int?,
    carryOver: json['carryOver'] as bool,
    carriedIn: json['carriedIn'] as int? ?? 0,
    projection: json['projection'] == null
        ? null
        : PotProjection.fromJson(json['projection'] as Map<String, dynamic>),
  );

  final String id;
  final String name;
  final int target;
  final int allocated;
  final int spent;
  final String color;
  final String icon;
  final int priority;
  final String kind;
  final int? dueDayOfMonth;
  final bool carryOver;

  /// Part of [allocated] carried over from last month (carry-over pots).
  final int carriedIn;
  final PotProjection? projection;

  /// What this pot received *this month* — [allocated] minus the carried-in
  /// part. Use it (not [allocated]) for disbursed / left-to-disburse totals.
  int get sentThisMonth => allocated - carriedIn < 0 ? 0 : allocated - carriedIn;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'target': target,
    'allocated': allocated,
    'spent': spent,
    'color': color,
    'icon': icon,
    'priority': priority,
    'kind': kind,
    'dueDayOfMonth': dueDayOfMonth,
    'carryOver': carryOver,
    'carriedIn': carriedIn,
    'projection': projection?.toJson(),
  };
}
