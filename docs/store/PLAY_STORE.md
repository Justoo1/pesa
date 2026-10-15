# Google Play — publishing checklist and form answers

Everything Play Console asks for, with the answers that match what Pesa actually does. If the app changes (a new SDK, a new kind of data), update these answers, `/privacy` and [APP_STORE.md](APP_STORE.md) together.

App id: `com.edtmsys.pesa` · Listing copy: [LISTING.md](LISTING.md)

---

## 0. Before you start

- [ ] **Production is live** at https://pesa.edtmsys.com (see [../DEPLOY.md](../DEPLOY.md)), and `npm run check:release -- --url https://pesa.edtmsys.com` passes.
- [ ] **Your legal name** is in `lib/legal.ts` (`PUBLISHER_NAME`) and deployed. Play shows your developer name next to the privacy policy, and the two must match.
- [ ] A **reviewer account** exists on production (step 4).
- [ ] The **upload keystore** (`C:\Users\User\.pesa-signing\pesa-upload-keystore.jks`) and its `key.properties` password are backed up. If you lose them, you'll need Play support to reset the upload key.

## 1. Developer account (personal)

1. Sign up at <https://play.google.com/console/signup> as an **individual** ($25 one-time fee). Google verifies your identity, so use your legal name; it becomes your public developer name unless you set another one.
2. **New personal accounts must run a closed test first.** Before you can publish to production, you need at least **12 testers** opted in to a closed test for **14 days in a row**. Plan for this, because it's the longest step. Invite friends and family through a Google Group or an email list.
3. Verify the contact email and phone number that Console asks for.

## 2. Create the app

Play Console → **Create app**:

| Field | Answer |
|---|---|
| App name | `Pesa: Salary Budget Planner` |
| Default language | English (United Kingdom) — or (United States) |
| App or game | App |
| Free or paid | Free |
| Declarations | Tick Developer Program Policies and US export laws |

## 3. Build the release bundle

```bash
cd pesa_mobile
# bump version in pubspec.yaml first: 1.0.0+1 → 1.0.0+2 for every upload
flutter build appbundle --release --dart-define=API_BASE_URL=https://pesa.edtmsys.com
# → build/app/outputs/bundle/release/app-release.aab
```

- Let Play manage the app signing key (**Play App Signing**, the default). You upload builds signed with your upload key, and Play re-signs them for users.
- Push notifications only work if `android/app/google-services.json` was present when you built (see [../FIREBASE_SETUP.md](../FIREBASE_SETUP.md)).

## 4. App content (Policy → App content)

### Privacy policy
`https://pesa.edtmsys.com/privacy`

### App access
Pick **All or some functionality is restricted** and add instructions:

```
Pesa requires an account. Reviewer login:
Email: <reviewer email you created>
Password: <password>
Sign in with "Email" + "Password" on the first screen. No 2-step code is needed for password sign-in.
```

To create the reviewer account, sign up on https://pesa.edtmsys.com with an inbox you control, for example `pesa.review@…`. Then add a few pots and transactions so the app doesn't look empty. Don't set an app-lock PIN on this account. Use the same account for Apple.

### Ads
**No**, the app doesn't contain ads.

### Content rating (IARC questionnaire)
- Category: **All other app types**
- Violence, sexuality, language, controlled substances, gambling: **No** to all.
- Does the app let users interact or exchange content? **No.** Users can't see each other, and the Wrap share sends an image or text through the phone's own share sheet.
- Does it share the user's current location? **No**
- Does it allow purchases of digital goods? **No**
- Expected result: **Everyone / PEGI 3**.

### Target audience and content
- Target age group: **18 and over** only. Pesa is for adults managing a salary. Choosing only 18+ keeps the app out of the Families programme.
- Could the app unintentionally appeal to children? **No**

### News app
**No**

### Health apps
**No** health features.

### Financial features declaration
Pesa is a **budgeting / personal finance management** tool. It doesn't offer loans, payments, money transfers, trading, crypto, insurance, banking or credit.
- If the form lists budgeting or personal finance management, select that.
- For everything else (personal loans, earned-wage access, payments, crypto…), answer **No / doesn't provide**.
- If Console asks for supporting documents, they're needed only for regulated features, which Pesa doesn't have.

### Government apps
**No**

### Data safety

Answer the questionnaire like this:

**Data collection and security**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only; release builds refuse http) |
| Do you provide a way for users to request that their data is deleted? | **Yes** — in-app (More → Delete my account) and `https://pesa.edtmsys.com/delete-account` |

**Data types**. Tick only these:

| Category → type | Collected | Shared | Ephemeral? | Required or optional | Purposes |
|---|---|---|---|---|---|
| Personal info → **Name** | Yes | No | No | Required | App functionality, Account management |
| Personal info → **Email address** | Yes | No | No | Required | App functionality, Account management |
| Personal info → **User IDs** | Yes | No | No | Required | App functionality, Account management |
| Financial info → **Other financial info** (salary, pot amounts and transactions the user types in) | Yes | No | No | Required | App functionality |
| Device or other IDs → **Device or other IDs** (push token) | Yes | No | No | Optional (only if notifications are on) | App functionality |

Leave everything else **unticked**:
- **Location:** not collected. IP addresses are used only for anti-abuse rate limiting, stored hashed for up to a day and never turned into a location.
- **Not collected at all:** contacts, photos, files, audio, calendar, messages, web browsing, app activity / analytics, crash logs, diagnostics.
- **Financial info:** don't tick "User payment info", "Purchase history" or "Credit score". Pesa never takes card or bank details.

"Shared" means sent to a third party for that party's own use. Vercel, Neon, Resend and Firebase only *process* data on our behalf, so they don't count as sharing.

**Security practices**
- Data is encrypted in transit: **Yes**
- Users can request deletion: **Yes**
- Independent security review: **No**. Leave it unclaimed.

## 5. Store listing (Grow → Store presence → Main store listing)

Paste the text from [LISTING.md](LISTING.md), then upload:
- App icon: `docs/store/assets/play-icon-512.png`
- Feature graphic: `docs/store/assets/play-feature-graphic.png`
- Phone screenshots: `docs/store/assets/screenshots/android/` (between 2 and 8)
- Category **Finance**; contact email `amankrahjay@gmail.com`; website `https://pesa.edtmsys.com`

### Screenshots
The checked-in screenshots come from the Android emulator with a demo account. To re-capture them, run the app with `--dart-define=API_BASE_URL=…` against a demo account, open each screen, then:

```bash
adb exec-out screencap -p > docs/store/assets/screenshots/android/01-home.png
```

Use Home, a pot's detail screen, Disburse, Insights, Wrap and Bank. Hide the debug banner first, which release and profile builds already do.

## 6. Testing tracks → production

1. **Internal testing** (instant, up to 100 testers): upload the AAB, add yourself, and install from the opt-in link. Check sign-in, a disburse, notifications, and that the legal links open.
2. **Closed testing** (required for new personal accounts): create a track, add at least 12 testers, and keep it running for 14 days. Fix whatever they report.
3. Under **Production → Apply for production access**, answer the short questionnaire about your testing. Once you're approved, roll out the release (staged rollout is fine).
4. Check **Pre-launch report** on each upload. Google runs the app on test devices, and the reviewer login from step 4 lets the crawler get past sign-in.

## 7. Things that commonly get apps rejected, and Pesa's status

| Policy | Status |
|---|---|
| Account deletion in-app **and** via a web link | ✓ More → Delete my account; `/delete-account` |
| Privacy policy reachable in-app and on the listing | ✓ More → Privacy policy; `/privacy` |
| Data safety answers match the app (incl. SDKs) | ✓ Firebase Analytics is off; no other SDKs collect data |
| Target API level (Android 15 / API 35+) | ✓ targets API 36 |
| Misleading claims (implies payments) | ✓ listing and terms say Pesa doesn't move money |
| Login-gated app without reviewer credentials | ✓ provide them in App access |
| Broken functionality on review devices | ✓ test on internal track first; release build refuses a non-https API |
