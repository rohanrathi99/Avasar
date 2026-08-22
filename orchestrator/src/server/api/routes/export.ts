/**
 * Data export routes.
 *
 * GET  /api/export/datasets  -> list exportable datasets with row counts
 * POST /api/export           -> download selected datasets as XLSX or JSON
 */

import { badRequest } from "@infra/errors";
import { asyncRoute, fail, ok } from "@infra/http";
import { logger } from "@infra/logger";
import { generateExport, listExportDatasets } from "@server/services/export";
import {
  EXPORT_DATASET_IDS,
  type ExportDatasetId,
  isExportDatasetId,
  isExportFormat,
} from "@shared/types";
import { type Request, type Response, Router } from "express";

export const exportRouter = Router();

/** RFC 5987 encoding for a filename in a Content-Disposition header. */
function contentDispositionAttachment(fileName: string): string {
  const fallback =
    fileName
      .replace(/["\\\r\n]/g, "_")
      .replace(/[^\x20-\x7E]/g, "_")
      .trim() || "export";
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

exportRouter.get(
  "/datasets",
  asyncRoute(async (_req: Request, res: Response) => {
    const datasets = await listExportDatasets();
    ok(res, { datasets });
  }),
);

exportRouter.post(
  "/",
  asyncRoute(async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      datasets?: unknown;
      format?: unknown;
    };

    if (!isExportFormat(body.format)) {
      fail(
        res,
        badRequest("A valid export format is required (xlsx or json)."),
      );
      return;
    }

    if (!Array.isArray(body.datasets) || body.datasets.length === 0) {
      fail(res, badRequest("Select at least one dataset to export."));
      return;
    }

    const invalid = body.datasets.filter((id) => !isExportDatasetId(id));
    if (invalid.length > 0) {
      fail(
        res,
        badRequest("One or more selected datasets are invalid.", {
          invalid,
          allowed: [...EXPORT_DATASET_IDS],
        }),
      );
      return;
    }

    // De-duplicate while keeping the requested identifiers.
    const datasetIds = [
      ...new Set(body.datasets as ExportDatasetId[]),
    ] as ExportDatasetId[];

    try {
      const result = await generateExport({
        datasetIds,
        format: body.format,
      });

      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Disposition",
        contentDispositionAttachment(result.fileName),
      );
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Length", String(result.buffer.byteLength));
      res.status(200).send(result.buffer);
    } catch (error) {
      logger.error("Failed to generate export", {
        route: "POST /api/export",
        datasets: datasetIds,
        format: body.format,
        error,
      });
      throw error;
    }
  }),
);
