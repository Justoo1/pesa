package com.edtmsys.pesa

import android.content.Intent
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * "Share to Pesa": text shared from another app (an SMS, a receipt) arrives
 * as an ACTION_SEND intent. Dart reads it over the `pesa/share` channel —
 * `takeSharedText` for the text that launched the app, and a `sharedText`
 * call for text shared while Pesa is already running (singleTop).
 */
class MainActivity : FlutterActivity() {
    private var channel: MethodChannel? = null
    private var pendingText: String? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        pendingText = sharedText(intent)
        channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "pesa/share").apply {
            setMethodCallHandler { call, result ->
                if (call.method == "takeSharedText") {
                    result.success(pendingText)
                    pendingText = null
                } else {
                    result.notImplemented()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val text = sharedText(intent) ?: return
        channel?.invokeMethod("sharedText", text)
    }

    private fun sharedText(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_SEND || intent.type?.startsWith("text/") != true) {
            return null
        }
        return intent.getStringExtra(Intent.EXTRA_TEXT)?.takeIf { it.isNotBlank() }
    }
}
