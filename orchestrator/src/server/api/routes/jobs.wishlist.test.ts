import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startServer, stopServer } from "./test-utils";

describe.sequential("Jobs wishlist API routes", () => {
  let server: Server;
  let baseUrl: string;
  let closeDb: () => void;
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ server, baseUrl, closeDb, tempDir } = await startServer());
  });

  afterEach(async () => {
    await stopServer({ server, closeDb, tempDir });
  });

  const createWishlistJob = async () => {
    const { createJob } = await import("@server/repositories/jobs");
    return createJob({
      source: "manual",
      title: "Wishlist Role",
      employer: "Acme",
      jobUrl: "https://example.com/job/wishlist",
      jobDescription: "Test description",
    });
  };

  it("adds and removes a job from the wishlist", async () => {
    const job = await createWishlistJob();
    expect(job.wishlistedAt).toBeNull();

    const addRes = await fetch(`${baseUrl}/api/jobs/${job.id}/wishlist`, {
      method: "POST",
    });
    const addBody = await addRes.json();
    expect(addRes.status).toBe(200);
    expect(addBody.ok).toBe(true);
    expect(typeof addBody.data.wishlistedAt).toBe("string");

    // Adding again is idempotent and keeps the original timestamp.
    const addAgainRes = await fetch(`${baseUrl}/api/jobs/${job.id}/wishlist`, {
      method: "POST",
    });
    const addAgainBody = await addAgainRes.json();
    expect(addAgainBody.data.wishlistedAt).toBe(addBody.data.wishlistedAt);

    const listRes = await fetch(`${baseUrl}/api/jobs?view=list`);
    const listBody = await listRes.json();
    expect(listBody.data.jobs[0].wishlistedAt).toBe(addBody.data.wishlistedAt);

    const removeRes = await fetch(`${baseUrl}/api/jobs/${job.id}/wishlist`, {
      method: "DELETE",
    });
    const removeBody = await removeRes.json();
    expect(removeRes.status).toBe(200);
    expect(removeBody.ok).toBe(true);
    expect(removeBody.data.wishlistedAt).toBeNull();
  });

  it("returns 404 for unknown jobs", async () => {
    const res = await fetch(`${baseUrl}/api/jobs/does-not-exist/wishlist`, {
      method: "POST",
    });
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("removes a job from the wishlist when it is marked as applied", async () => {
    const job = await createWishlistJob();

    const addRes = await fetch(`${baseUrl}/api/jobs/${job.id}/wishlist`, {
      method: "POST",
    });
    expect(addRes.status).toBe(200);

    const applyRes = await fetch(`${baseUrl}/api/jobs/${job.id}/apply`, {
      method: "POST",
    });
    const applyBody = await applyRes.json();
    expect(applyRes.status).toBe(200);
    expect(applyBody.data.status).toBe("applied");
    expect(applyBody.data.wishlistedAt).toBeNull();
  });

  it("removes a job from the wishlist when a status update marks it applied", async () => {
    const job = await createWishlistJob();

    await fetch(`${baseUrl}/api/jobs/${job.id}/wishlist`, { method: "POST" });

    const patchRes = await fetch(`${baseUrl}/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied" }),
    });
    const patchBody = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patchBody.data.status).toBe("applied");
    expect(patchBody.data.wishlistedAt).toBeNull();
  });
});
