import { sql, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { appMetrics, visitorTokens } from "@/drizzle/schema";
import { hashWithSalt } from "@/lib/hash";

const VISITOR_TOTAL_KEY = "visitor_total";
const VISITOR_COOKIE_NAME = "pc_visitor";

const metricSecret = () =>
  process.env.NEXTAUTH_SECRET ??
  process.env.METRICS_SECRET ??
  "pollcraft";

export function generateVisitorToken(): string {
  return randomUUID();
}

function toVisitorHash(token: string): string {
  return hashWithSalt(token, `${metricSecret()}:visitor`);
}

export async function getVisitorTotal(): Promise<number> {
  const rows = await db
    .select({ value: appMetrics.value })
    .from(appMetrics)
    .where(eq(appMetrics.key, VISITOR_TOTAL_KEY))
    .limit(1);

  const value = rows[0]?.value ?? 0;
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function registerVisitor(token: string): Promise<number> {
  const tokenHash = toVisitorHash(token);

  try {
    const inserted = await db
      .insert(visitorTokens)
      .values({ tokenHash })
      .onConflictDoNothing()
      .returning({ tokenHash: visitorTokens.tokenHash });

    const isNewVisitor = inserted.length > 0;

    if (isNewVisitor) {
      const updated = await db
        .insert(appMetrics)
        .values({ key: VISITOR_TOTAL_KEY, value: 1 })
        .onConflictDoUpdate({
          target: appMetrics.key,
          set: {
            value: sql`${appMetrics.value} + 1`,
            updatedAt: new Date(),
          },
        })
        .returning({ value: appMetrics.value });

      if (updated[0]?.value !== undefined) {
        const next = updated[0].value;
        return typeof next === "number" ? next : Number(next);
      }
    }
  } catch (error) {
    console.error("[metrics] failed to register visitor", error);
  }

  return getVisitorTotal();
}

export function getVisitorCookieName(): string {
  return VISITOR_COOKIE_NAME;
}
