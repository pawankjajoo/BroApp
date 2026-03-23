# BRO

Your crew at a glance. Connect with friends, send bro-nations, explore your community. One app. Six dimensions of bro.

---

## What's a Bro?

Bro is a social app built for real connections. Text your crew, broadcast moments, find friends nearby with Bro-ximity, explore communities, manage your Bro Bucks wallet, and build your bro-file. It's all here.

**Six tabs. One mission: stay connected.**

- **Bros** - Your roster. Unread messages at a glance.
- **Bro-cast** - Share moments with your circle.
- **Bro-ximity** - Find friends nearby using location.
- **Bro-mmunity** - Discover and join communities.
- **Bro Bucks** - Your in-app currency. Send bro-nations, earn rewards.
- **Bro-file** - Your identity. Photo, work/school, one thing about you.

---

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- An Expo account (free at expo.dev)

### Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/yourusername/bro-app.git
cd bro-app
npm install
```

Install additional Expo packages:

```bash
npx expo install expo-haptics @expo-google-fonts/bebas-neue expo-font expo-splash-screen react-native-iap
```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your phone (iOS/Android).

---

## Project Structure

```
bro-app/
├── App.js                  # Root: navigation, global state, fonts
├── app.json                # Expo config (permissions, bundle IDs, icons)
├── eas.json                # EAS build profiles (iOS/Android builds)
├── package.json
├── constants/
│   └── bro.js              # Currency rates, mock data, expressions
├── screens/
│   ├── SplashScreen.js
│   ├── AuthScreen.js
│   ├── HomeScreen.js
│   ├── ChatScreen.js
│   ├── BrocastScreen.js
│   ├── BroximityScreen.js
│   ├── CommunityScreen.js
│   ├── NationsScreen.js
│   ├── WalletScreen.js
│   └── ProfileScreen.js
├── services/
│   ├── auth.js             # Firebase authentication
│   ├── firebase.js         # Firebase setup
│   ├── broCoin.js          # In-app currency logic
│   ├── iap.js              # In-app purchases (Apple Pay, Google Play)
│   ├── notifications.js    # Push notifications
│   ├── broNetwork.js       # Peer-to-peer bro connections
│   ├── firestoreService.js # Firestore database
│   └── storageService.js   # Local storage
└── legal/
    ├── privacy-policy.html
    └── terms-of-service.html
```

---

## Building for App Stores

### Preparing for iOS/Android

Update these files before building:

1. **app.json**: Replace placeholder values
   - `YOUR-EAS-PROJECT-ID-HERE` - Get from `npx eas-cli init`
   - `YOUR-EXPO-USERNAME` - Your Expo account username
   - Bundle identifiers and team IDs for iOS

2. **eas.json**: Add credentials
   - Apple ID and Team ID (iOS)
   - Google Play service account JSON (Android)

3. **Assets** (place in `assets/` folder):
   - `icon.png` - 1024x1024 PNG
   - `splash-icon.png` - Splash screen
   - `adaptive-icon.png` - Android adaptive icon
   - `favicon.png` - Web favicon

### Build Commands

Create an EAS account and initialize your project:

```bash
npx eas-cli login
npx eas-cli init
```

Build for iOS:

```bash
npx eas-cli build --platform ios --profile production
```

Build for Android:

```bash
npx eas-cli build --platform android --profile production
```

### Submit to Stores

After building:

```bash
# iOS - requires Apple Developer account ($99/yr)
npx eas-cli submit --platform ios --profile production

# Android - requires Google Play account ($25 one-time)
npx eas-cli submit --platform android --profile production
```

For details, see SUBMIT_GUIDE.md.

---

## Currency: Bro Bucks

Bro uses Bro Bucks, an in-app currency. Exchange USD for Bro Bucks via in-app purchase, then send bro-nations to friends.

**Exchange rate:** 1,000,000 Bro Bucks = $1 USD

**Peer-to-peer tiers:**
- Lil Bro: 100,000 BB (~$0.10)
- Big Bro: 1,000,000 BB (~$1)
- Baller Bro: 10,000,000 BB (~$10)
- GOAT Bro: 100,000,000 BB (~$100)

Platform fee on bro-nations: 30% (recipient gets 70%).

---

## Firebase Setup

Bro uses Firebase for auth, Firestore database, and notifications.

1. Create a Firebase project at firebase.google.com
2. Enable Authentication (Email/Password, Google Sign-In)
3. Create a Firestore database
4. Download your service account keys
5. Update `services/firebase.js` with your credentials

---

## Apple Pay & In-App Purchases

The app includes Apple Pay buttons for Bro Bucks purchases. To enable real payments:

1. Register a Merchant ID at developer.apple.com/account
2. Update the merchant ID in app.json entitlements
3. Integrate Stripe SDK or RevenueCat for payment processing

Current implementation shows UI placeholders for testing.

---

## Legal Documents

Included:
- `legal/privacy-policy.html` - Privacy Policy
- `legal/terms-of-service.html` - Terms of Service

Update these with your own before submitting to app stores.

---

## Key Features

- Firebase Authentication (email/password, Google Sign-In)
- Real-time Firestore syncing
- Push notifications (Expo notifications)
- In-app purchases (IAP) for Bro Bucks
- Geolocation (Bro-ximity)
- Peer-to-peer bro-nations with platform fees
- Publisher revenue tracking

---

## Troubleshooting

**Build fails:** Make sure you've run `npm install` and all Expo packages are installed.

**Authentication not working:** Check Firebase config in `services/firebase.js`.

**Notifications not showing:** Ensure push notification permissions are granted in app.json and Firebase messaging is configured.

**IAP not working:** Verify product IDs in constants/bro.js match your store listings exactly.

---

## Support & Docs

- Expo Documentation: https://docs.expo.dev
- Firebase Docs: https://firebase.google.com/docs
- EAS Build: https://docs.expo.dev/build/introduction
- App Store Connect: https://appstoreconnect.apple.com
- Google Play Console: https://play.google.com/console

---

## License

Check LICENSE file for details.

---

**Ready to build?** Start with `npm install` and `npx expo start`. Your bro empire awaits.
