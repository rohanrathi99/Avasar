// Pure JWT helpers. No secret is present on the client, so we do NOT verify the
// signature — the server is authoritative. We only decode the public payload to
// read expiry/identity for UX (e.g. skip a doomed /me probe on a stale token).

export interface JwtPayload {
  sub?: string;
  userId?: string;
  tenantId?: string;
  username?: string;
  isSystemAdmin?: boolean;
  exp?: number; // seconds since epoch
  iat?: number;
}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  // `atob` is available in the RN/Hermes runtime; guard for test environments.
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(padded);
  }
  // Node/Jest fallback.
  return Buffer.from(padded, "base64").toString("binary");
}

export function decodeJwt(token: string): JwtPayload | null {
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(segment)) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as JwtPayload) : null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token is missing, unparseable, or expired.
 * `skewSeconds` treats tokens expiring very soon as already expired so we don't
 * fire a request that will 401 in flight.
 */
export function isTokenExpired(token: string | null, skewSeconds = 30): boolean {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSeconds + skewSeconds;
}
