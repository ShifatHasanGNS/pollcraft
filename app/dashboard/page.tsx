import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { buttonPrimary, card } from "@/lib/styles";
import { pruneExpiredPolls } from "@/lib/poll-maintenance";
import { polls } from "@/drizzle/schema";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const ownerId = session.user.id;

  await pruneExpiredPolls();

  const userPolls = await (async () => {
    try {
      const result = await withDbRetry(() =>
        db
          .select()
          .from(polls)
          .where(eq(polls.ownerId, ownerId))
          .orderBy(desc(polls.createdAt)),
      );
      return result;
    } catch (error) {
      console.error("[dashboard] failed to load polls", error);
      return [] as typeof polls.$inferSelect[];
    }
  })();

  const formatDate = (value: Date | string | null | undefined) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-muted">
            Poll overview
          </p>
          <h1 className="text-3xl font-semibold">Your polls</h1>
          <p className="max-w-2xl text-sm text-muted">
            Manage drafts, monitor live participation, and schedule releases.
          </p>
        </div>
        <Link href="/dashboard/polls/new" className={buttonPrimary}>
          Create poll
        </Link>
      </header>

      {userPolls.length === 0 ? (
        <section className="rounded-xl border border-white/5 bg-surface/80 p-6 text-sm text-muted shadow-md shadow-black/30 backdrop-blur">
          No polls yet. Use the builder to create one.
        </section>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2">
          {userPolls.map((poll) => {
            const status = poll.committedAt ? "Committed" : "Draft";
            const statusColor = poll.committedAt ? "text-green-400" : "text-amber-300";
            return (
              <Link
                key={poll.id}
                href={`/dashboard/polls/${poll.id}`}
                className={`${card} border-white/10 bg-surface/85 p-5 shadow-black/30 transition hover:border-white/20 hover:bg-surface`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium text-foreground">{poll.title}</h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted">{poll.id}</p>
                  </div>
                  <span className={`text-xs font-semibold ${statusColor}`}>{status}</span>
                </div>
                <dl className="mt-6 grid grid-cols-2 gap-3 text-xs text-muted">
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDate(poll.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Opens</dt>
                    <dd>{poll.opensAt ? formatDate(poll.opensAt) : "Unscheduled"}</dd>
                  </div>
                  <div>
                    <dt>Closes</dt>
                    <dd>{poll.closesAt ? formatDate(poll.closesAt) : "Unscheduled"}</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>{poll.version}</dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
