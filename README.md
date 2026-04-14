# BRO

Your crew at a glance. Connect with friends, send bro-nations, explore your community. One app. Six dimensions of bro.

---

## What's a Bro?

Bro is a React Native / Expo social app built for real connections. Text your crew, broadcast moments, find friends nearby with Bro-ximity, explore communities, manage your Bro Bucks wallet, trade BroCoins, and build your bro-file. It's all here.

**Six tabs. One mission: stay connected.**

- **Bros** - Your roster. Unread messages at a glance. Send individual bro expressions or peer-to-peer Bro-nations.
- **Bro-cast** - Broadcast one expression to all your bros at once. Track total bro count sent.
- **Bro-ximity** - Find friends nearby using location radar. See distance and signal strength.
- **Bro-mmunity** - Global bro feed. Watch live activity from across the network.
- **Bro Bucks** - In-app currency wallet. Buy Bro Bucks via IAP, send bro-nations, view exchange rates, see transaction history.
- **Bro-file** - Your identity. Photo, work/school affiliation, one thing about you. View recommended bros, BroCoin balance, global stats, and trade BroCoins for Bro Bucks.

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
âââ App.js                    # Root: navigation, tabs, global state, animations
âââ app.json                  # Expo config (permissions, bundle IDs, icons)
âââ eas.json                  # EAS build profiles (iOS/Android builds)
âââ package.json
âââ firestore.rules           # Firestore security rules
âââ storage.rules             # Cloud Storage security rules
âââ constants/
â   âââ bro.js                # Currency rates, mock data, bro expressions
âââ screens/
â   âââ SplashScreen.js       # Splash with animated logo & radar pulse
â   âââ AuthScreen.js         # Email/password, Google, Facebook auth + anti-bot
â   âââ HomeScreen.js         # Bro roster with unread counts
â   âââ ChatScreen.js         # 1-on-1 chat, bro expressions, bro-nations
â   âââ BrocastScreen.js      # Broadcast expression to all bros
â   âââ BroximityScreen.js    # Radar map, nearby bros, signal strength
â   âââ CommunityScreen.js    # Global activity feed
â   âââ WalletScreen.js       # Bro Bucks balance, purchase packs, exchange rates
â   âââ BroCoinScreen.js      # Private BroCoin wallet, ledger, trading
â   âââ ProfileScreen.js      # User profile, notifications, recommendations, BroCoin stats
â   âââ NationsScreen.js      # (Unused) Apple Pay donation screen
âââ services/
â   âââ auth.js               # Firebase auth, device fingerprinting, anti-bot (proof-of-work, CAPTCHA)
â   âââ firebase.js           # Firebase config, auth, Firestore, Storage init
â   âââ broCoin.js            # BroCoin minting, trading, public ledger, anonymization
â   âââ iap.js                # In-app purchase integration (react-native-iap)
â   âââ notifications.js      # Expo push notifications, registration
â   âââ broNetwork.js         # Friend recommendations (BFS graph traversal)
â   âââ firestoreService.js   # Firestore CRUD for users, bros, transactions
â   âââ storageService.js     # Firebase Storage profile image upload/delete
âââ legal/
    âââ privacy-policy.html
    âââ terms-of-service.html
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

## Currency Systems

### Bro Bucks (Consumable In-App Currency)

Exchange USD for Bro Bucks via in-app purchase, then send peer-to-peer bro-nations to friends.

**Exchange rate:** 1,000,000 Bro Bucks = $1 USD

**Purchase tiers:**
- Bro Starter: $1 â 1M BB
- Lil Bro: $3 â 3M BB
- Just Bro: $5 â 5M BB
- Big Bro: $10 â 10M BB
- Baller Bro: $100 â 100M BB
- GOAT Bro: $1,000 â 1B BB

**Bro-nation fee:** 30% platform fee applies. Recipient receives 70% of amount sent.

### BroCoins (Platform Rewards)

Non-consumable reward token. Minted when verified users meet platform milestones. Stored in private wallet, never public.

**Features:**
- Public anonymized ledger of all mints (no user IDs)
- Private wallet balance (visible only to owner)
- Tradeable for Bro Bucks at dynamic market rate
- Global treasury reserves track total minted and circulating supply

**Minting:** Triggered by verified bro connections and transactions. Milestone-based rewards.

---

## Firebase Setup

Bro uses Firebase for auth, Firestore database, and Cloud Storage.

1. Create a Firebase project at firebase.google.com
2. Enable Authentication (Email/Password, Google OAuth, Facebook OAuth)
3. Create a Firestore database with security rules from `firestore.rules`
4. Set up Cloud Storage with rules from `storage.rules`
5. Enable Cloud Messaging for push notifications
6. Download your config and update `services/firebase.js` with credentials

Deploy rules with:
```bash
firebase deploy --only firestore:rules,storage
```

---

## In-App Purchases & IAP

Bro uses `react-native-iap` for in-app purchases on iOS and Android.

**Product IDs** (defined in `constants/bro.js`):
- `com.broapp.bro.bucks_1m` - $1 / 1M BB
- `com.broapp.bro.bucks_3m` - $3 / 3M BB
- `com.broapp.bro.bucks_5m` - $5 / 5M BB
- `com.broapp.bro.bucks_10m` - $10 / 10M BB
- `com.broapp.bro.bucks_100m` - $100 / 100M BB
- `com.broapp.bro.bucks_1b` - $1,000 / 1B BB

**Setup:**

1. Create matching product IDs in App Store Connect (iOS) and Google Play Console (Android)
2. Test in sandbox / internal testing before production
3. IAP service listens for purchase updates and grants Bro Bucks after transaction is finished

**Compliance:**
- 30% platform fee on peer-to-peer bro-nations disclosed in app
- Bro Bucks are consumable, no refunds, no real-world value
- Follows Apple Â§3.1.1 and Google Play Billing requirements

---

## Legal Documents

Included:
- `legal/privacy-policy.html` - Privacy Policy
- `legal/terms-of-service.html` - Terms of Service

Update these with your own before submitting to app stores.

---

## Key Features

- **Authentication** - Email/password, Google OAuth, Facebook OAuth with device fingerprinting
- **Anti-bot measures** - Proof-of-work, CAPTCHA, rate limiting, behavior scoring (client-side)
- **Bro Connections** - Firestore-backed friend network with unread message tracking
- **Messaging** - 1-on-1 chat with 6 preset bro expressions (Love, Hype, Respect, Laugh, Sad, Rage)
- **Bro-cast** - One-tap broadcast to all bros with counter
- **Bro-ximity** - Location-based radar to find nearby bros with signal strength
- **Bro-mmunity** - Global activity feed showing bro actions across the network
- **Bro Bucks** - In-app currency with 6 purchase tiers ($1 to $1,000 USD), real-time store pricing
- **Bro-nations** - Peer-to-peer transfers with 30% platform fee (recipient gets 70%)
- **BroCoins** - Platform reward token, private wallet, public anonymized ledger, tradeable for Bro Bucks
- **Push Notifications** - Expo notifications with routing to relevant tabs
- **In-app Purchases** - IAP via react-native-iap (Apple App Store, Google Play)
- **Profile Management** - Photo upload, affiliation verification, interesting fact field, recommended bros
- **Real-time Firestore** - Synced user data, transactions, BroCoin ledger, notifications
- **Cloud Storage** - Profile image upload with 5MB limit

---

## Troubleshooting

**Build fails:** Run `npm install` and Expo packages from Installation section.

**Authentication not working:** Verify Firebase config in `services/firebase.js`. Check OAuth client IDs in `services/auth.js` AUTH_CONFIG.

**Notifications not showing:** Confirm push notification permissions in app.json. Test on physical device (required for push). Check Firebase Cloud Messaging setup.

**IAP not working:** Verify product IDs in `constants/bro.js` match App Store / Play Store listings exactly. Use sandbox testing first.

**BroCoin trades failing:** Ensure `services/broCoin.js` is initialized. Local state will be used if Firestore is unavailable.

**Bro-ximity not working:** Location permission must be granted. Test on physical device.

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
