import 'package:flutter/material.dart';

import '../theme/pesa_theme.dart';

/// The web's per-screen header: an uppercase eyebrow over a 30px serif line
/// whose last part is italic, e.g. "BANK" / "Your *balance.*".
class ScreenHeader extends StatelessWidget {
  const ScreenHeader({
    super.key,
    required this.eyebrow,
    required this.title,
    this.italic,
    this.trailing,
  });

  final String eyebrow;
  final String title;
  final String? italic;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final serif = PesaTextStyles.serif(fontSize: 30);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(eyebrow.toUpperCase(), style: PesaTextStyles.eyebrow()),
                const SizedBox(height: 4),
                Text.rich(
                  TextSpan(
                    style: serif,
                    children: [
                      TextSpan(text: title),
                      if (italic != null)
                        TextSpan(
                          text: ' $italic',
                          style: serif.copyWith(fontStyle: FontStyle.italic),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}
