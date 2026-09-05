import { fetchApi } from "./http";
import type { Job, JobStatus, JobsListResponse } from "./types";

function query(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * `GET /api/jobs`. The backend filters ONLY by `status` (comma-separated) and
 * returns the full status-filtered collection sorted `discoveredAt DESC` — it
 * does NOT paginate, search, or sort server-side. The mobile UI does those
 * client-side over the returned list.
 */
export function listJobs(input?: {
  status?: JobStatus[] | string;
  view?: "list" | "full";
}): Promise<JobsListResponse> {
  const status = Array.isArray(input?.status)
    ? input?.status.join(",")
    : input?.status;
  return fetchApi<JobsListResponse>(
    `/jobs${query({ status, view: input?.view ?? "list" })}`,
    { method: "GET" },
  );
}

export interface JobsRevision {
  revision: string;
  latestUpdatedAt: string | null;
  total: number;
  statusFilter: string | null;
}

/** Cheap change-detection poll before re-fetching the full list. */
export function getJobsRevision(input?: {
  status?: JobStatus[] | string;
}): Promise<JobsRevision> {
  const status = Array.isArray(input?.status)
    ? input?.status.join(",")
    : input?.status;
  return fetchApi<JobsRevision>(`/jobs/revision${query({ status })}`, {
    method: "GET",
  });
}

export function getJob(id: string): Promise<Job> {
  return fetchApi<Job>(`/jobs/${encodeURIComponent(id)}`, { method: "GET" });
}

/** `POST /api/jobs/:id/rescore` — synchronous AI re-scoring. Non-200 on failure. */
export function rescoreJob(id: string): Promise<Job> {
  return fetchApi<Job>(`/jobs/${encodeURIComponent(id)}/rescore`, {
    method: "POST",
    body: {},
    // Scoring calls an LLM; give it more headroom than a normal request.
    timeoutMs: 90_000,
  });
}

/** `POST /api/jobs/:id/apply` — records the "applied" stage transition. */
export function applyToJob(id: string): Promise<Job> {
  return fetchApi<Job>(`/jobs/${encodeURIComponent(id)}/apply`, {
    method: "POST",
    body: {},
  });
}

/** `POST /api/jobs/:id/skip` — marks a discovered/ready job as skipped. */
export function skipJob(id: string): Promise<Job> {
  return fetchApi<Job>(`/jobs/${encodeURIComponent(id)}/skip`, {
    method: "POST",
    body: {},
  });
}

/** `/api`-relative path to a job's tailored resume PDF (binary). */
export function jobPdfEndpoint(id: string): string {
  return `/jobs/${encodeURIComponent(id)}/pdf`;
}
