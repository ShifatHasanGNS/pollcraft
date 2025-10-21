import { and, isNotNull, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { polls } from "@/drizzle/schema";

export async function pruneExpiredPolls(referenceDate: Date = new Date()): Promise<string[]> {
  const cutoff = referenceDate;

  const rows = await withDbRetry(() =>
    db
      .delete(polls)
      .where(and(isNotNull(polls.closesAt), lt(polls.closesAt, cutoff)))
      .returning({ id: polls.id }),
  );

  if (rows.length > 0 && process.env.NODE_ENV !== "production") {
    console.info(`[poll-maintenance] removed ${rows.length} expired polls`);
  }

  return rows.map((row) => row.id);
}
