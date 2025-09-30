import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SharePollButton } from "@/components/share-poll-button";
import { withDbRetry } from "@/lib/db-retry";

function buildSearchClause(term: string | null) {
  if (!term) return sql``;
  return sql`AND (p.title ILIKE ${term} OR p.description ILIKE ${term} OR p.id ILIKE ${term} OR q.prompt ILIKE ${term})`;
}

type PollRecord = {
  id: string;
  title: string;
  description: string | null;
  created_at: string | null;
  visibility: "public" | "listed";
  owner_id: string;
  has_voted: boolean;
};

export default async function PollsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const searchTerm = params.q?.trim() ? `%${params.q!.trim()}%` : null;
  const userId = session?.user?.id ?? null;
  const userEmail = session?.user?.email ?? null;

  async function fetchPollRows(query: SQL): Promise<PollRecord[]> {
    try {
      const result = await withDbRetry(() => db.execute<PollRecord>(query));
      return result.rows;
    } catch (error) {
      console.error("[polls] failed to load query", error);
      return [];
    }
  }

  const hasVotedExpression = userEmail
    ? sql`EXISTS (
        SELECT 1
        FROM ballots b
        WHERE b.poll_id = p.id
          AND b.submitted_at IS NOT NULL
          AND b.voter_ref = ${userEmail}
      )`
    : sql`FALSE`;

  const createdPolls = userId
    ? await fetchPollRows(sql`
        SELECT DISTINCT
          p.id,
          p.title,
          p.description,
          p.created_at,
          p.visibility,
          p.owner_id,
          ${hasVotedExpression} AS has_voted
        FROM polls p
        LEFT JOIN questions q ON q.poll_id = p.id
        WHERE p.owner_id = ${userId}
        ${buildSearchClause(searchTerm)}
        ORDER BY p.created_at DESC
        LIMIT 50
      `)
    : [];

  const publicPolls = await fetchPollRows(sql`
    SELECT DISTINCT
      p.id,
      p.title,
      p.description,
      p.created_at,
      p.visibility,
      p.owner_id,
      ${hasVotedExpression} AS has_voted
    FROM polls p
    LEFT JOIN questions q ON q.poll_id = p.id
    WHERE p.visibility = 'public'
      ${userId ? sql`AND p.owner_id <> ${userId}` : sql``}
    ${buildSearchClause(searchTerm)}
    ORDER BY p.created_at DESC
    LIMIT 50
  `);

  const listedPolls = userEmail
    ? await fetchPollRows(sql`
        SELECT DISTINCT
          p.id,
          p.title,
          p.description,
          p.created_at,
          p.visibility,
          p.owner_id,
          ${hasVotedExpression} AS has_voted
        FROM polls p
        LEFT JOIN eligibility_lists el ON el.poll_id = p.id
        LEFT JOIN eligibility_list_items eli ON eli.list_id = el.id AND eli.email = ${userEmail}
        LEFT JOIN questions q ON q.poll_id = p.id
        WHERE p.visibility = 'listed' AND eli.email IS NOT NULL AND p.owner_id <> ${userId}
        ${buildSearchClause(searchTerm)}
        ORDER BY p.created_at DESC
        LIMIT 50
      `)
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="flex flex-col gap-5">
        <div>
          <h1 className="text-3xl font-semibold">Browse polls</h1>
          <p className="text-sm text-muted">Find polls by title, prompt, or ID.</p>
        </div>
        <form className="w-full">
          <input
            type="search"
            name="q"
            placeholder="Search by title, prompt, or ID"
            defaultValue={params.q ?? ""}
            className="w-full rounded-full border border-white/15 bg-black/25 px-5 py-2 text-sm text-foreground outline-none focus:border-white/35"
          />
        </form>
      </header>

      {createdPolls.length > 0 && (
        <section className="mt-12 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Created polls</h2>
          <div className="grid gap-3">
            {createdPolls.map((poll) => (
              <article
                key={poll.id}
                className="rounded-xl border border-white/10 bg-surface/80 p-5 shadow shadow-black/25 backdrop-blur"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-2 text-left">
                    <h3 className="text-base font-medium text-foreground break-words">{poll.title}</h3>
                    {poll.description && <p className="text-sm text-muted break-words">{poll.description}</p>}
                    <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Created by you</p>
                  </div>
                  <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {(!poll.has_voted || !userEmail) && (
                      <Link
                        href={`/polls/${poll.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
                      >
                        Cast vote
                      </Link>
                    )}
                    <Link
                      href={`/polls/${poll.id}/details`}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
                    >
                      View details
                    </Link>
                    <Link
                      href={`/polls/${poll.id}/statistics`}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
                    >
                      View statistics
                    </Link>
                    <SharePollButton pollId={poll.id} mode="vote" label="Copy vote link" className="px-3" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {listedPolls.length > 0 && (
        <section className="mt-12 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Shared with you</h2>
          <div className="space-y-3">
            {listedPolls.map((poll) => (
              <article
                key={poll.id}
                className="rounded-xl border border-white/10 bg-surface/80 p-5 shadow shadow-black/25 backdrop-blur"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-2 text-left">
                    <h3 className="text-base font-medium text-foreground break-words">{poll.title}</h3>
                    {poll.description && <p className="text-sm text-muted break-words">{poll.description}</p>}
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Listed poll</p>
                  </div>
                  <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {(!poll.has_voted || !userEmail) && (
                      <Link
                        href={`/polls/${poll.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
                      >
                        Cast vote
                      </Link>
                    )}
                    <Link
                      href={`/polls/${poll.id}/details`}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
                    >
                      View details
                    </Link>
                    <Link
                      href={`/polls/${poll.id}/statistics`}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
                    >
                      View statistics
                    </Link>
                    <SharePollButton pollId={poll.id} mode="vote" label="Copy vote link" className="px-3" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Public polls</h2>
        {publicPolls.length === 0 ? (
          <p className="text-sm text-muted">No public polls found for this search.</p>
        ) : (
          <div className="space-y-3">
            {publicPolls.map((poll) => (
              <article
                key={poll.id}
                className="rounded-xl border border-white/10 bg-surface/80 p-5 shadow shadow-black/25 backdrop-blur"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-2 text-left">
                    <h3 className="text-base font-medium text-foreground break-words">{poll.title}</h3>
                    {poll.description && <p className="text-sm text-muted break-words">{poll.description}</p>}
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Poll ID: {poll.id}</p>
                  </div>
                  <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {(!poll.has_voted || !userEmail) && (
                      <Link
                        href={`/polls/${poll.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
                      >
                        Cast vote
                      </Link>
                    )}
                    <Link
                      href={`/polls/${poll.id}/details`}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
                    >
                      View details
                    </Link>
                    <Link
                      href={`/polls/${poll.id}/statistics`}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
                    >
                      View statistics
                    </Link>
                    <SharePollButton pollId={poll.id} mode="vote" label="Copy vote link" className="px-3" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
