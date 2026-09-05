import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { currentAuthHeader } from "@/api/http";
import { apiUrl } from "@/config/env";

export function sanitizeFileName(name: string, fallback = "download"): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

/**
 * Downloads an authenticated API endpoint to the app cache and opens the native
 * share sheet (which also gives preview / "Open in…"). All JobOps file routes
 * require the bearer token and send `Cache-Control: no-store`, so we attach the
 * Authorization header and a cache-buster.
 */
export async function downloadAndShareFile(
  endpoint: string,
  fileName: string,
  opts?: { mimeType?: string; uti?: string },
): Promise<void> {
  const header = currentAuthHeader();
  const target = `${FileSystem.cacheDirectory ?? ""}${sanitizeFileName(fileName)}`;
  const url = `${apiUrl(endpoint)}${endpoint.includes("?") ? "&" : "?"}v=${Date.now()}`;

  const result = await FileSystem.downloadAsync(url, target, {
    headers: header ? { Authorization: header } : {},
  });

  if (result.status === 401) {
    throw new Error("Your session expired. Please sign in again.");
  }
  if (result.status === 404) {
    throw new Error("This file isn't available yet.");
  }
  if (result.status !== 200) {
    throw new Error(`Couldn't download the file (status ${result.status}).`);
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: opts?.mimeType,
    UTI: opts?.uti,
    dialogTitle: fileName,
  });
}

/** Human-readable byte size, e.g. "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}
