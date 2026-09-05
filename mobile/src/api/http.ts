import type { ApiResponse } from "./types";
import { apiUrl } from "@/config/env";

/**
 * Centralized error type for every API failure. Carries the backend error
 * `code` (e.g. UNAUTHORIZED, SERVICE_UNAVAILABLE) and correlation `requestId`
 * so the UI can render consistent, non-leaky messages.
 */
export class ApiError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code;
    this.status = options?.status;
    this.requestId = options?.requestId;
    this.details = options?.details;
  }
}

/** Raised when a request exceeds the client timeout or the network is down. */
export class NetworkError extends ApiError {
  constructor(message: string, options?: { code?: string }) {
    super(message, { code: options?.code ?? "NETWORK_ERROR" });
    this.name = "NetworkError";
  }
}

// --- Auth bridge -----------------------------------------------------------
// The client stays decoupled from the auth store: the auth layer registers a
// token getter and an unauthorized handler. This mirrors the web client's
// module-level token cache + redirect callback.

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureApiAuth(config: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}): void {
  getToken = config.getToken;
  onUnauthorized = config.onUnauthorized;
}

/** Current bearer header, for authenticated out-of-band transfers (PDF downloads). */
export function currentAuthHeader(): string | null {
  const token = getToken();
  return token ? `Bearer ${token}` : null;
}

// --- Response envelope -----------------------------------------------------

type LegacyResponse<T> =
  | { success: true; data?: T; message?: string }
  | { success: false; error?: string; message?: string; details?: unknown };

function isEnvelope<T>(v: unknown): v is ApiResponse<T> {
  return Boolean(v) && typeof v === "object" && "ok" in (v as object);
}

function isLegacy<T>(v: unknown): v is LegacyResponse<T> {
  return Boolean(v) && typeof v === "object" && "success" in (v as object);
}

const DEFAULT_TIMEOUT_MS = 30_000;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
  /** Skip the automatic 401 → clear-session handler (used by /auth/me probe). */
  suppressUnauthorizedHandler?: boolean;
}

async function rawFetch(
  endpoint: string,
  options: RequestOptions | undefined,
  extraHeaders: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(apiUrl(endpoint), {
      ...options,
      headers,
      body:
        options?.body === undefined
          ? undefined
          : typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body),
      signal: options?.signal ?? controller.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new NetworkError("The request timed out. Check your connection.", {
        code: "REQUEST_TIMEOUT",
      });
    }
    throw new NetworkError(
      "Can't reach JobOps. Check your internet connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function unwrap<T>(
  response: Response,
  parsed: ApiResponse<T> | LegacyResponse<T>,
): T {
  if (isEnvelope<T>(parsed)) {
    if (parsed.ok) return parsed.data;
    throw new ApiError(parsed.error.message || "Request failed", {
      code: parsed.error.code,
      status: response.status,
      requestId: parsed.meta?.requestId,
      details: parsed.error.details,
    });
  }
  // Legacy { success } envelope.
  if (parsed.success) {
    return (parsed.data ?? ({ message: parsed.message } as unknown)) as T;
  }
  throw new ApiError(parsed.error || parsed.message || "Request failed", {
    status: response.status,
    details: parsed.details,
  });
}

/**
 * Performs a JSON API request, unwraps the `{ ok, data }` envelope, and returns
 * `data`. A 401 clears the session (unless suppressed) before throwing.
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestOptions,
): Promise<T> {
  const hasJsonBody = options?.body !== undefined;
  const response = await rawFetch(
    endpoint,
    options,
    hasJsonBody ? { "Content-Type": "application/json" } : {},
  );

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(
      `Server error (${response.status}): expected JSON. Is the API URL correct?`,
      { status: response.status },
    );
  }

  if (response.status === 401 && !options?.suppressUnauthorizedHandler) {
    onUnauthorized();
  }

  if (!isEnvelope<T>(payload) && !isLegacy<T>(payload)) {
    throw new ApiError("Unexpected response from server.", {
      status: response.status,
    });
  }

  return unwrap<T>(response, payload as ApiResponse<T> | LegacyResponse<T>);
}

/** Fetches a binary resource (e.g. a resume PDF) as a base64 data string. */
export async function fetchArrayBuffer(
  endpoint: string,
  options?: RequestOptions,
): Promise<{ data: ArrayBuffer; contentType: string }> {
  const response = await rawFetch(endpoint, options, {});
  if (response.status === 401 && !options?.suppressUnauthorizedHandler) {
    onUnauthorized();
  }
  if (!response.ok) {
    throw new ApiError(`Download failed (${response.status}).`, {
      status: response.status,
    });
  }
  return {
    data: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}
