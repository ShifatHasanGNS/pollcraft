import Link from "next/link";
import { cookies } from "next/headers";

import VisitorCounter from "@/components/visitor-counter";
import { auth } from "@/lib/auth";
import { buttonPrimaryTall, card, subCard } from "@/lib/styles";
import {
  getVisitorCookieName,
  getVisitorTotal,
  registerVisitor,
} from "@/lib/metrics";

const highlights = [
  {
    title: "Structured poll builder",
    description:
      "Draft questions, choose single or multi-select answers, and decide whether ballots are anonymous or verified by email.",
  },
  {
    title: "Audience controls",
    description:
      "Share public links or upload eligibility lists so only the people you invite can vote, one ballot per device or address.",
  },
  {
    title: "Realtime statistics",
    description:
      "Results refresh the instant a vote lands. Every chart in PollCraft streams updates without manual refreshes.",
  },
];

const workflow = [
  {
    step: "1",
    title: "Create",
    copy: "Use the poll builder to set the title, description, and question set. Pick anonymous or identified ballots per poll.",
  },
  {
    step: "2",
    title: "Commit",
    copy: "Lock the poll once it looks right. PollCraft freezes the definition so every voter sees the same options.",
  },
  {
    step: "3",
    title: "Collect",
    copy: "Send the invite link or share results with listed voters. Each person submits once while you watch totals rise in real time.",
  },
  {
    step: "4",
    title: "Share",
    copy: "Publish a read-only link or export the tally so your group can review the outcome together.",
  },
];

const capabilities = [
  {
    heading: "Eligibility & access",
    detail:
      "Upload approved addresses or run open polls. PollCraft enforces one ballot per voter with device tokens and email checks.",
  },
  {
    heading: "Realtime dashboards",
    detail:
      "Creators see vote charts refresh instantly. Shared links keep the whole group aligned without exposing individual ballots.",
  },
  {
    heading: "Flexible responses",
    detail:
      "Voters can skip questions they don't need to answer. PollCraft tracks per-question participation so you know who weighed in.",
  },
  {
    heading: "Open-source stack",
    detail:
      "Built with Next.js, Neon, and Drizzle. Fork it, deploy privately, or contribute improvements back to the community.",
  },
];

export default async function HomePage() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  const cookieStore = await cookies();
  const visitorCookieName = getVisitorCookieName();
  const visitorToken = cookieStore.get(visitorCookieName)?.value ?? null;

  const visitorCount = visitorToken
    ? await registerVisitor(visitorToken)
    : await getVisitorTotal();
  const visitorCountLabel = new Intl.NumberFormat().format(visitorCount);
  const needsVisitorRegistration = !visitorToken;

  return (
    <main className="relative isolate overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute left-1/2 top-[-18%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-[rgba(96,165,250,0.35)] via-[rgba(56,242,170,0.25)] to-transparent blur-3xl" />
        <div className="absolute bottom-[-25%] right-[-15%] h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[rgba(168,85,247,0.25)] via-[rgba(96,165,250,0.18)] to-transparent blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col items-center text-center px-6 pb-20 pt-16 sm:pt-24">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.35em] text-muted">
            open-source • community friendly
          </span>
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
            <span className="text-[10px] uppercase tracking-[0.35em] text-muted">
              Total visitors
            </span>
            <span className="text-sm font-semibold text-foreground tracking-[0.08em]">
              <VisitorCounter
                initialLabel={visitorCountLabel}
                needsRegistration={needsVisitorRegistration}
              />
            </span>
          </div>
        </div>
        <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
          Run thoughtful polls for classrooms, clubs, and communities.
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-[var(--muted-strong)] sm:text-xl">
          PollCraft is the survey workflow we use for student councils, meetup planning, and quick community votes. Draft together, lock the poll, invite the right people, and share the outcome instantly.
        </p>
        <div className="mt-10">
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className={buttonPrimaryTall}
          >
            Get Started
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {highlights.map((feature) => (
            <article
              key={feature.title}
              className={`${card} border-white/10 bg-surface/85 p-6 text-left shadow hover:border-white/15 hover:bg-surface`}
            >
              <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-3 text-sm text-muted">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="workflow"
        className="mx-auto flex w-full max-w-6xl flex-col gap-12 border-t border-white/10 px-6 pb-24 pt-24 lg:flex-row"
      >
        <div className="flex-1 space-y-6">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <div className="space-y-4">
            {workflow.map((item) => (
              <div key={item.step} className={`${subCard} border-white/10 bg-black/25 p-4`}>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                  Step {item.step}
                </div>
                <h3 className="mt-2 text-base font-medium text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
        <aside className={`${card} flex-1 border-white/15 bg-surface-elevated/80 p-6`} aria-label="Platform capabilities">
          <div className="rounded-xl border border-white/10 bg-black/40 p-5 shadow-inner shadow-black/30">
            <div className="text-xs uppercase tracking-[0.3em] text-muted">What you ship with</div>
            <ul className="mt-5 space-y-5 text-sm text-muted">
              {capabilities.map((item) => (
                <li key={item.heading} className="space-y-1">
                  <h3 className="text-base font-medium text-foreground">{item.heading}</h3>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-muted">
              The repository contains everything you need to deploy: authentication, poll management, eligibility lists, realtime statistics, and shareable results links.
            </p>
          </div>
        </aside>
      </section>

      <footer className="mx-auto w-full max-w-6xl border-t border-white/10 px-6 pb-10 pt-8 text-center text-[11px] uppercase tracking-[0.3em] text-muted">
        PollCraft © {new Date().getFullYear()} • Open for communities
      </footer>
    </main>
  );
}
