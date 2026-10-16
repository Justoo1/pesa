import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api_client.dart';

/// Phone push via Firebase Cloud Messaging. Dormant until the Firebase
/// config files are added (android/app/google-services.json,
/// ios/Runner/GoogleService-Info.plist — see README "Push notifications"):
/// without them [init] fails quietly and [available] stays false.
class PushService {
  PushService._();

  static bool available = false;

  /// Pesa's Android notification channel. Background pushes land here via
  /// the manifest's default_notification_channel_id; high importance makes
  /// them pop up as heads-up notifications.
  static const _channel = AndroidNotificationChannel(
    'pesa_alerts',
    'Pesa alerts',
    description: 'Payday, bills due, pots filling up and your monthly wrap.',
    importance: Importance.high,
  );

  static final _local = FlutterLocalNotificationsPlugin();

  static StreamSubscription<String>? _tokenRefresh;

  static Future<void> init() async {
    try {
      await Firebase.initializeApp();
      available = true;
    } catch (e) {
      available = false;
      debugPrint('[push] Firebase not configured — phone push disabled ($e)');
      return;
    }
    // A push that arrives while Pesa is open (e.g. "Rent is full" right
    // after a top-up) must still show as a real notification: Android hides
    // FCM notifications in the foreground, so post it ourselves; iOS can be
    // told to present it.
    if (Platform.isAndroid) {
      await _local.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('ic_stat_pesa'),
        ),
      );
      await _local
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);
      FirebaseMessaging.onMessage.listen(_showForeground);
    } else {
      await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
    }
  }

  static Future<void> _showForeground(RemoteMessage message) async {
    final n = message.notification;
    if (n == null) return;
    await _local.show(
      // Same tag (e.g. one pot) → replace rather than stack.
      id: (message.data['tag'] as String? ?? message.messageId ?? '').hashCode,
      title: n.title,
      body: n.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: 'ic_stat_pesa',
          color: const Color(0xFFC9714B),
        ),
      ),
    );
  }

  static String get _platform => Platform.isIOS ? 'ios' : 'android';

  /// Asks for permission (Android 13+/iOS) and registers this phone's token.
  /// Returns false if the user declined.
  static Future<bool> enable(ApiClient api) async {
    if (!available) return false;
    final settings = await FirebaseMessaging.instance.requestPermission();
    if (settings.authorizationStatus == AuthorizationStatus.denied) return false;
    await _register(api);
    return true;
  }

  /// Re-registers on start when permission was granted before, and keeps the
  /// server's copy current when FCM rotates the token.
  static Future<void> syncIfPermitted(ApiClient api) async {
    if (!available) return;
    final settings = await FirebaseMessaging.instance.getNotificationSettings();
    if (settings.authorizationStatus != AuthorizationStatus.authorized &&
        settings.authorizationStatus != AuthorizationStatus.provisional) {
      return;
    }
    await _register(api);
  }

  static Future<void> _register(ApiClient api) async {
    final token = await FirebaseMessaging.instance.getToken();
    // Debug builds only: paste this into Firebase console → Messaging →
    // "Send test message" to check delivery (docs/FIREBASE_SETUP.md).
    if (kDebugMode) debugPrint('[push] FCM token: $token');
    if (token != null) await _post(api, token);
    _tokenRefresh ??= FirebaseMessaging.instance.onTokenRefresh.listen((t) => _post(api, t));
  }

  static Future<void> _post(ApiClient api, String token) async {
    try {
      await api.dio.post<void>(
        '/api/mobile/push/register-token',
        data: {'fcmToken': token, 'platform': _platform},
      );
    } on DioException catch (e) {
      debugPrint('[push] token registration failed: ${e.message}');
    }
  }

  /// Before signing out: stop this phone receiving this account's pushes.
  static Future<void> unregister(ApiClient api) async {
    if (!available) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await api.dio.delete<void>('/api/mobile/push/register-token', data: {'fcmToken': token});
      }
      await FirebaseMessaging.instance.deleteToken();
    } catch (e) {
      debugPrint('[push] unregister failed: $e');
    }
    await _tokenRefresh?.cancel();
    _tokenRefresh = null;
  }
}
