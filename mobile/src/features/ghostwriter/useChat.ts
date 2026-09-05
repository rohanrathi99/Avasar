import { useCallback, useEffect, useRef, useState } from "react";
import * as ghost from "@/api/ghostwriter";
import type { JobChatMessage } from "@/api/types";
import { toUserMessage } from "@/utils/errors";

function tempUserMessage(jobId: string, content: string): JobChatMessage {
  const now = new Date().toISOString();
  return {
    id: `local-${Date.now()}`,
    threadId: "",
    jobId,
    role: "user",
    content,
    status: "complete",
    tokensIn: null,
    tokensOut: null,
    version: 1,
    replacesMessageId: null,
    parentMessageId: null,
    activeChildId: null,
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface ChatController {
  messages: JobChatMessage[];
  pendingUser: JobChatMessage | null;
  streamingText: string | null;
  isStreaming: boolean;
  loading: boolean;
  loadError: string | null;
  sendError: string | null;
  send: (content: string) => void;
  cancel: () => void;
  reset: () => void;
  reload: () => void;
}

export function useGhostwriterChat(jobId: string): ChatController {
  const [messages, setMessages] = useState<JobChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<JobChatMessage | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const runIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await ghost.listMessages(jobId);
      if (!mountedRef.current) return;
      setMessages(
        [...res.messages].sort(
          (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
        ),
      );
    } catch (e) {
      if (mountedRef.current) setLoadError(toUserMessage(e));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [load]);

  const endStreaming = useCallback(() => {
    setIsStreaming(false);
    setStreamingText(null);
    setPendingUser(null);
    runIdRef.current = null;
    abortRef.current = null;
  }, []);

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || isStreaming) return;

      setSendError(null);
      setPendingUser(tempUserMessage(jobId, text));
      setStreamingText("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await ghost.streamMessage(
          jobId,
          { content: text, signal: controller.signal },
          (event) => {
            if (!mountedRef.current) return;
            switch (event.type) {
              case "ready":
                runIdRef.current = event.runId;
                break;
              case "delta":
                setStreamingText((prev) => (prev ?? "") + event.delta);
                break;
              case "completed":
              case "cancelled":
                endStreaming();
                void load(); // reconcile with canonical server state
                break;
              case "error":
                setSendError(event.message || "The assistant failed to reply.");
                endStreaming();
                break;
            }
          },
        );
        // Stream closed without a terminal event (e.g. cancelled fetch): reconcile.
        if (mountedRef.current && runIdRef.current === null) {
          void load();
        }
      } catch (e) {
        if (mountedRef.current) {
          setSendError(toUserMessage(e));
          endStreaming();
        }
      }
    },
    [jobId, isStreaming, load, endStreaming],
  );

  const cancel = useCallback(() => {
    const runId = runIdRef.current;
    if (runId) {
      // Server marks the run cancelled; the stream then emits `cancelled`.
      void ghost.cancelRun(jobId, runId).catch(() => {});
    } else {
      abortRef.current?.abort();
      endStreaming();
    }
  }, [jobId, endStreaming]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    endStreaming();
    setSendError(null);
    ghost
      .resetConversation(jobId)
      .then(() => {
        if (mountedRef.current) setMessages([]);
      })
      .catch((e) => {
        if (mountedRef.current) setSendError(toUserMessage(e));
      });
  }, [jobId, endStreaming]);

  return {
    messages,
    pendingUser,
    streamingText,
    isStreaming,
    loading,
    loadError,
    sendError,
    send,
    cancel,
    reset,
    reload: () => void load(),
  };
}
