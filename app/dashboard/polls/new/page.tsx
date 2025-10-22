import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { PollBuilder } from "@/components/poll-builder";

export default async function NewPollPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-16">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-muted">
          Draft poll
        </p>
        <h1 className="text-3xl font-semibold">Create a poll</h1>
        <p className="text-sm text-muted">
          Define your poll, add questions, configure timing, then hit save. You can
          commit once you are satisfied.
        </p>
      </header>
      <PollBuilder />
    </main>
  );
}
