import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { withDbRetry } from "@/lib/db-retry";
import { card, subCard } from "@/lib/styles";
import { pruneExpiredPolls } from "@/lib/poll-maintenance";
import { CommitPollButton } from "@/components/commit-poll-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import {
  polls,
  questions,
  options as pollOptions,
  voteAggregates,
  ballots,
  votes,
  eligibilityLists,
  eligibilityItems,
} from "@/drizzle/schema";

export default async function PollDetailsPage({ params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await pruneExpiredPolls();

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

  const optionRecords = !!questionIds.length
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
    [] as Array<{ questionId: string; optionId: string; count: number }>,
  );

  const counts = new Map<string, number>();
  for (const row of aggregateRows) {
    counts.set(`${row.questionId}:${row.optionId ?? "text"}`, row.count);
  }

  type QuestionKind = "single" | "multi" | "ranked" | "text";

  const questionMeta = new Map<string, { prompt: string; kind: QuestionKind; order: number }>(
    pollQuestions.map((question, index) => [
      question.id,
      { prompt: question.prompt, kind: question.kind as QuestionKind, order: index },
    ]),
  );

  const optionOrderIndex = new Map<string, Map<string, number>>();
  Object.entries(optionsByQuestion).forEach(([questionId, options]) => {
    const orderMap = new Map<string, number>();
    [...options]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .forEach((option, idx) => {
        orderMap.set(option.id, idx);
      });
    optionOrderIndex.set(questionId, orderMap);
  });

  type ParticipantEntry = {
    email: string;
    name: string | null;
    invited: boolean;
    ballotId: string | null;
    submittedAt: Date | null;
    status: "submitted" | "in-progress" | "pending";
    responses: Array<{
      questionId: string;
      prompt: string;
      kind: QuestionKind;
      answers: string[];
    }>;
  };

  let participantEntries: ParticipantEntry[] = [];

  if (poll.identityMode === "identified") {
    const eligibleRows = await safeRetry(
      () =>
        db
          .select({
            email: eligibilityItems.email,
            displayName: eligibilityItems.displayName,
            invited: eligibilityItems.invited,
          })
          .from(eligibilityItems)
          .innerJoin(eligibilityLists, eq(eligibilityItems.listId, eligibilityLists.id))
          .where(eq(eligibilityLists.pollId, pollId)),
      [] as Array<{ email: string; displayName: string | null; invited: boolean }>,
    );

    const ballotRows = await safeRetry(
      () =>
        db
          .select({
            id: ballots.id,
            voterRef: ballots.voterRef,
            submittedAt: ballots.submittedAt,
          })
          .from(ballots)
          .where(eq(ballots.pollId, pollId)),
      [] as Array<{ id: string; voterRef: string | null; submittedAt: Date | null }>,
    );

    const participantMap = new Map<string, ParticipantEntry>();
    const ballotIdToEmail = new Map<string, string>();

    for (const row of eligibleRows) {
      const email = row.email.trim();
      if (!email) continue;
      const key = email.toLowerCase();
      participantMap.set(key, {
        email,
        name: row.displayName,
        invited: row.invited,
        ballotId: null,
        submittedAt: null,
        status: "pending",
        responses: [],
      });
    }

    for (const ballot of ballotRows) {
      if (!ballot.voterRef) continue;
      const email = ballot.voterRef.trim();
      if (!email) continue;
      const key = email.toLowerCase();
      const existing =
        participantMap.get(key) ??
        {
          email,
          name: null,
          invited: false,
          ballotId: null,
          submittedAt: null,
          status: "pending" as const,
          responses: [] as ParticipantEntry["responses"],
        };

      existing.ballotId = ballot.id;
      existing.submittedAt = ballot.submittedAt ? new Date(ballot.submittedAt) : null;
      existing.status = existing.submittedAt ? "submitted" : "in-progress";

      participantMap.set(key, existing);
      ballotIdToEmail.set(ballot.id, key);
    }

    const ballotIds = Array.from(ballotIdToEmail.keys());

    const voteRows =
      ballotIds.length === 0
        ? []
        : await safeRetry(
          () =>
            db
              .select({
                ballotId: votes.ballotId,
                questionId: votes.questionId,
                optionId: votes.optionId,
                optionLabel: pollOptions.label,
                freeText: votes.freeText,
              })
              .from(votes)
              .leftJoin(pollOptions, eq(votes.optionId, pollOptions.id))
              .where(inArray(votes.ballotId, ballotIds)),
          [] as Array<{
            ballotId: string;
            questionId: string;
            optionId: string | null;
            optionLabel: string | null;
            freeText: string | null;
          }>,
        );

    const answersByBallot = new Map<
      string,
      Map<string, Array<{ value: string; optionId: string | null }>>
    >();

    for (const row of voteRows) {
      if (!ballotIdToEmail.has(row.ballotId)) continue;
      const ballotMap = answersByBallot.get(row.ballotId) ?? new Map();
      const existingAnswers = ballotMap.get(row.questionId) ?? [];
      const rawValue = row.optionLabel ?? row.freeText ?? "";
      const value = rawValue.trim();
      if (value.length === 0) {
        ballotMap.set(row.questionId, existingAnswers);
        answersByBallot.set(row.ballotId, ballotMap);
        continue;
      }
      existingAnswers.push({ value, optionId: row.optionId });
      ballotMap.set(row.questionId, existingAnswers);
      answersByBallot.set(row.ballotId, ballotMap);
    }

    participantEntries = Array.from(participantMap.values()).map((entry) => {
      if (!entry.ballotId) {
        return { ...entry, responses: [], status: entry.status };
      }

      const responseMap =
        answersByBallot.get(entry.ballotId) ??
        new Map<string, Array<{ value: string; optionId: string | null }>>();

      const structuredResponses: Array<{
        order: number;
        response: ParticipantEntry["responses"][number];
      }> = [];

      for (const [questionId, records] of responseMap.entries()) {
        const meta = questionMeta.get(questionId);
        if (!meta) continue;
        const orderMap = optionOrderIndex.get(questionId);

        const sortedRecords =
          meta.kind === "text"
            ? records
            : [...records].sort((a, b) => {
              const fallback = Number.MAX_SAFE_INTEGER;
              const orderA = a.optionId && orderMap ? orderMap.get(a.optionId) ?? fallback : fallback;
              const orderB = b.optionId && orderMap ? orderMap.get(b.optionId) ?? fallback : fallback;
              return orderA - orderB;
            });

        const answers =
          meta.kind === "text"
            ? sortedRecords.map((item) => item.value)
            : Array.from(
              new Map(sortedRecords.map((item) => [item.optionId ?? item.value, item.value])).values(),
            );

        structuredResponses.push({
          order: meta.order,
          response: {
            questionId,
            prompt: meta.prompt,
            kind: meta.kind,
            answers,
          },
        });
      }

      const responses = structuredResponses
        .sort((a, b) => a.order - b.order)
        .map((entry) => entry.response);

      return {
        ...entry,
        status: entry.submittedAt ? "submitted" : entry.status,
        responses,
      };
    });

    participantEntries.sort((a, b) => {
      const rank = (entry: ParticipantEntry) => {
        if (entry.status === "submitted") return 0;
        if (entry.status === "in-progress") return 1;
        return 2;
      };

      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;

      if (a.submittedAt && b.submittedAt) {
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      }

      return a.email.localeCompare(b.email);
    });
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

      {poll.identityMode === "identified" && (
        <section className={`${card} p-6`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-foreground">Participant responses</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-muted">
              Visible to poll owners
            </span>
          </div>
          {participantEntries.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Add participants to your eligibility list to track individual ballots.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {participantEntries.map((participant) => {
                const trimmedName = participant.name?.trim() || null;
                const statusMeta =
                  participant.status === "submitted"
                    ? {
                      label: "Submitted",
                      className:
                        "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
                      subLabel: participant.submittedAt
                        ? `Submitted ${participant.submittedAt.toLocaleString()}`
                        : "Ballot submitted",
                    }
                    : participant.status === "in-progress"
                      ? {
                        label: "In progress",
                        className: "border-amber-300/40 bg-amber-400/10 text-amber-200",
                        subLabel: "Ballot started — awaiting submission",
                      }
                      : {
                        label: "Pending",
                        className: "border-white/10 bg-white/5 text-slate-200",
                        subLabel: "No ballot started yet",
                      };

                return (
                  <li key={participant.email}>
                    <details className={`${subCard} border-white/10 bg-black/25`}>
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 text-left hover:text-foreground">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {trimmedName ?? participant.email}
                          </span>
                          {trimmedName && (
                            <span className="text-xs text-muted">{participant.email}</span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs">
                          <span
                            className={`rounded-full border px-3 py-1 font-semibold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                          <span className="text-muted">{statusMeta.subLabel}</span>
                        </div>
                      </summary>
                      <div className="border-t border-white/10 px-4 py-3 text-sm text-muted">
                        {participant.responses.length === 0 ? (
                          <p className="text-xs text-muted">
                            {participant.status === "submitted"
                              ? "No responses recorded for this ballot."
                              : participant.status === "in-progress"
                                ? "Participant has started their ballot but has not submitted yet."
                                : "Participant has not opened their ballot yet."}
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {participant.responses.map((response) => (
                              <div key={response.questionId}>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                                  Question
                                </p>
                                <p className="mt-1 text-sm text-foreground">{response.prompt}</p>
                                <div className="mt-2 text-sm text-muted">
                                  {response.kind === "text" ? (
                                    <div className="space-y-2">
                                      {response.answers.map((answer, index) => (
                                        <p
                                          key={`${response.questionId}-${index}`}
                                          className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
                                        >
                                          {answer}
                                        </p>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {response.answers.map((answer, index) => (
                                        <span
                                          key={`${response.questionId}-${index}`}
                                          className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-slate-200"
                                        >
                                          {answer}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

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
