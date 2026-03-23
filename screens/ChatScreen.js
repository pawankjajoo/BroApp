/**
 * ChatScreen.js
 * ───────────────────────────────────────────────────────────────────────────
 * ONLY two things can be sent in a Bro chat:
 *   1. A bro expression (one of 20 preset variants) — free
 *   2. A Bro Bucks bronation (deducted from sender's wallet)
 *
 * No free text. No calls. No media. Bro only.
 */

import React, { useState, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  BRO_EXPRESSIONS, BRONATION_AMOUNTS, randomExpr, formatBB,
  PLATFORM_FEE_LABEL, calcPlatformFee, calcRecipientAmount,
} from "../constants/bro";

export default function ChatScreen({
  bro, messages, broBucks, onSendBro, onSendNation, onBack, onGoWallet, showToast,
}) {
  // Track selected expression, sending state, and bronation modal
  const [selectedExpr, setSelectedExpr]   = useState(BRO_EXPRESSIONS[0]);
  const [sending, setSending]             = useState(false);
  const [donateOpen, setDonateOpen]       = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  // Scale animation for send button — adds punch to teh interaction
  const btnScale = useRef(new Animated.Value(1)).current;
  const flatRef  = useRef(null);

  const pressBro = () => {
    if (sending) return;
    // Haptic feedback — users feel the action, not just see it
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    // Send animation: compress then release for tactile responsiveness
    Animated.sequence([
      Animated.timing(btnScale, { toValue:0.93, duration:80,  useNativeDriver:true }),
      Animated.timing(btnScale, { toValue:1,    duration:180, useNativeDriver:true }),
    ]).start();
    onSendBro(selectedExpr);
    // Auto-reply from bro creates natural converstion feel. Random delay makes it feel organic
    setTimeout(() => {
      onSendBro(randomExpr(), "them");
      setSending(false);
    }, 900 + Math.random() * 400);
  };

  const doNation = () => {
    if (!selectedAmount) return;
    const success = onSendNation(bro, selectedAmount.bucks);
    if (success) {
      // Success feedback: haptic + toast. Premium experiece across all senses
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`${selectedAmount.display} sent to ${bro.name}! ${selectedAmount.badge}`);
    } else {
      // Insufficient balance — send them to top up, no friction
      onGoWallet();
    }
    setDonateOpen(false);
    setSelectedAmount(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{top:12,bottom:12,left:12,right:12}}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={styles.chatName}>{bro.name}</Text>
          <Text style={styles.chatSub}>
            💰 {formatBB(bro.broNationsBB)} RECEIVED · BRO ONLY ZONE
          </Text>
        </View>
        {/* Wallet balance shortcut */}
        <TouchableOpacity style={styles.walletPill} onPress={onGoWallet}>
          <Text style={styles.walletPillTxt}>💰 {formatBB(broBucks)}</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={[
          { id:"seed1", from:"them", type:"bro", expr:BRO_EXPRESSIONS[0], time:"Yesterday" },
          { id:"seed2", from:"me",   type:"bro", expr:BRO_EXPRESSIONS[0], time:"Yesterday" },
          { id:"seed3", from:"them", type:"bro", expr:BRO_EXPRESSIONS[2], time:"1h ago"    },
          ...messages,
        ]}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={styles.msgs}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated:true })}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: msg }) => {
          const isMe = msg.from === "me";
          if (msg.type === "nation") {
            return (
              <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                <View style={[styles.bubble, styles.nationBubble]}>
                  <Text style={styles.nationAmt}>{formatBB(msg.bucks)} 💰</Text>
                  <Text style={styles.nationLbl}>BRO-NATION · BRO BUCKS</Text>
                </View>
              </View>
            );
          }
          return (
            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
              <View style={[styles.bubble, isMe && styles.bubbleMe]}>
                <Text style={[styles.broText, { color: isMe ? "#000" : (msg.expr?.color || "#777") }]}>
                  {msg.expr?.label || "BRO"}
                </Text>
                <Text style={[styles.broTime, isMe && styles.broTimeMe]}>{msg.time}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Expression Picker: The only text input allowed. 20 preset variants of Bro, no free text. Design is teh guardrail */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pickerRow}
        contentContainerStyle={{ paddingHorizontal:14, gap:7 }}
      >
        {BRO_EXPRESSIONS.map((expr) => (
          <TouchableOpacity
            key={expr.id}
            style={[styles.chip, selectedExpr.id === expr.id && styles.chipActive]}
            onPress={() => setSelectedExpr(expr)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipLbl, { color: selectedExpr.id===expr.id ? expr.color : "#888" }]}>
              {expr.label}
            </Text>
            <Text style={styles.chipSub}>{expr.sub}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Action area */}
      <View style={styles.actionArea}>
        <View style={styles.actionRow}>
          {/* Send button: Large, animated, haptic-powered. Focal point of teh interface */}
          <Animated.View style={{ transform:[{ scale:btnScale }] }}>
            <TouchableOpacity
              style={[styles.broBtn, sending && styles.broBtnSent]}
              onPress={pressBro}
              activeOpacity={0.85}
            >
              <Text style={[styles.broBtnLbl, sending && { color:"#2e2e2e" }]}>
                {sending ? "…" : selectedExpr.label}
              </Text>
              {!sending && <Text style={styles.broBtnSub}>{selectedExpr.sub}</Text>}
            </TouchableOpacity>
          </Animated.View>

          {/* Side actions: Open bronation modal, ping, or set as bro-mance — secondary layer */}
          <View style={styles.sideBtns}>
            <TouchableOpacity
              style={[styles.sideBtn, styles.sideBtnNation]}
              onPress={() => { setDonateOpen(true); setSelectedAmount(null); }}
              activeOpacity={0.7}
            >
              <Text style={styles.sideBtnLbl}>💰 BRO-NATION</Text>
              <Text style={styles.sideBtnSub}>Send Bro Bucks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideBtn} onPress={() => showToast(`Bro 2 Bro ping → ${bro.name} ↔️`)} activeOpacity={0.7}>
              <Text style={styles.sideBtnLbl}>↔️ BRO 2 BRO</Text>
              <Text style={styles.sideBtnSub}>Direct bro ping</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideBtn} onPress={() => showToast(`${bro.name} is your Bro-mance! ❤️`)} activeOpacity={0.7}>
              <Text style={styles.sideBtnLbl}>❤️ BRO-MANCE</Text>
              <Text style={styles.sideBtnSub}>Set as top bro</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.hint}>{sending ? "BRO RECEIVED IT, BRO" : "PICK A BRO · TAP TO SEND"}</Text>
      </View>

      {/* Bronation Modal: Bottom sheet interface for sending Bro Bucks. Fast, focused, no distraction */}
      {donateOpen && (
        <TouchableOpacity style={styles.overlay} onPress={() => setDonateOpen(false)} activeOpacity={1}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>💰 BRO-NATION</Text>
            <Text style={styles.modalSub}>
              Send Bro Bucks to {bro.name} · Wallet: {formatBB(broBucks)}
            </Text>

            {/* Amount selector: Show all presets. Disable those out of reach — clear, instant feedback */}
            {BRONATION_AMOUNTS.map((amt) => {
              const canAfford = broBucks >= amt.bucks;
              const recipientBB = calcRecipientAmount(amt.bucks);
              return (
                <TouchableOpacity
                  key={amt.id}
                  style={[
                    styles.amtRow,
                    selectedAmount?.id === amt.id && styles.amtRowSel,
                    !canAfford && styles.amtRowDisabled,
                  ]}
                  onPress={() => canAfford && setSelectedAmount(amt)}
                >
                  <Text style={{ fontSize:22 }}>{amt.badge}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={[styles.amtLabel, !canAfford && { color:"#333" }]}>{amt.label}</Text>
                    <Text style={styles.amtEquiv}>{amt.usdEquiv} value · {formatBB(recipientBB)} delivered</Text>
                  </View>
                  <Text style={[styles.amtBB, !canAfford && { color:"#333" }]}>{amt.display}</Text>
                  {!canAfford && (
                    <Text style={styles.amtNope}>LOW</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Platform fee disclosure: Apple §3.1.1 & Google Play require transparency. Show what recepient actually gets */}
            <Text style={styles.feeDisclosure}>
              A {PLATFORM_FEE_LABEL} platform fee applies to all Bro-nations.{"\n"}
              Recipient receives 70% of the amount sent.
            </Text>

            {broBucks < BRONATION_AMOUNTS[0].bucks ? (
              <TouchableOpacity
                style={styles.topUpBtn}
                onPress={() => { setDonateOpen(false); onGoWallet(); }}
              >
                <Text style={styles.topUpTxt}>💰 TOP UP BRO BUCKS FIRST, BRO</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendBtn, !selectedAmount && { opacity:0.2 }]}
                onPress={doNation}
                disabled={!selectedAmount}
              >
                <Text style={styles.sendTxt}>
                  {selectedAmount
                    ? `SEND ${selectedAmount.display} TO ${bro.name.toUpperCase()} (${formatBB(calcRecipientAmount(selectedAmount.bucks))} DELIVERED)`
                    : "PICK AN AMOUNT, BRO"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setDonateOpen(false)} style={{ marginTop:6, alignItems:"center" }}>
              <Text style={{ fontFamily:"BebasNeue_400Regular", fontSize:15, color:"#3a3a3a", letterSpacing:2 }}>
                NAH BRO
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex:1, backgroundColor:"#0d0d0d" },
  header:         { flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:18, paddingTop:6, paddingBottom:13, borderBottomWidth:1, borderBottomColor:"#181818" },
  back:           { fontSize:28, color:"#fff" },
  chatName:       { fontFamily:"BebasNeue_400Regular", fontSize:24, color:"#fff", letterSpacing:2 },
  chatSub:        { fontSize:8, color:"#3a3a3a", letterSpacing:1.5, marginTop:1 },
  walletPill:     { backgroundColor:"#111", borderWidth:1, borderColor:"#2a2a2a", borderRadius:16, paddingHorizontal:8, paddingVertical:4 },
  walletPillTxt:  { fontFamily:"BebasNeue_400Regular", fontSize:11, color:"#ffe066", letterSpacing:1 },
  msgs:           { paddingHorizontal:18, paddingTop:14, paddingBottom:8, gap:9 },
  msgRow:         { flexDirection:"row" },
  msgRowMe:       { justifyContent:"flex-end" },
  bubble:         { backgroundColor:"#1c1c1c", borderRadius:20, paddingHorizontal:16, paddingVertical:8, maxWidth:220 },
  bubbleMe:       { backgroundColor:"#fff" },
  broText:        { fontFamily:"BebasNeue_400Regular", fontSize:20, letterSpacing:2 },
  broTime:        { fontSize:9, color:"#3a3a3a", marginTop:2 },
  broTimeMe:      { color:"#aaa", textAlign:"right" },
  nationBubble:   { backgroundColor:"#0d1a00", borderWidth:1, borderColor:"#1e3a00" },
  nationAmt:      { fontFamily:"BebasNeue_400Regular", fontSize:22, color:"#ffe066", letterSpacing:2 },
  nationLbl:      { fontSize:8, color:"#2a4a00", letterSpacing:2, marginTop:2 },
  pickerRow:      { flexGrow:0, paddingVertical:8, borderTopWidth:1, borderTopColor:"#141414" },
  chip:           { backgroundColor:"#181818", borderWidth:1.5, borderColor:"#252525", borderRadius:20, paddingHorizontal:12, paddingVertical:5 },
  chipActive:     { borderColor:"#fff", backgroundColor:"#252525" },
  chipLbl:        { fontFamily:"BebasNeue_400Regular", fontSize:13, letterSpacing:1 },
  chipSub:        { fontSize:8, color:"#3a3a3a", letterSpacing:1, marginTop:1 },
  actionArea:     { paddingHorizontal:16, paddingTop:6, paddingBottom:12, alignItems:"center", gap:8, borderTopWidth:1, borderTopColor:"#141414" },
  actionRow:      { flexDirection:"row", alignItems:"center", gap:10, width:"100%" },
  broBtn:         { width:130, height:130, borderRadius:65, backgroundColor:"#fff", alignItems:"center", justifyContent:"center" },
  broBtnSent:     { backgroundColor:"#1c1c1c" },
  broBtnLbl:      { fontFamily:"BebasNeue_400Regular", fontSize:22, color:"#000", letterSpacing:2, textAlign:"center", paddingHorizontal:8 },
  broBtnSub:      { fontSize:7, color:"#888", letterSpacing:1.5, marginTop:3, textAlign:"center" },
  sideBtns:       { flex:1, gap:7 },
  sideBtn:        { backgroundColor:"#141414", borderWidth:1, borderColor:"#202020", borderRadius:13, paddingHorizontal:12, paddingVertical:9 },
  sideBtnNation:  { borderColor:"#2a2a00", backgroundColor:"#111100" },
  sideBtnLbl:     { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#fff", letterSpacing:1.5 },
  sideBtnSub:     { fontSize:8, color:"#3a3a3a", letterSpacing:1.5, marginTop:2 },
  hint:           { fontSize:9, color:"#262626", letterSpacing:3 },
  overlay:        { position:"absolute", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(0,0,0,0.88)", justifyContent:"flex-end" },
  sheet:          { backgroundColor:"#0f0f0f", borderTopLeftRadius:26, borderTopRightRadius:26, borderTopWidth:1, borderTopColor:"#202020", padding:18, paddingBottom:36 },
  handle:         { width:34, height:4, backgroundColor:"#252525", borderRadius:2, alignSelf:"center", marginBottom:14 },
  modalTitle:     { fontFamily:"BebasNeue_400Regular", fontSize:28, color:"#ffe066", letterSpacing:2 },
  modalSub:       { fontSize:11, color:"#444", letterSpacing:1, marginBottom:14, marginTop:2 },
  amtRow:         { flexDirection:"row", alignItems:"center", gap:11, padding:11, backgroundColor:"#161616", borderWidth:1, borderColor:"#202020", borderRadius:13, marginBottom:7 },
  amtRowSel:      { borderColor:"#ffe066" },
  amtRowDisabled: { opacity:0.45 },
  amtLabel:       { fontFamily:"BebasNeue_400Regular", fontSize:17, color:"#fff", letterSpacing:1 },
  amtEquiv:       { fontSize:9, color:"#444", marginTop:1 },
  amtBB:          { fontFamily:"BebasNeue_400Regular", fontSize:17, color:"#ffe066" },
  amtNope:        { fontFamily:"BebasNeue_400Regular", fontSize:9, color:"#d63031", letterSpacing:1, backgroundColor:"#1a0000", borderRadius:6, paddingHorizontal:5, paddingVertical:2 },
  topUpBtn:       { backgroundColor:"#111", borderWidth:1, borderColor:"#ffe066", borderRadius:13, height:48, alignItems:"center", justifyContent:"center", marginTop:4 },
  topUpTxt:       { fontFamily:"BebasNeue_400Regular", fontSize:14, color:"#ffe066", letterSpacing:1.5 },
  sendBtn:        { backgroundColor:"#ffe066", borderRadius:13, height:48, alignItems:"center", justifyContent:"center", marginTop:4 },
  sendTxt:        { fontFamily:"BebasNeue_400Regular", fontSize:14, color:"#000", letterSpacing:1.5 },
  feeDisclosure:  { fontSize:9, color:"#333", letterSpacing:0.5, textAlign:"center", marginTop:4, lineHeight:14 },
});
