# Firebase setup — turning on phone push notifications

Pesa's phone notifications (payday, bills due, a pot filled, the monthly wrap) are already built into both the server and the app. They stay **off** until you connect a Firebase project. Until then, the app works normally and shows "Not set up" under More → Push notifications.

Doing this takes about 30 minutes for Android. iOS takes longer, and needs a paid Apple Developer account and a Mac.

What you'll end up with:

| Piece | Where it goes | Secret? |
|---|---|---|
| `google-services.json` | `pesa_mobile/android/app/` | No — safe to commit |
| `GoogleService-Info.plist` | `pesa_mobile/ios/Runner/` (added through Xcode) | No — safe to commit |
| APNs auth key (`.p8`) | Uploaded to Firebase only | **Yes** — never commit |
| Service-account JSON | Server env var `FCM_SERVICE_ACCOUNT` | **Yes** — never commit |

---

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and click **Create a project**.
2. Name it `Pesa`.
3. When asked about **Google Analytics**, turn it **off**. Pesa doesn't use analytics, and the privacy policy and store forms say so. Leaving it on would make those statements untrue.
4. Click **Create project**.

## 2. Android

1. In the project overview, click the **Android** icon (**Add app**).
2. **Android package name:** `com.edtmsys.pesa`. This must match exactly; it is the `applicationId` in `pesa_mobile/android/app/build.gradle.kts`.
3. App nickname: `Pesa Android`. You can skip the SHA-1 field, because push doesn't need it.
4. Click **Register app**, then **Download google-services.json**.
5. Save the file as `pesa_mobile/android/app/google-services.json`.
6. Skip Firebase's "Add Firebase SDK" steps. The Gradle setup is already done: `android/app/build.gradle.kts` applies the Google Services plugin automatically once that file exists.

Android 13 and later asks the user for notification permission. The app asks when the user turns on a notification type, and the manifest permission (`POST_NOTIFICATIONS`) comes from the `firebase_messaging` plugin.

## 3. iOS (needs a Mac and an Apple Developer account)

### 3a. Create an APNs key (Apple → Firebase)

Apple delivers iPhone notifications through its APNs service, and Firebase needs a key to use it.

1. Go to <https://developer.apple.com/account/resources/authkeys/list> and click **+**.
2. Name the key `Pesa APNs` and tick **Apple Push Notifications service (APNs)**. Click **Continue**, then **Register**.
3. **Download** the `.p8` file. Apple lets you download it only once, so store it in your password manager. Also note the **Key ID** shown on that page, and your **Team ID** (top right of the developer site).
4. In Firebase, open **Project settings** (gear icon) → **Cloud Messaging** → **Apple app configuration** → **APNs authentication key** → **Upload**. Upload the `.p8` file and enter the Key ID and Team ID.

### 3b. Register the iOS app in Firebase

1. Firebase project overview → **Add app** → **iOS**.
2. **Bundle ID:** `com.edtmsys.pesa`.
3. Click **Register app**, then download **GoogleService-Info.plist**.
4. On the Mac, open `pesa_mobile/ios/Runner.xcworkspace` in Xcode. Drag `GoogleService-Info.plist` into the **Runner** folder in the left sidebar. In the dialog, tick **Copy items if needed** and make sure the **Runner** target is ticked.

   The file has to be added through Xcode. Copying it into the folder by hand isn't enough, because Xcode won't include it in the build.

### 3c. Capabilities

The repo already includes:
- `ios/Runner/Runner.entitlements`, with the Push Notifications entitlement;
- `UIBackgroundModes → remote-notification` in `Info.plist`.

In Xcode, select the **Runner** target → **Signing & Capabilities**:
- Pick your **Team**. Automatic signing creates the App ID with push enabled.
- Check that **Push Notifications** and **Background Modes → Remote notifications** both appear. If Xcode offers to "fix" either one, accept.

The entitlement says `development`. Xcode switches it to `production` automatically when you archive for TestFlight or the App Store.

## 4. Server: the service-account key

The server sends notifications through the FCM HTTP v1 API (`lib/fcm.ts`), and it needs a service-account key to do so.

1. Firebase → **Project settings** → **Service accounts** → **Generate new private key** → **Generate key**. This downloads a JSON file. Treat it like a password.
2. Put the whole JSON into the env var `FCM_SERVICE_ACCOUNT`. You can paste it raw, or base64-encode it first, which avoids quoting trouble:
   - macOS / Linux: `base64 -i pesa-firebase-adminsdk.json | tr -d '\n'`
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("pesa-firebase-adminsdk.json"))`
3. **Production (Vercel):** Project → **Settings** → **Environment Variables** → add `FCM_SERVICE_ACCOUNT`, scoped to **Production**, then **Redeploy**.
4. **Local dev (optional):** add `FCM_SERVICE_ACCOUNT="..."` to `.env` and restart `npm run dev`.
5. Delete the downloaded JSON from your Downloads folder once it's stored in Vercel and your password manager.

When the variable is missing or invalid, the server logs `[fcm] FCM_SERVICE_ACCOUNT is not valid…` and simply skips phone push. Web push keeps working either way.

## 5. Build and check it works

1. Rebuild the app: `cd pesa_mobile && flutter run`. A full rebuild is needed after adding config files; hot reload won't pick them up.
2. Sign in, go to **More → Push notifications**, and turn on any notification. Allow the permission prompt.
3. **Check registration.** The debug console prints `[push] FCM token: …`, and the server stores the token in `MobileDeviceToken`. To see it locally, run `npx prisma studio`.
4. **Check delivery from Firebase.** Firebase console → **Messaging** → **Create your first campaign** → **Firebase Notification messages** → enter a title and text → **Send test message** → paste the token → **Test**. Put the app in the background first: while it's in the foreground, Pesa shows the message as an in-app banner instead.
5. **Check delivery from the server.** The real notifications come from the cron routes in `vercel.json`. Run one by hand:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://pesa.edtmsys.com/api/cron/payday-reminder
   ```

   A cron only sends to users it actually applies to. For example, the payday reminder goes only to users whose payday is today and who have that notification turned on.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `[push] Firebase not configured` in the logs | The config file is missing or misplaced, or the app wasn't fully rebuilt. On iOS, the plist wasn't added to the Runner target. |
| Android build fails at `processDebugGoogleServices` | The package name in `google-services.json` isn't `com.edtmsys.pesa`. |
| iOS: token is null / `APNS token has not been set` | You're on the Simulator (APNs needs a real device, or Simulator on Apple-silicon Macs with iOS 16+), or the APNs key isn't uploaded, or the Push capability is missing. |
| Firebase test message works, server ones don't | `FCM_SERVICE_ACCOUNT` isn't set in that environment, or the deploy is older than the change. Check the Vercel function logs for `[fcm]`. |
| Tokens disappear from the database | Expected. When FCM reports a token as unregistered (app uninstalled, data cleared), the server deletes it. |
| Nothing arrives on a Xiaomi/Oppo/Tecno phone | Battery savers kill background delivery. Allow Pesa to "auto-start" / remove battery restrictions. |

## Privacy notes

- Firebase Cloud Messaging and Apple's push service are already named as processors in the privacy policy (`app/privacy/page.tsx`) and the store data-safety answers (`docs/store/`).
- Don't add other Firebase products (Analytics, Crashlytics, Remote Config) without updating the policy, `ios/Runner/PrivacyInfo.xcprivacy` and both store privacy forms. Each one collects data the forms currently say Pesa doesn't collect.
