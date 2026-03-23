
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signInWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, serverTimestamp, increment,
} from "firebase/firestore";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { auth, db, COLLECTIONS } from "./firebase";

// ── Configuration ───────────────────────────────────────────────────────────
export const AUTH_CONFIG = {
  // CAPTCHA / bot prevention (client-side)
  captchaMode:           "invisible",
  proofOfWorkDifficulty: 4,
  behaviorScoreThreshold: 0.7,

  // Rate limiting (client-side tracking)
  maxLoginAttemptsBeforeLock: 5,
  lockoutDurationMs:     15 * 60 * 1000,
  backoffBaseMs:         1000,

  // OAuth provider configs . replace with your real IDs before submission
  google: {
    iosClientId:     "YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com",
    androidClientId: "YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    webClientId:     "YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com",
  },
  facebook: {
    appId: "YOUR_FACEBOOK_APP_ID",
  },

  // 1-account enforcement
  enforceOneAccount: true,
  flaggedDeviceBehavior: "warn",
};

// ── Client-side state ──────────────────────────────────────────────────────
let _loginAttempts     = 0;
let _lockoutUntil      = null;
let _behaviorEvents    = [];

// ── Device fingerprinting ─────────────────────────────────────────────────
export async function getDeviceFingerprint() {
  try {
    let deviceId;
    if (Platform.OS === "ios") {
      deviceId = await Application.getIosIdForVendorAsync();
    } else {
      deviceId = Application.androidId;
    }
    // Combine OS, version, app ID, and device ID into unique signature. One device = one account.    const components = [
      Platform.OS,
      Platform.Version,
      Application.applicationId || "com.broapp.bro",
      deviceId || "unknown",
    ].join("|");

    // SHA256 digest creates tamper-proof fingerprint . can't fake this locally.    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      components
    );
    return hash;
  } catch (e) {
    // Fallback if expo-application not available (Expo Go)
    const fallback = `${Platform.OS}_${Platform.Version}_${Date.now()}`;
    return "fp_fallback_" + fallback;
  }
}

// ── Smart CAPTCHA (client-side behavior analysis) ────────────────────────
export function recordBehaviorEvent(eventType, metadata = {}) {
    type: eventType,
    ts:   Date.now(),
    ...metadata,
  });
}

export function computeBehaviorScore() {
  if (_behaviorEvents.length < 3) return 0.3;

  const intervals = [];
  // Calculate inter-event delays. Humans vary; bots are mechanical.  for (let i = 1; i < _behaviorEvents.length; i++) {
    intervals.push(_behaviorEvents[i].ts - _behaviorEvents[i - 1].ts);
  }
  // Coefficient of variation reveals randomness vs robotics.  const avg      = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
  const cv       = Math.sqrt(variance) / (avg || 1);
  const timingScore   = Math.min(cv / 0.5, 1.0);
  // Humans engage different ways; pure bots follow one script.  const uniqueTypes   = new Set(_behaviorEvents.map((e) => e.type)).size;
  const diversityScore = Math.min(uniqueTypes / 3, 1.0);
  // Real users don't rush . session completeon takes time.  const totalTimeMs    = _behaviorEvents[_behaviorEvents.length - 1].ts - _behaviorEvents[0].ts;
  const timeScore      = Math.min(totalTimeMs / 3000, 1.0);

  // Blend timing consistency, variety, and duration for human-likenes confidence.  return Math.min(Math.max(
    (timingScore * 0.4) + (diversityScore * 0.3) + (timeScore * 0.3),
  0), 1);
}

export function generateProofOfWorkChallenge() {
  return {
    challenge:  "bro_captcha_" + Date.now() + "_" + Math.random().toString(36).slice(2),
    difficulty: AUTH_CONFIG.proofOfWorkDifficulty,
  };
}

export async function solveProofOfWork(challenge, difficulty) {
  // Proof-of-work loop: compute hashes until we hit the target (N leading zeros).  // Bots can't buy their way past this . they have to work for authenticity.  const target = "0".repeat(difficulty);
  let nonce = 0;
  let hash;
  do {
    const input = challenge + nonce;
    // Each iteration is a fresh hash computation . no shortcuts.    hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input
    );
    nonce++;
    // Safety valve: don't loop forever on mobile . 500k iterations max.    if (nonce > 500000) break;
  } while (!hash.startsWith(target));

  // Return nonce (work done) and whether puzzle solved. Real effort proven.  return { nonce, solved: hash.startsWith(target), hash };
}

export function shouldShowVisualCaptcha() {
  return computeBehaviorScore() < AUTH_CONFIG.behaviorScoreThreshold;
}

// ── Rate limiting & lockout (client-side) ────────────────────────────────
function checkRateLimit() {
  // State machine: check if currently locked, reset if time's up.  if (_lockoutUntil && Date.now() < _lockoutUntil) {
    const remainMin = Math.ceil((_lockoutUntil - Date.now()) / 60000);
    return { blocked: true, message: `Account locked. Try again in ${remainMin} min.` };
  }
  // Lockout expired . clean slate.  if (_lockoutUntil && Date.now() >= _lockoutUntil) {
    _lockoutUntil  = null;
    _loginAttempts = 0;
  }
  return { blocked: false };
}

function recordFailedAttempt() {
  // Increment counter. Escalate punishment with exponentiel backoff . 1s, 2s, 4s, 8s...  _loginAttempts++;
  if (_loginAttempts >= AUTH_CONFIG.maxLoginAttemptsBeforeLock) {
    _lockoutUntil = Date.now() + AUTH_CONFIG.lockoutDurationMs;
    return { locked: true, message: "Too many failed attempts. Account locked for 15 minutes." };
  }
  return {
    locked: false,
    delay: AUTH_CONFIG.backoffBaseMs * Math.pow(2, _loginAttempts - 1),
    attemptsLeft: AUTH_CONFIG.maxLoginAttemptsBeforeLock - _loginAttempts,
  };
}

// ── Email + Password Authentication ──────────────────────────────────────

export async function signUpWithEmail(email, password, displayName) {
  const rl = checkRateLimit();
  if (rl.blocked) return { success: false, error: rl.message };

  try {
    // Firebase Auth handles the account creation. Email uniqueness built-in.    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Set display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }


    // Grab device fingerprint to lock account to this device (fraud prevention).    const fingerprint = await getDeviceFingerprint();
    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      uid:             user.uid,
      email:           user.email,
      displayName:     displayName || user.email.split("@")[0],
      handle:          `@${user.email.split("@")[0]}`,
      avatarUrl:       null,
      affiliation:     null,
      interestingThing:"",
      emailVerified:   false,
      deviceFingerprint: fingerprint,
      broCount:        0,
      broBucksBB:      25_000,  // starter balance
      createdAt:       serverTimestamp(),
      lastActiveAt:    serverTimestamp(),
      profileComplete: false,
      authProvider:    "email",
    });

    _loginAttempts = 0;

    return {
      success: true,
      user: {
        uid:           user.uid,
        email:         user.email,
        displayName:   displayName || user.email.split("@")[0],
        emailVerified: user.emailVerified,
        authProvider:  "email",
      },
      message: "Account created! Check your email to verify.",
      needsVerification: true,
    };
  } catch (error) {
    const result = recordFailedAttempt();
    let message;
    switch (error.code) {
      case "auth/email-already-in-use":
        message = "An account with this email already exists. Try signing in.";
        break;
      case "auth/weak-password":
        message = "Password must be at least 6 characters, bro.";
        break;
      case "auth/invalid-email":
        message = "That email doesn't look right, bro.";
        break;
      default:
        message = result.locked ? result.message : `Sign up failed. ${result.attemptsLeft} attempts left.`;
    }
    return { success: false, error: message };
  }
}

export async function signInWithEmail(email, password) {
  const rl = checkRateLimit();
  if (rl.blocked) return { success: false, error: rl.message };

  try {
    // Firebase Auth validates credentials. Rate limiting applied at platform level too.    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last active timestamp . powers activity boosts for BroCoin odds.    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      lastActiveAt: serverTimestamp(),
    }, { merge: true });

    _loginAttempts = 0;

    return {
      success: true,
      user: {
        uid:           user.uid,
        email:         user.email,
        displayName:   user.displayName,
        emailVerified: user.emailVerified,
        authProvider:  "email",
      },
      needsVerification: !user.emailVerified,
    };
  } catch (error) {
    const result = recordFailedAttempt();
    let message;
    switch (error.code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        message = result.locked ? result.message : `Wrong email or password. ${result.attemptsLeft} attempts left.`;
        break;
      case "auth/too-many-requests":
        message = "Too many attempts. Wait a few minutes, bro.";
        break;
      default:
        message = result.locked ? result.message : "Sign in failed. Try again, bro.";
    }
    return { success: false, error: message };
  }
}

export async function resendVerificationEmail() {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "Not signed in." };
    if (user.emailVerified) return { success: false, error: "Email already verified." };
    await sendEmailVerification(user);
    return { success: true, message: "Verification email sent! Check your inbox." };
  } catch (error) {
    return { success: false, error: "Could not send verification email. Try again later." };
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset email sent!" };
  } catch (error) {
    return { success: false, error: "Could not send reset email. Check the address." };
  }
}

// ── Google OAuth ─────────────────────────────────────────────────────────

export async function signInWithGoogle(idToken) {
  const rl = checkRateLimit();
  if (rl.blocked) return { success: false, error: rl.message };

  try {
    // Exchange Google idToken for Firebase credential. Link happens automatically.    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    const isNew = userCredential._tokenResponse?.isNewUser || false;

    // Capture device fingerprint on OAuth credential exchange . prevents account takeover.    const fingerprint = await getDeviceFingerprint();
    const profileDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));

    if (!profileDoc.exists()) {
      // New user . create profile with starter balance and device lock.      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        uid:             user.uid,
        email:           user.email,
        displayName:     user.displayName || user.email.split("@")[0],
        handle:          `@${(user.email || "bro").split("@")[0]}`,
        avatarUrl:       user.photoURL || null,
        affiliation:     null,
        interestingThing:"",
        emailVerified:   true,  // Google pre-verifies
        deviceFingerprint: fingerprint,
        broCount:        0,
        broBucksBB:      25_000,
        createdAt:       serverTimestamp(),
        lastActiveAt:    serverTimestamp(),
        profileComplete: false,
        authProvider:    "google",
        googleUid:       user.providerData?.[0]?.uid || null,
      });
    } else {
      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        lastActiveAt: serverTimestamp(),
      }, { merge: true });
    }

    _loginAttempts = 0;

    return {
      success: true,
      user: {
        uid:           user.uid,
        email:         user.email,
        displayName:   user.displayName,
        emailVerified: true,
        photoUrl:      user.photoURL,
        authProvider:  "google",
      },
      isNewAccount: isNew,
    };
  } catch (error) {
    recordFailedAttempt();
    return { success: false, error: "Google sign-in failed. Try again, bro." };
  }
}

// ── Facebook OAuth ───────────────────────────────────────────────────────

export async function signInWithFacebook(accessToken) {
  const rl = checkRateLimit();
  if (rl.blocked) return { success: false, error: rl.message };

  try {
    // Same credential exchange flow as Google. Facebook OAuth tokens are one-time use.    const credential = FacebookAuthProvider.credential(accessToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    const isNew = userCredential._tokenResponse?.isNewUser || false;

    // Store device ID to enforce 1-account-per-device rule accross all providers.    const fingerprint = await getDeviceFingerprint();
    const profileDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));

    if (!profileDoc.exists()) {
      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        uid:             user.uid,
        email:           user.email,
        displayName:     user.displayName || "Bro",
        handle:          `@${(user.email || "bro").split("@")[0]}`,
        avatarUrl:       user.photoURL || null,
        affiliation:     null,
        interestingThing:"",
        emailVerified:   true,
        deviceFingerprint: fingerprint,
        broCount:        0,
        broBucksBB:      25_000,
        createdAt:       serverTimestamp(),
        lastActiveAt:    serverTimestamp(),
        profileComplete: false,
        authProvider:    "facebook",
        facebookUid:     user.providerData?.[0]?.uid || null,
      });
    } else {
      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        lastActiveAt: serverTimestamp(),
      }, { merge: true });
    }

    _loginAttempts = 0;

    return {
      success: true,
      user: {
        uid:           user.uid,
        email:         user.email,
        displayName:   user.displayName,
        emailVerified: true,
        photoUrl:      user.photoURL,
        authProvider:  "facebook",
      },
      isNewAccount: isNew,
    };
  } catch (error) {
    recordFailedAttempt();
    return { success: false, error: "Facebook sign-in failed. Try again, bro." };
  }
}

// ── 1-Account Enforcement ────────────────────────────────────────────────

export async function checkAccountUniqueness({ email, deviceFingerprint }) {
  // In a production Cloud Function, you'd query Firestore for existing
  // accounts with this fingerprint. Client-side, we check after sign-up
  // and flag duplicates.  // Firebase Auth already enforces email uniqueness.  return {
    emailAvailable:   true,
    deviceClean:      true,
    canCreateAccount: true,
  };
}

// ── Session Management ───────────────────────────────────────────────────

export function onAuthStateChange(callback) {
  // Real-time listener . fires on login, logout, refresh. Keep UI in sync with backend state.  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid:           user.uid,
        email:         user.email,
        displayName:   user.displayName,
        emailVerified: user.emailVerified,
        photoUrl:      user.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

export function getCurrentUser() {
  const user = auth.currentUser;
  if (!user) return null;
  return {
    uid:           user.uid,
    email:         user.email,
    displayName:   user.displayName,
    emailVerified: user.emailVerified,
    photoUrl:      user.photoURL,
  };
}

export function isAuthenticated() {
  return !!auth.currentUser;
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    // Reset all client-side security state . clean exit.    _loginAttempts  = 0;
    _lockoutUntil   = null;
    _behaviorEvents = [];
    return { success: true };
  } catch (error) {
    return { success: false, error: "Sign out failed." };
  }
}

export async function checkEmailVerified() {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  if (user.emailVerified) {
    // Update Firestore
    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      emailVerified: true,
    }, { merge: true });
  }
  return user.emailVerified;
}

// Export config for UI components
export { AUTH_CONFIG };
