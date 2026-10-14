import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:pesa_mobile/core/api_exception.dart';
import 'package:pesa_mobile/core/widgets/async_data_view.dart';

/// Phase 8.1/8.2: the shared loading/error/stale-data treatment.
void main() {
  // Riverpod 3 auto-retries failed providers; disable it so each state is
  // observable deterministically.
  Widget host(FutureProvider<String> provider) => ProviderScope(
    retry: (retryCount, error) => null,
    child: MaterialApp(
      home: Scaffold(
        body: Consumer(
          builder: (context, ref, _) => AsyncDataView<String>(
            value: ref.watch(provider),
            onRefresh: () => ref.refresh(provider.future),
            builder: (data) => ListView(children: [Text('data: $data')]),
          ),
        ),
      ),
    ),
  );

  final offline = DioException(
    requestOptions: RequestOptions(path: '/api/mobile/bootstrap'),
    type: DioExceptionType.connectionError,
  );

  testWidgets('first-load network failure shows an offline state with retry', (tester) async {
    var calls = 0;
    final provider = FutureProvider<String>((ref) async {
      calls++;
      if (calls == 1) throw offline;
      return 'ok';
    });
    await tester.pumpWidget(host(provider));
    await tester.pumpAndSettle();

    expect(find.text("You're offline"), findsOneWidget);
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(find.text('data: ok'), findsOneWidget);
  });

  testWidgets('a failed refresh keeps the last good data and shows a banner', (tester) async {
    var calls = 0;
    final provider = FutureProvider<String>((ref) async {
      calls++;
      if (calls == 1) return 'first';
      throw offline;
    });
    await tester.pumpWidget(host(provider));
    await tester.pumpAndSettle();
    expect(find.text('data: first'), findsOneWidget);

    await tester.fling(find.byType(ListView), const Offset(0, 300), 1000);
    await tester.pumpAndSettle();

    expect(find.text('data: first'), findsOneWidget, reason: 'stale data must stay visible');
    expect(find.byKey(const Key('stale-data-banner')), findsOneWidget);
    expect(find.text('Offline — showing your last saved data.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('server errors show the server message, not raw exception text', (tester) async {
    final provider = FutureProvider<String>(
      (ref) async => throw ApiException('Something went wrong. Please try again.'),
    );
    await tester.pumpWidget(host(provider));
    await tester.pumpAndSettle();
    expect(find.text("Couldn't load this"), findsOneWidget);
    expect(find.text('Something went wrong. Please try again.'), findsOneWidget);
  });
}
