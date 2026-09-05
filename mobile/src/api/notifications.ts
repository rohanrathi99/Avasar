import { fetchApi } from "./http";

export type PushPlatform = "ios" | "android" | "web";

/** `POST /api/notifications/register` — associate a device push token with the user. */
export function registerPushToken(input: {
  token: string;
  platform?: PushPlatform;
}): Promise<{ registered: boolean }> {
  return fetchApi<{ registered: boolean }>("/notifications/register", {
    method: "POST",
    body: input,
  });
}

/** `POST /api/notifications/unregister` — drop a device push token (e.g. on logout). */
export function unregisterPushToken(input: {
  token: string;
}): Promise<{ unregistered: boolean }> {
  return fetchApi<{ unregistered: boolean }>("/notifications/unregister", {
    method: "POST",
    body: input,
    suppressUnauthorizedHandler: true,
  });
}
