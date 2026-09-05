import { fetchApi } from "./http";
import type { Job, JobDocument } from "./types";

/** `GET /api/jobs/:id/documents` — attachments for a job. */
export function listJobDocuments(jobId: string): Promise<JobDocument[]> {
  return fetchApi<JobDocument[]>(
    `/jobs/${encodeURIComponent(jobId)}/documents`,
    { method: "GET" },
  );
}

/** `POST /api/jobs/:id/documents` — upload an attachment (base64 JSON, ≤10 MB). */
export function uploadJobDocument(
  jobId: string,
  input: { fileName: string; mediaType?: string | null; dataBase64: string },
): Promise<JobDocument> {
  return fetchApi<JobDocument>(
    `/jobs/${encodeURIComponent(jobId)}/documents`,
    { method: "POST", body: input, timeoutMs: 60_000 },
  );
}

/** `DELETE /api/jobs/:id/documents/:documentId`. */
export function deleteJobDocument(
  jobId: string,
  documentId: string,
): Promise<null> {
  return fetchApi<null>(
    `/jobs/${encodeURIComponent(jobId)}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" },
  );
}

/** `/api`-relative path to a document's raw bytes (binary). */
export function jobDocumentContentEndpoint(
  jobId: string,
  documentId: string,
): string {
  return `/jobs/${encodeURIComponent(jobId)}/documents/${encodeURIComponent(documentId)}/content`;
}

/**
 * `POST /api/jobs/:id/pdf` — upload a resume PDF (base64 JSON). PDF-only, ≤10 MB;
 * promotes a discovered job to `ready` and sets `pdfSource: "uploaded"`.
 */
export function uploadJobResumePdf(
  jobId: string,
  input: { fileName: string; mediaType?: string | null; dataBase64: string },
): Promise<Job> {
  return fetchApi<Job>(`/jobs/${encodeURIComponent(jobId)}/pdf`, {
    method: "POST",
    body: input,
    timeoutMs: 60_000,
  });
}
