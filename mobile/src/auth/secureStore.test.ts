import { clearToken, loadToken, saveToken } from "./secureStore";

// expo-secure-store is mocked with an in-memory Map in jest.setup.js.
describe("secure token storage", () => {
  it("round-trips a token and clears it", async () => {
    expect(await loadToken()).toBeNull();
    await saveToken("abc.def.ghi");
    expect(await loadToken()).toBe("abc.def.ghi");
    await clearToken();
    expect(await loadToken()).toBeNull();
  });
});
