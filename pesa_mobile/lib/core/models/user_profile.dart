class UserProfile {
  const UserProfile({
    required this.id,
    required this.displayName,
    required this.email,
    required this.salary,
    required this.currency,
    required this.monthLabel,
    required this.roundUpsEnabled,
    required this.roundUpStep,
    required this.paydayRemindersOn,
    required this.paydayDayOfMonth,
    required this.appLockEnabled,
    required this.pushPaydayOn,
    required this.pushBucketHitOn,
    required this.pushWrapOn,
    required this.pushBillsDueOn,
    required this.autoPaydayOn,
    required this.hasPushSubscription,
    required this.hasSavingsBucket,
    required this.tourCompleted,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    displayName: json['displayName'] as String,
    email: json['email'] as String?,
    salary: json['salary'] as int,
    currency: json['currency'] as String,
    monthLabel: json['monthLabel'] as String,
    roundUpsEnabled: json['roundUpsEnabled'] as bool,
    roundUpStep: json['roundUpStep'] as int,
    paydayRemindersOn: json['paydayRemindersOn'] as bool,
    paydayDayOfMonth: json['paydayDayOfMonth'] as int?,
    appLockEnabled: json['appLockEnabled'] as bool,
    pushPaydayOn: json['pushPaydayOn'] as bool,
    pushBucketHitOn: json['pushBucketHitOn'] as bool,
    pushWrapOn: json['pushWrapOn'] as bool,
    pushBillsDueOn: json['pushBillsDueOn'] as bool,
    autoPaydayOn: json['autoPaydayOn'] as bool,
    hasPushSubscription: json['hasPushSubscription'] as bool,
    hasSavingsBucket: json['hasSavingsBucket'] as bool,
    tourCompleted: json['tourCompleted'] as bool,
  );

  final String id;
  final String displayName;
  final String? email;
  final int salary;
  final String currency;
  final String monthLabel;
  final bool roundUpsEnabled;
  final int roundUpStep;
  final bool paydayRemindersOn;
  final int? paydayDayOfMonth;
  final bool appLockEnabled;
  final bool pushPaydayOn;
  final bool pushBucketHitOn;
  final bool pushWrapOn;
  final bool pushBillsDueOn;
  final bool autoPaydayOn;
  final bool hasPushSubscription;
  final bool hasSavingsBucket;
  final bool tourCompleted;

  Map<String, dynamic> toJson() => {
    'id': id,
    'displayName': displayName,
    'email': email,
    'salary': salary,
    'currency': currency,
    'monthLabel': monthLabel,
    'roundUpsEnabled': roundUpsEnabled,
    'roundUpStep': roundUpStep,
    'paydayRemindersOn': paydayRemindersOn,
    'paydayDayOfMonth': paydayDayOfMonth,
    'appLockEnabled': appLockEnabled,
    'pushPaydayOn': pushPaydayOn,
    'pushBucketHitOn': pushBucketHitOn,
    'pushWrapOn': pushWrapOn,
    'pushBillsDueOn': pushBillsDueOn,
    'autoPaydayOn': autoPaydayOn,
    'hasPushSubscription': hasPushSubscription,
    'hasSavingsBucket': hasSavingsBucket,
    'tourCompleted': tourCompleted,
  };
}
