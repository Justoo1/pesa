# Apple App Store — publishing checklist and form answers

Everything App Store Connect asks for, with answers matching what Pesa does. **You need a Mac with the current Xcode** to build and upload; nothing on this Windows machine can produce an iOS build.

Bundle id: `com.edtmsys.pesa` · iPhone only, portrait · Listing copy: [LISTING.md](LISTING.md)

---

## 0. Before you start

- [ ] **Apple Developer Program**: enrol as an **individual** at <https://developer.apple.com/programs/> ($99 a year). Your legal name becomes the seller name on the App Store, so `lib/legal.ts` `PUBLISHER_NAME` must be the same name.
- [ ] Production is live and `npm run check:release -- --url https://pesa.edtmsys.com` passes.
- [ ] The reviewer account from [PLAY_STORE.md §4](PLAY_STORE.md#app-access) exists. Use the same one here.
- [ ] Optional: push is set up ([../FIREBASE_SETUP.md](../FIREBASE_SETUP.md) §3). Without it, the push toggles show "Not set up", and review accepts that.

## 1. Register the app

1. In the developer portal, go to **Identifiers → +** → App IDs → App, with bundle ID `com.edtmsys.pesa` (explicit). Tick **Push Notifications**. Xcode automatic signing can also do this for you.
2. In **App Store Connect → Apps → +**, create a new app:

| Field | Answer |
|---|---|
| Platform | iOS |
| Name | `Pesa: Salary Budget Planner` |
| Primary language | English (U.K.) or (U.S.) |
| Bundle ID | `com.edtmsys.pesa` |
| SKU | `pesa-ios` |
| User access | Full access |

## 2. Build and upload (on the Mac)

```bash
cd pesa_mobile
flutter pub get
cd ios && pod install && cd ..
# bump version in pubspec.yaml for every upload (1.0.0+1 → 1.0.0+2)
flutter build ipa --release --dart-define=API_BASE_URL=https://pesa.edtmsys.com
```

Then open `build/ios/archive/Runner.xcarchive` in Xcode (Window → Organizer) → **Distribute App** → **App Store Connect** → Upload. You can also use the Transporter app with `build/ios/ipa/*.ipa`.

Already set up in the repo:
- **Privacy manifest:** `ios/Runner/PrivacyInfo.xcprivacy`, with no tracking and the collected data types below.
- **Export compliance:** `ITSAppUsesNonExemptEncryption = false` in `Info.plist`. Pesa only uses the system's HTTPS, so App Store Connect won't ask the encryption question for each build.
- **Push:** the Push Notifications entitlement (`Runner.entitlements`) and Background Modes → remote-notification.
- **Device family:** iPhone only, portrait only. No iPad screenshots are needed. iPad users can still run the iPhone version.

## 3. App Privacy ("nutrition label")

App Store Connect → your app → **App Privacy** → Get Started.

**Do you or your third-party partners collect data from this app?** **Yes**

Select these data types, and **only** these:

| Data type | Linked to the user? | Used for tracking? | Purposes |
|---|---|---|---|
| Contact Info → **Name** | Yes | No | App Functionality |
| Contact Info → **Email Address** | Yes | No | App Functionality |
| Financial Info → **Other Financial Info** | Yes | No | App Functionality |
| Identifiers → **User ID** | Yes | No | App Functionality |
| Identifiers → **Device ID** (push token) | Yes | No | App Functionality |

Don't select any of these:
- Location, contacts, user content (photos, audio…), browsing, search, purchases, usage data, diagnostics, health, sensitive info.
- Financial Info → Payment Info or Credit Info.

**Tracking:** No. Pesa has no ads, no third-party analytics, and no data-sharing with data brokers. That's why there's no App Tracking Transparency prompt.

The result shows as "Data Linked to You: Contact Info, Financial Info, Identifiers" and "Data Used to Track You: None". `PrivacyInfo.xcprivacy` declares the same thing.

## 4. App information

| Field | Value |
|---|---|
| Subtitle | `Plan every cedi into pots` |
| Category | Primary **Finance**, secondary **Productivity** |
| Privacy Policy URL | `https://pesa.edtmsys.com/privacy` |
| Support URL | `https://pesa.edtmsys.com/support` |
| Marketing URL | `https://pesa.edtmsys.com` |
| Copyright | `2026 <your legal name>` |
| Content rights | Doesn't contain third-party content |
| Age rating | Answer **None / No** to every question → **4+** |

## 5. Version page

- **Screenshots:** iPhone **6.9"** display, at 1320×2868 or 1290×2796, portrait. You need 3 to 10, and smaller iPhone sizes are generated from them. Capture them on the Mac with the iPhone 17 Pro Max simulator: run the app against production with the reviewer/demo account, then use **File → Save Screen** (⌘S). Show the same screens as Play: Home, a pot, Disburse, Insights, Wrap and Bank. The Android screenshots in `docs/store/assets/screenshots/android/` can't be reused, because Apple requires the exact sizes and iPhone screens.
- **Promotional text, description, keywords:** see [LISTING.md](LISTING.md).
- **Build:** select the uploaded build. TestFlight processing takes 10–30 minutes.
- **Sign-in required:** Yes. Enter the reviewer email and password.
- **Notes for review:**

```
Pesa is a personal budgeting planner. It does NOT move, hold or transfer real money and does not connect to any bank or payment service — "send to a pot" records how the user plans to divide their salary.

Sign in on the first screen with the demo account above (email + password). Sign-up uses email and password or a one-time email code; there is no third-party/social login on iOS, so Sign in with Apple is not applicable (Guideline 4.8).

Account deletion: More tab → "Delete my account" (also https://pesa.edtmsys.com/delete-account).
Privacy policy: More tab → "Privacy policy".
Push notifications are optional and only requested when the user turns one on in More → Push notifications.
```

## 6. TestFlight first

1. After the upload processes, add yourself under **TestFlight → Internal testing** and install the build on a real iPhone.
2. Check:
   - sign-in, a disburse and a spend;
   - the app lock;
   - the legal links;
   - delete account, tried on a throwaway account;
   - notifications, if Firebase is set up.
3. Then go back to the version page and click **Add for Review** → **Submit**.

## 7. Common rejection reasons, and Pesa's status

| Guideline | Status |
|---|---|
| 5.1.1(v) account deletion must be in-app | ✓ More → Delete my account (immediate, full) |
| 5.1.1 privacy policy link in-app and in App Store Connect | ✓ More → Privacy policy |
| 5.1.2 / privacy manifest matches App Privacy answers | ✓ `PrivacyInfo.xcprivacy` |
| 2.1 reviewer can't sign in / app crashes | ✓ demo account; test on TestFlight first |
| 4.8 Sign in with Apple when using third-party login | ✓ not applicable (no Google sign-in on mobile). **If you add Google sign-in to the app later, you must also offer Sign in with Apple.** |
| 3.2.1(viii) financial services must come from licensed institutions | ✓ Pesa offers no financial services (no payments, loans or trading); say so in the review notes |
| 2.3 accurate metadata | ✓ listing says Pesa doesn't move money |
| 4.2 minimum functionality | ✓ full native app, not a web wrapper |
