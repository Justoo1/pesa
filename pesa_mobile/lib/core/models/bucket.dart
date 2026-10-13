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
  final PotProjection? projection;

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
    'projection': projection?.toJson(),
  };
}
