/**
 * Types for the settings data export feature.
 *
 * Users can select one or more datasets in the Settings > Export tab and
 * download them as a single `.xlsx` workbook (one sheet per dataset) or a
 * `.json` document (one top-level key per dataset).
 */

/** File formats a user can choose when exporting their data. */
export const EXPORT_FORMATS = ["xlsx", "json"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * Canonical list of datasets that can be exported. Kept here (in shared) so the
 * client and server agree on the identifiers; labels and descriptions live in
 * the server-side registry.
 */
export const EXPORT_DATASET_IDS = [
  "jobs",
  "notes",
  "tasks",
  "interviews",
  "pipelineRuns",
  "watchlist",
  "settings",
] as const;
export type ExportDatasetId = (typeof EXPORT_DATASET_IDS)[number];

/** Metadata describing a single exportable dataset, including its row count. */
export interface ExportDatasetInfo {
  id: ExportDatasetId;
  label: string;
  description: string;
  count: number;
}

/** Response for `GET /api/export/datasets`. */
export interface ExportDatasetsResponse {
  datasets: ExportDatasetInfo[];
}

/** Request body for `POST /api/export`. */
export interface ExportRequest {
  datasets: ExportDatasetId[];
  format: ExportFormat;
}

/** Type guard for a valid export format string. */
export function isExportFormat(value: unknown): value is ExportFormat {
  return (
    typeof value === "string" &&
    (EXPORT_FORMATS as readonly string[]).includes(value)
  );
}

/** Type guard for a valid export dataset identifier. */
export function isExportDatasetId(value: unknown): value is ExportDatasetId {
  return (
    typeof value === "string" &&
    (EXPORT_DATASET_IDS as readonly string[]).includes(value)
  );
}
