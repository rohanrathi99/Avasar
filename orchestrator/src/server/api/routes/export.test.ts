import type { Server } from "node:http";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startServer, stopServer } from "./test-utils";

describe.sequential("Export API routes", () => {
  let server: Server;
  let baseUrl: string;
  let closeDb: () => void;
  let tempDir: string;

  beforeEach(async () => {
    ({ server, baseUrl, closeDb, tempDir } = await startServer());
  });

  afterEach(async () => {
    await stopServer({ server, closeDb, tempDir });
  });

  describe("GET /api/export/datasets", () => {
    it("lists exportable datasets with counts", async () => {
      const res = await fetch(`${baseUrl}/api/export/datasets`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.data.datasets)).toBe(true);
      const ids = body.data.datasets.map((d: { id: string }) => d.id);
      expect(ids).toContain("jobs");
      expect(ids).toContain("settings");
      for (const dataset of body.data.datasets) {
        expect(dataset).toHaveProperty("label");
        expect(dataset).toHaveProperty("description");
        expect(typeof dataset.count).toBe("number");
      }
    });
  });

  describe("POST /api/export", () => {
    it("rejects requests with no datasets", async () => {
      const res = await fetch(`${baseUrl}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasets: [], format: "json" }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.ok).toBe(false);
    });

    it("rejects an invalid format", async () => {
      const res = await fetch(`${baseUrl}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasets: ["jobs"], format: "csv" }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects an unknown dataset id", async () => {
      const res = await fetch(`${baseUrl}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasets: ["nope"], format: "json" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns a JSON export with the expected shape", async () => {
      const res = await fetch(`${baseUrl}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasets: ["jobs", "settings"],
          format: "json",
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(res.headers.get("content-disposition")).toContain("attachment");

      const payload = await res.json();
      expect(payload).toHaveProperty("exportedAt");
      expect(Array.isArray(payload.datasets)).toBe(true);
      const ids = payload.datasets.map((d: { id: string }) => d.id);
      expect(ids).toEqual(["jobs", "settings"]);
      for (const dataset of payload.datasets) {
        expect(Array.isArray(dataset.rows)).toBe(true);
      }
    });

    it("returns a valid XLSX workbook", async () => {
      const res = await fetch(`${baseUrl}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasets: ["jobs"], format: "xlsx" }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("spreadsheetml.sheet");

      const buffer = Buffer.from(await res.arrayBuffer());
      const zip = await JSZip.loadAsync(buffer);
      expect(zip.file("xl/workbook.xml")).not.toBeNull();
      expect(zip.file("xl/worksheets/sheet1.xml")).not.toBeNull();
    });
  });
});
