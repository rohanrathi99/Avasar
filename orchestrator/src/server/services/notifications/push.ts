import { logger } from "@infra/logger";
import * as jobsRepo from "@server/repositories/jobs";
import * as pushTokensRepo from "@server/repositories/push-tokens";
import type { PostApplicationMessageType } from "@shared/types";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK_SIZE = 100;

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

type ExpoTicket = {
  status: "ok" | "error";
  details?: { error?: string };
};

function redactToken(token: string): string {
  // Never log a full push token.
  return token.length > 12 ? `${token.slice(0, 10)}…` : "token";
}

/**
 * Sends push notifications through the Expo push service. Best-effort: a failure
 * to notify must never break the caller's workflow. Tokens Expo reports as
 * `DeviceNotRegistered` are disabled so they aren't retried.
 */
export async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  for (let i = 0; i < messages.length; i += EXPO_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + EXPO_CHUNK_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        logger.warn("Expo push request failed", { status: res.status });
        continue;
      }

      const payload = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = payload.data ?? [];
      await Promise.all(
        tickets.map(async (ticket, index) => {
          if (
            ticket.status === "error" &&
            ticket.details?.error === "DeviceNotRegistered"
          ) {
            const token = chunk[index]?.to;
            if (token) {
              await pushTokensRepo.disablePushToken(token).catch(() => {});
              logger.info("Disabled unregistered push token", {
                token: redactToken(token),
              });
            }
          }
        }),
      );
    } catch (error) {
      logger.warn("Failed to deliver push notifications", {
        error: error instanceof Error ? error.message : String(error),
        count: chunk.length,
      });
    }
  }
}

function buildCopy(
  messageType: PostApplicationMessageType,
  employer: string,
  title: string,
): { title: string; body: string } {
  switch (messageType) {
    case "interview":
      return {
        title: "Interview update",
        body: `${employer}: interview activity on your ${title} application.`,
      };
    case "offer":
      return {
        title: "You may have an offer 🎉",
        body: `${employer}: an offer was detected for ${title}.`,
      };
    case "rejection":
      return {
        title: "Application update",
        body: `${employer}: your ${title} application was closed.`,
      };
    default:
      return {
        title: "Application update",
        body: `${employer}: a new update on your ${title} application.`,
      };
  }
}

/**
 * Notifies the owner of a job that an application update was detected (from the
 * Gmail email router). Fire-and-forget; swallows all errors.
 */
export async function notifyApplicationUpdate(args: {
  jobId: string;
  messageType: PostApplicationMessageType;
}): Promise<void> {
  try {
    const job = await jobsRepo.getJobById(args.jobId);
    if (!job?.userId) return; // Nothing to target.

    const tokens = await pushTokensRepo.listActiveTokensForUser(job.userId);
    if (tokens.length === 0) return;

    const { title, body } = buildCopy(
      args.messageType,
      job.employer ?? "An employer",
      job.title ?? "a role",
    );

    await sendExpoPush(
      tokens.map((to) => ({
        to,
        title,
        body,
        data: {
          type: "application_update",
          jobId: args.jobId,
          messageType: args.messageType,
        },
      })),
    );
  } catch (error) {
    logger.warn("notifyApplicationUpdate failed", {
      jobId: args.jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
