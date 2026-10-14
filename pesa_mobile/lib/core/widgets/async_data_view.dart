import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../api_exception.dart';
import '../theme/pesa_colors.dart';
import 'pesa_button.dart';

/// The one loading / error / data treatment every screen uses:
/// - first load → spinner;
/// - first load failed → friendly message + Retry (inside a scrollable, so
///   pull-to-refresh also works);
/// - a refresh failed but earlier data exists → keep showing that data with
///   a small "showing saved data" banner instead of blanking the screen.
class AsyncDataView<T> extends StatelessWidget {
  const AsyncDataView({
    super.key,
    required this.value,
    required this.onRefresh,
    required this.builder,
  });

  final AsyncValue<T> value;
  final Future<void> Function() onRefresh;
  final Widget Function(T data) builder;

  /// The failure is already reflected in [value] (banner / error state), so
  /// a rethrown refresh error must not escape as an unhandled exception.
  Future<void> _safeRefresh() async {
    try {
      await onRefresh();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final Widget body;
    if (value.hasValue) {
      final data = builder(value.requireValue);
      body = value.hasError
          ? Column(
              children: [
                StaleDataBanner(error: value.error!, onRetry: _safeRefresh),
                Expanded(child: data),
              ],
            )
          : data;
    } else if (value.hasError) {
      body = ListView(
        padding: const EdgeInsets.all(32),
        children: [
          const SizedBox(height: 60),
          ErrorState(error: value.error!, onRetry: _safeRefresh),
        ],
      );
    } else {
      body = const Center(child: CircularProgressIndicator());
    }
    return RefreshIndicator(onRefresh: _safeRefresh, child: body);
  }
}

/// Full-screen-ish error with a Retry button.
class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.error, required this.onRetry});

  final Object error;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final e = ApiException.from(error);
    return Column(
      children: [
        Icon(
          e.isNetwork ? LucideIcons.wifiOff : LucideIcons.circleAlert,
          size: 36,
          color: PesaColors.ink3,
        ),
        const SizedBox(height: 12),
        Text(
          e.isNetwork ? "You're offline" : "Couldn't load this",
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 6),
        Text(
          e.message,
          textAlign: TextAlign.center,
          style: const TextStyle(color: PesaColors.ink2),
        ),
        const SizedBox(height: 16),
        PesaButton(label: 'Try again', variant: PesaButtonVariant.soft, onPressed: onRetry),
      ],
    );
  }
}

/// Thin banner shown above still-visible data when the latest refresh failed.
class StaleDataBanner extends StatelessWidget {
  const StaleDataBanner({super.key, required this.error, required this.onRetry});

  final Object error;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final e = ApiException.from(error);
    return Material(
      key: const Key('stale-data-banner'),
      color: PesaColors.claySoft,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 4, 6),
          child: Row(
            children: [
              Icon(
                e.isNetwork ? LucideIcons.wifiOff : LucideIcons.circleAlert,
                size: 16,
                color: PesaColors.clayDeep,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  e.isNetwork
                      ? 'Offline — showing your last saved data.'
                      : "Couldn't refresh — showing your last saved data.",
                  style: const TextStyle(fontSize: 12, color: PesaColors.clayDeep),
                ),
              ),
              TextButton(
                onPressed: onRetry,
                style: TextButton.styleFrom(foregroundColor: PesaColors.clayDeep),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
