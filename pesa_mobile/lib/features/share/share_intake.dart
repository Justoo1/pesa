import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Text shared into Pesa from another app ("Share → Log spend in Pesa"), waiting to
/// be turned into a spend once the user is signed in and unlocked.
class SharedText extends Notifier<String?> {
  @override
  String? build() => null;

  void receive(String text) => state = text;

  /// Hands the text over exactly once.
  String? take() {
    final text = state;
    state = null;
    return text;
  }
}

final sharedTextProvider = NotifierProvider<SharedText, String?>(SharedText.new);

/// Listens on the `pesa/share` channel (MainActivity.kt). Android only — iOS
/// would need a share extension.
class ShareIntakeListener extends ConsumerStatefulWidget {
  const ShareIntakeListener({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ShareIntakeListener> createState() => _ShareIntakeListenerState();
}

class _ShareIntakeListenerState extends ConsumerState<ShareIntakeListener> {
  static const _channel = MethodChannel('pesa/share');

  @override
  void initState() {
    super.initState();
    if (!Platform.isAndroid) return;
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'sharedText' && call.arguments is String) {
        ref.read(sharedTextProvider.notifier).receive(call.arguments as String);
      }
    });
    _channel
        .invokeMethod<String>('takeSharedText')
        .then((text) {
          if (text != null && mounted) ref.read(sharedTextProvider.notifier).receive(text);
        })
        .catchError((Object _) {});
  }

  @override
  void dispose() {
    if (Platform.isAndroid) _channel.setMethodCallHandler(null);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// First plausible amount in shared text: "GH₵ 30", "30.50", "1,200".
/// Same rules as the web share target (components/pesa/screens/share-landing.tsx).
int parseSharedAmount(String text) {
  final m = RegExp(r'(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)').firstMatch(text);
  if (m == null) return 0;
  final n = double.tryParse(m.group(1)!.replaceAll(RegExp(r'[,\s]'), ''));
  return n == null ? 0 : n.round();
}

/// The text minus a leading currency + amount, so the note reads as the
/// description rather than echoing the number.
String parseSharedNote(String text) {
  final note = text.replaceFirst(RegExp(r'^[^\d]*\d[\d,.\s]*\s*'), '').trim();
  return note.isEmpty ? text.trim() : note;
}
