import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { SharePollButton } from "@/components/share-poll-button";

type PollDetailsPageProps = {
  params: Promise<{ pollId: string }>;
};

type PollRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string | null;
  opens_at: string | null;
  closes_at: string | null;
  visibility: "public" | "listed";
  identity_mode: "anonymous" | "identified";
};

type QuestionRow = {
  id: string;
  prompt: string;
  kind: string;
  option_count: string;
};

export default async function PollDetailsPage({ params }: PollDetailsPageProps) {
  const { pollId } = await params;

  const safe = async <T,>(operation: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await withDbRetry(operation);
    } catch (error) {
      console.error("[polls/details] query failed", error);
      return fallback;
    }
  };

  const pollResult = await safe(
    () =>
      db.execute<PollRow>(sql`
        SELECT id, title, description, created_at, opens_at, closes_at, visibility, identity_mode
        FROM polls
        WHERE id = ${pollId}
        LIMIT 1
      `),
    { rows: [] as PollRow[] } as { rows: PollRow[] },
  );

  const poll = pollResult.rows[0];
  if (!poll) {
    notFound();
  }

  const questionResult = await safe(
    () =>
      db.execute<QuestionRow>(sql`
        SELECT q.id, q.prompt, q.kind, COUNT(o.id)::text AS option_count
        FROM questions q
        LEFT JOIN options o ON o.question_id = q.id
        WHERE q.poll_id = ${pollId}
        GROUP BY q.id
        ORDER BY q.order_index ASC
      `),
    { rows: [] as QuestionRow[] } as { rows: QuestionRow[] },
  );

  const questions = questionResult.rows;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-muted">Poll overview</p>
        <h1 className="text-3xl font-semibold">{poll.title}</h1>
        {poll.description && <p className="text-sm text-muted">{poll.description}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.2em]">
            {poll.visibility} visibility
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.2em]">
            {poll.identity_mode} ballots
          </span>
        </div>
      </header>

      <section className="rounded-xl border border-white/10 bg-surface/80 p-6 shadow shadow-black/25 backdrop-blur">
        <h2 className="text-lg font-semibold text-foreground">Schedule</h2>
        <dl className="mt-4 grid gap-4 text-sm text-muted sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-[0.3em]">Created</dt>
            <dd>{poll.created_at ? new Date(poll.created_at).toLocaleString() : "—"}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-[0.3em]">Opens</dt>
            <dd>{poll.opens_at ? new Date(poll.opens_at).toLocaleString() : "Not scheduled"}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-[0.3em]">Closes</dt>
            <dd>{poll.closes_at ? new Date(poll.closes_at).toLocaleString() : "No close date"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-white/10 bg-surface/80 p-6 shadow shadow-black/25 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Questions</h2>
          <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <SharePollButton pollId={poll.id} mode="details" label="Copy details link" />
            <Link
              href={`/polls/${poll.id}`}
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
            >
              Cast vote
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
          {questions.length === 0 ? (
            <p>This poll does not have questions yet.</p>
          ) : (
            questions.map((question, index) => (
              <article key={question.id} className="rounded-lg border border-white/5 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Question {index + 1}</p>
                <p className="mt-1 text-sm text-foreground break-words">{question.prompt}</p>
                <p className="mt-2 text-xs text-muted">
                  {question.kind} • {Number(question.option_count)} option{Number(question.option_count) === 1 ? "" : "s"}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href={`/polls/${poll.id}/statistics`}
          className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
        >
          View statistics
        </Link>
        <Link
          href={`/polls/${poll.id}`}
          className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
        >
          Return to voting
        </Link>
        <SharePollButton pollId={poll.id} mode="vote" label="Copy vote link" />
        <SharePollButton pollId={poll.id} mode="statistics" label="Copy statistics link" />
      </section>
    </main>
  );
}
