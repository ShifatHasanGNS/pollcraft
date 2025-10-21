import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import {
  polls,
  questions,
  options as pollOptions,
} from "@/drizzle/schema";
import { VoteForm } from "@/components/vote-form";

type PollVotePageProps = {
  params: Promise<{ pollId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function PollVotePage({
  params,
  searchParams,
}: PollVotePageProps) {
  const [{ pollId }, { token }] = await Promise.all([params, searchParams]);
  const requestHeaders = await headers();
  const requestDateHeader = requestHeaders.get("date");
  const nowTimestamp = requestDateHeader ? Date.parse(requestDateHeader) : null;

  const safe = async <T,>(operation: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await withDbRetry(operation);
    } catch (error) {
      console.error("[polls/vote] query failed", error);
      return fallback;
    }
  };

  const pollRecord = await safe(
    () =>
      db
        .select()
        .from(polls)
        .where(eq(polls.id, pollId))
        .limit(1),
    [] as typeof polls.$inferSelect[],
  );

  const poll = pollRecord[0];
  if (!poll || !poll.committedAt) {
    redirect("/");
  }

  const opensAtMs = poll.opensAt ? new Date(poll.opensAt).getTime() : null;
  const closesAtMs = poll.closesAt ? new Date(poll.closesAt).getTime() : null;
  const notYetOpen =
    opensAtMs !== null && nowTimestamp !== null ? opensAtMs > nowTimestamp : false;
  const alreadyClosed =
    closesAtMs !== null && nowTimestamp !== null ? closesAtMs < nowTimestamp : false;

  const questionRecords = await safe(
    () =>
      db
        .select()
        .from(questions)
        .where(eq(questions.pollId, pollId))
        .orderBy(questions.orderIndex),
    [] as typeof questions.$inferSelect[],
  );

  const questionIds = questionRecords.map((q) => q.id);
  const optionRecords = questionIds.length
    ? await safe(
        () =>
          db
            .select()
            .from(pollOptions)
            .where(inArray(pollOptions.questionId, questionIds)),
        [] as typeof pollOptions.$inferSelect[],
      )
    : [];

  const optionsByQuestion = optionRecords.reduce<
    Record<string, Array<{ id: string; label: string }>>
  >((acc, option) => {
    const list = acc[option.questionId] ?? [];
    list.push({ id: option.id, label: option.label });
    acc[option.questionId] = list;
    return acc;
  }, {});

  const questionsPayload = questionRecords.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    kind: question.kind,
    options: optionsByQuestion[question.id] ?? [],
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-muted">
          Cast ballot
        </p>
        <h1 className="text-3xl font-semibold">{poll.title}</h1>
        {poll.description && <p className="text-sm text-muted">{poll.description}</p>}
        {token ? (
          <p className="text-xs text-muted">Redeeming invite token {token}</p>
        ) : null}
        {notYetOpen && (
          <p className="text-sm text-amber-300">
            Voting opens on {new Date(poll.opensAt!).toLocaleString()}.
          </p>
        )}
        {alreadyClosed && (
          <p className="text-sm text-amber-300">Voting for this poll has closed.</p>
        )}
      </header>

      {notYetOpen || alreadyClosed ? (
        <section className="rounded-xl border border-white/5 bg-surface/80 p-8 text-sm text-muted shadow shadow-black/30 backdrop-blur">
          Voting is unavailable at this time.
        </section>
      ) : questionRecords.length === 0 ? (
        <section className="rounded-xl border border-white/5 bg-surface/80 p-8 text-sm text-muted shadow shadow-black/30 backdrop-blur">
          This poll has no questions defined yet.
        </section>
      ) : (
        <VoteForm
          poll={{ id: poll.id, identityMode: poll.identityMode }}
          questions={questionsPayload}
          inviteToken={token}
        />
      )}
    </main>
  );
}
