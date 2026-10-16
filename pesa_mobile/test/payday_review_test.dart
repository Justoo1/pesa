import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:pesa_mobile/core/api_client.dart';
import 'package:pesa_mobile/core/models/payday_draft.dart';
import 'package:pesa_mobile/core/token_storage.dart';
import 'package:pesa_mobile/core/widgets/row_icon_chip.dart';
import 'package:pesa_mobile/features/pots/payday_review_sheet.dart';
import 'package:pesa_mobile/features/pots/pot_actions_provider.dart';
import 'package:pesa_mobile/features/pots/pot_repository.dart';

class _FakePots extends PotRepository {
  _FakePots() : super(apiClient: ApiClient(tokenStorage: TokenStorage()));

  List<PaydayDraft>? sent;

  @override
  Future<void> applyPaydayTemplate(List<PaydayDraft> drafts) async => sent = drafts;
}

PaydayDraft _draft(String id, String name, int amount) => PaydayDraft(
  bucketId: id,
  bucketName: name,
  amount: amount,
  color: 'green',
  icon: 'home',
  kind: 'essential',
  alreadyThisMonth: 0,
);

/// "Replay last month" lets you edit and skip lines before anything is sent.
void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('edits and skips are what gets sent', (tester) async {
    final pots = _FakePots();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [potRepositoryProvider.overrideWithValue(pots)],
        child: MaterialApp(
          home: Builder(
            builder: (context) => TextButton(
              onPressed: () => showPaydayReviewSheet(
                context,
                template: [_draft('rent', 'Rent', 3500), _draft('mom', 'Mom', 1200)],
                currency: 'GH₵',
                remainingToDisburse: 14000,
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('Send GH₵4,700'), findsOneWidget);

    // Lower Rent, skip Mom (tap its icon).
    await tester.enterText(find.widgetWithText(TextField, '3500'), '3000');
    await tester.pump();
    await tester.tap(
      find.ancestor(of: find.byType(RowIconChip).at(1), matching: find.byType(InkWell)).first,
    );
    await tester.pump();
    expect(find.text('Send GH₵3,000'), findsOneWidget);

    await tester.tap(find.text('Send GH₵3,000'));
    await tester.pumpAndSettle();
    expect(pots.sent, isNotNull);
    expect(pots.sent!.map((d) => (d.bucketId, d.amount)), [('rent', 3000)]);
  });
}
