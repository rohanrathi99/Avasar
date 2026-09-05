import { downloadAndShareFile } from "@/utils/download";

function ensurePdfName(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

/**
 * Downloads an authenticated PDF endpoint and opens the native share sheet
 * (preview / "Open in…"). Thin wrapper over the shared file downloader.
 */
export async function downloadAndSharePdf(
  endpoint: string,
  fileName: string,
): Promise<void> {
  await downloadAndShareFile(endpoint, ensurePdfName(fileName), {
    mimeType: "application/pdf",
    uti: "com.adobe.pdf",
  });
}
