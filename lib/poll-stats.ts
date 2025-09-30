import { sql, eq, inArray, and, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  ballots,
  polls,
  questions,
  options as pollOptions,
  votes,
} from "@/drizzle/schema";
import { withDbRetry } from "@/lib/db-retry";

type OptionStat = {
  optionId: string;
  label: string;
  count: number;
  participants: number;
  percentage: number;
};

type TextStat = {
  responses: number;
};

type QuestionStat = {
  id: string;
  prompt: string;
  kind: "single" | "multi" | "ranked" | "text";
  participants: number;
  options?: OptionStat[];
  text?: TextStat;
};

type BallotSnapshot = {
  totalIssued: number;
  totalSubmitted: number;
  totalVotes: number;
};

export type PollStatistics = {
  poll: {
    id: string;
    title: string;
    description: string | null;
  };
  ballots: BallotSnapshot;
  questions: QuestionStat[];
};

const countExpression = sql<number>`COUNT(*)`;

export async function getPollStatistics(pollId: string): Promise<PollStatistics | null> {
  const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await withDbRetry(fn);
    } catch (error) {
      console.error("[poll-stats] query failed", error);
      return fallback;
    }
  };

  const pollRecord = await db
    .select({ id: polls.id, title: polls.title, description: polls.description })
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);

  const poll = pollRecord[0];
  if (!poll) {
    return null;
  }

  const [{ totalIssued }] = await safe(
    () =>
      db
        .select({ totalIssued: countExpression })
        .from(ballots)
        .where(eq(ballots.pollId, pollId)),
    [{ totalIssued: 0 }],
  );

  const [{ totalSubmitted }] = await safe(
    () =>
      db
        .select({ totalSubmitted: countExpression })
        .from(ballots)
        .where(and(eq(ballots.pollId, pollId), isNotNull(ballots.submittedAt))),
    [{ totalSubmitted: 0 }],
  );

  const voteRows = await safe(
    () =>
      db
        .select({
          ballotId: votes.ballotId,
          questionId: votes.questionId,
          optionId: votes.optionId,
        })
        .from(votes)
        .where(eq(votes.pollId, pollId)),
    [] as Array<{ ballotId: string; questionId: string; optionId: string | null }>,
  );

  const totalVotes = voteRows.length;

  const questionRecords = await safe(
    () =>
      db
        .select({
          id: questions.id,
          prompt: questions.prompt,
          kind: questions.kind,
          order: questions.orderIndex,
        })
        .from(questions)
        .where(eq(questions.pollId, pollId))
        .orderBy(questions.orderIndex),
    [] as Array<{ id: string; prompt: string; kind: "single" | "multi" | "ranked" | "text"; order: number }>,
  );

  const questionIds = questionRecords.map((question) => question.id);

  const optionRecords = questionIds.length
    ? await safe(
        () =>
          db
            .select({
              id: pollOptions.id,
              questionId: pollOptions.questionId,
              label: pollOptions.label,
              order: pollOptions.orderIndex,
            })
            .from(pollOptions)
            .where(inArray(pollOptions.questionId, questionIds)),
        [] as Array<{ id: string; questionId: string; label: string; order: number }>,
      )
    : [];

  const optionsByQuestion = optionRecords.reduce<Record<string, typeof optionRecords>>((acc, option) => {
    const bucket = acc[option.questionId] ?? [];
    bucket.push(option);
    acc[option.questionId] = bucket;
    return acc;
  }, {});

  const votesByQuestion = voteRows.reduce<Record<string, typeof voteRows>>((acc, vote) => {
    const bucket = acc[vote.questionId] ?? [];
    bucket.push(vote);
    acc[vote.questionId] = bucket;
    return acc;
  }, {});

  const questionsStats: QuestionStat[] = questionRecords.map((question) => {
    const responses = votesByQuestion[question.id] ?? [];
    const uniqueBallots = new Set(responses.map((vote) => vote.ballotId));
    const participants = uniqueBallots.size;

    if (question.kind === "text") {
      return {
        id: question.id,
        prompt: question.prompt,
        kind: question.kind,
        participants,
        text: {
          responses: responses.length,
        },
      };
    }

    const options = (optionsByQuestion[question.id] ?? []).sort((a, b) => a.order - b.order);
    const optionStats: OptionStat[] = options.map((option) => {
      const count = responses.filter((vote) => vote.optionId === option.id).length;
      const percentage = participants === 0 ? 0 : (count / participants) * 100;
      return {
        optionId: option.id,
        label: option.label,
        count,
        participants,
        percentage,
      };
    });

    return {
      id: question.id,
      prompt: question.prompt,
      kind: question.kind,
      participants,
      options: optionStats,
    };
  });

  return {
    poll: {
      id: poll.id,
      title: poll.title,
      description: poll.description,
    },
    ballots: {
      totalIssued: Number(totalIssued ?? 0),
      totalSubmitted: Number(totalSubmitted ?? 0),
      totalVotes,
    },
    questions: questionsStats,
  };
}
