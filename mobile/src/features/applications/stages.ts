import {
  APPLICATION_OUTCOMES,
  APPLICATION_STAGES,
  STAGE_LABELS,
} from "job-ops-shared/types/jobs";
import type { ApplicationStage, JobOutcome, StageEvent } from "@/api/types";

export const STAGE_ORDER = APPLICATION_STAGES;
export { STAGE_LABELS };

export function stageLabel(stage: ApplicationStage): string {
  return STAGE_LABELS[stage] ?? stage;
}

export function stageIndex(stage: ApplicationStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export const OUTCOME_LABELS: Record<JobOutcome, string> = {
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  no_response: "No response",
  ghosted: "Ghosted",
};

export const OUTCOME_OPTIONS: readonly JobOutcome[] = APPLICATION_OUTCOMES;

export function outcomeLabel(outcome: JobOutcome | null | undefined): string {
  return outcome ? (OUTCOME_LABELS[outcome] ?? outcome) : "";
}

/** A "good news" outcome is styled as success; the rest are muted/negative. */
export function isPositiveOutcome(outcome: JobOutcome | null | undefined): boolean {
  return outcome === "offer_accepted";
}

/**
 * The application's current stage = the `toStage` of the most recent event.
 * Events from the API are ascending by `occurredAt`, so the last one wins; we
 * still guard by comparing `occurredAt` in case ordering is not relied upon.
 */
export function deriveCurrentStage(
  events: StageEvent[],
): ApplicationStage | null {
  if (!events.length) return null;
  let latest = events[0];
  for (const e of events) {
    if (e.occurredAt >= latest.occurredAt) latest = e;
  }
  return latest.toStage;
}

/**
 * Stages the user can advance to from the current one: everything strictly
 * later in the pipeline. With no history yet, the whole pipeline is offered.
 */
export function nextStageOptions(
  current: ApplicationStage | null,
): ApplicationStage[] {
  const from = current ? stageIndex(current) : -1;
  return STAGE_ORDER.filter((_, i) => i > from);
}

/** Formats a unix-SECONDS timestamp for the timeline. */
export function formatEventTimestamp(
  occurredAtSeconds: number,
  now = Date.now(),
): string {
  const ms = occurredAtSeconds * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  const sameYear = new Date(now).getFullYear() === date.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** The label shown for a timeline row. */
export function eventTitle(event: StageEvent): string {
  const label = event.metadata?.eventLabel?.trim();
  if (label) return label;
  if (event.outcome) return outcomeLabel(event.outcome);
  return stageLabel(event.toStage);
}
