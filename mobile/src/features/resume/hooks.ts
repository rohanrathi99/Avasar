import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as resumeApi from "@/api/resume";
import type {
  DesignResumePdfResponse,
  DesignResumeStatusResponse,
  Job,
  ResumeProfile,
} from "@/api/types";
import { jobKeys } from "@/features/jobs/hooks";

export const resumeKeys = {
  status: ["resume", "status"] as const,
  profile: ["resume", "profile"] as const,
};

export function useResumeStatus() {
  return useQuery<DesignResumeStatusResponse>({
    queryKey: resumeKeys.status,
    queryFn: resumeApi.getResumeStatus,
  });
}

export function useResumeProfile() {
  return useQuery<ResumeProfile>({
    queryKey: resumeKeys.profile,
    queryFn: resumeApi.getResumeProfile,
  });
}

export function useGenerateDesignResumePdf() {
  return useMutation<DesignResumePdfResponse>({
    mutationFn: resumeApi.generateDesignResumePdf,
  });
}

/** Writes the returned Job back into the detail cache after a tailoring/PDF op. */
function useJobWriteback(jobId: string) {
  const qc = useQueryClient();
  return (job: Job) => {
    qc.setQueryData(jobKeys.detail(jobId), job);
    void qc.invalidateQueries({ queryKey: jobKeys.all });
  };
}

export function useTailorJob(jobId: string) {
  const writeback = useJobWriteback(jobId);
  return useMutation({
    mutationFn: (opts?: { force?: boolean; fields?: resumeApi.TailorField[] }) =>
      resumeApi.tailorJobResume(jobId, opts),
    onSuccess: writeback,
  });
}

export function useGenerateJobPdf(jobId: string) {
  const writeback = useJobWriteback(jobId);
  return useMutation({
    mutationFn: () => resumeApi.generateJobPdf(jobId),
    onSuccess: writeback,
  });
}
