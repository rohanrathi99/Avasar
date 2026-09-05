import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as appsApi from "@/api/applications";
import type { StageEvent } from "@/api/types";
import { jobKeys } from "@/features/jobs/hooks";

export const appKeys = {
  events: (jobId: string) => ["jobs", "events", jobId] as const,
};

export function useStageEvents(jobId: string | undefined) {
  return useQuery<StageEvent[]>({
    queryKey: appKeys.events(jobId ?? ""),
    queryFn: () => appsApi.getStageEvents(jobId as string),
    enabled: Boolean(jobId),
  });
}

/** Invalidates the timeline, the job detail, and the job lists after a write. */
function useTimelineInvalidation(jobId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: appKeys.events(jobId) });
    void qc.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
    void qc.invalidateQueries({ queryKey: jobKeys.all });
  };
}

export function useTransitionStage(jobId: string) {
  const invalidate = useTimelineInvalidation(jobId);
  return useMutation({
    mutationFn: (input: appsApi.TransitionStageInput) =>
      appsApi.transitionStage(jobId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteStageEvent(jobId: string) {
  const invalidate = useTimelineInvalidation(jobId);
  return useMutation({
    mutationFn: (eventId: string) => appsApi.deleteStageEvent(jobId, eventId),
    onSuccess: invalidate,
  });
}

export function useUpdateOutcome(jobId: string) {
  const qc = useQueryClient();
  const invalidate = useTimelineInvalidation(jobId);
  return useMutation({
    mutationFn: (input: { outcome: appsApi.TransitionStageInput["outcome"] }) =>
      appsApi.updateOutcome(jobId, { outcome: input.outcome ?? null }),
    onSuccess: (job) => {
      qc.setQueryData(jobKeys.detail(jobId), job);
      invalidate();
    },
  });
}
