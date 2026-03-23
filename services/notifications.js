/**
 * notifications.js — Push Notification Service
 * ───────────────────────────────────────────────────────────────────────────
 * Uses expo-notifications for local + push notifications.
 *
 * Notification types:
 *   - bro_received:    Someone bro'd you
 *   - bronation:       Someone sent you Bro Bucks
 *   - brocoin_mint:    You won a BroCoin
 *   - bro_request:     Someone wants to be your bro
 *   - brocast:         A bro sent a broadcast
 *   - broximity:       A bro is nearby
 *
 * Push tokens are stored in Firestore user docs for server-side sending.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";

// ── Notification channel setup (Android) ─────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

// ── Permission & Token Registration ──────────────────────────────────────

/**
 * Request notification permissions and register push token.
 * Stores the Expo push token in the user's Firestore profile.
 *
 * @param {string} uid - Firebase UID of the current user
 * @returns {{ success, token } | { success, error }}
 */
export async function registerForPushNotifications(uid) {
  // Permission flow — iOS & Android handle differently under hood, Expo handles it.
  if (!Device.isDevice) {
    console.log("[Notifications] Must use physical device for push");
    return { success: false, error: "Push requires a physical device." };
  }

  try {
    // Check existing status — might already be granted, saves a prompt.
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return { success: false, error: "Notification permission denied." };
    }

    // Get Expo push token — unique per app install. Send this to backend for server-side push.
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "YOUR-EAS-PROJECT-ID-HERE", // Replace with eas.json projectId
    });
    const pushToken = tokenData.data;

    // Android notification channel setup — controls vibration, sound, importance.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("bro-alerts", {
        name: "Bro Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FFE066",
        sound: "default",
      });
    }

    // Store token in Firestore — enables Cloud Functions to push to this user.
    if (uid) {
      await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
        pushToken,
        pushTokenUpdatedAt: new Date().toISOString(),
        pushPlatform: Platform.OS,
      });
    }

    return { success: true, token: pushToken };
  } catch (error) {
    console.warn("[Notifications] Registration failed:", error.message);
    return { success: false, error: "Failed to register for notifications." };
  }
}

// ── Local Notifications ──────────────────────────────────────────────────

/**
 * Show a local notification immediately.
 */
export async function showLocalNotification({ title, body, data = {} }) {
  // Local notification scheduling — fires on device, no server needed.
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: "bro-alerts" } : {}),
    },
    trigger: null, // Immediately — null = right now.
  });
}

/**
 * Show a BroCoin mint notification (private — only to the winner).
 */
export async function showBroCoinMintNotification(milestone) {
  await showLocalNotification({
    title: "🪙 BroCoin Dropped!",
    body:  `BroCoin #${milestone} just landed in your wallet!`,
    data:  { type: "brocoin_mint", milestone },
  });
}

/**
 * Show a bro-nation received notification.
 */
export async function showBroNationNotification(fromName, amountDisplay) {
  await showLocalNotification({
    title: "💰 Bro-Nation Received!",
    body:  `${fromName} sent you ${amountDisplay}`,
    data:  { type: "bronation" },
  });
}

/**
 * Show a new bro request notification.
 */
export async function showBroRequestNotification(fromName) {
  await showLocalNotification({
    title: "🤜 New Bro Request",
    body:  `${fromName} wants to be your bro!`,
    data:  { type: "bro_request" },
  });
}

// ── Listeners ────────────────────────────────────────────────────────────

/**
 * Add a listener for when a notification is received while app is in foreground.
 * Returns an unsubscribe function.
 */
export function onNotificationReceived(callback) {
  // Listener pattern — fires when notification arrives while app active.
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return () => subscription.remove();
}

/**
 * Add a listener for when user taps a notification.
 * Returns an unsubscribe function.
 */
export function onNotificationTapped(callback) {
  // Listener for user interaction — tap opens app and routes based on notification data.
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      callback(data);
    }
  );
  return () => subscription.remove();
}

/**
 * Get the notification that launched the app (if any).
 */
export async function getInitialNotification() {
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification?.request?.content?.data || null;
}

/**
 * Clear badge count.
 */
export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}
