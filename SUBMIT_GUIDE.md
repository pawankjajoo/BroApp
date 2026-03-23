# Bro App  -  Store Submission Guide

*Author: Pawan K Jajoo*

## What's in this project

```
BroApp/
├── App.js                  ← Root: fonts, navigation, global state
├── app.json                ← Expo config (bundle IDs, permissions, Apple Pay entitlement)
├── eas.json                ← EAS build profiles (development / preview / production)
├── constants/
│   └── bro.js              ← All 20 bro expressions, donation tiers, mock data
└── screens/
    ├── SplashScreen.js
    ├── HomeScreen.js
    ├── ChatScreen.js       ← Bro expressions only + Apple Pay bronations
    ├── BrocastScreen.js
    ├── BroximityScreen.js
    ├── CommunityScreen.js
    ├── NationsScreen.js    ← Apple Pay tiers
    └── ProfileScreen.js
```

---

## Step-by-step: Get to the stores

### 1  -  Install on your Mac (required for iOS builds)
```bash
# From inside the BroApp folder:
npm install
npx expo install expo-haptics @expo-google-fonts/bebas-neue expo-font expo-splash-screen
```

### 2  -  Test on your phone right now
```bash
npm install -g expo-cli
npx expo start
# Scan the QR code with Expo Go app (iOS/Android)
```

### 3  -  Create your Expo account + EAS project
```bash
npx eas-cli login          # Sign up at expo.dev if you haven't
npx eas-cli init           # Links this project, fills in projectId in app.json
```

### 4  -  Build for stores

**iOS (requires Apple Developer account  -  $99/yr at developer.apple.com):**
```bash
npx eas-cli build --platform ios --profile production
```
EAS handles certificates and provisioning profiles automatically.

**Android (requires Google Play account  -  $25 one-time at play.google.com/console):**
```bash
npx eas-cli build --platform android --profile production
```

### 5  -  Fill in eas.json placeholders
Open `eas.json` and replace:
- `YOUR-APPLE-ID@EMAIL.COM` → your Apple ID
- `YOUR-APP-STORE-CONNECT-APP-ID` → create app in App Store Connect first, copy the numeric ID
- `YOUR-APPLE-TEAM-ID` → found at developer.apple.com/account
- `./google-play-service-account.json` → download from Google Play Console → Setup → API access

### 6  -  Submit to stores
```bash
# iOS  -  submits .ipa to App Store Connect for review
npx eas-cli submit --platform ios --profile production

# Android  -  submits .aab to Google Play production track
npx eas-cli submit --platform android --profile production
```

---

## Before submitting  -  checklist

- [ ] App icon: 1024×1024 PNG (no alpha), save to `assets/icon.png`
- [ ] Splash image: save to `assets/splash-icon.png`
- [ ] Android adaptive icon: save to `assets/adaptive-icon.png`
- [ ] Privacy policy URL  -  required because Bro-nations involves payments
      (free option: create one at privacypolicygenerator.info)
- [ ] Apple Pay merchant ID registered at developer.apple.com → Identifiers → Merchant IDs
      Then update `entitlements` in app.json with your merchant ID
- [ ] For real Apple Pay payments, integrate Stripe SDK or RevenueCat
      (current Apple Pay buttons in app are UI-only placeholders)
- [ ] App Store Connect: create app listing with screenshots, description, age rating
- [ ] Google Play Console: create app, complete store listing, content rating questionnaire

---

## Apple Pay (real implementation)
The Bro-nation buttons show Apple Pay UI but currently simulate the payment.
To go live with real payments:
```bash
npm install @stripe/stripe-react-native
```
Then wrap your `App.js` in `<StripeProvider publishableKey="...">` and call
`presentPaymentSheet()` when a user taps the Apple Pay button.

---

## Review timelines
- Apple App Store: 1–3 business days typically
- Google Play: 1–3 days for new apps, faster for updates

## Support
App Store Connect: appstoreconnect.apple.com
Google Play Console: play.google.com/console
EAS Build docs: docs.expo.dev/build/introduction
```
