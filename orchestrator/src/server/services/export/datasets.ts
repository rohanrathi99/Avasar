/**
 * Registry of datasets that can be exported from Settings > Export.
 *
 * Every dataset is scoped to the caller's private data scope (tenant + user),
 * so users only ever export their own rows.
 */

import { db } from "@server/db";
import {
  interviews,
  jobNotes,
  jobs,
  pipelineRuns,
  settings,
  tasks,
  watchlistJobStates,
} from "@server/db/schema";
import { privateDataScopeFilter } from "@server/tenancy/private-scope";
import { settingsRegistry } from "@shared/settings-registry";
import type { ExportDatasetId } from "@shared/types";
import { count } from "drizzle-orm";

/** Placeholder written in place of any stored secret value in an export. */
const REDACTED_VALUE = "***redacted***";

/** Settings keys whose stored values are secrets and must never be exported. */
const SECRET_SETTING_KEYS = new Set(
  Object.entries(settingsRegistry)
    .filter(([, def]) => def.kind === "secret")
    .map(([key]) => key),
);

/**
 * Redact secret values from settings rows so exported files never contain
 * plaintext API keys or passwords.
 */
function redactSettingsRows(
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const key = row.key;
    if (typeof key === "string" && SECRET_SETTING_KEYS.has(key)) {
      return { ...row, value: REDACTED_VALUE };
    }
    return row;
  });
}

type ScopedTable = Parameters<typeof privateDataScopeFilter>[0];

export type ExportDatasetDefinition = {
  id: ExportDatasetId;
  label: string;
  description: string;
  /** Human-friendly worksheet name used in the XLSX export. */
  sheetName: string;
  /** Fetch all rows for the dataset within the current private data scope. */
  fetchRows: () => Promise<Record<string, unknown>[]>;
  /** Count rows within the current private data scope. */
  countRows: () => Promise<number>;
};

/**
 * Read every row of a user-scoped table within the active private data scope.
 * Returns plain objects (the drizzle row shape) ready for serialization.
 */
async function selectScoped(
  table: ScopedTable,
): Promise<Record<string, unknown>[]> {
  const rows = await db
    .select()
    // biome-ignore lint/suspicious/noExplicitAny: drizzle table typing across a generic registry
    .from(table as any)
    .where(privateDataScopeFilter(table));
  return rows as Record<string, unknown>[];
}

/** Count rows of a user-scoped table within the active private data scope. */
async function countScoped(table: ScopedTable): Promise<number> {
  const result = await db
    .select({ value: count() })
    // biome-ignore lint/suspicious/noExplicitAny: drizzle table typing across a generic registry
    .from(table as any)
    .where(privateDataScopeFilter(table));
  return result[0]?.value ?? 0;
}

function defineTableDataset(config: {
  id: ExportDatasetId;
  label: string;
  description: string;
  sheetName: string;
  table: ScopedTable;
}): ExportDatasetDefinition {
  return {
    id: config.id,
    label: config.label,
    description: config.description,
    sheetName: config.sheetName,
    fetchRows: () => selectScoped(config.table),
    countRows: () => countScoped(config.table),
  };
}

/**
 * Ordered list of exportable datasets. The order also determines worksheet
 * ordering in the generated XLSX workbook.
 */
export const EXPORT_DATASET_DEFINITIONS: ExportDatasetDefinition[] = [
  defineTableDataset({
    id: "jobs",
    label: "Jobs",
    description: "All discovered and tracked job applications.",
    sheetName: "Jobs",
    table: jobs,
  }),
  defineTableDataset({
    id: "notes",
    label: "Job Notes",
    description: "Notes you have written on jobs.",
    sheetName: "Job Notes",
    table: jobNotes,
  }),
  defineTableDataset({
    id: "tasks",
    label: "Tasks",
    description: "Follow-up tasks attached to applications.",
    sheetName: "Tasks",
    table: tasks,
  }),
  defineTableDataset({
    id: "interviews",
    label: "Interviews",
    description: "Scheduled interviews and their outcomes.",
    sheetName: "Interviews",
    table: interviews,
  }),
  defineTableDataset({
    id: "pipelineRuns",
    label: "Pipeline Runs",
    description: "History of job-discovery pipeline runs.",
    sheetName: "Pipeline Runs",
    table: pipelineRuns,
  }),
  defineTableDataset({
    id: "watchlist",
    label: "Watchlist",
    description: "Watchlist job states you have saved.",
    sheetName: "Watchlist",
    table: watchlistJobStates,
  }),
  {
    id: "settings",
    label: "Settings",
    description: "Your saved configuration (secret values are redacted).",
    sheetName: "Settings",
    fetchRows: async () => redactSettingsRows(await selectScoped(settings)),
    countRows: () => countScoped(settings),
  },
];

const DATASET_BY_ID = new Map<ExportDatasetId, ExportDatasetDefinition>(
  EXPORT_DATASET_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function getExportDatasetDefinition(
  id: ExportDatasetId,
): ExportDatasetDefinition | undefined {
  return DATASET_BY_ID.get(id);
}
