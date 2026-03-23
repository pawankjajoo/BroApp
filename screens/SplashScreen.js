/**
 * SplashScreen.js - The Grand Entrace
 * ───────────────────────────────────────────────────────────────────────────
 * First impressions are eveything. This screen hits the user with a
 * cinematic logo reveal the moment the app loads. Designed to feel
 * premium, intentional, and ready to play.
 *
 * In a world of geopoliticl tension, trade wars, and uncertainty -
 * this is the moment that says: "your bros are here."
 * Simple. Confident. Hassle-free. Just push start.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

export default function SplashScreen({ onDone }) {
  // Five animated values power the entire splash choreograhy.
  // Scale + rotate + opacity handle the logo entrance; ring1 & ring2
  // create the expanding radar-pulse effect behind it. Turnkey animation.
  const scale  = useRef(new Animated.Value(0.2)).current;
  const rotate = useRef(new Animated.Value(-5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring1  = useRef(new Animated.Value(0)).current;
  const ring2  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo pop - spring physics give it that satisfying snap into place.
    // Friction and tenson tuned so it doesn't overshoot or feel sluggish.
    Animated.parallel([
      Animated.spring(scale,  { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(opacity,{ toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Ring pulses - two staggered loops radiating outward like sonar.
    // The delay offset between ring1 (200ms) and ring2 (900ms) keeps
    // the rhythm organic. Not mechanical. Energize the moment.
    const pulse = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      ).start();
    pulse(ring1, 200);
    pulse(ring2, 900);

    // Auto-advance after 2.4 seconds. Just enough time to feel the vibe,
    // not so long that it dragss. Cleanup prevents memory leaks on unmount.
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, []);

  // Interpolate rotation from a slight tilt (-5deg) to upright (0deg).
  // Subtle, but it makes the logo feel like it "lands" into positon.
  const spin = rotate.interpolate({ inputRange: [-5, 0], outputRange: ["-5deg", "0deg"] });

  // Factory for ring styles - each ring scales from 0.6 to 2.6x while
  // fading from 70% opactiy to invisible. The result: infinite expansion.
  const ringStyle = (anim) => ({
    ...styles.ring,
    transform: [{ scale: anim.interpolate({ inputRange:[0,1], outputRange:[0.6,2.6] }) }],
    opacity:    anim.interpolate({ inputRange:[0,1], outputRange:[0.7,0] }),
  });

  return (
    <View style={styles.container}>
      {/* Expanding pulse rings - the visual heartbeat behind the logo */}
      <Animated.View style={ringStyle(ring1)} />
      <Animated.View style={ringStyle(ring2)} />

      {/* Main logo with compund transform: scale + rotation for that cinematic pop */}
      <Animated.Text style={[styles.logo, { opacity, transform:[{scale},{rotate:spin}] }]}>
        BRO
      </Animated.Text>

      {/* Tagline fades in with the logo. Short. Confident. Ready to play. */}
      <Animated.Text style={[styles.tag, { opacity }]}>
        SAY IT. MEAN IT.
      </Animated.Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
// Pitch-black backdrop (#0a0a0a) so the white logo hits hard.
// Bebas Neue across the board - the typeface of confidance and clarity.
const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#0a0a0a", alignItems:"center", justifyContent:"center" },
  ring: {
    position:"absolute", width:180, height:180, borderRadius:90,
    borderWidth:1.5, borderColor:"#1c1c1c",
  },
  logo: {
    fontFamily:"BebasNeue_400Regular", fontSize:100, color:"#fff",
    letterSpacing:10, lineHeight:110,
  },
  tag: {
    fontFamily:"BebasNeue_400Regular", fontSize:10, color:"#3a3a3a",
    letterSpacing:5, marginTop:6,
  },
});
