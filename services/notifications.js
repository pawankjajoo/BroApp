
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

export async function registerForPushNotifications(uid) {
  // Permission flow . iOS & Android handle differently under hood, Expo handles it.  if (!Device.isDevice) {
    console.log("[Notifications] Must use physical device for push");
    return { success: false, error: "Push requires a physical device." };
  }

  try {
    // Check existing status . might already be granted, saves a prompt.    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return { success: false, error: "Notification permission denied." };
    }

      projectId: "YOUR-EAS-PROJECT-ID-HERE", // Replace with eas.json projectId
    });
    const pushToken = tokenData.data;

    // Android notification channel setup . controls vibration, sound, importance.    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("bro-alerts", {
        name: "Bro Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FFE066",
        sound: "default",
      });
    }

    // Store token in Firestore . enables Cloud Functions to push to this user.    if (uid) {
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

export async function showLocalNotification({ title, body, data = {} }) {
  // Local notification scheduling . fires on device, no server needed.  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: "bro-alerts" } : {}),
    },
    trigger: null, // Immediately . null = right now.  });
}

export async function showBroCoinMintNotification(milestone) {
  await showLocalNotification({
    title: "🪙 BroCoin Dropped!",
    body:  `BroCoin #${milestone} just landed in your wallet!`,
    data:  { type: "brocoin_mint", milestone },
  });
}

export async function showBroNationNotification(fromName, amountDisplay) {
  await showLocalNotification({
    title: "💰 Bro-Nation Received!",
    body:  `${fromName} sent you ${amountDisplay}`,
    data:  { type: "bronation" },
  });
}

export async function showBroRequestNotification(fromName) {
  await showLocalNotification({
    title: "🤜 New Bro Request",
    body:  `${fromName} wants to be your bro!`,
    data:  { type: "bro_request" },
  });
}

// ── Listeners ────────────────────────────────────────────────────────────

export function onNotificationReceived(callback) {
  return () => subscription.remove();
}

export function onNotificationTapped(callback) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      callback(data);
    }
  );
  return () => subscription.remove();
}

export async function getInitialNotification() {
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification?.request?.content?.data || null;
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}
