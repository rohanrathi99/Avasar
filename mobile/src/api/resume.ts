import { fetchApi } from "./http";
import type {
  DesignResumePdfResponse,
  DesignResumeStatusResponse,
  Job,
  ResumeProfile,
} from "./types";

// The backend owns a single editable "Design Resume" document plus per-job
// tailoring stored on the Job. Typst/PDF rendering stays server-side; the app
// only reads the human-friendly ResumeProfile projection and downloads PDFs.

/** `GET /api/design-resume/status` — whether a resume has been imported. */
export function getResumeStatus(): Promise<DesignResumeStatusResponse> {
  return fetchApi<DesignResumeStatusResponse>("/design-resume/status", {
    method: "GET",
  });
}

/**
 * `GET /api/profile` — the readable projection of the resume (basics + sections).
 * 404 when no resume exists yet.
 */
export function getResumeProfile(): Promise<ResumeProfile> {
  return fetchApi<ResumeProfile>("/profile", { method: "GET" });
}

/** `POST /api/design-resume/generate-pdf` — renders the base resume PDF. */
export function generateDesignResumePdf(): Promise<DesignResumePdfResponse> {
  return fetchApi<DesignResumePdfResponse>("/design-resume/generate-pdf", {
    method: "POST",
    body: {},
    timeoutMs: 90_000, // Typst/LaTeX rendering can take a while.
  });
}

/** `/api`-relative path to the base resume PDF (binary). */
export function designResumePdfEndpoint(): string {
  return "/design-resume/pdf";
}

export type TailorField = "summary" | "headline" | "skills";

/**
 * `POST /api/jobs/:id/summarize` — AI tailoring of the resume for a job. Runs
 * server-side through the existing LLM service and returns the updated Job with
 * `tailoredSummary`/`tailoredHeadline`/`tailoredSkills` populated. Synchronous.
 */
export function tailorJobResume(
  jobId: string,
  opts?: { force?: boolean; fields?: TailorField[] },
): Promise<Job> {
  const params = new URLSearchParams();
  if (opts?.force) params.set("force", "1");
  if (opts?.fields?.length) params.set("fields", opts.fields.join(","));
  const q = params.toString() ? `?${params.toString()}` : "";
  return fetchApi<Job>(`/jobs/${encodeURIComponent(jobId)}/summarize${q}`, {
    method: "POST",
    body: {},
    timeoutMs: 120_000,
  });
}

/** `POST /api/jobs/:id/generate-pdf` — renders the tailored resume PDF. */
export function generateJobPdf(jobId: string): Promise<Job> {
  return fetchApi<Job>(`/jobs/${encodeURIComponent(jobId)}/generate-pdf`, {
    method: "POST",
    body: {},
    timeoutMs: 90_000,
  });
}
