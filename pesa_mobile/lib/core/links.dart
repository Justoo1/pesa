import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'env.dart';

/// Public pages served by the web app (app/privacy, app/terms, …) — the same
/// URLs the store listings link to. Release builds point at the production
/// site because API_BASE_URL does.
abstract final class PesaLinks {
  static Uri page(String path) => Uri.parse('${Env.apiBaseUrl}$path');

  static final privacy = page('/privacy');
  static final terms = page('/terms');
  static final support = page('/support');
}

/// Opens [uri] in the browser; snackbar if nothing can handle it.
Future<void> openLink(BuildContext context, Uri uri) async {
  final messenger = ScaffoldMessenger.of(context);
  final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!opened) {
    messenger.showSnackBar(SnackBar(content: Text('Couldn\'t open $uri')));
  }
}
