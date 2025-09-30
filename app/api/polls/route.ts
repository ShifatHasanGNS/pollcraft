import { randomUUID, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  polls,
  questions,
  options as pollOptions,
  eligibilityLists,
  eligibilityItems,
} from "@/drizzle/schema";

const PollBody = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["public", "listed"]).default("public"),
  identityMode: z.enum(["anonymous", "identified"]).default("anonymous"),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
  listedEmails: z.array(z.string().email()).optional(),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(3).max(2000),
        kind: z.enum(["single", "multi", "ranked", "text"]).default("single"),
        options: z
          .array(
            z.object({
              label: z.string().min(1).max(2000),
            }),
          )
          .optional(),
      }),
    )
    .default([]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userPolls = await db
    .select({
      id: polls.id,
      title: polls.title,
      createdAt: polls.createdAt,
      committedAt: polls.committedAt,
      opensAt: polls.opensAt,
      closesAt: polls.closesAt,
    })
    .from(polls)
    .where(eq(polls.ownerId, session.user.id))
    .orderBy(desc(polls.createdAt));

  return NextResponse.json({ polls: userPolls });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = PollBody.parse(await request.json());

  const pollId = randomUUID();
  const now = new Date();

  if (body.visibility === "listed" && (!body.listedEmails || body.listedEmails.length === 0)) {
    return NextResponse.json(
      { error: "Provide at least one email for a listed poll." },
      { status: 400 },
    );
  }

  const questionRecords: (typeof questions.$inferInsert)[] = [];
  const optionRecords: (typeof pollOptions.$inferInsert)[] = [];
  const listedEmails = body.listedEmails ?? [];

  body.questions.forEach((question, index) => {
    const questionId = randomUUID();
    questionRecords.push({
      id: questionId,
      pollId,
      kind: question.kind,
      prompt: question.prompt,
      orderIndex: index,
    });

    (question.options ?? []).forEach((option, optionIndex) => {
      optionRecords.push({
        id: randomUUID(),
        questionId,
        label: option.label,
        orderIndex: optionIndex,
      });
    });
  });

  try {
    await db.insert(polls).values({
      id: pollId,
      ownerId: session.user!.id,
      title: body.title,
      description: body.description,
      visibility: body.visibility,
      identityMode: body.identityMode,
      opensAt: body.opensAt ? new Date(body.opensAt) : null,
      closesAt: body.closesAt ? new Date(body.closesAt) : null,
      version: 1,
      createdAt: now,
    });

    if (questionRecords.length > 0) {
      await db.insert(questions).values(questionRecords);
    }

    if (optionRecords.length > 0) {
      await db.insert(pollOptions).values(optionRecords);
    }

    if (body.visibility === "listed" && listedEmails.length > 0) {
      const [list] = await db
        .insert(eligibilityLists)
        .values({ pollId, name: "Default list" })
        .returning({ id: eligibilityLists.id });

      if (!list?.id) {
        throw new Error("Failed to create eligibility list");
      }

      const nowIso = new Date().toISOString();
      const items = listedEmails.map((email) => ({
        listId: list.id,
        email,
        displayName: null,
        invited: true,
        redeemed: false,
        inviteTokenHash: createHash("sha256").update(`${email}:${nowIso}`).digest("hex"),
      }));

      if (items.length > 0) {
        await db.insert(eligibilityItems).values(items);
      }
    }
  } catch (error) {
    await db.delete(polls).where(eq(polls.id, pollId));
    throw error;
  }

  return NextResponse.json({ id: pollId });
}
