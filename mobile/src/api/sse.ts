import { fetch as expoFetch } from "expo/fetch";
import { ApiError, currentAuthHeader, NetworkError } from "./http";
import { apiUrl } from "@/config/env";

// Minimal UTF-8 decoding that works whether or not the runtime exposes
// TextDecoder (Hermes does on modern RN, but guard for safety/tests).
function makeDecoder(): (bytes: Uint8Array) => string {
  if (typeof TextDecoder !== "undefined") {
    const decoder = new TextDecoder();
    return (bytes) => decoder.decode(bytes, { stream: true } as never);
  }
  return (bytes) => {
    let out = "";
    for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(out));
  };
}

/**
 * Extracts complete SSE frames from a buffer. Returns the `data:` payloads of
 * every complete frame and the unconsumed remainder (a partial trailing frame).
 * `:`-comment lines (heartbeats) are ignored. Pure — unit-tested.
 */
export function drainSseFrames(buffer: string): {
  data: string[];
  rest: string;
} {
  const data: string[] = [];
  let rest = buffer;
  let sep = rest.search(/\r?\n\r?\n/);
  while (sep !== -1) {
    const frame = rest.slice(0, sep);
    rest = rest.slice(sep + (rest[sep] === "\r" ? 4 : 2));
    for (const line of frame.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload) data.push(payload);
    }
    sep = rest.search(/\r?\n\r?\n/);
  }
  return { data, rest };
}

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
    onEvent: (event: TEvent) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const header = currentAuthHeader();
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (header) requestHeaders.Authorization = header;

  let response: Response;
  try {
    response = (await expoFetch(apiUrl(endpoint), {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(input),
      signal: handlers.signal,
    })) as unknown as Response;
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return; // caller cancelled
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
  const decode = makeDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decode(value);

      const { data, rest } = drainSseFrames(buffer);
      buffer = rest;
      for (const payload of data) {
        try {
          handlers.onEvent(JSON.parse(payload) as TEvent);
        } catch {
          // Ignore malformed frames rather than tearing down the stream.
        }
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
