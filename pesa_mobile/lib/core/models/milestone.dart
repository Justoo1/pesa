class Milestone {
  const Milestone({
    required this.id,
    required this.projectId,
    required this.title,
    required this.funDetail,
    required this.targetAmount,
    required this.currentSaved,
    required this.targetDate,
    required this.sequenceOrder,
    required this.status,
    required this.bucketId,
  });

  factory Milestone.fromJson(Map<String, dynamic> json) => Milestone(
    id: json['id'] as String,
    projectId: json['projectId'] as String,
    title: json['title'] as String,
    funDetail: json['funDetail'] as String,
    targetAmount: json['targetAmount'] as int,
    currentSaved: json['currentSaved'] as int,
    targetDate: json['targetDate'] as String?,
    sequenceOrder: json['sequenceOrder'] as int,
    status: json['status'] as String,
    bucketId: json['bucketId'] as String?,
  );

  final String id;
  final String projectId;
  final String title;
  final String funDetail;
  final int targetAmount;
  final int currentSaved;
  final String? targetDate;
  final int sequenceOrder;
  final String status;
  final String? bucketId;

  Map<String, dynamic> toJson() => {
    'id': id,
    'projectId': projectId,
    'title': title,
    'funDetail': funDetail,
    'targetAmount': targetAmount,
    'currentSaved': currentSaved,
    'targetDate': targetDate,
    'sequenceOrder': sequenceOrder,
    'status': status,
    'bucketId': bucketId,
  };
}
