import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../db/index";

const { pushTokens } = schema;

/**
 * Registers (or refreshes) a device push token for a user. Push tokens are
 * globally unique per device, so an existing token is re-pointed to the current
 * user/tenant and re-enabled — handling the case where a device is handed to a
 * different account.
 */
export async function upsertPushToken(args: {
  tenantId: string;
  userId: string;
  token: string;
  platform?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(pushTokens)
    .values({
      id: randomUUID(),
      tenantId: args.tenantId,
      userId: args.userId,
      token: args.token,
      platform: args.platform ?? null,
      disabledAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: {
        tenantId: args.tenantId,
        userId: args.userId,
        platform: args.platform ?? null,
        disabledAt: null,
        updatedAt: now,
      },
    });
}

/** Active (non-disabled) push tokens for a user. */
export async function listActiveTokensForUser(
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), isNull(pushTokens.disabledAt)));
  return rows.map((r) => r.token);
}

/** Removes a token (e.g. on explicit unregister at logout). */
export async function deletePushToken(
  userId: string,
  token: string,
): Promise<void> {
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
}

/** Marks a token disabled after the push service reports it invalid. */
export async function disablePushToken(token: string): Promise<void> {
  await db
    .update(pushTokens)
    .set({
      disabledAt: Math.floor(Date.now() / 1000),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(pushTokens.token, token));
}
