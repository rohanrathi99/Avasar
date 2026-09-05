import Constants from "expo-constants";

/**
 * Resolves the JobOps API base URL.
 *
 * Priority:
 *   1. `EXPO_PUBLIC_API_URL` (inlined at build time by Expo).
 *   2. `extra.apiUrl` from app.config.ts (also runtime-readable).
 *   3. `http://localhost:3001` (the server's default port).
 *
 * The value is a bare origin (no trailing slash, no `/api`); the API client
 * appends `/api` + the endpoint path.
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)
    ?.apiUrl;
  const raw = fromEnv ?? fromExtra ?? "http://localhost:3001";
  return raw.replace(/\/+$/, "");
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
} as const;

/** Full URL for an `/api`-relative endpoint, e.g. `/auth/login`. */
export function apiUrl(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${env.apiBaseUrl}/api${path}`;
}
