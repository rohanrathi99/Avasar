import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

// The backend rejects uploads over 10 MB; check on-device first for a clear
// error rather than a wasted round-trip.
const MAX_BYTES = 10 * 1024 * 1024;

export interface CapturedFile {
  fileName: string;
  mediaType: string;
  dataBase64: string;
  byteSize: number;
}

async function encode(
  uri: string,
  fileName: string,
  mediaType: string,
): Promise<CapturedFile> {
  const info = await FileSystem.getInfoAsync(uri);
  const byteSize = info.exists ? ((info as { size?: number }).size ?? 0) : 0;
  if (byteSize > MAX_BYTES) {
    throw new Error("That file is larger than the 10 MB limit.");
  }
  const dataBase64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { fileName, mediaType, dataBase64, byteSize };
}

/** Capture a photo of a document with the camera. Returns null if cancelled. */
export async function captureFromCamera(): Promise<CapturedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera access is needed to capture a document.");
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return encode(
    asset.uri,
    asset.fileName ?? `photo-${asset.assetId ?? "capture"}.jpg`,
    asset.mimeType ?? "image/jpeg",
  );
}

/** Pick an existing image from the photo library. */
export async function pickImageFromLibrary(): Promise<CapturedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library access is needed to attach an image.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return encode(
    asset.uri,
    asset.fileName ?? `image-${asset.assetId ?? "library"}.jpg`,
    asset.mimeType ?? "image/jpeg",
  );
}

/** Pick any file (PDF, docx, …) via the system document picker. */
export async function pickDocument(): Promise<CapturedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return encode(
    asset.uri,
    asset.name ?? "document",
    asset.mimeType ?? "application/octet-stream",
  );
}
