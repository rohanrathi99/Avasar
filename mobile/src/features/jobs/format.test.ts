import type { JobListItem } from "@/api/types";
import {
  filterJobs,
  formatSalary,
  formatScore,
  relativeTime,
  scoreBand,
  sortJobs,
  statusLabel,
} from "./format";

function job(partial: Partial<JobListItem>): JobListItem {
  return {
    id: "j1",
    title: "Engineer",
    employer: "Acme",
    ...partial,
  } as JobListItem;
}

describe("formatScore / scoreBand", () => {
  it("rounds and stringifies scores", () => {
    expect(formatScore(87.4)).toBe("87");
    expect(formatScore(0)).toBe("0");
  });
  it("renders an em dash for missing scores", () => {
    expect(formatScore(null)).toBe("—");
    expect(formatScore(undefined)).toBe("—");
  });
  it("bands scores by threshold", () => {
    expect(scoreBand(90)).toBe("high");
    expect(scoreBand(60)).toBe("mid");
    expect(scoreBand(20)).toBe("low");
    expect(scoreBand(null)).toBe("none");
  });
});

describe("formatSalary", () => {
  it("formats a structured range with currency", () => {
    expect(
      formatSalary(
        job({ salaryMinAmount: 50000, salaryMaxAmount: 70000, salaryCurrency: "GBP" }),
      ),
    ).toBe("£50,000 – £70,000");
  });
  it("falls back to free-text salary", () => {
    expect(formatSalary(job({ salary: "Competitive" }))).toBe("Competitive");
  });
  it("returns null when nothing is available", () => {
    expect(formatSalary(job({}))).toBeNull();
  });
});

describe("statusLabel", () => {
  it("maps known statuses", () => {
    expect(statusLabel("in_progress")).toBe("In progress");
    expect(statusLabel("ready")).toBe("Ready");
  });
  it("handles null", () => {
    expect(statusLabel(null)).toBe("—");
  });
});

describe("filterJobs / sortJobs", () => {
  const jobs = [
    job({ id: "a", title: "Frontend Engineer", employer: "Acme", suitabilityScore: 40, discoveredAt: "2026-01-01T00:00:00Z" }),
    job({ id: "b", title: "Backend Engineer", employer: "Globex", suitabilityScore: 90, discoveredAt: "2026-02-01T00:00:00Z" }),
  ];

  it("filters case-insensitively across fields", () => {
    expect(filterJobs(jobs, "globex").map((j) => j.id)).toEqual(["b"]);
    expect(filterJobs(jobs, "engineer")).toHaveLength(2);
    expect(filterJobs(jobs, "")).toHaveLength(2);
  });

  it("sorts by score descending", () => {
    expect(sortJobs(jobs, "score").map((j) => j.id)).toEqual(["b", "a"]);
  });

  it("sorts by recency descending", () => {
    expect(sortJobs(jobs, "recent").map((j) => j.id)).toEqual(["b", "a"]);
  });
});

describe("relativeTime", () => {
  it("formats past times compactly", () => {
    const now = Date.parse("2026-01-10T00:00:00Z");
    expect(relativeTime("2026-01-07T00:00:00Z", now)).toBe("3d ago");
    expect(relativeTime(null, now)).toBe("");
  });
});
