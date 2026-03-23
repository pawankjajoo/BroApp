
import React from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
} from "react-native";

export default function HomeScreen({ bros, onOpenChat }) {
  const totalUnread = bros.reduce((a, b) => a + b.unread, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BRO</Text>
        <Text style={styles.sub}>YOUR BROS · {totalUnread} NEW BRO-TIFICATIONS</Text>
      </View>
      {/* Bro roster */}
      <FlatList
        data={bros}
        keyExtractor={(b) => String(b.id)}
        renderItem={({ item: bro }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => onOpenChat(bro)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{bro.avatar}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{bro.name}</Text>
              <Text style={styles.meta}>
                BRO · {bro.lastBro} · {bro.broCount || 0} bros
              </Text>
            </View>
            {bro.unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{bro.unread}</Text>
              </View>
            ) : (
              <Text style={styles.lastBro}>{bro.lastBro}</Text>
            )}
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex:1, backgroundColor:"#0d0d0d" },
  header:      { paddingHorizontal:20, paddingTop:8, paddingBottom:13, borderBottomWidth:1, borderBottomColor:"#181818" },
  title:       { fontFamily:"BebasNeue_400Regular", fontSize:40, color:"#fff", letterSpacing:3 },
  sub:         { fontSize:10, color:"#3a3a3a", letterSpacing:2, marginTop:2 },
  row:         { flexDirection:"row", alignItems:"center", paddingHorizontal:20, paddingVertical:13, borderBottomWidth:1, borderBottomColor:"#151515" },
  avatar:      { width:50, height:50, borderRadius:25, backgroundColor:"#1a1a1a", borderWidth:1.5, borderColor:"#222", alignItems:"center", justifyContent:"center" },
  avatarEmoji: { fontSize:22 },
  info:        { flex:1, paddingHorizontal:12 },
  name:        { fontFamily:"BebasNeue_400Regular", fontSize:22, color:"#fff", letterSpacing:1 },
  meta:        { fontSize:10, color:"#444", marginTop:1 },
  badge:       { width:22, height:22, borderRadius:11, backgroundColor:"#fff", alignItems:"center", justifyContent:"center" },
  badgeTxt:    { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#000" },
  lastBro:     { fontSize:10, color:"#2a2a2a" },
});
