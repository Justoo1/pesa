class PotProjection {
  const PotProjection({
    required this.avgPerMonth,
    required this.lifetimeBalance,
    required this.monthsToGoal,
    required this.etaIso,
    required this.goalReached,
  });

  factory PotProjection.fromJson(Map<String, dynamic> json) => PotProjection(
    avgPerMonth: json['avgPerMonth'] as int,
    lifetimeBalance: json['lifetimeBalance'] as int,
    monthsToGoal: json['monthsToGoal'] as int?,
    etaIso: json['etaIso'] as String?,
    goalReached: json['goalReached'] as bool,
  );

  final int avgPerMonth;
  final int lifetimeBalance;
  final int? monthsToGoal;
  final String? etaIso;
  final bool goalReached;

  Map<String, dynamic> toJson() => {
    'avgPerMonth': avgPerMonth,
    'lifetimeBalance': lifetimeBalance,
    'monthsToGoal': monthsToGoal,
    'etaIso': etaIso,
    'goalReached': goalReached,
  };
}
