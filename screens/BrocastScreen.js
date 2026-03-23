
import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { BRO_EXPRESSIONS } from "../constants/bro";

export default function BrocastScreen({ broCount, onBrocast }) {
  const [sent, setSent] = useState(false);
  // Scale animation for broadcast button . premium haptic feedback with visual punch
  const scale = useRef(new Animated.Value(1)).current;
  const BRO_COUNT = 6;

  const doBrocast = () => {
    if (sent) return;
    // Heavy haptic feedback: users FEEL the broadcast hit. Unmistakeable
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Button animation: compress hard, release fast. Energizes the moment
    Animated.sequence([
      Animated.timing(scale, { toValue:0.94, duration:80,  useNativeDriver:true }),
      Animated.timing(scale, { toValue:1,    duration:200, useNativeDriver:true }),
    ]).start();
    setSent(true);
    // Random expression selected, broadcast to all bros instantly
    const expr = BRO_EXPRESSIONS[Math.floor(Math.random() * BRO_EXPRESSIONS.length)];
    onBrocast(expr);
    // Reset after 3s so user can broadcast again immediately if they want
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BRO-CAST</Text>
        <Text style={styles.sub}>BROADCAST · ONE BRO TO RULE THEM ALL</Text>
      </View>
      <View style={styles.body}>
        {/* Counter: Perpetual tally of brocasts sent. Social proof . build momentum */}
        <View>
          <Text style={styles.count}>{broCount.toLocaleString()}</Text>
          <Text style={styles.countLbl}>TOTAL BROS SENT</Text>
        </View>
        {/* The broadcast button: Massive, responsive, singular focus. Everything leads here */}
        <Animated.View style={{ transform:[{ scale }] }}>
          <TouchableOpacity
            style={[styles.castBtn, sent && styles.castBtnSent]}
            onPress={doBrocast}
            activeOpacity={0.85}
          >
            <Text style={styles.castIcon}>📡</Text>
            <Text style={[styles.castLbl, sent && { color:"#2e2e2e" }]}>
              {sent ? "SENT!" : "BRO-CAST"}
            </Text>
            <Text style={[styles.castSub, sent && { color:"#222" }]}>
              {sent ? `All ${BRO_COUNT} bros notified` : `Bro all ${BRO_COUNT} of your bros`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        {/* Mantra: Distilled to essense. Clarity over complexity */}
        <Text style={styles.info}>{"One tap. All your bros. One word.\nBro."}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#0d0d0d" },
  header:    { paddingHorizontal:20, paddingTop:8, paddingBottom:13, borderBottomWidth:1, borderBottomColor:"#181818" },
  title:     { fontFamily:"BebasNeue_400Regular", fontSize:40, color:"#fff", letterSpacing:3 },
  sub:       { fontSize:10, color:"#3a3a3a", letterSpacing:2, marginTop:2 },
  body:      { flex:1, alignItems:"center", justifyContent:"center", padding:24, gap:22 },
  count:     { fontFamily:"BebasNeue_400Regular", fontSize:56, color:"#fff", letterSpacing:2, textAlign:"center" },
  countLbl:  { fontSize:9, color:"#2e2e2e", letterSpacing:3, textAlign:"center", marginTop:-8 },
  castBtn:   { width:210, height:210, borderRadius:105, backgroundColor:"#fff", alignItems:"center", justifyContent:"center", shadowColor:"#fff", shadowOpacity:0.07, shadowRadius:40 },
  castBtnSent:{ backgroundColor:"#1c1c1c" },
  castIcon:  { fontSize:44, marginBottom:4 },
  castLbl:   { fontFamily:"BebasNeue_400Regular", fontSize:34, letterSpacing:3, color:"#000" },
  castSub:   { fontSize:10, letterSpacing:1.5, color:"#555", marginTop:3 },
  info:      { fontSize:12, color:"#3a3a3a", textAlign:"center", letterSpacing:0.5, lineHeight:20 },
});
