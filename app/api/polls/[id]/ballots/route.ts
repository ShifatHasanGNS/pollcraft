import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { hashWithSalt, generateDeviceToken } from "@/lib/hash";
import { checkAndIncrement } from "@/lib/rate-limit";
import { ballots, polls } from "@/drizzle/schema";

const CreateBallotBody = z.object({
  deviceToken: z.string().min(8).max(128).optional(),
  userAgent: z.string().max(255).optional(),
  voterRef: z.string().email().optional(),
  inviteToken: z.string().optional(),
});

async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (!forwardedFor) return null;
  const [first] = forwardedFor.split(",");
  return first?.trim() ?? null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: pollId } = await context.params;
  const pollRecord = await db
    .select({
      id: polls.id,
      committedAt: polls.committedAt,
      identityMode: polls.identityMode,
      opensAt: polls.opensAt,
      closesAt: polls.closesAt,
    })
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);

  const poll = pollRecord[0];
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  if (!poll.committedAt) {
    return NextResponse.json({ error: "Poll is not yet open" }, { status: 400 });
  }

  const now = Date.now();
  if (poll.opensAt && now < new Date(poll.opensAt).getTime()) {
    return NextResponse.json({ error: "Poll is not open yet" }, { status: 400 });
  }
  if (poll.closesAt && now > new Date(poll.closesAt).getTime()) {
    return NextResponse.json({ error: "Poll has closed" }, { status: 400 });
  }

  const body = CreateBallotBody.parse(await request.json().catch(() => ({})));

  if (poll.identityMode === "identified" && !body.voterRef) {
    return NextResponse.json(
      { error: "Email is required for this poll" },
      { status: 400 },
    );
  }

  const secret = process.env.NEXTAUTH_SECRET ?? "pollcraft";
  const deviceToken = body.deviceToken ?? generateDeviceToken();
  const deviceTokenHash = hashWithSalt(deviceToken, `${secret}:${pollId}:device`);
  const userAgentHash = body.userAgent
    ? hashWithSalt(body.userAgent, `${secret}:${pollId}:ua`)
    : null;

  const ip = await getClientIp();
  const ipHash = ip ? hashWithSalt(ip, `${secret}:${pollId}:ip`) : null;

  const duplicateConditions: Array<ReturnType<typeof eq>> = [
    eq(ballots.deviceTokenHash, deviceTokenHash),
  ];
  if (poll.identityMode === "identified" && body.voterRef) {
    duplicateConditions.push(eq(ballots.voterRef, body.voterRef));
  }

  const duplicateBallotQuery = await db
    .select({ id: ballots.id, submittedAt: ballots.submittedAt })
    .from(ballots)
    .where(
      and(
        eq(ballots.pollId, pollId),
        duplicateConditions.length === 1
          ? duplicateConditions[0]
          : or(...duplicateConditions),
      ),
    )
    .limit(1);

  if (duplicateBallotQuery.length > 0) {
    const existing = duplicateBallotQuery[0];
    if (!existing.submittedAt) {
      return NextResponse.json({ id: existing.id, pollId, deviceToken });
    }

    return NextResponse.json(
      { error: "You have already started a ballot for this poll" },
      { status: 409 },
    );
  }

  const rateKey = `poll:${pollId}:device:${deviceTokenHash}`;
  const allowed = await checkAndIncrement(rateKey, 1, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many ballot attempts. Try again later." },
      { status: 429 },
    );
  }

  const ballotId = randomUUID();
  await db.insert(ballots).values({
    id: ballotId,
    pollId,
    voterRef: poll.identityMode === "identified" ? body.voterRef : null,
    anonymous: poll.identityMode !== "identified",
    originIpHash: ipHash,
    deviceTokenHash,
    userAgentHash,
  });

  return NextResponse.json({
    id: ballotId,
    pollId,
    deviceToken,
  });
}
