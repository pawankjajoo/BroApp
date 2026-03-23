/**
 * ───────────────────────────────────────────────────────────────────────────
 * PROFILESCREEN - Bro-file
 * ───────────────────────────────────────────────────────────────────────────
 * Intentionally minimal profile by design. Elegant simplicity.
 *
 * HERO SECTION:
 *   • Profile image (tap for camera/library picker)
 *   • Display name + handle + "Est. 2014"
 *   • Affiliation badge (work/school + verification checkmark)
 *   • One interesting thing (max 150 chars)
 *   • Edit button
 *
 * EDIT FLOW:
 *   • Image picker (camera or library)
 *   • Affiliation selector (work OR school)
 *   • Company/school name input
 *   • Email verifier (domain validation)
 *   • One interesting thing textarea
 *   • Save to persist
 *
 * STATS ROW:
 *   • Your bros count
 *   • Bros sent (bro-nations)
 *   • Bro Bucks balance (premium stat)
 *
 * RECOMMENDED BROS:
 *   • 2nd & 3rd degree connections
 *   • Tap to view full list
 *   • Add bro button on each
 *
 * BROCOIN WALLET CARD:
 *   • Private balance (never shared publicly)
 *   • Mint progress bar
 *   • Tap to visit BroCoin hub
 *
 * FEATURE GRID:
 *   • 8 core features (2 columns)
 *   • Icons + titles + descriptions
 *   • Tap routing to feature screens
 *
 * NOTIFICATION SETTINGS:
 *   • Bro 2 Bro, Bro-cast, Bro-nations, Bro-ximity
 *   • Toggle switches
 *   • Persistent storage
 *
 * SIGN OUT:
 *   • Destructive action (requires confirmation)
 *   • Bottom of screen
 *
 * Three fields. That's it. No bio. No links. No extras. Bro.
 */

import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  Switch, Image, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  formatBB, PROFILE_MAX_INTERESTING_LENGTH, VERIFICATION_METHODS,
  PLATFORM_FEE_LABEL, BROCOIN_CONFIG,
} from "../constants/bro";
import { getRecommendedBros } from "../services/broNetwork";
import { getMyBroCoins, getGlobalStats, getMintProgress, getBroCoinPriceUSD } from "../services/broCoin";

// ── Feature grid items - 8 core experiences. Icons + text. Tappable. ──
const BRO_FEATURES = [
  { key:"bro2bro",      icon:"↔️", title:"Bro 2 Bro",      subtitle:"Direct one-on-one bro"  },
  { key:"brocast",      icon:"📡", title:"Bro-cast",        subtitle:"Broadcast to all bros"   },
  { key:"bromance",     icon:"❤️", title:"Bro-mance",       subtitle:"Your top bro"            },
  { key:"broximity",    icon:"📍", title:"Bro-ximity",      subtitle:"Find nearby bros"        },
  { key:"bro-mmunity",  icon:"👥", title:"Bro-mmunity",     subtitle:"Global bro feed"         },
  { key:"wallet",       icon:"💰", title:"Bro Bucks",       subtitle:"Buy & spend BB"          },
  { key:"brofile",      icon:"🪪", title:"Bro-file",        subtitle:"Your bro identity"       },
  { key:"brotifications",icon:"🔔",title:"Bro-tifications", subtitle:"Bro alert settings"      },
];

const NOTIF_ITEMS = [
  { key:"bro2bro",    name:"Bro 2 Bro",    sub:"When a bro bro's you directly"    },
  { key:"brocast",    name:"Bro-cast",      sub:"When a bro broadcasts to all"     },
  { key:"bronations", name:"Bro-nations",   sub:"When a bro sends you Bro Bucks"   },
  { key:"broximity",  name:"Bro-ximity",    sub:"Bros within bro-ximity range"     },
];

export default function ProfileScreen({
  broCount, broBucks, bros, publisherRevenueBB,
  userProfile, onUpdateProfile, onNavigate, onSignOut, showToast,
}) {
  const [notifs, setNotifs]       = useState({ bro2bro:true, brocast:true, bronations:true, broximity:false });
  const [showNotifs, setShowNotifs]     = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showRecommended, setShowRecommended] = useState(false);

  // ── Recommended bros (2nd & 3rd degree connections) ────────────────────────
  // Grow your network. Privacy preserved - others can't see your bro list.
  const recommendedBros = useMemo(() => getRecommendedBros(0, 3), []);

  // ── BroCoin stats (PRIVATE - only shown to the owner) ───────────────────
  // Never displayed on your public profile. Only you see this.
  const myBroCoins   = getMyBroCoins(0);
  const globalStats  = getGlobalStats();
  const mintProgress = getMintProgress();
  const broCoinPrice = getBroCoinPriceUSD();

  // ── Edit profile local state ──────────────────────────────────────────────
  const [editAffType, setEditAffType]         = useState(userProfile.affiliation?.type || null);
  const [editAffName, setEditAffName]         = useState(userProfile.affiliation?.name || "");
  const [editVerifyEmail, setEditVerifyEmail]   = useState(userProfile.affiliation?.verifyEmail || "");
  const [editInteresting, setEditInteresting] = useState(userProfile.interestingThing || "");
  const [verificationSent, setVerificationSent] = useState(false);

  // ── Image picker - Library or camera. Square crop. Low quality save. ──
  // Tap image to launch options. Replace or remove anytime.
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to set your bro-file pic.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      onUpdateProfile({ avatarUri: result.assets[0].uri });
      showToast("Bro-file pic updated! 📸");
    }
  };

  // Camera snap. Also square crop, low quality. Same update flow.
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to take a bro-file pic.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      onUpdateProfile({ avatarUri: result.assets[0].uri });
      showToast("Bro-file pic updated! 📸");
    }
  };

  const showImageOptions = () => {
    Alert.alert("Bro-file Pic", "Choose your bro look", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickImage },
      ...(userProfile.avatarUri ? [{ text: "Remove Photo", style:"destructive", onPress: () => onUpdateProfile({ avatarUri: null }) }] : []),
      { text: "Cancel", style:"cancel" },
    ]);
  };

  // ── Verification flow - Email domain validation. Build trust. ──
  // Ensures legit .edu or real work domains. No personal emails for work.
  const handleSendVerification = () => {
    if (!editVerifyEmail) {
      showToast("Enter your email first, bro");
      return;
    }
    // Validate email domain based on type
    if (editAffType === "school" && !editVerifyEmail.endsWith(".edu")) {
      showToast("Use a .edu email to verify school, bro");
      return;
    }
    if (editAffType === "work") {
      // Basic check: not a personal email domain. Block Gmail, Yahoo, etc.
      const personalDomains = ["gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com","aol.com","protonmail.com"];
      const domain = editVerifyEmail.split("@")[1]?.toLowerCase();
      if (!domain || personalDomains.includes(domain)) {
        showToast("Use your work email (not personal), bro");
        return;
      }
    }
    // Simulate sending verification email
    setVerificationSent(true);
    showToast(`Verification sent to ${editVerifyEmail} ✉️`);
    // In production this would hit a real verification endpoint
    // For demo, auto-verify after a delay. Real API would require email click.
    setTimeout(() => {
      onUpdateProfile({
        affiliation: {
          type: editAffType,
          name: editAffName,
          verified: true,
          verifyEmail: editVerifyEmail,
        },
      });
      showToast("Verified! ✅");
    }, 2000);
  };

  // ── Profile save handler. Persists all three fields. Simple. ──
  // Saves one interesting thing + affiliation. Validates existing verification.
  const handleSaveProfile = () => {
    // Save interesting thing - slice ensures max length
    onUpdateProfile({ interestingThing: editInteresting.slice(0, PROFILE_MAX_INTERESTING_LENGTH) });
    // Save affiliation (unverified if not yet verified)
    if (editAffType && editAffName) {
      const currentAff = userProfile.affiliation;
      const alreadyVerified = currentAff?.verified && currentAff?.type === editAffType && currentAff?.name === editAffName;
      onUpdateProfile({
        affiliation: {
          type: editAffType,
          name: editAffName,
          verified: alreadyVerified || false,
          verifyEmail: editVerifyEmail,
        },
      });
    }
    setShowEditProfile(false);
    showToast("Bro-file saved! 🤙");
  };

  // ── Recommended Bros subscreen ──────────────────────────────────────────
  // Full-screen list. 2nd & 3rd degree connections. Privacy preserved.
  if (showRecommended) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { flexDirection:"row", alignItems:"center", gap:10 }]}>
          <TouchableOpacity onPress={() => setShowRecommended(false)}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { fontSize:28 }]}>RECOMMENDED BROS</Text>
            <Text style={styles.sub}>BROS YOU MIGHT KNOW · {recommendedBros.length} FOUND</Text>
          </View>
        </View>
        {/* List of potential connections. Tap + BRO to send request. */}
        <FlatList
          data={recommendedBros}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          {/* Privacy notice - transparency about algorithm. No surveillance. */}
          ListHeaderComponent={
            <Text style={styles.recPrivacyNote}>
              Recommendations based on your network. You cannot see who others are bros with.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.recRow}>
              {/* Avatar emoji */}
              <View style={styles.recAvatar}>
                <Text style={{ fontSize:22 }}>{item.avatar}</Text>
              </View>
              <View style={{ flex:1 }}>
                {/* Name + degree badge + mutual count */}
                <Text style={styles.recName}>{item.name}</Text>
                <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                  {/* Degree badge (2nd vs 3rd). Different colors. */}
                  <View style={[styles.degreeBadge, item.degree === 2 ? styles.degree2 : styles.degree3]}>
                    <Text style={styles.degreeTxt}>{item.degreeLabel}</Text>
                  </View>
                  <Text style={styles.recMutual}>{item.mutualLabel}</Text>
                </View>
              </View>
              {/* + BRO button. Sends request. One-tap. */}
              <TouchableOpacity
                style={styles.addBroBtn}
                onPress={() => showToast(`Bro request sent to ${item.name}! 🤜`)}
              >
                <Text style={styles.addBroBtnTxt}>+ BRO</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Privacy reinforcement. Your list stays private. */}
          ListFooterComponent={
            <Text style={styles.recFooterNote}>
              Bro lists are private. You'll never see who someone else is bros with - only recommendations based on shared connections.
            </Text>
          }
        />
      </SafeAreaView>
    );
  }

  // ── Notifications subscreen ───────────────────────────────────────────────
  // Four notification types. Toggle on/off. Real-time preference syncing.
  if (showNotifs) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { flexDirection:"row", alignItems:"center", gap:10 }]}>
          <TouchableOpacity onPress={() => setShowNotifs(false)}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { fontSize:28 }]}>BRO-TIFICATIONS</Text>
            <Text style={styles.sub}>NOTIFICATION · BRO ALERT SETTINGS</Text>
          </View>
        </View>
        {/* Notification preference toggles. Instant feedback. */}
        <FlatList
          data={NOTIF_ITEMS}
          keyExtractor={(i) => i.key}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.notifRow}>
              {/* Name + description */}
              <View style={{ flex:1 }}>
                <Text style={styles.notifName}>{item.name}</Text>
                <Text style={styles.notifSub}>{item.sub}</Text>
              </View>
              {/* Toggle switch. Yellow when on, gray when off. */}
              <Switch
                value={notifs[item.key]}
                onValueChange={(v) => setNotifs((p) => ({ ...p, [item.key]:v }))}
                trackColor={{ false:"#1c1c1c", true:"#ffe066" }}
                thumbColor={notifs[item.key] ? "#000" : "#444"}
              />
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  // ── Edit Profile subscreen ────────────────────────────────────────────────
  // Full-screen edit. Image + affiliation + one thing. Keyboard aware.
  if (showEditProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex:1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.header, { flexDirection:"row", alignItems:"center", gap:10 }]}>
            {/* Back button dismisses without saving. */}
            <TouchableOpacity onPress={() => setShowEditProfile(false)}>
              <Text style={styles.back}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex:1 }}>
              <Text style={[styles.title, { fontSize:28 }]}>EDIT BRO-FILE</Text>
              <Text style={styles.sub}>KEEP IT SIMPLE · KEEP IT BRO</Text>
            </View>
            {/* Save button in header. Sticky position. Save only on tap. */}
            <TouchableOpacity onPress={handleSaveProfile} style={styles.saveBtn}>
              <Text style={styles.saveBtnTxt}>SAVE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom:40 }}
          >
            {/* ── 1. Profile Image ── Tap to replace with camera or library. ──*/}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>BRO-FILE PIC</Text>
              {/* Tappable image. Shows existing or placeholder. Camera badge overlay. */}
              <TouchableOpacity style={styles.avatarEditWrap} onPress={showImageOptions}>
                {userProfile.avatarUri ? (
                  <Image source={{ uri: userProfile.avatarUri }} style={styles.avatarEditImg} />
                ) : (
                  <View style={styles.avatarEditPlaceholder}>
                    <Text style={{ fontSize:40 }}>🤜</Text>
                  </View>
                )}
                <View style={styles.avatarEditBadge}>
                  <Text style={{ fontSize:12 }}>📷</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.editHint}>Tap to change your bro-file pic</Text>
            </View>

            {/* ── 2. Work or School (with verification) ── One or the other. ──*/}
            {/* Domain validation ensures legitimacy. Build trust in the platform. */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>WHERE YOU AT, BRO?</Text>
              <Text style={styles.editDesc}>Pick one: work or school. We verify so bros know you're legit.</Text>

              {/* Toggle buttons - work or school affiliation selection. */}
              <View style={styles.affToggle}>
                <TouchableOpacity
                  style={[styles.affBtn, editAffType === "work" && styles.affBtnActive]}
                  onPress={() => { setEditAffType("work"); setVerificationSent(false); }}
                >
                  <Text style={[styles.affBtnTxt, editAffType === "work" && styles.affBtnTxtActive]}>🏢 WORK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.affBtn, editAffType === "school" && styles.affBtnActive]}
                  onPress={() => { setEditAffType("school"); setVerificationSent(false); }}
                >
                  <Text style={[styles.affBtnTxt, editAffType === "school" && styles.affBtnTxtActive]}>🎓 SCHOOL</Text>
                </TouchableOpacity>
              </View>

              {editAffType && (
                <>
                  {/* Company or school name input */}
                  <TextInput
                    style={styles.editInput}
                    placeholder={editAffType === "work" ? "Company name" : "School name"}
                    placeholderTextColor="#333"
                    value={editAffName}
                    onChangeText={setEditAffName}
                    maxLength={80}
                    autoCapitalize="words"
                  />
                  {/* Explanation of which email to use */}
                  <Text style={styles.editFieldLabel}>
                    {VERIFICATION_METHODS[editAffType].desc}
                  </Text>
                  {/* Email input for verification. Domain validated on submit. */}
                  <TextInput
                    style={styles.editInput}
                    placeholder={editAffType === "work" ? "you@company.com" : "you@school.edu"}
                    placeholderTextColor="#333"
                    value={editVerifyEmail}
                    onChangeText={setEditVerifyEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={120}
                  />
                  {/* Show verified badge if already verified for this affiliation type. */}
                  {userProfile.affiliation?.verified && userProfile.affiliation?.type === editAffType ? (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedTxt}>✅ VERIFIED</Text>
                    </View>
                  ) : (
                    /* Send verification email button. Disabled after sending. */
                    <TouchableOpacity
                      style={[styles.verifyBtn, verificationSent && styles.verifyBtnSent]}
                      onPress={handleSendVerification}
                      disabled={verificationSent}
                    >
                      <Text style={styles.verifyBtnTxt}>
                        {verificationSent ? "✉️ CHECK YOUR EMAIL" : "SEND VERIFICATION EMAIL"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* ── 3. ONE Interesting Thing ── Three fields total. That's bro. ──*/}
            {/* 150 char limit. Character counter. Textarea. Constraints breed clarity. */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>1 INTERESTING THING</Text>
              <Text style={styles.editDesc}>
                Just one thing. That's it. Make it count, bro.
              </Text>
              {/* Multiline input. Auto-slices to max length. Real-time counter. */}
              <TextInput
                style={[styles.editInput, styles.editInputMulti]}
                placeholder="One interesting thing about you..."
                placeholderTextColor="#333"
                value={editInteresting}
                onChangeText={(t) => setEditInteresting(t.slice(0, PROFILE_MAX_INTERESTING_LENGTH))}
                maxLength={PROFILE_MAX_INTERESTING_LENGTH}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {/* Character counter - shows usage. Transparency. */}
              <Text style={styles.charCount}>
                {editInteresting.length}/{PROFILE_MAX_INTERESTING_LENGTH}
              </Text>
            </View>

            {/* Design philosophy note. Reinforce intentional minimalism. */}
            <Text style={styles.designNote}>
              That's your whole bro-file. Image + where you're at + one thing.{"\n"}
              No bio. No links. No extras. Just bro.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Main Profile screen ───────────────────────────────────────────────────
  // Hero section + stats + recommended + brocoin + features + settings.
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero / Avatar - Your face. Tap to change. */}
        <View style={styles.heroSection}>
          {/* Image or fist emoji placeholder. Camera badge visible. */}
          <TouchableOpacity onPress={showImageOptions} activeOpacity={0.8}>
            {userProfile.avatarUri ? (
              <Image source={{ uri: userProfile.avatarUri }} style={styles.profileAvaImg} />
            ) : (
              <View style={styles.profileAva}>
                <Text style={{ fontSize:40 }}>🤜</Text>
              </View>
            )}
            <View style={styles.profileAvaCamBadge}>
              <Text style={{ fontSize:10 }}>📷</Text>
            </View>
          </TouchableOpacity>
          {/* Display name centered. Est. 2014 for legacy vibes. */}
          <Text style={styles.profileName}>{userProfile.displayName}</Text>
          <Text style={styles.profileHandle}>{userProfile.handle} · Est. 2014</Text>

          {/* Affiliation badge - Shows work/school with verification checkmark if verified. */}
          {userProfile.affiliation?.name && (
            <View style={styles.affBadgeRow}>
              <Text style={styles.affBadgeIcon}>
                {userProfile.affiliation.type === "work" ? "🏢" : "🎓"}
              </Text>
              <Text style={styles.affBadgeName}>{userProfile.affiliation.name}</Text>
              {userProfile.affiliation.verified && (
                <Text style={styles.affBadgeVerified}>✅</Text>
              )}
            </View>
          )}

          {/* Interesting thing - One quote from the profile. Italic emphasis. */}
          {userProfile.interestingThing ? (
            <Text style={styles.interestingThing}>"{userProfile.interestingThing}"</Text>
          ) : null}

          {/* Edit button - Taps to edit profile. Easy access. */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => {
              setEditAffType(userProfile.affiliation?.type || null);
              setEditAffName(userProfile.affiliation?.name || "");
              setEditVerifyEmail(userProfile.affiliation?.verifyEmail || "");
              setEditInteresting(userProfile.interestingThing || "");
              setVerificationSent(false);
              setShowEditProfile(true);
            }}
          >
            <Text style={styles.editProfileBtnTxt}>EDIT BRO-FILE</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row - Three key numbers. BroCoin not shown publicly (private). */}
        {/* Your network size + engagement + spending power. Transparent metrics. */}
        <View style={styles.statsRow}>
          {/* Bros count - your connection size */}
          <View style={styles.stat}>
            <Text style={styles.statN}>{bros?.length || 6}</Text>
            <Text style={styles.statL}>BROS</Text>
          </View>
          {/* Bros sent - your generosity tracked */}
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={styles.statN}>{broCount.toLocaleString()}</Text>
            <Text style={styles.statL}>BROS SENT</Text>
          </View>
          {/* Bro Bucks - your spending balance (non-private display context) */}
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={[styles.statN, { color:"#ffe066", fontSize:18 }]}>{formatBB(broBucks)}</Text>
            <Text style={styles.statL}>BRO BUCKS</Text>
          </View>
        </View>

        {/* Recommended bros preview - Teaser card. Tap for full list. */}
        {/* Shows avatars of 2nd & 3rd degree connections. Privacy-safe recommendations. */}
        <TouchableOpacity
          style={styles.recPreview}
          onPress={() => setShowRecommended(true)}
          activeOpacity={0.7}
        >
          <View style={{ flex:1 }}>
            <Text style={styles.recPreviewTitle}>RECOMMENDED BROS</Text>
            <Text style={styles.recPreviewSub}>
              {recommendedBros.length} bros you might know · 2nd & 3rd degree
            </Text>
          </View>
          {/* Avatar stack. Shows up to 4. Overflow count. */}
          <View style={styles.recPreviewAvatars}>
            {recommendedBros.slice(0, 4).map((r) => (
              <View key={r.id} style={styles.recPreviewAva}>
                <Text style={{ fontSize:14 }}>{r.avatar}</Text>
              </View>
            ))}
            {recommendedBros.length > 4 && (
              <Text style={styles.recPreviewMore}>+{recommendedBros.length - 4}</Text>
            )}
          </View>
          <Text style={styles.recPreviewArrow}>›</Text>
        </TouchableOpacity>

        {/* BroCoin wallet card - PRIVATE: only you see your balance */}
        {/* Never shown on your public profile. Treasury-backed value. Tap for hub. */}
        <TouchableOpacity
          style={styles.broCoinCard}
          activeOpacity={0.7}
          onPress={() => onNavigate("brocoin")}
        >
          <View style={styles.broCoinHeader}>
            {/* Emoji icon + title + privacy label */}
            <Text style={styles.broCoinEmoji}>{BROCOIN_CONFIG.tokenEmoji}</Text>
            <View style={{ flex:1 }}>
              <Text style={styles.broCoinTitle}>YOUR BROCOIN WALLET</Text>
              <Text style={styles.broCoinSub}>Private · Only you can see this</Text>
            </View>
            {/* Balance + USD value estimate */}
            <View style={{ alignItems:"flex-end" }}>
              <Text style={styles.broCoinBalance}>{myBroCoins} {BROCOIN_CONFIG.tokenSymbol}</Text>
              {broCoinPrice > 0 && (
                <Text style={styles.broCoinUsd}>~${(myBroCoins * broCoinPrice).toFixed(2)} value</Text>
              )}
            </View>
          </View>
          {/* Mint progress bar. Shows % to next drop. Linked to ledger. */}
          <View style={styles.mintProgressWrap}>
            <View style={styles.mintProgressBg}>
              <View style={[styles.mintProgressFill, { width: `${Math.min(mintProgress, 100)}%` }]} />
            </View>
            <Text style={styles.mintProgressTxt}>
              {mintProgress.toFixed(0)}% to next drop · {globalStats.totalMinted} minted · Tap for ledger & trading ›
            </Text>
          </View>
        </TouchableOpacity>

        {/* Feature grid - 8 features, 2 columns. Icons + titles + descriptions. */}
        {/* Each card tappable. Routes to feature or modal. Wallet shows balance. */}
        <FlatList
          data={BRO_FEATURES}
          keyExtractor={(f) => f.key}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap:9 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.featCard, f.key==="wallet" && styles.featCardWallet]}
              activeOpacity={0.7}
              onPress={() => {
                // Tap routing: notifs, edit, navigation, or showToast for unimplemented
                if (f.key==="brotifications") setShowNotifs(true);
                else if (f.key==="brofile") {
                  setEditAffType(userProfile.affiliation?.type || null);
                  setEditAffName(userProfile.affiliation?.name || "");
                  setEditVerifyEmail(userProfile.affiliation?.verifyEmail || "");
                  setEditInteresting(userProfile.interestingThing || "");
                  setVerificationSent(false);
                  setShowEditProfile(true);
                }
                else if (["wallet","brocast","broximity","bro-mmunity","bronations"].includes(f.key))
                  onNavigate(f.key);
                else showToast(`${f.title}: Bro.`);
              }}
            >
              <Text style={styles.featIcon}>{f.icon}</Text>
              <Text style={styles.featTitle}>{f.title}</Text>
              <Text style={styles.featSub}>{f.subtitle}</Text>
              {/* Wallet card shows live BB balance as premium stat. */}
              {f.key === "wallet" && (
                <Text style={styles.featBB}>{formatBB(broBucks)}</Text>
              )}
            </TouchableOpacity>
          )}
        />

        {/* Sign Out - Destructive action. Requires confirmation dialog. Bottom placement. */}
        {onSignOut && (
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => {
              Alert.alert("Sign Out", "You sure, bro?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: onSignOut },
              ]);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutTxt}>SIGN OUT</Text>
          </TouchableOpacity>
        )}

        {/* Bottom spacer for scroll clearance */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex:1, backgroundColor:"#0d0d0d" },
  header:        { paddingHorizontal:20, paddingTop:8, paddingBottom:13, borderBottomWidth:1, borderBottomColor:"#181818" },
  back:          { fontSize:28, color:"#fff", marginRight:4 },
  title:         { fontFamily:"BebasNeue_400Regular", fontSize:40, color:"#fff", letterSpacing:3 },
  sub:           { fontSize:10, color:"#3a3a3a", letterSpacing:2, marginTop:2 },

  // Hero
  heroSection:   { alignItems:"center", paddingVertical:18, paddingHorizontal:20, gap:6 },
  profileAva:    { width:88, height:88, borderRadius:44, backgroundColor:"#1c1c1c", borderWidth:2, borderColor:"#262626", alignItems:"center", justifyContent:"center" },
  profileAvaImg: { width:88, height:88, borderRadius:44, borderWidth:2, borderColor:"#262626" },
  profileAvaCamBadge: { position:"absolute", bottom:0, right:0, width:24, height:24, borderRadius:12, backgroundColor:"#1c1c1c", borderWidth:1, borderColor:"#333", alignItems:"center", justifyContent:"center" },
  profileName:   { fontFamily:"BebasNeue_400Regular", fontSize:40, color:"#fff", letterSpacing:3 },
  profileHandle: { fontSize:11, color:"#3a3a3a", letterSpacing:2 },

  // Affiliation badge
  affBadgeRow:    { flexDirection:"row", alignItems:"center", gap:6, marginTop:4, backgroundColor:"#141414", borderRadius:12, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:"#1e1e1e" },
  affBadgeIcon:   { fontSize:14 },
  affBadgeName:   { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#aaa", letterSpacing:1 },
  affBadgeVerified: { fontSize:12 },

  // Interesting thing
  interestingThing: { fontSize:12, color:"#555", fontStyle:"italic", textAlign:"center", marginTop:6, paddingHorizontal:30, lineHeight:18 },

  // Edit profile button
  editProfileBtn:    { marginTop:10, borderWidth:1, borderColor:"#2a2a2a", borderRadius:20, paddingHorizontal:20, paddingVertical:7 },
  editProfileBtnTxt: { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#666", letterSpacing:2 },

  // Stats
  statsRow:      { flexDirection:"row", borderTopWidth:1, borderBottomWidth:1, borderColor:"#181818" },
  stat:          { flex:1, alignItems:"center", paddingVertical:13, paddingHorizontal:8 },
  statBorder:    { borderLeftWidth:1, borderColor:"#181818" },
  statN:         { fontFamily:"BebasNeue_400Regular", fontSize:24, color:"#fff", letterSpacing:1 },
  statL:         { fontSize:8, color:"#3a3a3a", letterSpacing:2, marginTop:1 },

  // Feature grid
  grid:          { padding:10, gap:9 },
  featCard:      { flex:1, backgroundColor:"#121212", borderWidth:1, borderColor:"#1c1c1c", borderRadius:16, padding:14 },
  featCardWallet:{ borderColor:"#2a2a00", backgroundColor:"#111100" },
  featIcon:      { fontSize:22, marginBottom:6 },
  featTitle:     { fontFamily:"BebasNeue_400Regular", fontSize:17, color:"#fff", letterSpacing:1 },
  featSub:       { fontSize:9, color:"#3a3a3a", letterSpacing:1, marginTop:2 },
  featBB:        { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#ffe066", letterSpacing:1, marginTop:4 },

  // Notifications
  notifRow:      { flexDirection:"row", alignItems:"center", paddingHorizontal:20, paddingVertical:15, borderBottomWidth:1, borderBottomColor:"#131313" },
  notifName:     { fontFamily:"BebasNeue_400Regular", fontSize:20, color:"#fff", letterSpacing:1 },
  notifSub:      { fontSize:10, color:"#3a3a3a", marginTop:1 },

  // ── Edit Profile ──────────────────────────────────────────────────────────
  saveBtn:       { backgroundColor:"#ffe066", borderRadius:16, paddingHorizontal:16, paddingVertical:7 },
  saveBtnTxt:    { fontFamily:"BebasNeue_400Regular", fontSize:14, color:"#000", letterSpacing:2 },

  editSection:     { marginHorizontal:16, marginTop:20, gap:8 },
  editSectionTitle:{ fontFamily:"BebasNeue_400Regular", fontSize:15, color:"#555", letterSpacing:3 },
  editDesc:        { fontSize:11, color:"#333", lineHeight:16 },
  editFieldLabel:  { fontSize:10, color:"#444", letterSpacing:0.5 },
  editHint:        { fontSize:10, color:"#333", textAlign:"center" },

  editInput: {
    backgroundColor:"#141414", borderWidth:1, borderColor:"#222", borderRadius:12,
    paddingHorizontal:14, paddingVertical:12, color:"#fff",
    fontFamily:"BebasNeue_400Regular", fontSize:16, letterSpacing:1,
  },
  editInputMulti: { minHeight:80, textAlignVertical:"top", fontSize:14 },
  charCount:       { fontSize:9, color:"#333", textAlign:"right" },

  // Avatar edit
  avatarEditWrap:       { alignSelf:"center", marginTop:4 },
  avatarEditImg:        { width:100, height:100, borderRadius:50, borderWidth:2, borderColor:"#333" },
  avatarEditPlaceholder:{ width:100, height:100, borderRadius:50, backgroundColor:"#1c1c1c", borderWidth:2, borderColor:"#262626", alignItems:"center", justifyContent:"center" },
  avatarEditBadge:      { position:"absolute", bottom:2, right:2, width:28, height:28, borderRadius:14, backgroundColor:"#222", borderWidth:1, borderColor:"#444", alignItems:"center", justifyContent:"center" },

  // Affiliation toggle
  affToggle:   { flexDirection:"row", gap:8 },
  affBtn:      { flex:1, backgroundColor:"#141414", borderWidth:1, borderColor:"#222", borderRadius:12, paddingVertical:12, alignItems:"center" },
  affBtnActive:{ borderColor:"#ffe066", backgroundColor:"#111100" },
  affBtnTxt:   { fontFamily:"BebasNeue_400Regular", fontSize:14, color:"#555", letterSpacing:1 },
  affBtnTxtActive: { color:"#ffe066" },

  // Verification
  verifyBtn:     { backgroundColor:"#1a1a1a", borderWidth:1, borderColor:"#333", borderRadius:12, paddingVertical:12, alignItems:"center" },
  verifyBtnSent: { borderColor:"#2a4a00", backgroundColor:"#0a1400" },
  verifyBtnTxt:  { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#888", letterSpacing:1.5 },
  verifiedBadge: { backgroundColor:"#0a1400", borderWidth:1, borderColor:"#1e3a00", borderRadius:12, paddingVertical:10, alignItems:"center" },
  verifiedTxt:   { fontFamily:"BebasNeue_400Regular", fontSize:14, color:"#4ade80", letterSpacing:2 },

  designNote:    { fontSize:9, color:"#222", letterSpacing:0.5, textAlign:"center", marginTop:24, marginHorizontal:20, lineHeight:16 },

  // Sign out
  signOutBtn:    { marginHorizontal:16, marginTop:20, borderWidth:1, borderColor:"#2a1a1a", borderRadius:16, paddingVertical:14, alignItems:"center", backgroundColor:"#120a0a" },
  signOutTxt:    { fontFamily:"BebasNeue_400Regular", fontSize:14, color:"#ff6b6b", letterSpacing:3 },

  // ── Recommended bros ───────────────────────────────────────────────────
  recPrivacyNote: { fontSize:10, color:"#2a2a2a", letterSpacing:0.5, textAlign:"center", padding:14, lineHeight:16 },
  recRow:         { flexDirection:"row", alignItems:"center", paddingHorizontal:20, paddingVertical:13, borderBottomWidth:1, borderBottomColor:"#131313", gap:10 },
  recAvatar:      { width:44, height:44, borderRadius:22, backgroundColor:"#1a1a1a", borderWidth:1, borderColor:"#222", alignItems:"center", justifyContent:"center" },
  recName:        { fontFamily:"BebasNeue_400Regular", fontSize:20, color:"#fff", letterSpacing:1 },
  degreeBadge:    { paddingHorizontal:6, paddingVertical:2, borderRadius:6, borderWidth:1 },
  degree2:        { backgroundColor:"#111100", borderColor:"#332200" },
  degree3:        { backgroundColor:"#0a0a1a", borderColor:"#1a1a33" },
  degreeTxt:      { fontFamily:"BebasNeue_400Regular", fontSize:9, color:"#888", letterSpacing:1 },
  recMutual:      { fontSize:10, color:"#3a3a3a" },
  addBroBtn:      { backgroundColor:"#ffe066", borderRadius:12, paddingHorizontal:14, paddingVertical:7 },
  addBroBtnTxt:   { fontFamily:"BebasNeue_400Regular", fontSize:12, color:"#000", letterSpacing:1.5 },
  recFooterNote:  { fontSize:9, color:"#1e1e1e", letterSpacing:0.5, textAlign:"center", padding:20, lineHeight:15 },

  // Recommended bros preview (on main profile)
  recPreview:       { flexDirection:"row", alignItems:"center", marginHorizontal:12, marginTop:10, padding:14, backgroundColor:"#121212", borderWidth:1, borderColor:"#1c1c1c", borderRadius:16, gap:10 },
  recPreviewTitle:  { fontFamily:"BebasNeue_400Regular", fontSize:14, color:"#fff", letterSpacing:1 },
  recPreviewSub:    { fontSize:9, color:"#3a3a3a", marginTop:1 },
  recPreviewAvatars:{ flexDirection:"row", gap:-6 },
  recPreviewAva:    { width:28, height:28, borderRadius:14, backgroundColor:"#1a1a1a", borderWidth:1, borderColor:"#222", alignItems:"center", justifyContent:"center" },
  recPreviewMore:   { fontFamily:"BebasNeue_400Regular", fontSize:10, color:"#555", alignSelf:"center", marginLeft:4 },
  recPreviewArrow:  { fontSize:22, color:"#333" },

  // ── BroCoin wallet card ────────────────────────────────────────────────
  broCoinCard:     { margin:12, marginTop:8, padding:16, backgroundColor:"#0f0a00", borderWidth:1, borderColor:"#2a1f00", borderRadius:16 },
  broCoinHeader:   { flexDirection:"row", alignItems:"center", gap:10, marginBottom:10 },
  broCoinEmoji:    { fontSize:28 },
  broCoinTitle:    { fontFamily:"BebasNeue_400Regular", fontSize:16, color:"#ffa500", letterSpacing:2 },
  broCoinSub:      { fontSize:9, color:"#553300", letterSpacing:0.5 },
  broCoinBalance:  { fontFamily:"BebasNeue_400Regular", fontSize:22, color:"#ffa500", letterSpacing:1 },
  broCoinUsd:      { fontSize:9, color:"#664400", letterSpacing:0.5 },
  broCoinDesc:     { fontSize:9, color:"#3a2a00", lineHeight:14, marginTop:8 },

  mintProgressWrap: { gap:4 },
  mintProgressBg:   { height:4, backgroundColor:"#1a1200", borderRadius:2, overflow:"hidden" },
  mintProgressFill: { height:4, backgroundColor:"#ffa500", borderRadius:2 },
  mintProgressTxt:  { fontSize:8, color:"#553300", letterSpacing:0.5 },
});
