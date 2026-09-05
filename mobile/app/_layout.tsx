import "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, SplashScreen, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { LoadingView } from "@/components/States";
import { queryClient } from "@/query/queryClient";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore: splash may already be hidden in fast-refresh.
});

/**
 * Redirects between the (auth) and (tabs) groups based on session status.
 * This is the single navigation guard for the whole app — protected routes
 * live under (tabs); unauthenticated users are always sent to (auth).
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    void SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === "(auth)";
    if (status === "signedOut" && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (status === "signedIn" && inAuthGroup) {
      router.replace("/(tabs)/jobs");
    }
  }, [status, segments, router]);

  if (status === "loading") {
    return <LoadingView label="Restoring your session…" />;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
            <AuthProvider>
              <StatusBar style={scheme === "dark" ? "light" : "dark"} />
              <AuthGate>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="job/[id]" options={{ headerShown: true }} />
                </Stack>
              </AuthGate>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
