import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as authApi from "@/api/auth";
import { configureApiAuth } from "@/api/http";
import type { AuthUser } from "@/api/types";
import { unregisterCurrentPushToken } from "@/notifications/registration";
import { queryClient } from "@/query/queryClient";
import { clearToken, loadToken, saveToken } from "./secureStore";
import { isTokenExpired } from "./token";

type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  runSetup: (
    username: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  runSignup: (
    username: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  // Kept in a ref so the API bridge's getToken() always reads the latest value.
  const tokenRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    setUser(null);
    setStatus("signedOut");
    queryClient.clear();
    await clearToken();
  }, []);

  // Register the API client's token getter + 401 handler exactly once.
  useEffect(() => {
    configureApiAuth({
      getToken: () => tokenRef.current,
      onUnauthorized: () => {
        // Fire-and-forget: an in-flight request 401'd; drop to the sign-in gate.
        void clearSession();
      },
    });
  }, [clearSession]);

  const establishSession = useCallback(async (token: string) => {
    tokenRef.current = token;
    await saveToken(token);
    const me = await authApi.getMe();
    if (!me.user || me.user.isDisabled) {
      throw new Error("Account unavailable.");
    }
    setUser(me.user);
    setStatus("signedIn");
  }, []);

  // Restore a persisted session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadToken();
      if (cancelled) return;
      if (!stored || isTokenExpired(stored)) {
        await clearSession();
        return;
      }
      tokenRef.current = stored;
      try {
        const me = await authApi.getMe();
        if (cancelled) return;
        if (!me.user || me.user.isDisabled) {
          await clearSession();
          return;
        }
        setUser(me.user);
        setStatus("signedIn");
      } catch {
        if (!cancelled) await clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const { token } = await authApi.login({ username, password });
      await establishSession(token);
    },
    [establishSession],
  );

  const runSetup = useCallback(
    async (username: string, password: string, displayName?: string) => {
      const { token, user: created } = await authApi.setup({
        username,
        password,
        displayName,
      });
      tokenRef.current = token;
      await saveToken(token);
      setUser(created);
      setStatus("signedIn");
    },
    [],
  );

  const runSignup = useCallback(
    async (username: string, password: string, displayName?: string) => {
      const { token, user: created } = await authApi.signup({
        username,
        password,
        displayName,
      });
      tokenRef.current = token;
      await saveToken(token);
      setUser(created);
      setStatus("signedIn");
    },
    [],
  );

  const signOut = useCallback(async () => {
    // Drop the device push token while the session can still authenticate.
    await unregisterCurrentPushToken();
    try {
      await authApi.logout();
    } catch {
      // Best-effort server revocation; always clear locally regardless.
    }
    await clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, runSetup, runSignup, signOut }),
    [status, user, signIn, runSetup, runSignup, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
