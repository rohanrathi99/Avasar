import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as jobsApi from "@/api/jobs";
import type { Job, JobStatus, JobsListResponse } from "@/api/types";

export const jobKeys = {
  all: ["jobs"] as const,
  list: (status?: string) => ["jobs", "list", status ?? "all"] as const,
  detail: (id: string) => ["jobs", "detail", id] as const,
};

function statusKey(status?: JobStatus[]): string | undefined {
  return status && status.length ? [...status].sort().join(",") : undefined;
}

export function useJobsList(status?: JobStatus[]) {
  const key = statusKey(status);
  return useQuery<JobsListResponse>({
    queryKey: jobKeys.list(key),
    queryFn: () => jobsApi.listJobs({ status: key, view: "list" }),
  });
}

export function useJob(id: string | undefined) {
  return useQuery<Job>({
    queryKey: jobKeys.detail(id ?? ""),
    queryFn: () => jobsApi.getJob(id as string),
    enabled: Boolean(id),
  });
}

/** Writes the updated job into the detail cache and refreshes lists. */
function useJobMutation(fn: (id: string) => Promise<Job>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (job) => {
      qc.setQueryData(jobKeys.detail(job.id), job);
      void qc.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useRescoreJob() {
  return useJobMutation(jobsApi.rescoreJob);
}

export function useApplyToJob() {
  return useJobMutation(jobsApi.applyToJob);
}

export function useSkipJob() {
  return useJobMutation(jobsApi.skipJob);
}
