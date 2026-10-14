# Pesa mobile

Flutter client for Pesa. It talks to the Next.js app's mobile REST API
(`app/api/mobile/**` in the repo root). The build plan and history live in
[`../MOBILE_PLAN.md`](../MOBILE_PLAN.md).

- App ID (Android `applicationId` / iOS bundle id): **`com.edtmsys.pesa`**.
  This is permanent once published.
- State: Riverpod 3. Routing: go_router. HTTP: dio.
- Money is always an `int`. Monthly rollover and payday crediting happen on the
  server. The app never calculates them.

## Run locally

1. Start the backend from the repo root: `npm install`, set up `.env`, then
   `npm run dev`. `.env` needs `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
   `AUTH_SECRET` and `MOBILE_JWT_SECRET`.
2. Run the app from this folder, passing the backend URL as the target sees it:

| Target | Command |
|---|---|
| Android emulator | `flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:3000` |
| iOS simulator | `flutter run --dart-define=API_BASE_URL=http://localhost:3000` |
| Physical device | `flutter run -d <id> --dart-define=API_BASE_URL=http://<your-LAN-IP>:3000` |

In development, email sign-in codes are not emailed. They are printed in the
`npm run dev` output: `[dev] mobile email-code for …`.

## Tests

```sh
flutter analyze
flutter test                                   # unit/widget tests, no server needed
flutter test integration_test/<name>.dart -d emulator-5554 \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000   # needs npm run dev running
```

The integration tests register throwaway users against the live dev database.
`email_code_test.dart` reads the code from `/tmp/pesa-dev.log`, so it only works
on a desktop target. From the repo root, `npm run smoke:mobile` checks the whole
mobile API without a device.

## Release builds

A release build **must** be given the production API URL over https:

```sh
flutter build appbundle --dart-define=API_BASE_URL=https://<your-production-domain>
flutter build ipa       --dart-define=API_BASE_URL=https://<your-production-domain>
```

If a release build is made without it, the app shows a configuration error
screen instead of failing on every request (see `lib/core/env.dart`).

### Android signing

1. Create an upload keystore once and keep it and its passwords safe. If you
   lose them, you can't publish updates without asking Play support for a reset.
   ```sh
   keytool -genkey -v -keystore ~/pesa-upload-keystore.jks -keyalg RSA \
     -keysize 2048 -validity 10000 -alias upload
   ```
2. Create `android/key.properties`. It is gitignored, so never commit it.
   ```properties
   storePassword=…
   keyPassword=…
   keyAlias=upload
   storeFile=/absolute/path/to/pesa-upload-keystore.jks
   ```
3. Run `flutter build appbundle …` as above, then upload
   `build/app/outputs/bundle/release/app-release.aab` to Play Console with
   Play App Signing turned on.

Without `key.properties`, release builds are signed with the debug key. Gradle
prints a warning, and such a build can't be published.

### iOS / TestFlight prerequisites

These need a Mac with Xcode.

- An Apple Developer Program membership, and an App ID registered for
  `com.edtmsys.pesa`.
- Open `ios/Runner.xcworkspace`. Under Runner → Signing & Capabilities, choose
  the team. Automatic signing creates the profiles.
- Create the app in App Store Connect with the same bundle id, then run
  `flutter build ipa …` and upload with Xcode Organizer or Transporter.

### Versioning

`version: x.y.z+N` in `pubspec.yaml` sets both platforms. Increase `N` (the
build number) for every store upload.

## Branding

- **Icon and native splash.** These are generated from `assets/branding/*.png`.
  Those images are rendered from the web logo (`app/icon.svg`) by
  `scripts/gen-mobile-branding.cjs` in the repo root. The native splash
  deliberately shows an *empty* pot.
- **Animated splash.** The Flutter splash (`lib/features/splash/animated_splash.dart`)
  starts from that empty pot, drops in three coins and fills the pot. It lasts
  about 2.6 seconds and is shortened when the OS reduce-motion setting is on.
  It disappears once the app is ready.
- **Fonts.** Instrument Serif is bundled in `assets/google_fonts/` under the OFL,
  so the brand serif renders offline and on the first frame.

To regenerate after changing the logo:

```sh
node scripts/gen-mobile-branding.cjs          # from the repo root
cd pesa_mobile
dart run flutter_launcher_icons && dart run flutter_native_splash:create
```

Then review `git diff ios/`:

- `flutter_launcher_icons` sets
  `ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = AppIcon` in
  `project.pbxproj`. Revert that change.
- `flutter_native_splash` rewrites `Info.plist` with new indentation. Keep only
  real changes.

On Android 12+, the system caches an app's splash screen. Uninstall the app
(not `install -r`) to see a new one.
