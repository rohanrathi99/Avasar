import type { JobListItem, JobStatus } from "@/api/types";

/** Human label for the coarse job lifecycle status. */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  discovered: "Discovered",
  processing: "Processing",
  ready: "Ready",
  applied: "Applied",
  in_progress: "In progress",
  skipped: "Skipped",
  expired: "Expired",
};

export function statusLabel(status: JobStatus | null | undefined): string {
  if (!status) return "—";
  return JOB_STATUS_LABELS[status] ?? status;
}

/** Score → display string. Scores are 0–100; null/undefined render as em dash. */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return "—";
  return String(Math.round(score));
}

export type ScoreBand = "high" | "mid" | "low" | "none";

export function scoreBand(score: number | null | undefined): ScoreBand {
  if (score === null || score === undefined || Number.isNaN(score)) return "none";
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "C$",
  AUD: "A$",
};

function money(amount: number, currency?: string | null): string {
  const symbol = currency ? (CURRENCY_SYMBOLS[currency] ?? `${currency} `) : "";
  const rounded = Math.round(amount);
  return `${symbol}${rounded.toLocaleString("en-US")}`;
}

/**
 * Best available salary string: prefer the structured min/max amounts, fall
 * back to the free-text `salary` field, else null.
 */
export function formatSalary(
  job: Pick<
    JobListItem,
    "salary" | "salaryMinAmount" | "salaryMaxAmount" | "salaryCurrency"
  >,
): string | null {
  const { salaryMinAmount, salaryMaxAmount, salaryCurrency } = job;
  if (salaryMinAmount != null && salaryMaxAmount != null) {
    if (salaryMinAmount === salaryMaxAmount) {
      return money(salaryMinAmount, salaryCurrency);
    }
    return `${money(salaryMinAmount, salaryCurrency)} – ${money(salaryMaxAmount, salaryCurrency)}`;
  }
  if (salaryMinAmount != null) return `From ${money(salaryMinAmount, salaryCurrency)}`;
  if (salaryMaxAmount != null) return `Up to ${money(salaryMaxAmount, salaryCurrency)}`;
  const text = job.salary?.trim();
  return text ? text : null;
}

/** Compact relative time from an ISO string, e.g. "3d ago". */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.round((now - then) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

/**
 * Client-side search/filter over the returned list (the backend does not
 * search). Matches title, employer, and location, case-insensitively.
 */
export function filterJobs(jobs: JobListItem[], queryText: string): JobListItem[] {
  const q = queryText.trim().toLowerCase();
  if (!q) return jobs;
  return jobs.filter((j) => {
    const haystack = `${j.title ?? ""} ${j.employer ?? ""} ${j.location ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
}

export type JobSort = "recent" | "score";

export function sortJobs(jobs: JobListItem[], sort: JobSort): JobListItem[] {
  const copy = [...jobs];
  if (sort === "score") {
    copy.sort((a, b) => (b.suitabilityScore ?? -1) - (a.suitabilityScore ?? -1));
  } else {
    copy.sort(
      (a, b) =>
        Date.parse(b.discoveredAt ?? "") - Date.parse(a.discoveredAt ?? ""),
    );
  }
  return copy;
}
