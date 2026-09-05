import { fetch as expoFetch } from "expo/fetch";
import { ApiError, NetworkError } from "./http";
import { apiUrl } from "@/config/env";

/**
 * Consumes a JobOps SSE stream.
 *
 * The backend delivers long-running AI progress (ghostwriter chat, batch job
 * actions) as a **POST** request with `stream: true` in the body, responding
 * with `text/event-stream`. The native `EventSource` API can't do POST or send
 * an `Authorization` header, so — exactly like the web client — we read the
 * response body as a stream and parse `data:` frames ourselves.
 *
 * `expo/fetch` provides a WHATWG-streaming `fetch` in React Native; the default
 * RN `fetch` does not expose `response.body`.
 */
export async function streamSse<TEvent>(
  endpoint: string,
  input: unknown,
  handlers: {
    getToken: () => string | null;
    onEvent: (event: TEvent) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const token = handlers.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = (await expoFetch(apiUrl(endpoint), {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal: handlers.signal,
    })) as unknown as Response;
  } catch {
    throw new NetworkError("Lost connection while streaming updates.");
  }

  if (!response.ok) {
    throw new ApiError(`Stream failed (${response.status}).`, {
      status: response.status,
    });
  }
  if (!response.body) {
    throw new ApiError("Streaming is not supported in this environment.");
  }

  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line (\n\n or \r\n\r\n).
      let sep = buffer.search(/\r?\n\r?\n/);
      while (sep !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + (buffer[sep] === "\r" ? 4 : 2));
        for (const line of frame.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue; // skip `:`-comments/heartbeats
          const data = line.slice(5).trim();
          if (!data) continue;
          try {
            handlers.onEvent(JSON.parse(data) as TEvent);
          } catch {
            // Ignore malformed frames rather than tearing down the stream.
          }
        }
        sep = buffer.search(/\r?\n\r?\n/);
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Already closed.
    }
  }
}
