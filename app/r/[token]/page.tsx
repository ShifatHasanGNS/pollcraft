type SharedResultsPageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharedResultsPage({
  params,
}: SharedResultsPageProps) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-muted">
          Shared results
        </p>
        <h1 className="text-3xl font-semibold">Report token {token}</h1>
        <p className="text-sm text-muted">
          Result snapshots and AI-generated summaries will be rendered here once
          share links map to poll aggregates.
        </p>
      </header>
      <section className="rounded-xl border border-white/5 bg-surface/80 p-6 shadow-md shadow-black/30 backdrop-blur">
        <p className="text-sm text-muted">
          Waiting for poll data...
        </p>
      </section>
    </main>
  );
}
