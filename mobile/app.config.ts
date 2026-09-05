import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Dynamic Expo config.
 *
 * Only PUBLIC configuration is embedded here. Server secrets (LLM keys, JWT
 * secret, Gmail client secret, DB credentials, etc.) must never appear in this
 * file or in any `EXPO_PUBLIC_*` variable — the mobile app only ever holds a
 * user JWT obtained at runtime from `POST /api/auth/login`.
 *
 * The API base URL is resolved at build time from `EXPO_PUBLIC_API_URL` and
 * mirrored into `extra` so it is also readable via `expo-constants` at runtime.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

// A stable, reversed-domain identifier used for both stores and deep links.
const BUNDLE_ID = process.env.EXPO_PUBLIC_APP_ID ?? "com.jobops.mobile";
const SCHEME = "jobops";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "JobOps",
  slug: "job-ops-mobile",
  version: "0.1.0",
  orientation: "portrait",
  scheme: SCHEME,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  assetBundlePatterns: ["**/*"],
  splash: {
    resizeMode: "contain",
    backgroundColor: "#0B0B0F",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    buildNumber: "1",
    infoPlist: {
      // Bearer-token API traffic goes over HTTPS in production; ATS stays on.
      NSCameraUsageDescription:
        "JobOps uses the camera so you can capture a resume or supporting document to attach to a job.",
      NSPhotoLibraryUsageDescription:
        "JobOps needs photo library access so you can attach an existing document image to a job.",
    },
    associatedDomains: [],
  },
  android: {
    package: BUNDLE_ID,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: "#0B0B0F",
    },
    permissions: ["CAMERA", "READ_EXTERNAL_STORAGE", "POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: SCHEME }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "single",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0B0B0F",
        resizeMode: "contain",
      },
    ],
    [
      "expo-image-picker",
      {
        cameraPermission:
          "JobOps uses the camera so you can capture a document to attach to a job.",
        photosPermission:
          "JobOps needs photo library access so you can attach a document image to a job.",
      },
    ],
    "expo-notifications",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: API_URL,
    eas: {
      // Populated by `eas init`; kept empty so the config is valid pre-init.
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? undefined,
    },
  },
});
