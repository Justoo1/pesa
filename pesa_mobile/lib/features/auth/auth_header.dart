import 'package:flutter/material.dart';

import '../../core/theme/pesa_colors.dart';
import '../../core/theme/pesa_theme.dart';

/// Brand header shared by the sign-in, register and email-code screens:
/// the serif wordmark plus the web app's tagline ("Every cedi, a place to
/// land." — `app/layout.tsx` metadata description).
class AuthHeader extends StatelessWidget {
  const AuthHeader({super.key, required this.subtitle});

  /// One short line under the tagline, e.g. "Sign in to continue."
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final serif = PesaTextStyles.serif(fontSize: 40);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(color: PesaColors.clay, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Text('PESA', style: PesaTextStyles.eyebrow()),
          ],
        ),
        const SizedBox(height: 10),
        Text.rich(
          TextSpan(
            style: serif,
            children: [
              const TextSpan(text: 'Every cedi,\n'),
              TextSpan(
                text: 'a place to land.',
                style: serif.copyWith(fontStyle: FontStyle.italic, color: PesaColors.green),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(subtitle, style: const TextStyle(fontSize: 15, color: PesaColors.ink2)),
        const SizedBox(height: 28),
      ],
    );
  }
}
