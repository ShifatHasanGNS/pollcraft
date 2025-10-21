import Link from "next/link";
import { notFound } from "next/navigation";
import { PollStatisticsClient } from "@/components/poll-statistics";
import { SharePollButton } from "@/components/share-poll-button";
import { getPollStatistics } from "@/lib/poll-stats";

type PollStatisticsPageProps = {
  params: Promise<{ pollId: string }>;
};

export default async function PollStatisticsPage({ params }: PollStatisticsPageProps) {
  const { pollId } = await params;
  const stats = await getPollStatistics(pollId);

  if (!stats) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted">Poll statistics</p>
          <h1 className="text-3xl font-semibold">{stats.poll.title}</h1>
          {stats.poll.description && <p className="text-sm text-muted">{stats.poll.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <SharePollButton pollId={stats.poll.id} mode="statistics" label="Copy statistics link" />
          <Link
            href={`/polls/${stats.poll.id}/details`}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
          >
            View details
          </Link>
          <Link
            href={`/polls/${stats.poll.id}`}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 font-semibold text-foreground transition hover:border-white/35 hover:bg-white/10"
          >
            Return to voting
          </Link>
        </div>
      </header>

      <PollStatisticsClient pollId={stats.poll.id} initial={stats} />
    </main>
  );
}
