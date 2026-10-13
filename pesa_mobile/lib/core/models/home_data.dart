import 'bank_account.dart';
import 'bank_transaction.dart';
import 'bucket.dart';
import 'income_source.dart';
import 'milestone.dart';
import 'milestone_transaction.dart';
import 'month_row.dart';
import 'payday_draft.dart';
import 'project.dart';
import 'transaction.dart';
import 'user_profile.dart';

/// Mirrors `lib/mobile/bootstrap.ts` `HomeData` — the single payload behind
/// `GET /api/mobile/bootstrap`, shared verbatim with the web home page.
class HomeData {
  const HomeData({
    required this.profile,
    required this.onboardedAt,
    required this.buckets,
    required this.ledger,
    required this.months,
    required this.netWorth,
    required this.paydayTemplate,
    required this.avgEssentialsPerMonth,
    required this.annualMonths,
    required this.filledStreak,
    required this.incomeSources,
    required this.bankAccounts,
    required this.bankLedger,
    required this.monthlyBankSpend,
    required this.projects,
    required this.milestones,
    required this.milestoneLedger,
  });

  factory HomeData.fromJson(Map<String, dynamic> json) => HomeData(
    profile: UserProfile.fromJson(json['profile'] as Map<String, dynamic>),
    onboardedAt: json['onboardedAt'] as String?,
    buckets: (json['buckets'] as List)
        .map((e) => Bucket.fromJson(e as Map<String, dynamic>))
        .toList(),
    ledger: (json['ledger'] as List)
        .map((e) => PesaTransaction.fromJson(e as Map<String, dynamic>))
        .toList(),
    months: (json['months'] as List)
        .map((e) => MonthRow.fromJson(e as Map<String, dynamic>))
        .toList(),
    netWorth: json['netWorth'] as int,
    paydayTemplate: (json['paydayTemplate'] as List)
        .map((e) => PaydayDraft.fromJson(e as Map<String, dynamic>))
        .toList(),
    avgEssentialsPerMonth: json['avgEssentialsPerMonth'] as int,
    annualMonths: (json['annualMonths'] as List)
        .map((e) => MonthRow.fromJson(e as Map<String, dynamic>))
        .toList(),
    filledStreak: json['filledStreak'] as int,
    incomeSources: (json['incomeSources'] as List)
        .map((e) => IncomeSource.fromJson(e as Map<String, dynamic>))
        .toList(),
    bankAccounts: (json['bankAccounts'] as List)
        .map((e) => BankAccount.fromJson(e as Map<String, dynamic>))
        .toList(),
    bankLedger: (json['bankLedger'] as List)
        .map((e) => BankTransaction.fromJson(e as Map<String, dynamic>))
        .toList(),
    monthlyBankSpend: json['monthlyBankSpend'] as int,
    projects: (json['projects'] as List)
        .map((e) => PesaProject.fromJson(e as Map<String, dynamic>))
        .toList(),
    milestones: (json['milestones'] as List)
        .map((e) => Milestone.fromJson(e as Map<String, dynamic>))
        .toList(),
    milestoneLedger: (json['milestoneLedger'] as List)
        .map((e) => MilestoneTransaction.fromJson(e as Map<String, dynamic>))
        .toList(),
  );

  final UserProfile profile;
  final String? onboardedAt;
  final List<Bucket> buckets;
  final List<PesaTransaction> ledger;
  final List<MonthRow> months;
  final int netWorth;
  final List<PaydayDraft> paydayTemplate;
  final int avgEssentialsPerMonth;
  final List<MonthRow> annualMonths;
  final int filledStreak;
  final List<IncomeSource> incomeSources;
  final List<BankAccount> bankAccounts;
  final List<BankTransaction> bankLedger;
  final int monthlyBankSpend;
  final List<PesaProject> projects;
  final List<Milestone> milestones;
  final List<MilestoneTransaction> milestoneLedger;

  Map<String, dynamic> toJson() => {
    'profile': profile.toJson(),
    'onboardedAt': onboardedAt,
    'buckets': buckets.map((e) => e.toJson()).toList(),
    'ledger': ledger.map((e) => e.toJson()).toList(),
    'months': months.map((e) => e.toJson()).toList(),
    'netWorth': netWorth,
    'paydayTemplate': paydayTemplate.map((e) => e.toJson()).toList(),
    'avgEssentialsPerMonth': avgEssentialsPerMonth,
    'annualMonths': annualMonths.map((e) => e.toJson()).toList(),
    'filledStreak': filledStreak,
    'incomeSources': incomeSources.map((e) => e.toJson()).toList(),
    'bankAccounts': bankAccounts.map((e) => e.toJson()).toList(),
    'bankLedger': bankLedger.map((e) => e.toJson()).toList(),
    'monthlyBankSpend': monthlyBankSpend,
    'projects': projects.map((e) => e.toJson()).toList(),
    'milestones': milestones.map((e) => e.toJson()).toList(),
    'milestoneLedger': milestoneLedger.map((e) => e.toJson()).toList(),
  };
}
