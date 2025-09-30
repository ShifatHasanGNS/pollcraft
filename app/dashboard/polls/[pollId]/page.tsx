import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { card, subCard } from "@/lib/styles";
import {
  polls,
  questions,
  options as pollOptions,
  voteAggregates,
} from "@/drizzle/schema";
import { CommitPollButton } from "@/components/commit-poll-button";

export default async function PollDetailsPage({
  params,
}: {
  params: Promise<{ pollId: string }>;
}) {
  const { pollId } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const safeRetry = async <T,>(operation: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await withDbRetry(operation);
    } catch (error) {
      console.error("[dashboard/poll] query failed", error);
      return fallback;
    }
  };

  const pollResult = await safeRetry(
    () =>
      db
        .select()
        .from(polls)
        .where(eq(polls.id, pollId))
        .limit(1),
    [] as typeof polls.$inferSelect[],
  );

  const [poll] = pollResult;

  if (!poll) {
    notFound();
  }

  if (poll.ownerId !== session.user.id) {
    redirect("/dashboard");
  }

  const pollQuestions = await safeRetry(
    () =>
      db
        .select()
        .from(questions)
        .where(eq(questions.pollId, pollId))
        .orderBy(questions.orderIndex),
    [] as typeof questions.$inferSelect[],
  );

  const questionIds = pollQuestions.map((q) => q.id);

  const optionRecords = questionIds.length
    ? await safeRetry(
        () =>
          db
            .select()
            .from(pollOptions)
            .where(inArray(pollOptions.questionId, questionIds)),
        [] as typeof pollOptions.$inferSelect[],
      )
    : [];

  const optionsByQuestion = optionRecords.reduce<
    Record<string, Array<(typeof optionRecords)[number]>>
  >((acc, option) => {
    const list = acc[option.questionId] ?? [];
    list.push(option);
    acc[option.questionId] = list;
    return acc;
  }, {});

  const aggregateRows = await safeRetry(
    () =>
      db
        .select({
          questionId: voteAggregates.questionId,
          optionId: voteAggregates.optionId,
          count: voteAggregates.count,
        })
        .from(voteAggregates)
        .where(eq(voteAggregates.pollId, pollId)),
    [] as Array<{ questionId: string; optionId: string | null; count: number }>,
  );

  const counts = new Map<string, number>();
  for (const row of aggregateRows) {
    counts.set(`${row.questionId}:${row.optionId ?? "text"}`, row.count);
  }

  const formatDateTime = (value: Date | string | null | undefined) => {
    if (!value) return "Unscheduled";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
      ? "Unscheduled"
      : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-muted">
            Poll timeline
          </p>
          <h1 className="text-3xl font-semibold">{poll.title}</h1>
          {poll.description && (
            <p className="text-sm text-muted">{poll.description}</p>
          )}
        </div>
        {!poll.committedAt && (
          <CommitPollButton pollId={poll.id} disabled={pollQuestions.length === 0} />
        )}
      </header>

      <section className={`${card} p-6`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.3em] text-muted">Status</dt>
            <dd className="mt-1 text-sm font-semibold">
              {poll.committedAt ? "Committed" : "Draft"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.3em] text-muted">Visibility</dt>
            <dd className="mt-1 text-sm font-semibold">{poll.visibility}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.3em] text-muted">Identity mode</dt>
            <dd className="mt-1 text-sm font-semibold">{poll.identityMode}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.3em] text-muted">Opens</dt>
            <dd className="mt-1 text-sm font-semibold">{formatDateTime(poll.opensAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.3em] text-muted">Closes</dt>
            <dd className="mt-1 text-sm font-semibold">{formatDateTime(poll.closesAt)}</dd>
          </div>
          {poll.definitionHash && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.3em] text-muted">Definition hash</dt>
              <dd className="mt-1 break-all text-xs font-mono text-muted">{poll.definitionHash}</dd>
            </div>
          )}
        </div>
      </section>

      <section className={`${card} p-6`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Questions</h2>
          <Link href={`/vote/${poll.id}`} className="text-sm text-foreground underline">
            View voting surface
          </Link>
        </div>
        {pollQuestions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No questions created yet.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {pollQuestions.map((question, index) => {
              const optionList = optionsByQuestion[question.id] ?? [];
              return (
                <li key={question.id} className={`${subCard} border-white/10 bg-black/25 p-5`}>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Question {index + 1}</p>
                  <h3 className="mt-1 text-base font-medium text-foreground">
                    {question.prompt}
                  </h3>
                  <p className="mt-2 text-xs text-muted">Type: {question.kind}</p>
                  {question.kind !== "text" && optionList.length > 0 && (
                    <ul className="mt-3 space-y-2 text-sm text-muted">
                      {[...optionList]
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((option) => {
                          const countKey = `${question.id}:${option.id}`;
                          const count = counts.get(countKey) ?? 0;
                          return (
                            <li
                              key={option.id}
                              className="flex items-center justify-between rounded border border-white/10 bg-black/10 px-3 py-2"
                            >
                              <span>{option.label}</span>
                              <span className="text-xs font-semibold text-foreground">{count}</span>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                  {question.kind === "text" && (
                    <p className="mt-3 text-sm text-muted">
                      Responses recorded: {counts.get(`${question.id}:text`) ?? 0}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
