import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { currentAuthHeader } from "@/api/http";
import { apiUrl } from "@/config/env";

function safeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  const withExt = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
  return withExt || "resume.pdf";
}

/**
 * Downloads an authenticated PDF endpoint to the app cache and opens the native
 * share sheet (which also provides preview / "Open in…" on both platforms).
 *
 * The PDF routes require the bearer token and send `Cache-Control: no-store`, so
 * we pass the Authorization header and a `v=` cache-buster explicitly.
 */
export async function downloadAndSharePdf(
  endpoint: string,
  fileName: string,
): Promise<void> {
  const header = currentAuthHeader();
  const target = `${FileSystem.cacheDirectory ?? ""}${safeFileName(fileName)}`;
  const bust = `v=${Date.now()}`;
  const url = `${apiUrl(endpoint)}${endpoint.includes("?") ? "&" : "?"}${bust}`;

  const result = await FileSystem.downloadAsync(url, target, {
    headers: header ? { Authorization: header } : {},
  });

  if (result.status === 401) {
    throw new Error("Your session expired. Please sign in again.");
  }
  if (result.status === 404) {
    throw new Error("No PDF is available yet. Generate it first.");
  }
  if (result.status !== 200) {
    throw new Error(`Couldn't download the PDF (status ${result.status}).`);
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: fileName,
  });
}
