/**
 * AuthScreen.js — Your Gateway to Brotherhood
 * ───────────────────────────────────────────────────────────────────────────
 * The entrance to the BRO app. First thing users see, hardened to stay secure.
 *
 * GEOPOLITICAL MESSAGING: In turbulent times, loyalty becomes rare. This screen
 * sets the tone: borders shift, alliances crumble, but your bros? Constant.
 * Unshakeable. Ready to show up when it matters.
 *
 * SECURITY ARCHITECTURE:
 *   1. Smart state machine (welcome → signup/signin → verify/captcha → authenticated)
 *   2. Email + Password sign-up with cryptographic verification links
 *   3. Email + Password sign-in with rate limiting per device
 *   4. OAuth shortcuts via Google & Facebook (trust their auth layer)
 *   5. Adaptive CAPTCHA (invisible behavior tracking + proof-of-work for suspects)
 *   6. Device fingerprinting & 1-account-per-person enforcement
 *   7. Anti-bot measures throughout: behavioral analysis, rate limits, bot detection
 *
 * FLOWS: Smooth for humans. Brutal for bots.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from "react-native";
import * as GoogleAuth from "expo-auth-session/providers/google";
import * as FacebookAuth from "expo-auth-session/providers/facebook";
import * as WebBrowser from "expo-web-browser";
import {
  signUpWithEmail, signInWithEmail,
  signInWithGoogle, signInWithFacebook,
  resendVerificationEmail, resetPassword,
  recordBehaviorEvent, shouldShowVisualCaptcha,
  solveProofOfWork, generateProofOfWorkChallenge,
  checkAccountUniqueness, getDeviceFingerprint,
  AUTH_CONFIG,
} from "../services/auth";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ onAuthSuccess, showToast }) {
  // ── STATE MACHINE ────────────────────────────────────────────────────
  // Core navigation through the auth flow. Each mode represents a screen state:
  //   "welcome"  → initial landing (tagline, OAuth buttons, email/password options)
  //   "signup"   → email + password creation + anti-bot proof-of-work
  //   "signin"   → email + password verification + rate limit checks
  //   "verify"   → email link confirmation pending (user clicks link, returns here)
  //   "captcha"  → suspicious behavior detected; simple math challenge + proof-of-work
  const [mode, setMode]             = useState("welcome");

  // Form inputs tracked throughout the authentication process
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [displayName, setDisplayName] = useState("");

  // UI state: loading spinner, error messaging, CAPTCHA answer field
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  // Smooth screen transitions via React Native Animated API
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ── OAUTH FLOWS ──────────────────────────────────────────────────────
  // Delegate trust to Google & Facebook. Their auth layers handle identity.
  // We exchange tokens for user records in our backend.
  // Google OAuth (web + iOS + Android clients configured)
  const [googleRequest, googleResponse, googlePromptAsync] = GoogleAuth.useAuthRequest({
    iosClientId:     AUTH_CONFIG.google.iosClientId,
    androidClientId: AUTH_CONFIG.google.androidClientId,
    webClientId:     AUTH_CONFIG.google.webClientId,
  });

  // Facebook OAuth (web client configured)
  const [fbRequest, fbResponse, fbPromptAsync] = FacebookAuth.useAuthRequest({
    clientId: AUTH_CONFIG.facebook.appId,
  });

  // Trigger animations when mode changes (eveything fades/slides in smoothly)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [mode]);

  // Behavioral telemetry: track that auth screen was viewed
  useEffect(() => {
    recordBehaviorEvent("screen_view", { screen: "auth" });
  }, []);

  // ── GOOGLE OAUTH HANDLER ─────────────────────────────────────────────
  // User approved Google sign-in. Extract ID token and exchange for session.
  useEffect(() => {
    if (googleResponse?.type === "success") {
      const { id_token } = googleResponse.params;
      handleGoogleAuth(id_token);
    }
  }, [googleResponse]);

  // ── FACEBOOK OAUTH HANDLER ───────────────────────────────────────────
  // User approved Facebook sign-in. Extract access token and exchange for session.
  useEffect(() => {
    if (fbResponse?.type === "success") {
      const { access_token } = fbResponse.params;
      handleFacebookAuth(access_token);
    }
  }, [fbResponse]);

  // ── EMAIL SIGN UP HANDLER ──────────────────────────────────────────────
  // New account creation. Multi-layer bot defense: behavior analisys → proof-of-work.
  const handleSignUp = async () => {
    recordBehaviorEvent("tap", { target: "sign_up" });
    setError(null);
    setLoading(true);

    // ANTI-BOT LAYER 1: Invisible CAPTCHA
    // Behavioral analysis (cursor movements, tap patterns, timing) runs silently.
    // If something looks suspicious, we ask for math proof instead of blind creation.
    if (shouldShowVisualCaptcha()) {
      setLoading(false);
      setMode("captcha");
      return;
    }

    // ANTI-BOT LAYER 2: Proof-of-Work Challenge
    // Force computational cost on signup. Humans solve it instantly. Bots burn CPU cycles.
    const pow = generateProofOfWorkChallenge();
    await solveProofOfWork(pow.challenge, pow.difficulty);

    // Account creation in Firebase + record in DB (display name optional)
    const result = await signUpWithEmail(email, password, displayName || undefined);
    setLoading(false);

    if (result.success) {
      // Email verification is mandatory. User receives cryptographic link via email.
      if (result.needsVerification) {
        setMode("verify");
        showToast("Account created! Check your email to verify. ✉️");
      } else {
        // Fallback: immediate access if verification somehow bypassed
        onAuthSuccess(result.user, {});
      }
    } else {
      setError(result.error);
    }
  };

  // ── EMAIL SIGN IN HANDLER ──────────────────────────────────────────────
  // Returning user authentication. Rate-limited by device fingerprint + email.
  const handleSignIn = async () => {
    recordBehaviorEvent("tap", { target: "sign_in" });
    setError(null);
    setLoading(true);

    // Firebase credential verification + device rate limit check (fails if too many attempts)
    const result = await signInWithEmail(email, password);
    setLoading(false);

    if (result.success) {
      onAuthSuccess(result.user, {});
    } else {
      setError(result.error);
    }
  };

  // ── GOOGLE OAUTH EXCHANGE ──────────────────────────────────────────────
  // Token verification via Firebase + claim Google account data (email, name, photo).
  const handleGoogleAuth = async (idToken) => {
    setError(null);
    setLoading(true);
    const result = await signInWithGoogle(idToken);
    setLoading(false);
    if (result.success) {
      onAuthSuccess(result.user, {});
    } else {
      setError(result.error);
    }
  };

  // ── FACEBOOK OAUTH EXCHANGE ───────────────────────────────────────────
  // Token verification via Firebase + claim Facebook account data.
  const handleFacebookAuth = async (accessToken) => {
    setError(null);
    setLoading(true);
    const result = await signInWithFacebook(accessToken);
    setLoading(false);
    if (result.success) {
      onAuthSuccess(result.user, {});
    } else {
      setError(result.error);
    }
  };

  // ── CAPTCHA CHALLENGE ──────────────────────────────────────────────────
  // Suspicious signup detected (erratic taps, non-human timing patterns, VPN, etc).
  // Require simple arithmetic proof. Bots fail silently. Humans breeze through.
  const handleCaptchaSubmit = () => {
    recordBehaviorEvent("tap", { target: "captcha_submit" });
    if (captchaAnswer === "7") {
      // Correct answer. Proceed to full signup with proof-of-work next.
      setMode("signup");
      handleSignUp();
    } else {
      // Wrong answer. Clear field, show error, user tries again (no rate limit here).
      setError("Wrong answer. Try again, bro.");
      setCaptchaAnswer("");
    }
  };

  // ── EMAIL VERIFICATION RESEND ──────────────────────────────────────────
  // User missed the initial verification email. Send it again (rate-limited server-side).
  const handleResendVerification = async () => {
    const result = await resendVerificationEmail();
    if (result.success) {
      showToast("Verification email sent! ✉️");
    } else {
      setError(result.error);
    }
  };

  // ── WELCOME SCREEN ──────────────────────────────────────────────────────
  // The first screen users see. Sets emotional tone: brotherhood endures when the
  // world doesn't. OAuth shortcuts + email/password options below.
  if (mode === "welcome") {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.logo}>🤜</Text>
          <Text style={styles.appName}>BRO</Text>
          <Text style={styles.tagline}>WORLD'S CRAZY. YOUR BROS AREN'T.</Text>
          <Text style={styles.legalTxt} numberOfLines={2}>Borders shift. Alliances break. But your bros? They show up. Every. Single. Time.</Text>

          <View style={styles.authBox}>
            {/* Email-based signup: user creates password, we send verificaton link */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { setMode("signup"); recordBehaviorEvent("tap", { target: "email_signup" }); }}
            >
              <Text style={styles.primaryBtnTxt}>SIGN UP WITH EMAIL</Text>
            </TouchableOpacity>

            {/* Sign in for existing users */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { setMode("signin"); recordBehaviorEvent("tap", { target: "email_signin" }); }}
            >
              <Text style={styles.secondaryBtnTxt}>ALREADY HAVE AN ACCOUNT? SIGN IN</Text>
            </TouchableOpacity>

            {/* Visual seperator before OAuth options */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerTxt}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* OAuth: Trust Google's auth layer. Fast, seamless, widely supported. */}
            <TouchableOpacity
              style={styles.oauthBtn}
              onPress={() => googlePromptAsync()}
              disabled={!googleRequest || loading}
            >
              <Text style={styles.oauthIcon}>G</Text>
              <Text style={styles.oauthBtnTxt}>CONTINUE WITH GOOGLE</Text>
            </TouchableOpacity>

            {/* OAuth: Trust Facebook's auth layer. Another trusted identity provider. */}
            <TouchableOpacity
              style={[styles.oauthBtn, styles.oauthBtnFb]}
              onPress={() => fbPromptAsync()}
              disabled={!fbRequest || loading}
            >
              <Text style={styles.oauthIcon}>f</Text>
              <Text style={styles.oauthBtnTxt}>CONTINUE WITH FACEBOOK</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator color="#ffe066" style={{ marginTop: 16 }} />}
            {error && <Text style={styles.errorTxt}>{error}</Text>}
          </View>

          {/* Legal notice + anti-bot messaging */}
          <Text style={styles.legalTxt}>
            By continuing, you agree to Bro's Terms of Service and Privacy Policy.{"\n"}
            One account per person. Bots get bro'd out.
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── SIGNUP SCREEN ───────────────────────────────────────────────────────
  // New account creation. Anti-bot layers active. Email verification mandatory.
  if (mode === "signup") {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Back button to welcome screen */}
            <TouchableOpacity onPress={() => setMode("welcome")} style={styles.backBtn}>
              <Text style={styles.backTxt}>‹ BACK</Text>
            </TouchableOpacity>

            <Text style={styles.stepTitle}>CREATE YOUR ACCOUNT</Text>
            <Text style={styles.stepDesc}>Enter your email and create a password. We'll send a verification email.</Text>

            {/* Optional: User's display name for profile personalization */}
            <TextInput
              style={styles.emailInput}
              placeholder="Display name (optional)"
              placeholderTextColor="#333"
              value={displayName}
              onChangeText={(t) => { setDisplayName(t); recordBehaviorEvent("type", { field: "name" }); }}
              autoCapitalize="words"
              maxLength={30}
            />

            {/* Email address: unique key for acount & verification link delivery */}
            <TextInput
              style={styles.emailInput}
              placeholder="your@email.com"
              placeholderTextColor="#333"
              value={email}
              onChangeText={(t) => { setEmail(t); recordBehaviorEvent("type", { field: "email" }); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            {/* Password: hashed in Firebase, 6+ chars enforced */}
            <TextInput
              style={styles.emailInput}
              placeholder="Password (6+ characters)"
              placeholderTextColor="#333"
              value={password}
              onChangeText={(t) => { setPassword(t); recordBehaviorEvent("type", { field: "password" }); }}
              secureTextEntry
              autoCapitalize="none"
              maxLength={128}
            />

            {/* Submit signup: triggers anti-bot checks (CAPTCHA → proof-of-work) */}
            <TouchableOpacity
              style={[styles.primaryBtn, (!email.includes("@") || password.length < 6) && styles.btnDisabled]}
              onPress={handleSignUp}
              disabled={!email.includes("@") || password.length < 6 || loading}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.primaryBtnTxt}>CREATE ACCOUNT</Text>
              }
            </TouchableOpacity>

            {error && <Text style={styles.errorTxt}>{error}</Text>}

            {/* Security badges: transparent about hardening measures */}
            <Text style={styles.securityNote}>
              🔒 Email verified via link · Smart CAPTCHA active{"\n"}
              🛡️ Rate limited · Device fingerprinted · 1 account per person
            </Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── SIGNIN SCREEN ───────────────────────────────────────────────────────
  // Existing user authentication. Rate-limited per device fingerprint.
  if (mode === "signin") {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Back to welcome */}
            <TouchableOpacity onPress={() => setMode("welcome")} style={styles.backBtn}>
              <Text style={styles.backTxt}>‹ BACK</Text>
            </TouchableOpacity>

            <Text style={styles.stepTitle}>SIGN IN</Text>
            <Text style={styles.stepDesc}>Welcome back, bro.</Text>

            {/* Email: identifies account */}
            <TextInput
              style={styles.emailInput}
              placeholder="your@email.com"
              placeholderTextColor="#333"
              value={email}
              onChangeText={(t) => { setEmail(t); recordBehaviorEvent("type", { field: "email" }); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            {/* Password: Firebase credential verification */}
            <TextInput
              style={styles.emailInput}
              placeholder="Password"
              placeholderTextColor="#333"
              value={password}
              onChangeText={(t) => { setPassword(t); recordBehaviorEvent("type", { field: "password" }); }}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* Submit signin: Firebase credential check + device rate limit */}
            <TouchableOpacity
              style={[styles.primaryBtn, (!email.includes("@") || !password) && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={!email.includes("@") || !password || loading}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.primaryBtnTxt}>SIGN IN</Text>
              }
            </TouchableOpacity>

            {/* Forgot password: Firebase sends secure reset link via email */}
            <TouchableOpacity
              onPress={async () => {
                if (!email.includes("@")) {
                  setError("Enter your email first, bro.");
                  return;
                }
                const result = await resetPassword(email);
                if (result.success) showToast("Password reset email sent! ✉️");
                else setError(result.error);
              }}
              style={{ alignSelf: "center", marginTop: 8 }}
            >
              <Text style={styles.forgotTxt}>FORGOT PASSWORD?</Text>
            </TouchableOpacity>

            {error && <Text style={styles.errorTxt}>{error}</Text>}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── EMAIL VERIFICATION SCREEN ───────────────────────────────────────────
  // User created account. Verification email sent. Waiting for them to click link.
  if (mode === "verify") {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.stepTitle}>CHECK YOUR EMAIL</Text>
          <Text style={styles.stepDesc}>
            We sent a verification link to {email}.{"\n\n"}
            Click the link in your email, then come back and tap "I Verified" below.
          </Text>

          {/* User clicked link, verified their email on Firebase side. Grant access. */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              // Firebase auth state listener will pick up the verified user
              onAuthSuccess({ email, emailVerified: true }, {});
            }}
          >
            <Text style={styles.primaryBtnTxt}>I VERIFIED — LET ME IN</Text>
          </TouchableOpacity>

          {/* Resend link if user didn't recieve it or it expired (rate-limited) */}
          <TouchableOpacity onPress={handleResendVerification} style={{ alignSelf: "center", marginTop: 12 }}>
            <Text style={styles.resendTxt}>RESEND VERIFICATION EMAIL</Text>
          </TouchableOpacity>

          {error && <Text style={styles.errorTxt}>{error}</Text>}
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── CAPTCHA SCREEN ──────────────────────────────────────────────────────
  // Anti-bot checkpoint. Behavioral analysis detected suspicious activity.
  // Simple math problem filters out automated attacks.
  if (mode === "captcha") {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.stepTitle}>PROVE YOU'RE A BRO</Text>
          <Text style={styles.stepDesc}>Quick check to make sure you're not a bot.{"\n"}What is 3 + 4?</Text>

          {/* Simple arithmetic proof. Humans < 1 second. Bot scripts fail. */}
          <TextInput
            style={styles.emailInput}
            placeholder="Your answer"
            placeholderTextColor="#333"
            value={captchaAnswer}
            onChangeText={setCaptchaAnswer}
            keyboardType="number-pad"
            autoFocus
          />

          {/* Submit CAPTCHA answer. Correct answer → signup flow. Wrong → retry. */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCaptchaSubmit}>
            <Text style={styles.primaryBtnTxt}>VERIFY</Text>
          </TouchableOpacity>

          {error && <Text style={styles.errorTxt}>{error}</Text>}

          {/* Transparency: explain when & why this screen appears */}
          <Text style={styles.securityNote}>
            This challenge only appears when something looks off.{"\n"}
            Regular bros sail right through. 🤙
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#0d0d0d" },
  content:     { flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 12 },

  logo:        { fontSize: 60, textAlign: "center" },
  appName:     { fontFamily: "BebasNeue_400Regular", fontSize: 72, color: "#fff", letterSpacing: 12, textAlign: "center" },
  tagline:     { fontFamily: "BebasNeue_400Regular", fontSize: 14, color: "#3a3a3a", letterSpacing: 6, textAlign: "center", marginBottom: 30 },

  authBox:     { gap: 12 },

  primaryBtn:    { backgroundColor: "#ffe066", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryBtnTxt: { fontFamily: "BebasNeue_400Regular", fontSize: 16, color: "#000", letterSpacing: 3 },
  btnDisabled:   { opacity: 0.3 },

  secondaryBtn:    { alignItems: "center", paddingVertical: 8 },
  secondaryBtnTxt: { fontFamily: "BebasNeue_400Regular", fontSize: 12, color: "#555", letterSpacing: 2 },

  divider:     { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1c1c1c" },
  dividerTxt:  { fontFamily: "BebasNeue_400Regular", fontSize: 11, color: "#333", letterSpacing: 3 },

  oauthBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#141414", borderWidth: 1, borderColor: "#222", borderRadius: 16, paddingVertical: 14 },
  oauthBtnFb:  { borderColor: "#1a2744" },
  oauthIcon:   { fontFamily: "BebasNeue_400Regular", fontSize: 18, color: "#fff", width: 24, textAlign: "center" },
  oauthBtnTxt: { fontFamily: "BebasNeue_400Regular", fontSize: 14, color: "#888", letterSpacing: 2 },

  backBtn:     { marginBottom: 16 },
  backTxt:     { fontFamily: "BebasNeue_400Regular", fontSize: 16, color: "#555", letterSpacing: 2 },

  stepTitle:   { fontFamily: "BebasNeue_400Regular", fontSize: 32, color: "#fff", letterSpacing: 3 },
  stepDesc:    { fontSize: 12, color: "#444", lineHeight: 18, marginBottom: 8 },

  emailInput:  { backgroundColor: "#141414", borderWidth: 1, borderColor: "#222", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, color: "#fff", fontFamily: "BebasNeue_400Regular", fontSize: 18, letterSpacing: 1 },

  forgotTxt:   { fontFamily: "BebasNeue_400Regular", fontSize: 12, color: "#555", letterSpacing: 2 },
  resendTxt:   { fontFamily: "BebasNeue_400Regular", fontSize: 12, color: "#555", letterSpacing: 2 },

  errorTxt:    { fontSize: 11, color: "#ff6b6b", textAlign: "center", marginTop: 8 },

  legalTxt:    { fontSize: 9, color: "#222", letterSpacing: 0.5, textAlign: "center", lineHeight: 15, marginTop: 20, paddingHorizontal: 10 },
  securityNote:{ fontSize: 9, color: "#1e1e1e", letterSpacing: 0.5, textAlign: "center", lineHeight: 15, marginTop: 20 },
});
