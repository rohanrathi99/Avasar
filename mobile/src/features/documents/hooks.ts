import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as docsApi from "@/api/documents";
import type { JobDocument } from "@/api/types";
import type { CapturedFile } from "./capture";

export const documentKeys = {
  list: (jobId: string) => ["jobs", "documents", jobId] as const,
};

export function useJobDocuments(jobId: string) {
  return useQuery<JobDocument[]>({
    queryKey: documentKeys.list(jobId),
    queryFn: () => docsApi.listJobDocuments(jobId),
  });
}

export function useUploadDocument(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: CapturedFile) =>
      docsApi.uploadJobDocument(jobId, {
        fileName: file.fileName,
        mediaType: file.mediaType,
        dataBase64: file.dataBase64,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.list(jobId) });
    },
  });
}

export function useDeleteDocument(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      docsApi.deleteJobDocument(jobId, documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.list(jobId) });
    },
  });
}
