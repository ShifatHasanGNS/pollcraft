import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createDefinitionHash } from "@/lib/hash";
import {
  polls,
  questions,
  options as pollOptions,
} from "@/drizzle/schema";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: pollId } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [poll] = await db
    .select()
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);

  if (!poll) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (poll.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (poll.committedAt) {
    return NextResponse.json({ error: "Poll already committed" }, { status: 400 });
  }

  const pollQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.pollId, pollId))
    .orderBy(questions.orderIndex);

  const questionIds = pollQuestions.map((q) => q.id);
  if (questionIds.length === 0) {
    return NextResponse.json(
      { error: "Add at least one question before committing" },
      { status: 400 },
    );
  }
  const questionOptions = questionIds.length
    ? await db
        .select()
        .from(pollOptions)
        .where(inArray(pollOptions.questionId, questionIds))
    : [];

  const definitionHash = createDefinitionHash({
    poll,
    questions: pollQuestions,
    options: questionOptions,
  });

  await db
    .update(polls)
    .set({ committedAt: new Date(), definitionHash })
    .where(eq(polls.id, pollId));

  return NextResponse.json({ ok: true, definitionHash });
}
