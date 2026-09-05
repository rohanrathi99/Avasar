import { badRequest, unauthorized } from "@infra/errors";
import { asyncRoute, fail, ok } from "@infra/http";
import { getRequestContext } from "@infra/request-context";
import * as pushTokensRepo from "@server/repositories/push-tokens";
import { getActiveTenantId } from "@server/tenancy/context";
import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(1).max(2048),
  platform: z.enum(["ios", "android", "web"]).optional(),
});

const unregisterSchema = z.object({
  token: z.string().min(1).max(2048),
});

export const notificationsRouter = Router();

// All routes are workspace-private (mounted under /api, so auth is enforced by
// the global guard). Tokens are always scoped to the authenticated user.

notificationsRouter.post(
  "/register",
  asyncRoute(async (req: Request, res: Response) => {
    const userId = getRequestContext()?.userId;
    if (!userId) {
      fail(res, unauthorized("Authentication required"));
      return;
    }
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, badRequest("Invalid request body", parsed.error.flatten()));
      return;
    }
    await pushTokensRepo.upsertPushToken({
      tenantId: getActiveTenantId(),
      userId,
      token: parsed.data.token,
      platform: parsed.data.platform ?? null,
    });
    ok(res, { registered: true });
  }),
);

notificationsRouter.post(
  "/unregister",
  asyncRoute(async (req: Request, res: Response) => {
    const userId = getRequestContext()?.userId;
    if (!userId) {
      fail(res, unauthorized("Authentication required"));
      return;
    }
    const parsed = unregisterSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, badRequest("Invalid request body", parsed.error.flatten()));
      return;
    }
    await pushTokensRepo.deletePushToken(userId, parsed.data.token);
    ok(res, { unregistered: true });
  }),
);
