import { NextResponse } from "next/server";

import { getPollStatistics } from "@/lib/poll-stats";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: pollId } = await context.params;
  const stats = await getPollStatistics(pollId);
  if (!stats) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  return NextResponse.json({ pollId, statistics: stats });
}
