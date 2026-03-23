/**
 * NationsScreen
 *
 * Bro-nations: real-money tippping via Apple Pay. Support your dev bro with intent.
 * Tier selection, haptic feedback confirmation, seamless payment flow. Premium,
 * frictionless. For anyone who wants to give back. Drive real suport for your devs.
 */

import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { DONATION_TIERS } from "../constants/bro";

export default function NationsScreen({ showToast }) {
  // Selected tier state: tracks which donation level user chooses.
  const [selectedTier, setSelectedTier] = useState(null);

  // Execute donation: haptic feedback + toast notification + reset selection.
  const doDonate = () => {
    if (!selectedTier) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Bro-nation of $${selectedTier.amount.toFixed(2)} sent! Thanks bro 🤜`);
    setSelectedTier(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>BRO-NATIONS</Text>
        <Text style={styles.sub}>APPLE PAY · SUPPORT YOUR DEV BRO</Text>
      </View>
      <FlatList
        data={DONATION_TIERS}
        keyExtractor={(t) => t.label}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: tier }) => (
          <TouchableOpacity
            style={[styles.tierCard, selectedTier?.label===tier.label && styles.tierCardSel]}
            onPress={() => setSelectedTier(tier)}
            activeOpacity={0.7}
          >
            {/* Tier emoji: visual identity. At-a-glance tier recognition. */}
            <Text style={{ fontSize:30 }}>{tier.emoji}</Text>

            {/* Tier details: name + description. Build narrative around giving. */}
            <View style={{ flex:1 }}>
              <Text style={styles.tierName}>{tier.label}</Text>
              <Text style={styles.tierDesc}>{tier.desc}</Text>
            </View>

            {/* Price point: clear, unambiguous. No hidden costs. Premiem transparency. */}
            <Text style={styles.tierAmt}>${tier.amount.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      />
      {/* Apple Pay button: payment gateway. Disabled until tier selection. Drive checkout momentum. */}
      <TouchableOpacity
        style={[styles.applePayBtn, !selectedTier && { opacity:0.2 }]}
        onPress={doDonate}
        disabled={!selectedTier}
      >
        <Text style={styles.applePayTxt}>
          🍎 {selectedTier ? `Pay $${selectedTier.amount.toFixed(2)} with Apple Pay` : "SELECT A TIER, BRO"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex:1, backgroundColor:"#0d0d0d" },
  hero:        { paddingHorizontal:20, paddingTop:20, paddingBottom:14, alignItems:"center" },
  title:       { fontFamily:"BebasNeue_400Regular", fontSize:50, color:"#fff", letterSpacing:4 },
  sub:         { fontSize:10, color:"#3a3a3a", letterSpacing:2.5, marginTop:4 },
  list:        { padding:14, gap:9 },
  tierCard:    { backgroundColor:"#131313", borderWidth:1, borderColor:"#1e1e1e", borderRadius:18, padding:14, flexDirection:"row", alignItems:"center", gap:12 },
  tierCardSel: { borderColor:"#fff", backgroundColor:"#181818" },
  tierName:    { fontFamily:"BebasNeue_400Regular", fontSize:22, color:"#fff", letterSpacing:2 },
  tierDesc:    { fontSize:10, color:"#444", marginTop:2 },
  tierAmt:     { fontFamily:"BebasNeue_400Regular", fontSize:26, color:"#fff", letterSpacing:1 },
  applePayBtn: { marginHorizontal:14, marginBottom:14, backgroundColor:"#000", borderWidth:1.5, borderColor:"#333", borderRadius:16, height:50, alignItems:"center", justifyContent:"center" },
  applePayTxt: { fontFamily:"BebasNeue_400Regular", fontSize:16, color:"#fff", letterSpacing:2 },
});
