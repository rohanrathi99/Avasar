import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as notificationsApi from "@/api/notifications";

// The last Expo push token we registered, so we can unregister it at logout
// (while the session is still valid).
let lastToken: string | null = null;

function getProjectId(): string | undefined {
  const fromExtra = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;
  const fromEasConfig = (Constants as { easConfig?: { projectId?: string } })
    .easConfig?.projectId;
  return fromExtra ?? fromEasConfig;
}

function currentPlatform(): notificationsApi.PushPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Application updates",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Requests permission and resolves the Expo push token, or null when push isn't
 * possible (simulator, denied permission, or no EAS project configured yet).
 */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // Push tokens aren't issued on simulators.
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return null;

  const projectId = getProjectId();
  if (!projectId) return null; // Push is disabled until `eas init` sets this.

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    lastToken = data;
    return data;
  } catch {
    return null;
  }
}

/** Registers this device's push token with the backend (best-effort). */
export async function registerDeviceWithBackend(): Promise<void> {
  const token = await getPushToken();
  if (!token) return;
  try {
    await notificationsApi.registerPushToken({
      token,
      platform: currentPlatform(),
    });
  } catch {
    // Best-effort — a failed registration just means no pushes this session.
  }
}

/**
 * Unregisters the last token from the backend. Call this BEFORE clearing the
 * auth session, while the request can still authenticate.
 */
export async function unregisterCurrentPushToken(): Promise<void> {
  const token = lastToken;
  if (!token) return;
  lastToken = null;
  try {
    await notificationsApi.unregisterPushToken({ token });
  } catch {
    // Best-effort.
  }
}
