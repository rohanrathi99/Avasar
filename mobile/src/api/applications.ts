import { fetchApi } from "./http";
import type {
  ApplicationTask,
  Job,
  JobOutcome,
  StageEvent,
  StageEventMetadata,
  StageTransitionTarget,
} from "./types";

// Applications ARE jobs in JobOps; the tracking timeline lives in `stage_events`
// under the same /api/jobs/:id namespace. `occurredAt`, `dueDate`, and
// `closedAt` are unix SECONDS (not milliseconds).

/** `GET /api/jobs/:id/events` → chronological (ascending) stage events. */
export function getStageEvents(jobId: string): Promise<StageEvent[]> {
  return fetchApi<StageEvent[]>(`/jobs/${encodeURIComponent(jobId)}/events`, {
    method: "GET",
  });
}

/** `GET /api/jobs/:id/tasks` → application tasks. */
export function getTasks(
  jobId: string,
  includeCompleted = false,
): Promise<ApplicationTask[]> {
  const q = includeCompleted ? "?includeCompleted=1" : "";
  return fetchApi<ApplicationTask[]>(
    `/jobs/${encodeURIComponent(jobId)}/tasks${q}`,
    { method: "GET" },
  );
}

export interface TransitionStageInput {
  toStage: StageTransitionTarget;
  occurredAt?: number | null; // unix seconds
  metadata?: StageEventMetadata | null;
  outcome?: JobOutcome | null;
}

/** `POST /api/jobs/:id/stages` → the created StageEvent. */
export function transitionStage(
  jobId: string,
  input: TransitionStageInput,
): Promise<StageEvent> {
  return fetchApi<StageEvent>(`/jobs/${encodeURIComponent(jobId)}/stages`, {
    method: "POST",
    body: input,
  });
}

/** `PATCH /api/jobs/:id/events/:eventId` → null. */
export function updateStageEvent(
  jobId: string,
  eventId: string,
  input: {
    toStage?: StageEvent["toStage"];
    occurredAt?: number;
    metadata?: StageEventMetadata | null;
    outcome?: JobOutcome | null;
  },
): Promise<null> {
  return fetchApi<null>(
    `/jobs/${encodeURIComponent(jobId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: input },
  );
}

/** `DELETE /api/jobs/:id/events/:eventId` → null. Reverts status if it was last. */
export function deleteStageEvent(
  jobId: string,
  eventId: string,
): Promise<null> {
  return fetchApi<null>(
    `/jobs/${encodeURIComponent(jobId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
}

/** `PATCH /api/jobs/:id/outcome` → the updated Job (sets closedAt automatically). */
export function updateOutcome(
  jobId: string,
  input: { outcome: JobOutcome | null; closedAt?: number | null },
): Promise<Job> {
  return fetchApi<Job>(`/jobs/${encodeURIComponent(jobId)}/outcome`, {
    method: "PATCH",
    body: input,
  });
}
