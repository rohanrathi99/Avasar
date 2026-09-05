import { fetchApi } from "./http";
import type { AppStatusResponse } from "./types";

/**
 * `GET /api/app/status` — public endpoint. The app calls this on launch to
 * decide which auth UI to show (local first-run `setup` vs hosted `signup`)
 * and whether the instance is in read-only demo mode.
 */
export function getAppStatus(): Promise<AppStatusResponse> {
  return fetchApi<AppStatusResponse>("/app/status", { method: "GET" });
}
