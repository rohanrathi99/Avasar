import { fetchApi } from "./http";
import { streamSse } from "./sse";
import type { BranchInfo, JobChatMessage, JobChatStreamEvent } from "./types";

// Ghostwriter = a per-job AI chat assistant, mounted at /api/jobs/:id/chat.
// This client targets the DEFAULT thread (no thread management), which is the
// primary conversation the web app also uses.

export interface ChatMessagesResponse {
  messages: JobChatMessage[];
  branches: BranchInfo[];
  selectedNoteIds: string[];
  selectedEmailIds: string[];
  selectedDocumentIds: string[];
}

/** `GET /api/jobs/:id/chat/messages` — the default-thread history. */
export function listMessages(jobId: string): Promise<ChatMessagesResponse> {
  return fetchApi<ChatMessagesResponse>(
    `/jobs/${encodeURIComponent(jobId)}/chat/messages`,
    { method: "GET" },
  );
}

/**
 * `POST /api/jobs/:id/chat/messages` with `stream: true` — streams the assistant
 * reply as SSE. Emits `ready` (→ runId), `delta` (incremental text),
 * `completed`/`cancelled` (final message), or `error`.
 */
export function streamMessage(
  jobId: string,
  input: { content: string; signal?: AbortSignal },
  onEvent: (event: JobChatStreamEvent) => void,
): Promise<void> {
  return streamSse<JobChatStreamEvent>(
    `/jobs/${encodeURIComponent(jobId)}/chat/messages`,
    { content: input.content, stream: true },
    { onEvent, signal: input.signal },
  );
}

/** `POST /api/jobs/:id/chat/runs/:runId/cancel`. */
export function cancelRun(
  jobId: string,
  runId: string,
): Promise<{ cancelled: boolean; alreadyFinished: boolean }> {
  return fetchApi(
    `/jobs/${encodeURIComponent(jobId)}/chat/runs/${encodeURIComponent(runId)}/cancel`,
    { method: "POST", body: {} },
  );
}

/** `POST /api/jobs/:id/chat/reset` — clears the conversation. */
export function resetConversation(
  jobId: string,
): Promise<{ deletedMessages: number; deletedRuns: number }> {
  return fetchApi(`/jobs/${encodeURIComponent(jobId)}/chat/reset`, {
    method: "POST",
    body: {},
  });
}
