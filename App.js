/**
 * App.js
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE COMMAND CENTER.
 *
 * App.js is the central orchestrator for the entire Bro experiance. It owns:
 * • Font loading and app readiness
 * • Firebase authentication gate
 * • Global state: auth, bros, messages, wallet, profile
 * • Notification & toast lifecycle
 * • IAP (in-app purchases) integration
 * • The heartbeat: simulated incoming bro notifications
 * • Navigation & tab system
 * • Real-time mint listeners & bronation flows
 *
 * Everything flows through here. This is where the magic happens.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, StatusBar, Platform,
} from "react-native";
import { useFonts, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import * as SplashScreenExpo from "expo-splash-screen";

// Screens: the render tree branches
import SplashScreen    from "./screens/SplashScreen";
import AuthScreen      from "./screens/AuthScreen";
import HomeScreen      from "./screens/HomeScreen";
import ChatScreen      from "./screens/ChatScreen";
import BrocastScreen   from "./screens/BrocastScreen";
import BroximityScreen from "./screens/BroximityScreen";
import CommunityScreen from "./screens/CommunityScreen";
import WalletScreen    from "./screens/WalletScreen";
import BroCoinScreen   from "./screens/BroCoinScreen";
import ProfileScreen   from "./screens/ProfileScreen";

import {
  INITIAL_BROS, randomExpr, formatBB,
  calcPlatformFee, calcRecipientAmount, PLATFORM_FEE_RATE,
  PROFILE_MAX_INTERESTING_LENGTH,
} from "./constants/bro";
import * as IAPService from "./services/iap";
import {
  recordTransaction, onMint, getMyBroCoins, initBroCoinState,
} from "./services/broCoin";
import {
  onAuthStateChange, signOut, getCurrentUser,
} from "./services/auth";
import {
  registerForPushNotifications, onNotificationTapped, clearBadge,
} from "./services/notifications";

SplashScreenExpo.preventAutoHideAsync();

// ─────────────────────────────────────────────────────────────────────────────
// TAB NAVIGATION SYSTEM
// Build your bro empire across 6 dimensions. Every tab is your launchpad.
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key:"home",      icon:"🤜", label:"Bros"       },
  { key:"brocast",   icon:"📡", label:"Bro-cast"   },
  { key:"broximity", icon:"📍", label:"Bro-ximity" },
  { key:"community", icon:"👥", label:"Bro-mmunity" },
  { key:"wallet",    icon:"💰", label:"Bro Bucks"  },
  { key:"brofile",   icon:"🪪", label:"Bro-file"   },
];

export default function App() {
  const [fontsLoaded] = useFonts({ BebasNeue_400Regular });

  const [appReady, setAppReady]       = useState(false);
  const [showSplash, setShowSplash]   = useState(true);
  const [isAuthed, setIsAuthed]       = useState(false);
  const [authUser, setAuthUser]       = useState(null);
  const [tab, setTab]                 = useState("home");
  const [inChat, setInChat]           = useState(false);
  const [activeBro, setActiveBro]     = useState(null);
  const [bros, setBros]               = useState(INITIAL_BROS);
  const [messages, setMessages]       = useState({});
  const [broCount, setBroCount]       = useState(1247);
  const [toastMsg, setToastMsg]       = useState(null);
  const [notifMsg, setNotifMsg]       = useState(null);

  // ─────────────────────────────────────────────────────────────────────
  // Bro Bucks wallet state. Your currency. Your power.
  // ─────────────────────────────────────────────────────────────────────
  const [broBucks, setBroBucks]         = useState(25_000);
  const [storeProducts, setStoreProducts] = useState([]);
  const [purchasing, setPurchasing]     = useState(false);

  // ─────────────────────────────────────────────────────────────────────
  // Publisher revenue tracking. Watch the momentum grow.
  // ─────────────────────────────────────────────────────────────────────
  const [publisherRevenueBB, setPublisherRevenueBB] = useState(0);

  // ─────────────────────────────────────────────────────────────────────
  // User profile. Your identity on the Bro network. Make it count.
  // ─────────────────────────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState({
    displayName: "Big Bro",
    handle: "@bigbro",
    avatarUri: null,
    affiliation: null,
    interestingThing: "",
  });

  // Animation references. Smooth, responsive, premium.
  const toastAnim  = useRef(new Animated.Value(0)).current;
  const notifAnim  = useRef(new Animated.Value(-80)).current;

  // ─────────────────────────────────────────────────────────────────────
  // APP BOOTSTRAP: Font loading & splash screen
  // When fonts arrive, hide splash. App is ready. Go.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreenExpo.hideAsync();
      setAppReady(true);
    }
  }, [fontsLoaded]);

  // ─────────────────────────────────────────────────────────────────────
  // FIREBASE AUTH GATE
  // Listen for login. On success: populate profile, register notifications,
  // prime the wallet, clear badges. This is where the user enters the arena.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!appReady) return;

    const unsubAuth = onAuthStateChange(async (user) => {
      if (user) {
        // User authenticated. Bring their profile into state.
        setAuthUser(user);
        setIsAuthed(true);
        if (user.displayName) {
          setUserProfile((p) => ({ ...p, displayName: user.displayName }));
        }
        if (user.email) {
          setUserProfile((p) => ({ ...p, handle: `@${user.email.split("@")[0]}` }));
        }
        if (user.photoUrl) {
          setUserProfile((p) => ({ ...p, avatarUri: user.photoUrl }));
        }

        // Arm push notifications. Stay connected. Never miss a bro.
        registerForPushNotifications(user.uid).catch(() => {});

        // Load BroCoin state from Firestore. Your cryptographic earnings await.
        initBroCoinState().catch(() => {});

        // Clear any lingering badge counts. Fresh start, bro.
        clearBadge().catch(() => {});
      } else {
        // Logged out. Clear eveything.
        setAuthUser(null);
        setIsAuthed(false);
      }
    });

    return () => unsubAuth();
  }, [appReady]);

  // ─────────────────────────────────────────────────────────────────────
  // NOTIFICATION ROUTING
  // User taps a notfication banner. Route to the right screen. Immediate.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!appReady) return;
    const unsub = onNotificationTapped((data) => {
      if (data?.type === "brocoin_mint") setTab("brocoin");
      if (data?.type === "bronation") setTab("wallet");
      if (data?.type === "bro_request") setTab("brofile");
    });
    return unsub;
  }, [appReady]);

  // ─────────────────────────────────────────────────────────────────────
  // REAL-TIME MINT LISTENER
  // BroCoin minted somewhere in the network? You get alerted instantly.
  // Your rewards appear in real time. Celebrate every milestone.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!appReady) return;
    const unsub = onMint((record) => {
      const myUid = authUser?.uid || "demo_0";
      if (record.recipientId === myUid) {
        // You won! Drop the banner. Flash teh alert.
        showNotif(`🪙 YOU WON A BROCOIN! Check your wallet.`);
        showToast("🪙 BroCoin dropped into your wallet!");
      } else {
        // Network milestone. Another verified bro leveled up.
        showNotif(`🪙 BroCoin #${record.milestone} minted! A verified bro was rewarded.`);
      }
    });
    return unsub;
  }, [appReady, authUser]);

  // ─────────────────────────────────────────────────────────────────────
  // IAP (IN-APP PURCHASE) INITIALIZATION
  // Monetize. Setup purchase callbacks, load product catalog. Anything is
  // possible when you own your economy.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!appReady) return;

    IAPService.init({
      onPurchaseSuccess: (pack) => {
        // Payment processed. Bro Bucks land in wallet. Transaction recorded.
        setPurchasing(false);
        setBroBucks((prev) => prev + pack.bucks);
        recordTransaction(pack.bucks, "purchase");
        showToast(`+${pack.displayBB} added to your wallet! ${pack.badge}`);
        showNotif(`Bro Bucks purchased: ${pack.displayBB} 💰`);
      },
      onPurchaseError: (err) => {
        // Transaction failed. Reassure the user. Try again.
        setPurchasing(false);
        showToast("Purchase failed. Try again, bro 😤");
        console.warn("[IAP] error:", err);
      },
    }).then(async () => {
      // Load store inventory. Display what's for sale.
      const products = await IAPService.getStoreProducts();
      setStoreProducts(products);
    });

    return () => IAPService.destroy();
  }, [appReady]);

  // ─────────────────────────────────────────────────────────────────────
  // DEMO HEARTBEAT: Simulated incoming bro notifications
  // The network pulses. Every 7 seconds, a bro reaches out. A bro-cast
  // lands. A bronation arrives. This is teh lifeblood of the demo.
  // Realistic activity. Engagement. For the driven.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!appReady || showSplash) return;
    const interval = setInterval(() => {
      // Pick a random bro from your network.
      const b    = INITIAL_BROS[Math.floor(Math.random() * INITIAL_BROS.length)];
      const expr = randomExpr();
      // Variety: they're sending bro expressions, bro-casting, or donating.
      const types = [expr.label, "bro-casted", `bro-nation'd you 10K BB 💰`];
      // Notify. Update their unread count. Mark as "Just now".
      showNotif(`${b.name}: ${types[Math.floor(Math.random() * types.length)]}`);
      setBros((prev) => prev.map((x) =>
        x.id === b.id ? { ...x, unread: x.unread + 1, lastBro: "Just now" } : x
      ));
    }, 7000);
    return () => clearInterval(interval);
  }, [appReady, showSplash]);

  // ─────────────────────────────────────────────────────────────────────
  // TOAST & IN-APP NOTIFICATION ANIMATION HELPERS
  // Toast: bottom popup, fade in/out. Ephemeral feedback. Simple, elegant.
  // Notification: top banner, spring arrival, graceful exit. Premium feel.
  // ─────────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    // Fade in (250ms), hold (2.2s), fade out (300ms). Clean lifecycle.
    Animated.sequence([
      Animated.timing(toastAnim, { toValue:1, duration:250, useNativeDriver:true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue:0, duration:300, useNativeDriver:true }),
    ]).start(() => setToastMsg(null));
  }, [toastAnim]);

  const showNotif = useCallback((msg) => {
    setNotifMsg(msg);
    // Spring down from above (premium bounce), hold (3.2s), slide up. Energize.
    Animated.sequence([
      Animated.spring(notifAnim, { toValue:0, friction:8, tension:80, useNativeDriver:true }),
      Animated.delay(3200),
      Animated.timing(notifAnim, { toValue:-80, duration:300, useNativeDriver:true }),
    ]).start(() => setNotifMsg(null));
  }, [notifAnim]);

  // ─────────────────────────────────────────────────────────────────────
  // IAP PURCHASE HANDLER
  // User taps a product. Initiate purchase. Flag as loading.
  // ─────────────────────────────────────────────────────────────────────
  const handlePurchasePack = useCallback((productId) => {
    setPurchasing(productId);
    IAPService.purchase(productId);
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // CHAT FLOW ORCHESTRATION
  // Browse, design, energize. Open a chat window. Clear unread. Enter.
  // ─────────────────────────────────────────────────────────────────────
  const openChat = (bro) => {
    // Activate this bro. Zero their unread. Show the chat screen.
    setActiveBro(bro);
    setBros((prev) => prev.map((b) => b.id === bro.id ? { ...b, unread:0 } : b));
    setInChat(true);
  };

  // Send a bro expression. Your sentiment travels instantly.
  const handleSendBro = (expr, from = "me") => {
    if (!activeBro) return;
    const id = Date.now() + Math.random();
    // Append to the message thread for this bro. Timestamp: Just now.
    setMessages((prev) => ({
      ...prev,
      [activeBro.id]: [...(prev[activeBro.id] || []),
        { id, from, type:"bro", expr, time:"Just now" }
      ],
    }));
    // If you sent it, increment your bro count. Recognition unlocked.
    if (from === "me") setBroCount((c) => c + 1);
  };

  // Send a bronation. Real money moves. Real impact.
  const handleSendNation = (bro, bucksAmount) => {
    // Validate wallet. Prevent overdraft.
    if (broBucks < bucksAmount) {
      showToast("Not enough Bro Bucks, bro! Top up in the wallet 💰");
      return false;
    }
    const id          = Date.now() + Math.random();
    // Calculate fees. Split the transaction. Transparant.
    const fee         = calcPlatformFee(bucksAmount);
    const recipientBB = calcRecipientAmount(bucksAmount);

    // Debit your account. Credit the platform. Record it all.
    setBroBucks((prev) => prev - bucksAmount);
    setPublisherRevenueBB((prev) => prev + fee);
    recordTransaction(bucksAmount, "bronation", fee);
    // Append the transaction message to the thread.
    setMessages((prev) => ({
      ...prev,
      [bro.id]: [...(prev[bro.id] || []),
        { id, from:"me", type:"nation", bucks:bucksAmount, recipientBucks:recipientBB, fee, time:"Just now" }
      ],
    }));
    // Update the bro's total receipts.
    setBros((prev) => prev.map((b) =>
      b.id === bro.id ? { ...b, broNationsBB: b.broNationsBB + recipientBB } : b
    ));
    return true;
  };

  // Send a bro-cast. Broadcast your expression to your entire network.
  const handleBrocast = (expr) => {
    // Multiply your bro count by network size. Reach amplified.
    setBroCount((c) => c + bros.length);
    showToast(`"${expr.label}" bro-cast sent to all your bros! 📡`);
  };

  // ─────────────────────────────────────────────────────────────────────
  // PRIMARY RENDER DECISION TREE
  // Bootstrap → Auth gate → Splash → App. For the driven.
  // ─────────────────────────────────────────────────────────────────────

  // Wait for fonts and app state.
  if (!appReady) return null;

  // ─────────────────────────────────────────────────────────────────────
  // AUTH GATE: No entry without authentication
  // If logged out, show login screen. Anything is possible after you sign in.
  // ─────────────────────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
        <AuthScreen
          onAuthSuccess={(user, session) => {
            // User crossed the gate. Populate state. Unlock the app.
            setAuthUser(user);
            setIsAuthed(true);
            if (user.displayName) setUserProfile((p) => ({ ...p, displayName: user.displayName }));
            if (user.email)       setUserProfile((p) => ({ ...p, handle: `@${user.email.split("@")[0]}` }));
            if (user.photoUrl)    setUserProfile((p) => ({ ...p, avatarUri: user.photoUrl }));
          }}
          showToast={showToast}
        />
      </>
    );
  }

  // Show the splash screen once. Build momentum. Then transition to app.
  if (showSplash) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <SplashScreen onDone={() => setShowSplash(false)} />
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // DYNAMIC RENDER TREE
  // Select active screen based on navigation state. Each screen receives
  // everything it needs: data, callbacks, toast & notif helpers.
  // ─────────────────────────────────────────────────────────────────────
  const renderScreen = () => {
    // Chat mode active. Show the conversation thread instead of tabs.
    if (inChat && activeBro) {
      return (
        <ChatScreen
          bro={activeBro}
          messages={messages[activeBro.id] || []}
          broBucks={broBucks}
          onSendBro={handleSendBro}
          onSendNation={handleSendNation}
          onBack={() => { setInChat(false); setTab("home"); }}
          onGoWallet={() => { setInChat(false); setTab("wallet"); }}
          showToast={showToast}
        />
      );
    }
    // Tab navigation. Choose your destination.
    switch (tab) {
      case "home":      return <HomeScreen bros={bros} onOpenChat={openChat} />;
      case "brocast":   return <BrocastScreen broCount={broCount} onBrocast={handleBrocast} />;
      case "broximity": return <BroximityScreen showToast={showToast} />;
      case "community": return <CommunityScreen />;
      case "wallet":    return (
        <WalletScreen
          broBucks={broBucks}
          storeProducts={storeProducts}
          purchasing={purchasing}
          onPurchase={handlePurchasePack}
          showToast={showToast}
        />
      );
      case "brocoin":   return (
        <BroCoinScreen
          broBucks={broBucks}
          onTradeBB={(bbAmount) => setBroBucks((prev) => prev + bbAmount)}
          onBack={() => setTab("brofile")}
          showToast={showToast}
        />
      );
      case "brofile":   return (
        <ProfileScreen
          broCount={broCount}
          broBucks={broBucks}
          bros={bros}
          publisherRevenueBB={publisherRevenueBB}
          userProfile={userProfile}
          onUpdateProfile={(updates) => setUserProfile((p) => ({ ...p, ...updates }))}
          onNavigate={(t) => setTab(t)}
          onSignOut={async () => {
            // Sign out. Reset all state. Return to auth gate.
            await signOut();
            setIsAuthed(false);
            setAuthUser(null);
          }}
          showToast={showToast}
        />
      );
      default: return <HomeScreen bros={bros} onOpenChat={openChat} />;
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // MAIN APP LAYOUT
  // Screen content + tab bar + balance indicator + notification layer.
  // Everything orchestrated from one root view.
  // ─────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
      <View style={{ flex:1 }}>{renderScreen()}</View>

      {/* ══════════════════════════════════════════════════════════════════
          TAB BAR NAVIGATION
          Hidden in chat mode. Six tabs. Six pathways. Ready to explore.
          ══════════════════════════════════════════════════════════════════ */}
      {!inChat && (
        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => { setTab(t.key); setInChat(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, tab===t.key && styles.tabIconActive]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, tab===t.key && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BRO BUCKS BALANCE PILL
          Always visible (unless in chat). Quick access. Tap to top up.
          Your economy at a glance.
          ══════════════════════════════════════════════════════════════════ */}
      {!inChat && broBucks > 0 && (
        <TouchableOpacity
          style={styles.bbPill}
          onPress={() => setTab("wallet")}
          activeOpacity={0.8}
        >
          <Text style={styles.bbPillTxt}>💰 {formatBB(broBucks)}</Text>
        </TouchableOpacity>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          IN-APP NOTIFICATION OVERLAY
          Top banner. Springs down. Recieved live activity updates.
          BroCoin drops. Bronations land. Bro-casts arrive. Energize.
          ══════════════════════════════════════════════════════════════════ */}
      {notifMsg && (
        <Animated.View style={[styles.notif, { transform:[{ translateY:notifAnim }] }]}>
          <Text style={{ fontSize:22 }}>💪</Text>
          <View style={{ flex:1 }}>
            <Text style={styles.notifApp}>BRO · NOW</Text>
            <Text style={styles.notifMsg} numberOfLines={1}>{notifMsg}</Text>
          </View>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TOAST NOTIFICATION
          Bottom center. Ephemeral feedback. Confirmations, errors, wins.
          Fades in. Fades out. Clean & purposeful.
          ══════════════════════════════════════════════════════════════════ */}
      {toastMsg && (
        <Animated.View style={[styles.toast, { opacity:toastAnim }]}>
          <Text style={styles.toastTxt}>{toastMsg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex:1, backgroundColor:"#0d0d0d" },
  tabBar:         { height:74, backgroundColor:"#0a0a0a", borderTopWidth:1, borderTopColor:"#181818", flexDirection:"row", paddingTop:8 },
  tabItem:        { flex:1, alignItems:"center", gap:2, paddingVertical:5 },
  tabIcon:        { fontSize:19, opacity:0.35 },
  tabIconActive:  { opacity:1 },
  tabLabel:       { fontFamily:"BebasNeue_400Regular", fontSize:8, color:"#333", letterSpacing:0.5 },
  tabLabelActive: { color:"#fff" },
  bbPill: {
    position:"absolute",
    top: Platform.OS === "ios" ? 56 : 38,
    right: 14,
    backgroundColor:"#111",
    borderWidth:1, borderColor:"#2a2a2a",
    borderRadius:20,
    paddingHorizontal:10, paddingVertical:5,
    zIndex:200,
  },
  bbPillTxt: { fontFamily:"BebasNeue_400Regular", fontSize:12, color:"#ffe066", letterSpacing:1 },
  notif: {
    position:"absolute",
    top: Platform.OS === "ios" ? 52 : 36,
    left:12, right:12,
    backgroundColor:"rgba(16,16,16,0.97)",
    borderWidth:1, borderColor:"#252525", borderRadius:16,
    padding:12, flexDirection:"row", alignItems:"center", gap:10, zIndex:999,
  },
  notifApp:  { fontFamily:"BebasNeue_400Regular", fontSize:10, color:"#555", letterSpacing:2 },
  notifMsg:  { fontFamily:"BebasNeue_400Regular", fontSize:17, color:"#fff", letterSpacing:0.5 },
  toast: {
    position:"absolute", bottom:90,
    alignSelf:"center",
    backgroundColor:"rgba(255,255,255,0.08)",
    borderWidth:1, borderColor:"rgba(255,255,255,0.1)",
    borderRadius:24, paddingHorizontal:20, paddingVertical:10, zIndex:999,
  },
  toastTxt: { fontFamily:"BebasNeue_400Regular", fontSize:15, color:"#fff", letterSpacing:1 },
});
