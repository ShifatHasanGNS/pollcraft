import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  ballots,
  polls,
  questions,
  options as pollOptions,
  votes,
} from "@/drizzle/schema";
import { publishPollEvent } from "@/lib/realtime";

const SubmitBody = z.object({
  responses: z.array(
    z.object({
      questionId: z.string(),
      optionIds: z.array(z.string()).optional(),
      freeText: z.string().optional(),
    }),
  ),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: ballotId } = await context.params;
  const body = SubmitBody.parse(await request.json());

  const ballotRecord = await db
    .select({
      ballot: ballots,
      poll: polls,
    })
    .from(ballots)
    .innerJoin(polls, eq(ballots.pollId, polls.id))
    .where(eq(ballots.id, ballotId))
    .limit(1);

  const record = ballotRecord[0];
  if (!record) {
    return NextResponse.json({ error: "Ballot not found" }, { status: 404 });
  }

  if (record.ballot.submittedAt) {
    return NextResponse.json({ error: "Ballot already submitted" }, { status: 409 });
  }

  const pollQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.pollId, record.ballot.pollId));

  const questionMap = new Map(pollQuestions.map((q) => [q.id, q]));

  const questionIds = pollQuestions.map((q) => q.id);
  const optionRecords = questionIds.length
    ? await db
        .select()
        .from(pollOptions)
        .where(inArray(pollOptions.questionId, questionIds))
    : [];

  const optionsByQuestion = optionRecords.reduce<
    Record<string, Array<(typeof optionRecords)[number]>>
  >((acc, option) => {
    const list = acc[option.questionId] ?? [];
    list.push(option);
    acc[option.questionId] = list;
    return acc;
  }, {});

  const values = [] as Array<typeof votes.$inferInsert>;

  for (const response of body.responses) {
    const question = questionMap.get(response.questionId);
    if (!question) {
      return NextResponse.json({ error: "Invalid question" }, { status: 400 });
    }

    if (question.kind === "text") {
      const trimmed = response.freeText?.trim();
      if (!trimmed) {
        continue;
      }

      values.push({
        id: randomUUID(),
        ballotId,
        pollId: record.ballot.pollId,
        questionId: question.id,
        optionId: null,
        freeText: trimmed.slice(0, 4000),
        weight: 1,
      });
      continue;
    }

    const allowedOptions = optionsByQuestion[question.id] ?? [];
    const allowedOptionIds = new Set(allowedOptions.map((opt) => opt.id));

    const selected = response.optionIds ?? [];
    if (selected.length === 0) {
      continue;
    }

    if (question.kind === "single" && selected.length !== 1) {
      return NextResponse.json({ error: "Select a single option" }, { status: 400 });
    }

    for (const optionId of selected) {
      if (!allowedOptionIds.has(optionId)) {
        return NextResponse.json({ error: "Invalid option" }, { status: 400 });
      }
      values.push({
        id: randomUUID(),
        ballotId,
        pollId: record.ballot.pollId,
        questionId: question.id,
        optionId,
        freeText: null,
        weight: 1,
      });
    }
  }

  if (values.length === 0) {
    return NextResponse.json({ error: "No responses provided" }, { status: 400 });
  }

  try {
    await db.insert(votes).values(values);
  } catch (error) {
    console.error("[ballot-submit] Failed to insert votes", error);
    return NextResponse.json({ error: "Failed to record votes" }, { status: 500 });
  }

  const submittedAt = new Date();
  const [updated] = await db
    .update(ballots)
    .set({ submittedAt })
    .where(and(eq(ballots.id, ballotId), isNull(ballots.submittedAt)))
    .returning({ id: ballots.id });

  if (!updated) {
    try {
      await db.delete(votes).where(eq(votes.ballotId, ballotId));
    } catch (cleanupError) {
      console.error("[ballot-submit] Failed to cleanup votes after missing ballot", cleanupError);
    }
    return NextResponse.json(
      { error: "Ballot could not be marked as submitted" },
      { status: 409 },
    );
  }

  publishPollEvent(record.ballot.pollId, { type: "votes:updated" });

  return NextResponse.json({ ok: true });
}
