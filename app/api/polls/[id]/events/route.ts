import { NextResponse } from "next/server";
import { getPollStatistics } from "@/lib/poll-stats";
import { subscribeToPoll } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL = 15000;

type EncodedSend = (payload: unknown) => void;

type StreamController = ReadableStreamDefaultController<Uint8Array>;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: pollId } = await context.params;

  const stats = await getPollStatistics(pollId);
  if (!stats) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller: StreamController) {
      const send: EncodedSend = (payload) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      controller.enqueue(encoder.encode("retry: 5000\n\n"));
      send({ type: "snapshot", data: stats });

      unsubscribe = subscribeToPoll(pollId, async () => {
        try {
          const latest = await getPollStatistics(pollId);
          if (latest) {
            send({ type: "update", data: latest });
          }
        } catch (error) {
          console.error("[poll-events] failed to refresh stats", error);
        }
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, HEARTBEAT_INTERVAL);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
