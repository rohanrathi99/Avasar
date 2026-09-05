// Mock expo-secure-store with an in-memory store so auth logic is testable.
jest.mock("expo-secure-store", () => {
  const store = new Map();
  return {
    WHEN_UNLOCKED: "whenUnlocked",
    setItemAsync: jest.fn(async (k, v) => {
      store.set(k, v);
    }),
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    deleteItemAsync: jest.fn(async (k) => {
      store.delete(k);
    }),
  };
});

// expo-constants is provided by jest-expo, but pin a predictable API URL.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "0.1.0", extra: { apiUrl: "http://test.local:3001" } } },
}));

// Native file/share modules are stubbed so pure helpers that import them load.
jest.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { Base64: "base64" },
  downloadAsync: jest.fn(async () => ({ status: 200, uri: "file:///cache/f" })),
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 10 })),
  readAsStringAsync: jest.fn(async () => ""),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));
