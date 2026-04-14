
import React, { useRef, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Animated,
} from "react-native";
import { NEARBY_BROS } from "../constants/bro";

export default function BroximityScreen({ showToast }) {
  // Animated radar sweep: rotates 360° every 3 seconds. Continuous loop builds tension.  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(sweep, { toValue:1, duration:3000, useNativeDriver:true })
    ).start();
  }, []);

  // Convert 0–1 sweep value into 360° rotation. Smooth continuous spin effect.  const spin = sweep.interpolate({ inputRange:[0,1], outputRange:["0deg","360deg"] });

  // Signal bars: 5 levels of strength. Filled bars for signal level, empty for the rest.  // Builds visual clarity. At-a-glance bro range assessment.  const renderSignal = (n) =>
    Array.from({ length:5 }).map((_, i) => (
      <View key={i} style={[styles.signal, { height:6+i*2, backgroundColor: i < n ? "#fff" : "#2a2a2a" }]} />
    ));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BRO-XIMITY</Text>
        <Text style={styles.sub}>PROXIMITY · BROS WITHIN BRO-RANGE</Text>
      </View>
      <View style={styles.radarWrap}>
        <View style={styles.radar}>
          {/* Radar grid rings: 3 concentric circles for visual range breakdowns */}
          <View style={[styles.rRing, { width:"48%", height:"48%" }]} />
          <View style={[styles.rRing, { width:"74%", height:"74%" }]} />
          <View style={[styles.rRing, { width:"100%", height:"100%" }]} />

          {/* Animated sweep: the spinning searchlight. 360° rotation, teh heartbeat of bro-ximity */}
          <Animated.View style={[styles.sweep, { transform:[{ rotate:spin }] }]} />

          {/* Center dot: you are here. Premiem positioning, white glow. */}
          <View style={styles.rMe} />

          {/* Radar targets: positioned bros within range. Static dots for eveything else. */}
          {[{top:"22%",left:"62%"},{top:"58%",left:"74%"},{top:"68%",left:"34%"},{top:"28%",left:"28%"}].map((p,i)=>(
            <View key={i} style={[styles.rDot, { top:p.top, left:p.left }]} />
          ))}
        </View>
      </View>
      <FlatList
        data={NEARBY_BROS}
        keyExtractor={(n) => String(n.id)}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: n }) => (
          <View style={styles.row}>
            {/* Bro avatar: quick visual recongition */}
            <View style={[styles.avatar, { width:44, height:44, borderRadius:22 }]}>
              <Text style={{ fontSize:18 }}>{n.avatar}</Text>
            </View>

            {/* Bro details: name, distance, signal strength. Scanable at a glance. */}
            <View style={styles.info}>
              <Text style={styles.name}>{n.name}</Text>
              <View style={{ flexDirection:"row", alignItems:"center", gap:4 }}>
                <Text style={styles.dist}>📍 {n.dist}</Text>
                <View style={{ flexDirection:"row", alignItems:"flex-end" }}>{renderSignal(n.signal)}</View>
              </View>
            </View>

            {/* Ping button: reach out instantly. Direct action, no friction. */}
            <TouchableOpacity
              style={styles.pingBtn}
              onPress={() => showToast(`Bro-ximity bro → ${n.name} 📍`)}
            >
              <Text style={styles.pingLbl}>BRO</Text>
            </TouchableOpacity>
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
  radarWrap:  { alignItems:"center", padding:18 },
  radar:      { width:190, height:190, borderRadius:95, borderWidth:1.5, borderColor:"#1a1a1a", backgroundColor:"#0a0a0a", alignItems:"center", justifyContent:"center", position:"relative" },
  rRing:      { position:"absolute", borderRadius:999, borderWidth:1, borderColor:"#181818" },
  sweep:      { position:"absolute", width:"100%", height:"100%", borderRadius:95, borderTopWidth:1.5, borderTopColor:"rgba(255,255,255,0.07)", borderLeftWidth:0, borderRightWidth:0, borderBottomWidth:0 },
  rMe:        { width:9, height:9, borderRadius:5, backgroundColor:"#fff", shadowColor:"#fff", shadowOpacity:0.6, shadowRadius:4 },
  rDot:       { position:"absolute", width:7, height:7, borderRadius:4, backgroundColor:"#fff" },
  row:        { flexDirection:"row", alignItems:"center", paddingHorizontal:20, paddingVertical:11, borderBottomWidth:1, borderBottomColor:"#141414" },
  avatar:     { backgroundColor:"#1a1a1a", borderWidth:1.5, borderColor:"#222", alignItems:"center", justifyContent:"center" },
  info:       { flex:1, paddingHorizontal:11 },
  name:       { fontFamily:"BebasNeue_400Regular", fontSize:20, color:"#fff", letterSpacing:1 },
  dist:       { fontSize:10, color:"#444" },
  signal:     { width:3, borderRadius:1, marginLeft:1 },
  pingBtn:    { backgroundColor:"#fff", borderRadius:20, paddingHorizontal:14, paddingVertical:6 },
  pingLbl:    { fontFamily:"BebasNeue_400Regular", fontSize:13, color:"#000", letterSpacing:1 },
});
