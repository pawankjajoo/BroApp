/**
 * CommunityScreen
 *
 * The global bro feed. Social proof in action. Real-time activity stream of fellow
 * players: who's leveling up, who's winning, who's here. Maximalist transparency.
 * Builds momentum. For anyone. Build community power.
 */

import React from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView } from "react-native";
import { FEED_ITEMS } from "../constants/bro";

export default function CommunityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BRO-MMUNITY</Text>
        <Text style={styles.sub}>COMMUNITY · GLOBAL BRO FEED</Text>
      </View>
      <FlatList
        data={FEED_ITEMS}
        keyExtractor={(i) => String(i.id)}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.feedItem}>
            {/* Avatar: instant visual identity. Quick recognition. */}
            <View style={styles.ava}>
              <Text style={{ fontSize:18 }}>{item.avatar}</Text>
            </View>

            {/* Feed narrative: who did what. Lightweight. Energize the timeline. */}
            <View style={{ flex:1 }}>
              <Text style={styles.from}>{item.from}</Text>
              <Text style={styles.action}>
                {item.action} <Text style={styles.target}>{item.target}</Text>
              </Text>
            </View>

            {/* Timestamp: recency marker. When it happend. Builds momentum narrative. */}
            <Text style={styles.time}>{item.time}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex:1, backgroundColor:"#0d0d0d" },
  header:     { paddingHorizontal:20, paddingTop:8, paddingBottom:13, borderBottomWidth:1, borderBottomColor:"#181818" },
  title:      { fontFamily:"BebasNeue_400Regular", fontSize:40, color:"#fff", letterSpacing:3 },
  sub:        { fontSize:10, color:"#3a3a3a", letterSpacing:2, marginTop:2 },
  feedItem:   { flexDirection:"row", alignItems:"center", gap:12, paddingHorizontal:20, paddingVertical:11, borderBottomWidth:1, borderBottomColor:"#121212" },
  ava:        { width:40, height:40, borderRadius:20, backgroundColor:"#1c1c1c", borderWidth:1.5, borderColor:"#222", alignItems:"center", justifyContent:"center" },
  from:       { fontFamily:"BebasNeue_400Regular", fontSize:18, color:"#fff", letterSpacing:0.5 },
  action:     { fontSize:11, color:"#4a4a4a" },
  target:     { color:"#777" },
  time:       { fontSize:9, color:"#2e2e2e" },
});
