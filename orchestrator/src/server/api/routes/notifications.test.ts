import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startServer, stopServer } from "./test-utils";

const AUTH_ENV = {
  BASIC_AUTH_USER: "admin",
  BASIC_AUTH_PASSWORD: "secret",
  JWT_SECRET: "an-explicit-jwt-secret-with-at-least-32-chars",
  JOBOPS_TEST_AUTH_BYPASS: "0",
};

async function login(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "secret" }),
  });
  const body = await res.json();
  expect(res.status).toBe(200);
  return body.data.token as string;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

describe.sequential("Notifications routes", () => {
  let server: Server;
  let baseUrl: string;
  let closeDb: () => void;
  let tempDir: string;

  beforeEach(async () => {
    ({ server, baseUrl, closeDb, tempDir } = await startServer({
      env: AUTH_ENV,
    }));
  });

  afterEach(async () => {
    await stopServer({ server, closeDb, tempDir });
  });

  it("requires authentication to register a token", async () => {
    const res = await fetch(`${baseUrl}/api/notifications/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "ExponentPushToken[abc]" }),
    });
    expect(res.status).toBe(401);
  });

  it("registers, re-registers idempotently, and unregisters a push token", async () => {
    const token = await login(baseUrl);
    const pushToken = "ExponentPushToken[abc123]";

    const register = async () =>
      fetch(`${baseUrl}/api/notifications/register`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ token: pushToken, platform: "ios" }),
      });

    const reg1 = await register();
    expect(reg1.status).toBe(200);
    expect(await reg1.json()).toMatchObject({
      ok: true,
      data: { registered: true },
    });

    // Re-registering the same token must not error (upsert).
    const reg2 = await register();
    expect(reg2.status).toBe(200);

    const unreg = await fetch(`${baseUrl}/api/notifications/unregister`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ token: pushToken }),
    });
    expect(unreg.status).toBe(200);
    expect(await unreg.json()).toMatchObject({
      ok: true,
      data: { unregistered: true },
    });
  });

  it("rejects an invalid register body", async () => {
    const token = await login(baseUrl);
    const res = await fetch(`${baseUrl}/api/notifications/register`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
