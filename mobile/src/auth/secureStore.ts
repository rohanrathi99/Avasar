import * as SecureStore from "expo-secure-store";

// The JWT is the only sensitive value the app persists. It lives in the OS
// keychain / keystore via Expo Secure Store — never in AsyncStorage or plain
// files.
const TOKEN_KEY = "jobops.authToken";

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function loadToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // Corrupt/unreadable keychain entry — treat as signed out.
    return null;
  }
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}
