import { notFound } from "@infra/errors";
import { fail, ok } from "@infra/http";
import { logger } from "@infra/logger";
import * as jobsRepo from "@server/repositories/jobs";
import { type Request, type Response, Router } from "express";
import { hydrateJobPdfFreshness, requireJob, toJobsRouteError } from "./shared";

export const jobsWishlistRouter = Router();

jobsWishlistRouter.post(
  "/:id/wishlist",
  async (req: Request, res: Response) => {
    try {
      const job = await requireJob(req.params.id);

      const updatedJob = job.wishlistedAt
        ? job
        : await jobsRepo.updateJob(job.id, {
            wishlistedAt: new Date().toISOString(),
          });

      if (!updatedJob) {
        return fail(res, notFound("Job not found"));
      }

      logger.info("Job added to wishlist", {
        route: "POST /api/jobs/:id/wishlist",
        jobId: job.id,
      });

      ok(res, await hydrateJobPdfFreshness(updatedJob));
    } catch (error) {
      fail(res, toJobsRouteError(error));
    }
  },
);

jobsWishlistRouter.delete(
  "/:id/wishlist",
  async (req: Request, res: Response) => {
    try {
      const job = await requireJob(req.params.id);

      const updatedJob = job.wishlistedAt
        ? await jobsRepo.updateJob(job.id, { wishlistedAt: null })
        : job;

      if (!updatedJob) {
        return fail(res, notFound("Job not found"));
      }

      logger.info("Job removed from wishlist", {
        route: "DELETE /api/jobs/:id/wishlist",
        jobId: job.id,
      });

      ok(res, await hydrateJobPdfFreshness(updatedJob));
    } catch (error) {
      fail(res, toJobsRouteError(error));
    }
  },
);
