import { ApiError, NetworkError } from "@/api/http";
import { toUserMessage } from "./errors";

describe("toUserMessage", () => {
  it("passes NetworkError messages through", () => {
    expect(toUserMessage(new NetworkError("Offline"))).toBe("Offline");
  });

  it("maps known API error codes to friendly copy", () => {
    expect(toUserMessage(new ApiError("x", { code: "UNAUTHORIZED" }))).toMatch(
      /session expired/i,
    );
    expect(
      toUserMessage(new ApiError("x", { code: "SERVICE_UNAVAILABLE" })),
    ).toMatch(/temporarily unavailable/i);
  });

  it("uses the backend message for unmapped codes", () => {
    expect(
      toUserMessage(new ApiError("Employer already exists", { code: "CONFLICT_X" })),
    ).toBe("Employer already exists");
  });

  it("never leaks non-Error throwables", () => {
    expect(toUserMessage({ nasty: "object" })).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
