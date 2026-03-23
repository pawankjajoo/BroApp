/**
 * firebase.js - Firebase Configuration & Initialization
 * ───────────────────────────────────────────────────────────────────────────
 * Central Firebase setup for the Bro app.
 *
 * SERVICES USED (all on Firebase free Spark plan → 50K MAU free):
 *   1. Firebase Authentication - Email/password, Google, Facebook sign-in
 *      (NO SAML/OIDC - those require Blaze plan)
 *   2. Cloud Firestore - User profiles, bro connections, transactions,
 *      BroCoin ledger, treasury
 *   3. Firebase Storage - Profile images
 *
 * SETUP INSTRUCTIONS:
 *   1. Go to https://console.firebase.google.com
 *   2. Create a new project named "bro-app"
 *   3. Enable Authentication → Email/Password, Google, Facebook providers
 *   4. Create a Firestore database (start in production mode)
 *   5. Enable Storage
 *   6. Register iOS app (com.broapp.bro) and Android app (com.broapp.bro)
 *   7. Copy your Firebase config below
 *   8. Download google-services.json (Android) and GoogleService-Info.plist (iOS)
 *      and place them in your project root
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Firebase Configuration ─────────────────────────────────────────────────
// Replace these values with your actual Firebase project config
// Found at: Firebase Console → Project Settings → General → Your apps
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
  // measurementId is optional - only needed if you enable Google Analytics
  // measurementId: "G-XXXXXXXXXX",
};

// ── Initialize Firebase (singleton) ────────────────────────────────────────
// Singleton pattern: only ONE Firebase instance across entire app. Prevents double-init bugs.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Auth with React Native persistence (uses AsyncStorage) ─────────────────
// AsyncStorage persistence keeps users logged in accross app restarts. Native, no server round-trip.
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ── Firestore ──────────────────────────────────────────────────────────────
const db = getFirestore(app);

// ── Storage ────────────────────────────────────────────────────────────────
const storage = getStorage(app);

// ── Firestore Collection References ────────────────────────────────────────
// Centralized collection names prevent typos and make refactors safe across codebase.
export const COLLECTIONS = {
  USERS:          "users",           // User profiles, settings, private data
  BROS:           "bros",            // Bro connections (friend relationships)
  TRANSACTIONS:   "transactions",    // All BB transactions (purchases + bronations)
  BROCOIN_LEDGER: "brocoin_ledger",  // Public anonymized BroCoin mint records
  BROCOIN_WALLETS:"brocoin_wallets", // Private BroCoin balances (1 doc per user)
  TREASURY:       "treasury",        // Single doc tracking treasury reserve
  NOTIFICATIONS:  "notifications",   // Push notification queue
  BRO_REQUESTS:   "bro_requests",    // Pending bro (friend) requests
};

// ── Firestore Document IDs (singletons) ────────────────────────────────────
// Single doc patterns for global state. Easy to keep in sync, no complex queries needed.
export const SINGLETON_DOCS = {
  TREASURY_STATE: "global_treasury",  // Single treasury doc in TREASURY colection
  PLATFORM_STATS: "platform_stats",   // Global counters (total transactions, etc.)
};

export { app, auth, db, storage };
export default app;
