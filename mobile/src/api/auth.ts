import { fetchApi } from "./http";
import type {
  AuthWithUserResponse,
  BootstrapStatusResponse,
  LoginResponse,
  MeResponse,
} from "./types";

export function login(input: {
  username: string;
  password: string;
}): Promise<LoginResponse> {
  return fetchApi<LoginResponse>("/auth/login", {
    method: "POST",
    body: input,
  });
}

export function setup(input: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthWithUserResponse> {
  return fetchApi<AuthWithUserResponse>("/auth/setup", {
    method: "POST",
    body: input,
  });
}

export function signup(input: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthWithUserResponse> {
  return fetchApi<AuthWithUserResponse>("/auth/signup", {
    method: "POST",
    body: input,
  });
}

/**
 * Fetches the current user. Used to validate a restored token at startup —
 * the 401 handler is suppressed so a failed probe doesn't loop through the
 * session-clear path; the caller decides what to do.
 */
export function getMe(): Promise<MeResponse> {
  return fetchApi<MeResponse>("/auth/me", {
    method: "GET",
    suppressUnauthorizedHandler: true,
  });
}

export function bootstrapStatus(): Promise<BootstrapStatusResponse> {
  return fetchApi<BootstrapStatusResponse>("/auth/bootstrap-status", {
    method: "GET",
  });
}

export async function logout(): Promise<void> {
  await fetchApi<{ message: string }>("/auth/logout", {
    method: "POST",
    // Logout is idempotent server-side; never bounce the user twice.
    suppressUnauthorizedHandler: true,
  });
}
