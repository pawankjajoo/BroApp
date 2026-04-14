/**
 * App.js
 * Root app component. Manages auth, navigation, state, notifications, and IAP.
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

// TAB NAVIGATION SYSTEM
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

  // Bro Bucks wallet state
  const [broBucks, setBroBucks]         = useState(25_000);
  const [storeProducts, setStoreProducts] = useState([]);
  const [purchasing, setPurchasing]     = useState(false);

  // Publisher revenue tracking
  const [publisherRevenueBB, setPublisherRevenueBB] = useState(0);

  // User profile state
  const [userProfile, setUserProfile] = useState({
    displayName: "Big Bro",
    handle: "@bigbro",
    avatarUri: null,
    affiliation: null,
    interestingThing: "",
  });

  // Animation references
  const toastAnim  = useRef(new Animated.Value(0)).current;
  const notifAnim  = useRef(new Animated.Value(-80)).current;

  // APP BOOTSTRAP: Font loading & splash screen
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreenExpo.hideAsync();
      setAppReady(true);
    }
  }, [fontsLoaded]);

  // FIREBASE AUTH GATE: Listen for auth state changes
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

        // Register push notifications
        registerForPushNotifications(user.uid).catch(() => {});

        // Load BroCoin state from Firestore
        initBroCoinState().catch(() => {});

        // Clear badge counts
        clearBadge().catch(() => {});
      } else {
        // Logged out. Clear state.
        setAuthUser(null);
        setIsAuthed(false);
      }
    });

    return () => unsubAuth();
  }, [appReady]);

  // NOTIFICATION ROUTING: Route tapped notifications to correct screen
  useEffect(() => {
    if (!appReady) return;
    const unsub = onNotificationTapped((data) => {
      if (data?.type === "brocoin_mint") setTab("brocoin");
      if (data?.type === "bronation") setTab("wallet");
      if (data?.type === "bro_request") setTab("brofile");
    });
    return unsub;
  }, [appReady]);

  // REAL-TIME MINT LISTENER: Alert on BroCoin mints
  useEffect(() => {
    if (!appReady) return;
    const unsub = onMint((record) => {
      const myUid = authUser?.uid || "demo_0";
      if (record.recipientId === myUid) {
        showNotif(`🪙 YOU WON A BROCOIN! Check your wallet.`);
        showToast("🪙 BroCoin dropped into your wallet!");
      } else {
        showNotif(`🪙 BroCoin #${record.milestone} minted! A verified bro was rewarded.`);
      }
    });
    return unsub;
  }, [appReady, authUser]);

  // IAP (IN-APP PURCHASE) INITIALIZATION
  useEffect(() => {
    if (!appReady) return;

    IAPService.init({
      onPurchaseSuccess: (pack) => {
        setPurchasing(false);
        setBroBucks((prev) => prev + pack.bucks);
        recordTransaction(pack.bucks, "purchase");
        showToast(`+${pack.displayBB} added to your wallet! ${pack.badge}`);
        showNotif(`Bro Bucks purchased: ${pack.displayBB} 💰`);
      },
      onPurchaseError: (err) => {
        setPurchasing(false);
        showToast("Purchase failed. Try again, bro 😤");
        console.warn("[IAP] error:", err);
      },
    }).then(async () => {
      const products = await IAPService.getStoreProducts();
      setStoreProducts(products);
    });

    return () => IAPService.destroy();
  }, [appReady]);

  // DEMO HEARTBEAT: Simulated incoming notifications every 7 seconds
  useEffect(() => {
    if (!appReady || showSplash) return;
    const interval = setInterval(() => {
      const b    = INITIAL_BROS[Math.floor(Math.random() * INITIAL_BROS.length)];
      const expr = randomExpr();
      const types = [expr.label, "bro-casted", `bro-nation'd you 10K BB 💰`];
      showNotif(`${b.name}: ${types[Math.floor(Math.random() * types.length)]}`);
      setBros((prev) => prev.map((x) =>
        x.id === b.id ? { ...x, unread: x.unread + 1, lastBro: "Just now" } : x
      ));
    }, 7000);
    return () => clearInterval(interval);
  }, [appReady, showSplash]);

  // TOAST & IN-APP NOTIFICATION ANIMATION HELPERS
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue:1, duration:250, useNativeDriver:true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue:0, duration:300, useNativeDriver:true }),
    ]).start(() => setToastMsg(null));
  }, [toastAnim]);

  const showNotif = useCallback((msg) => {
    setNotifMsg(msg);
    Animated.sequence([
      Animated.spring(notifAnim, { toValue:0, friction:8, tension:80, useNativeDriver:true }),
      Animated.delay(3200),
      Animated.timing(notifAnim, { toValue:-80, duration:300, useNativeDriver:true }),
    ]).start(() => setNotifMsg(null));
  }, [notifAnim]);

  // IAP PURCHASE HANDLER
  const handlePurchasePack = useCallback((productId) => {
    setPurchasing(productId);
    IAPService.purchase(productId);
  }, []);

  // CHAT FLOW ORCHESTRATION
  const openChat = (bro) => {
    setActiveBro(bro);
    setBros((prev) => prev.map((b) => b.id === bro.id ? { ...b, unread:0 } : b));
    setInChat(true);
  };

  const handleSendBro = (expr, from = "me") => {
    if (!activeBro) return;
    const id = Date.now() + Math.random();
    setMessages((prev) => ({
      ...prev,
      [activeBro.id]: [...(prev[activeBro.id] || []),
        { id, from, type:"bro", expr, time:"Just now" }
      ],
    }));
    if (from === "me") setBroCount((c) => c + 1);
  };

  const handleSendNation = (bro, bucksAmount) => {
    if (broBucks < bucksAmount) {
      showToast("Not enough Bro Bucks, bro! Top up in the wallet 💰");
      return false;
    }
    const id          = Date.now() + Math.random();
    const fee         = calcPlatformFee(bucksAmount);
    const recipientBB = calcRecipientAmount(bucksAmount);

    setBroBucks((prev) => prev - bucksAmount);
    setPublisherRevenueBB((prev) => prev + fee);
    recordTransaction(bucksAmount, "bronation", fee);
    setMessages((prev) => ({
      ...prev,
      [bro.id]: [...(prev[bro.id] || []),
        { id, from:"me", type:"nation", bucks:bucksAmount, recipientBucks:recipientBB, fee, time:"Just now" }
      ],
    }));
    setBros((prev) => prev.map((b) =>
      b.id === bro.id ? { ...b, broNationsBB: b.broNationsBB + recipientBB } : b
    ));
    return true;
  };

  const handleBrocast = (expr) => {
    setBroCount((c) => c + bros.length);
    showToast(`"${expr.label}" bro-cast sent to all your bros! 📡`);
  };

  // PRIMARY RENDER DECISION TREE

  if (!appReady) return null;

  // AUTH GATE
  if (!isAuthed) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
        <AuthScreen
          onAuthSuccess={(user, session) => {
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

  if (showSplash) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <SplashScreen onDone={() => setShowSplash(false)} />
      </>
    );
  }

  // DYNAMIC RENDER TREE
  const renderScreen = () => {
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

  // MAIN APP LAYOUT
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
      <View style={{ flex:1 }}>{renderScreen()}</View>

      {/* TAB BAR NAVIGATION */}
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

      {/* BRO BUCKS BALANCE PILL */}
      {!inChat && broBucks > 0 && (
        <TouchableOpacity
          style={styles.bbPill}
          onPress={() => setTab("wallet")}
          activeOpacity={0.8}
        >
          <Text style={styles.bbPillTxt}>💰 {formatBB(broBucks)}</Text>
        </TouchableOpacity>
      )}

      {/* IN-APP NOTIFICATION OVERLAY */}
      {notifMsg && (
        <Animated.View style={[styles.notif, { transform:[{ translateY:notifAnim }] }]}>
          <Text style={{ fontSize:22 }}>💪</Text>
          <View style={{ flex:1 }}>
            <Text style={styles.notifApp}>BRO · NOW</Text>
            <Text style={styles.notifMsg} numberOfLines={1}>{notifMsg}</Text>
          </View>
        </Animated.View>
      )}

      {/* TOAST NOTIFICATION */}
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
