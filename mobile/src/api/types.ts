// Re-exports the backend contracts the mobile app consumes. Types are reused
// from the shared `job-ops-shared` workspace wherever they exist so mobile and
// web stay in lock-step; only contracts the shared package does NOT expose
// (notably the auth/user shapes, which live server-side) are declared here.

import type {
  ApplicationStage,
  Job,
  JobListItem,
  JobOutcome,
  JobStatus,
  StageEvent,
} from "job-ops-shared/types/jobs";
import type { JobsListResponse } from "job-ops-shared/types/pipeline";

export type {
  ApplicationStage,
  Job,
  JobListItem,
  JobOutcome,
  JobStatus,
  JobsListResponse,
  StageEvent,
};

export type { ApiResponse } from "job-ops-shared/types/api";

/**
 * Public user shape returned by the backend. The shared package intentionally
 * has no `User` type (auth lives server-side as `PublicUser`), so the mobile
 * client declares the response shape it depends on.
 */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  isSystemAdmin: boolean;
  isDisabled: boolean;
  workspaceId: string;
  workspaceName: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** `POST /api/auth/login` → data */
export interface LoginResponse {
  token: string;
  expiresIn: number;
}

/** `POST /api/auth/setup` and `/signup` → data (login + the created user). */
export interface AuthWithUserResponse extends LoginResponse {
  user: AuthUser;
}

/** `GET /api/auth/me` → data */
export interface MeResponse {
  user: AuthUser;
  analyticsDistinctId?: string;
}

/** `GET /api/auth/bootstrap-status` → data */
export interface BootstrapStatusResponse {
  setupRequired: boolean;
}

/** Subset of `GET /api/app/status` the mobile app branches on. */
export interface AppStatusResponse {
  appMode: "local" | "hosted";
  capabilities?: {
    hostedSignups?: boolean;
    platformLlm?: boolean;
    userEditableLlmSettings?: boolean;
    quotas?: boolean;
  };
  demoMode?: boolean;
}
