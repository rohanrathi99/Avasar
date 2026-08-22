import type { ExportDatasetsResponse, ExportRequest } from "@shared/types";
import { fetchApi, fetchBlobApi } from "./core";

/** List datasets available for export, with current row counts. */
export async function getExportDatasets(): Promise<ExportDatasetsResponse> {
  return fetchApi<ExportDatasetsResponse>("/export/datasets");
}

/**
 * Request an export of the selected datasets in the chosen format. Returns the
 * generated file as a Blob for the caller to download.
 */
export async function exportData(input: ExportRequest): Promise<Blob> {
  return fetchBlobApi("/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
