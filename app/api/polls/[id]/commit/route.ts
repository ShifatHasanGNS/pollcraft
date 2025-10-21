import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createDefinitionHash } from "@/lib/hash";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import {
  polls,
  questions,
  options as pollOptions,
  eligibilityLists,
  eligibilityItems,
} from "@/drizzle/schema";

const appUrl = (() => {
  const value = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return value.endsWith("/") ? value.slice(0, -1) : value;
})();

const escapeHtml = (input: string) =>
  input.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });

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

  if (poll.visibility === "listed") {
    try {
      const inviteRows = await db
        .select({
          id: eligibilityItems.id,
          email: eligibilityItems.email,
          displayName: eligibilityItems.displayName,
        })
        .from(eligibilityItems)
        .innerJoin(eligibilityLists, eq(eligibilityItems.listId, eligibilityLists.id))
        .where(eq(eligibilityLists.pollId, pollId));

      const emailConfigured = isEmailConfigured();

      if (inviteRows.length > 0 && emailConfigured) {
        const deduped: typeof inviteRows = [];
        const seen = new Set<string>();
        for (const row of inviteRows) {
          const normalized = row.email.trim().toLowerCase();
          if (seen.has(normalized)) continue;
          seen.add(normalized);
          deduped.push(row);
        }

        const voteUrl = `${appUrl}/polls/${pollId}`;
        const subject = `${poll.title} is ready for voting`;
        const sanitizedTitle = escapeHtml(poll.title);

        const results = await Promise.allSettled(
          deduped.map(({ email, displayName }) => {
            const safeName = displayName ? escapeHtml(displayName) : null;
            const greeting = safeName ? `Hello ${safeName},` : "Hello,";
            const html = `
              <p>${greeting}</p>
              <p>${sanitizedTitle} has been finalized and is ready for your vote.</p>
              <p><a href="${voteUrl}" target="_blank" rel="noopener noreferrer">Cast your ballot</a></p>
              <p style="font-size:12px;color:#94a3b8;">You are receiving this email because you were added to the voter list in PollCraft. If this was unexpected, you can ignore the message.</p>
            `.trim();
            return sendEmail({ to: email, subject, html });
          }),
        );

        const successfulIds: string[] = [];
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            const row = deduped[index];
            console.error(`[poll-commit] Failed to notify ${row.email}`, result.reason);
          } else {
            successfulIds.push(deduped[index].id);
          }
        });

        if (successfulIds.length > 0) {
          await db
            .update(eligibilityItems)
            .set({ invited: true })
            .where(inArray(eligibilityItems.id, successfulIds));
        }
      } else if (!emailConfigured && inviteRows.length > 0) {
        console.warn(
          "[poll-commit] Email configuration missing; participant notifications skipped.",
        );
      }
    } catch (error) {
      console.error("[poll-commit] Failed to send participant notifications", error);
    }
  }

  return NextResponse.json({ ok: true, definitionHash });
}
