import { decodeJwt, isTokenExpired } from "./token";

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.sig`;
}

describe("decodeJwt", () => {
  it("decodes the payload of a well-formed token", () => {
    const token = makeJwt({ userId: "u1", tenantId: "t1", exp: 123 });
    expect(decodeJwt(token)).toMatchObject({
      userId: "u1",
      tenantId: "t1",
      exp: 123,
    });
  });

  it("returns null for a malformed token", () => {
    expect(decodeJwt("not-a-jwt")).toBeNull();
    expect(decodeJwt("")).toBeNull();
  });
});

describe("isTokenExpired", () => {
  const now = Math.floor(Date.now() / 1000);

  it("treats a missing token as expired", () => {
    expect(isTokenExpired(null)).toBe(true);
  });

  it("treats a token without exp as expired", () => {
    expect(isTokenExpired(makeJwt({ userId: "u1" }))).toBe(true);
  });

  it("returns false for a token well in the future", () => {
    expect(isTokenExpired(makeJwt({ exp: now + 3600 }))).toBe(false);
  });

  it("returns true for an already-expired token", () => {
    expect(isTokenExpired(makeJwt({ exp: now - 10 }))).toBe(true);
  });

  it("respects the clock-skew window", () => {
    // Expires in 10s but skew is 30s → considered expired.
    expect(isTokenExpired(makeJwt({ exp: now + 10 }), 30)).toBe(true);
  });
});
