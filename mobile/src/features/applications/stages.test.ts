import type { StageEvent } from "@/api/types";
import {
  deriveCurrentStage,
  eventTitle,
  nextStageOptions,
  outcomeLabel,
  stageIndex,
  stageLabel,
} from "./stages";

function ev(partial: Partial<StageEvent>): StageEvent {
  return {
    id: "e1",
    applicationId: "j1",
    title: "",
    groupId: null,
    fromStage: null,
    toStage: "applied",
    occurredAt: 1000,
    metadata: null,
    outcome: null,
    ...partial,
  };
}

describe("stage helpers", () => {
  it("labels and indexes stages", () => {
    expect(stageLabel("hiring_manager_screen")).toBe("Team Match");
    expect(stageIndex("applied")).toBe(0);
    expect(stageIndex("closed")).toBe(7);
  });

  it("derives the current stage from the most recent event", () => {
    expect(deriveCurrentStage([])).toBeNull();
    const events = [
      ev({ id: "a", toStage: "applied", occurredAt: 100 }),
      ev({ id: "b", toStage: "technical_interview", occurredAt: 300 }),
      ev({ id: "c", toStage: "recruiter_screen", occurredAt: 200 }),
    ];
    expect(deriveCurrentStage(events)).toBe("technical_interview");
  });

  it("offers only later stages to advance to", () => {
    expect(nextStageOptions(null)).toContain("applied");
    expect(nextStageOptions("onsite")).toEqual(["offer", "closed"]);
    expect(nextStageOptions("closed")).toEqual([]);
  });

  it("maps outcomes to labels", () => {
    expect(outcomeLabel("offer_accepted")).toBe("Offer accepted");
    expect(outcomeLabel(null)).toBe("");
  });

  it("prefers an explicit event label, then outcome, then stage", () => {
    expect(eventTitle(ev({ metadata: { eventLabel: "Phone call" } }))).toBe(
      "Phone call",
    );
    expect(eventTitle(ev({ toStage: "closed", outcome: "rejected" }))).toBe(
      "Rejected",
    );
    expect(eventTitle(ev({ toStage: "offer" }))).toBe("Offer");
  });
});
