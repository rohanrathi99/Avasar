/**
 * Data export service: collects selected datasets within the caller's private
 * data scope and serializes them to XLSX or JSON.
 */

import type {
  ExportDatasetId,
  ExportDatasetInfo,
  ExportFormat,
} from "@shared/types";
import {
  EXPORT_DATASET_DEFINITIONS,
  getExportDatasetDefinition,
} from "./datasets";
import { buildXlsxWorkbook, type XlsxSheet } from "./xlsx";

export type ExportResult = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** List all exportable datasets with their current row counts. */
export async function listExportDatasets(): Promise<ExportDatasetInfo[]> {
  return Promise.all(
    EXPORT_DATASET_DEFINITIONS.map(async (definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      count: await definition.countRows(),
    })),
  );
}

/**
 * Convert a value from a database row into a flat cell value for a spreadsheet.
 * Objects/arrays are JSON-encoded; everything else is passed through.
 */
function toCellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Collect rows for the requested datasets, preserving registry order. */
async function collectRows(
  datasetIds: ExportDatasetId[],
): Promise<
  Array<{ info: ExportDatasetInfo; rows: Record<string, unknown>[] }>
> {
  const requested = new Set(datasetIds);
  const selected = EXPORT_DATASET_DEFINITIONS.filter((definition) =>
    requested.has(definition.id),
  );

  return Promise.all(
    selected.map(async (definition) => {
      const rows = await definition.fetchRows();
      return {
        info: {
          id: definition.id,
          label: definition.label,
          description: definition.description,
          count: rows.length,
        },
        rows,
      };
    }),
  );
}

/** Ordered union of keys across all rows, preserving first-seen order. */
function collectHeaders(rows: Record<string, unknown>[]): string[] {
  const headers: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }
  return headers;
}

function timestampSlug(now: Date): string {
  return now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

/**
 * Produce an export file (buffer + filename + content type) for the requested
 * datasets and format.
 */
export async function generateExport(args: {
  datasetIds: ExportDatasetId[];
  format: ExportFormat;
  now?: Date;
}): Promise<ExportResult> {
  const { datasetIds, format } = args;
  const now = args.now ?? new Date();
  const collected = await collectRows(datasetIds);
  const stamp = timestampSlug(now);

  if (format === "json") {
    const payload: Record<string, unknown> = {
      exportedAt: now.toISOString(),
      datasets: collected.map((entry) => ({
        id: entry.info.id,
        label: entry.info.label,
        count: entry.info.count,
        rows: entry.rows,
      })),
    };
    return {
      buffer: Buffer.from(JSON.stringify(payload, null, 2), "utf8"),
      fileName: `avasar-export-${stamp}.json`,
      contentType: "application/json; charset=utf-8",
    };
  }

  const sheets: XlsxSheet[] = collected.map((entry) => {
    const definition = getExportDatasetDefinition(entry.info.id);
    const headers = collectHeaders(entry.rows);
    return {
      name: definition?.sheetName ?? entry.info.label,
      headers,
      rows: entry.rows.map((row) =>
        headers.map((key) => toCellValue(row[key])),
      ),
    };
  });

  const buffer = await buildXlsxWorkbook(sheets);
  return {
    buffer,
    fileName: `avasar-export-${stamp}.xlsx`,
    contentType: XLSX_CONTENT_TYPE,
  };
}
