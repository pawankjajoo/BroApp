

import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { BB_PACKS, formatBB, bbEmojiCount } from "../constants/bro";

// Rate reference rows shown in the exchange table . transparent pricing backbone
const RATE_ROWS = [
  { usd:"$1",     bb:"1,000,000 BB",     short:"1M BB",   emoji:"10,000 💰"  },
  { usd:"$3",     bb:"3,000,000 BB",     short:"3M BB",   emoji:"30,000 💰"  },
  { usd:"$5",     bb:"5,000,000 BB",     short:"5M BB",   emoji:"50,000 💰"  },
  { usd:"$10",    bb:"10,000,000 BB",    short:"10M BB",  emoji:"100K 💰"    },
  { usd:"$100",   bb:"100,000,000 BB",   short:"100M BB", emoji:"1M 💰"      },
  { usd:"$1,000", bb:"1,000,000,000 BB", short:"1B BB",   emoji:"10M 💰"     },
];

export default function WalletScreen({
  broBucks, storeProducts, purchasing, onPurchase, showToast,
}) {
  const [confirmPack, setConfirmPack] = useState(null);
  const [showTable, setShowTable]     = useState(false);

  // Merge live store pricing with local pack metadata . one source of truth
  // Real pricing from the store, fallback to config if unavailable
  const packs = BB_PACKS.map((pack) => {
    const live = storeProducts?.find((p) => p.productId === pack.productId);
    return {
      ...pack,
      displayPrice: live?.localizedPrice ?? pack.displayUSD,
    };
  });

    if (purchasing) return;
    if (confirmPack?.productId === pack.productId) {
      setConfirmPack(null);
      onPurchase(pack.productId);
    } else {
      setConfirmPack(pack);
    }
  };

  // Emoji preview: visualize abundance without overwhelming. Cap at 20, show remainder.  // Psychological punch: more emojis = feels like a bigger deal
  const emojiPreview = (pack) => {
    const shown  = Math.min(pack.emojiCount, 20);
    const remain = pack.emojiCount - shown;
    return "💰".repeat(shown) + (remain > 0 ? `  +${remain.toLocaleString()} more` : "");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>BRO BUCKS</Text>
        <Text style={styles.sub}>IN-APP CURRENCY · BRO-NATION YOUR BROS</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom:30 }}
      >
        {/* ── Balance card ── Hero section. Your wealth at a glance. */}
        {/* Displays current Bro Bucks balance with visual emoji abundance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLbl}>YOUR BALANCE</Text>
          <Text style={styles.balanceNum}>{formatBB(broBucks)}</Text>
          <Text style={styles.balanceEmoji}>
            {"💰".repeat(bbEmojiCount(broBucks, 12))}
          </Text>
          <Text style={styles.balanceRate}>
            1,000,000 BB = $1 · $1,000 = 1 BILLION BB
          </Text>
        </View>

        {/* ── Exchange rate table (collapsible) ── Transparency in pricing */}
        {/* Tap to expand/collapse. Full rate visibility builds confidence. */}
        <TouchableOpacity
          style={styles.rateHeader}
          onPress={() => setShowTable((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.rateHeaderTxt}>
            💱 BRO BUCKS EXCHANGE RATE
          </Text>
          <Text style={styles.rateChevron}>{showTable ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {showTable && (
          <View style={styles.rateTable}>
            {/* Column headers */}
            <View style={[styles.rateRow, styles.rateRowHead]}>
              <Text style={[styles.rateUsd, styles.rateHeadTxt]}>USD</Text>
              <Text style={[styles.rateBB,  styles.rateHeadTxt, { flex:1 }]}>BRO BUCKS</Text>
              <Text style={[styles.rateEmoji, styles.rateHeadTxt]}>💰 COUNT</Text>
            </View>
            {/* Each row: USD → BB conversion + emoji count. Linear rate, no surprises. */}
            {RATE_ROWS.map((row, i) => (
              <View
                key={i}
                style={[
                  styles.rateRow,
                  i === RATE_ROWS.length - 1 && styles.rateRowLast,
                ]}
              >
                <Text style={styles.rateUsd}>{row.usd}</Text>
                <View style={{ flex:1 }}>
                  <Text style={styles.rateBBMain}>{row.short}</Text>
                  <Text style={styles.rateBBSub}>{row.bb}</Text>
                </View>
                <Text style={styles.rateEmoji}>{row.emoji}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Pack list ── Currency denominations for eveything from casual to premium */}
        {/* Grid of purchase options. Pick your denomination, tap twice, done. */}
        <Text style={styles.sectionTitle}>PURCHASE BRO BUCKS</Text>

        <View style={styles.packGrid}>
          {/* Each pack card: badge + name + price above, BB amount + emoji preview below */}
          {packs.map((pack) => {
            const isConfirming = confirmPack?.productId === pack.productId;
            const isBuying     = purchasing === pack.productId;
            const isMega       = pack.usd >= 1_000;

            return (
              <TouchableOpacity
                key={pack.productId}
                style={[
                  styles.packCard,
                  isConfirming && styles.packCardConfirm,
                  isMega       && styles.packCardMega,
                ]}
                onPress={() => handleBuy(pack)}
                activeOpacity={0.85}
              >
                {/* Top row: badge / name / price. Visual hierarchy recieved instantly. */}
                <View style={styles.packTop}>
                  <Text style={styles.packBadge}>{pack.badge}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={styles.packName}>{pack.name}</Text>
                    <Text style={styles.packDesc}>{pack.desc}</Text>
                  </View>
                  <View style={styles.packPriceBox}>
                    {isBuying
                      ? <ActivityIndicator size="small" color="#ffe066" />
                      : <Text style={styles.packPrice}>{pack.displayPrice}</Text>
                    }
                  </View>
                </View>

                {/* BB amount . mega packs get green highlight for prestige */}
                <Text style={[styles.packBB, isMega && { color:"#4ade80" }]}>
                  {pack.displayBB}
                </Text>

                {/* Emoji preview . visual proof of value. Abundance at a glance. */}
                <Text style={styles.packEmojis} numberOfLines={2}>
                  {emojiPreview(pack)}
                </Text>

                {/* Confirm prompt . second tap triggers purchace */}
                {isConfirming && !isBuying && (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmTxt}>
                      TAP AGAIN TO PAY {pack.displayPrice}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reset note: consumable currency, no refunds. Clear terms. */}
        <Text style={styles.restoreNote}>
          Bro Bucks are consumable in-app currency. All purchases are final.{"\n"}
          $1,000 real USD = 1,000,000,000 Bro Bucks. Rate is always 1M BB per $1.        </Text>

        {/* Store compliance disclosures . Apple §3.1.1 / Google Play Billing. Transparency required. */}
        {/* Explains p2p transfer fees and no real-world value. Legal requirement met with clarity. */}
        <View style={styles.disclosureBox}>
          <Text style={styles.disclosureTitle}>FEE DISCLOSURE</Text>
          <Text style={styles.disclosureText}>
            Bro Bucks purchases are processed through {Platform.OS === "ios" ? "Apple" : "Google Play"} In-App Purchase.{"\n\n"}
            When you send a Bro-nation (peer-to-peer), a 30% platform fee applies. The recipient receives 70% of the Bro Bucks you send.{"\n\n"}
            Bro Bucks have no real-world monetary value and cannot be redeemed, transferred outside the app, or refunded except as required by applicable law.          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:"#0d0d0d" },
  header:       { paddingHorizontal:20, paddingTop:8, paddingBottom:13, borderBottomWidth:1, borderBottomColor:"#181818" },
  title:        { fontFamily:"BebasNeue_400Regular", fontSize:40, color:"#fff", letterSpacing:3 },
  sub:          { fontSize:10, color:"#3a3a3a", letterSpacing:2, marginTop:2 },

  // Balance
  balanceCard:   { margin:14, marginBottom:8, backgroundColor:"#111", borderWidth:1, borderColor:"#222", borderRadius:20, padding:18, alignItems:"center", gap:6 },
  balanceLbl:    { fontFamily:"BebasNeue_400Regular", fontSize:11, color:"#3a3a3a", letterSpacing:3 },
  balanceNum:    { fontFamily:"BebasNeue_400Regular", fontSize:46, color:"#ffe066", letterSpacing:3 },
  balanceEmoji:  { fontSize:20, lineHeight:28, textAlign:"center" },
  balanceRate:   { fontSize:9, color:"#3a3a3a", letterSpacing:1.5, marginTop:4, textAlign:"center" },

  // Rate table
  rateHeader:    { flexDirection:"row", alignItems:"center", marginHorizontal:14, marginBottom:2, paddingVertical:10, paddingHorizontal:14, backgroundColor:"#111", borderRadius:12, borderWidth:1, borderColor:"#1c1c1c" },
  rateHeaderTxt: { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#555", letterSpacing:2, flex:1 },
  rateChevron:   { fontSize:10, color:"#333" },
  rateTable:     { marginHorizontal:14, marginBottom:8, borderWidth:1, borderColor:"#1c1c1c", borderRadius:12, overflow:"hidden" },
  rateRowHead:   { backgroundColor:"#0d0d0d", borderBottomWidth:1, borderBottomColor:"#222" },
  rateHeadTxt:   { color:"#333", fontSize:9, letterSpacing:2 },
  rateRow:       { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:9, borderBottomWidth:1, borderBottomColor:"#141414", gap:8, backgroundColor:"#101010" },
  rateRowLast:   { borderBottomWidth:0 },
  rateUsd:       { fontFamily:"BebasNeue_400Regular", fontSize:14, color:"#fff", width:48 },
  rateBBMain:    { fontFamily:"BebasNeue_400Regular", fontSize:15, color:"#ffe066", letterSpacing:1 },
  rateBBSub:     { fontSize:8, color:"#333", marginTop:1 },
  rateBB:        { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#ffe066" },
  rateEmoji:     { fontSize:10, color:"#555", width:70, textAlign:"right" },

  // Pack grid
  sectionTitle:  { fontFamily:"BebasNeue_400Regular", fontSize:11, color:"#3a3a3a", letterSpacing:3, marginHorizontal:14, marginTop:8, marginBottom:8 },
  packGrid:      { paddingHorizontal:14, gap:10 },
  packCard:      { backgroundColor:"#131313", borderWidth:1, borderColor:"#1e1e1e", borderRadius:18, padding:14, gap:8 },
  packCardConfirm:{ borderColor:"#ffe066" },
  packCardMega:  { borderColor:"#1a3a00", backgroundColor:"#0a1400" },

  packTop:       { flexDirection:"row", alignItems:"center", gap:10 },
  packBadge:     { fontSize:30 },
  packName:      { fontFamily:"BebasNeue_400Regular", fontSize:18, color:"#fff", letterSpacing:1 },
  packDesc:      { fontSize:10, color:"#444", marginTop:1 },
  packPriceBox:  { alignItems:"flex-end", minWidth:50 },
  packPrice:     { fontFamily:"BebasNeue_400Regular", fontSize:22, color:"#fff", letterSpacing:1 },

  packBB:        { fontFamily:"BebasNeue_400Regular", fontSize:32, color:"#ffe066", letterSpacing:2 },
  packEmojis:    { fontSize:15, color:"#444", lineHeight:22 },

  confirmRow:    { backgroundColor:"rgba(255,224,102,0.07)", borderRadius:10, padding:8, alignItems:"center", borderWidth:1, borderColor:"rgba(255,224,102,0.2)" },
  confirmTxt:    { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#ffe066", letterSpacing:1.5, textAlign:"center" },

  restoreNote:   { fontSize:9, color:"#252525", letterSpacing:0.8, textAlign:"center", marginTop:16, marginHorizontal:20, lineHeight:16 },

  // Fee disclosure (Apple/Google compliance)
  disclosureBox:   { margin:14, marginTop:12, padding:14, backgroundColor:"#0a0a0a", borderWidth:1, borderColor:"#1a1a1a", borderRadius:14 },
  disclosureTitle: { fontFamily:"BebasNeue_400Regular", fontSize:11, color:"#333", letterSpacing:3, marginBottom:6 },
  disclosureText:  { fontSize:9, color:"#2a2a2a", letterSpacing:0.5, lineHeight:15 },
});
