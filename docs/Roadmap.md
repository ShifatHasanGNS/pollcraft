# PollCraft Study Roadmap

1. [Project_Documentation.md](Project_Documentation.md) — Owner-written architecture briefing covering flows, stack, roadmap.
2. [README.md](../README.md) — High-level product summary, setup steps, and environment checklist.
3. [package.json](../package.json) — Scripts and runtime dependencies that drive the app and tooling.
4. [tsconfig.json](../tsconfig.json) — TypeScript strictness and the `@/*` import alias used across the repo.
5. [next.config.ts](../next.config.ts) — Placeholder for framework tweaks; confirm no hidden runtime flags.
6. [eslint.config.mjs](../eslint.config.mjs) — Lint baseline (Next + React Compiler) you will see in CI.
7. [postcss.config.mjs](../postcss.config.mjs) — Tailwind CSS entry point for the design system.
8. [drizzle.config.ts](../drizzle.config.ts) — Drizzle migration output path and DB connection expectations.
9. [drizzle/schema.ts](../drizzle/schema.ts) — Complete relational model (polls, ballots, eligibility, metrics, auth tables).
10. [`drizzle/migrations`](../drizzle/migrations) — Generated SQL you apply to Neon; scan to match schema intent.
11. [lib/db.ts](../lib/db.ts) — Neon client creation and typed Drizzle instance used everywhere.
12. [lib/db-retry.ts](../lib/db-retry.ts) — Exponential backoff wrapper around DB calls to smooth Neon hiccups.
13. [lib/auth.ts](../lib/auth.ts) — NextAuth configuration, credentials provider, and session helpers.
14. [types/next-auth.d.ts](../types/next-auth.d.ts) — Session typing that surfaces user IDs to the client.
15. [lib/hash.ts](../lib/hash.ts) — Shared hashing helpers for poll definitions, device tokens, invite secrets.
16. [lib/metrics.ts](../lib/metrics.ts) — Visitor counter token logic and Postgres-backed aggregate mutations.
17. [lib/rate-limit.ts](../lib/rate-limit.ts) — In-memory throttle safeguarding ballot creation requests.
18. [lib/poll-maintenance.ts](../lib/poll-maintenance.ts) — Expired poll pruning invoked before most poll operations.
19. [lib/poll-stats.ts](../lib/poll-stats.ts) — Aggregated statistics loader feeding dashboards and SSE.
20. [lib/realtime.ts](../lib/realtime.ts) — Server-side event bus powering poll statistics streaming.
21. [lib/email.ts](../lib/email.ts) — Resend integration and graceful fallback when credentials are missing.
22. [lib/styles.ts](../lib/styles.ts) — Shared Tailwind class compositions for buttons and cards.
23. [app/globals.css](../app/globals.css) — Tailwind import plus global dark theme tokens and background styling.
24. [app/layout.tsx](../app/layout.tsx) — Root HTML shell, font loading, session bootstrap, navbar placement.
25. [components/session-provider.tsx](../components/session-provider.tsx) — Client wrapper delivering initial session to React tree.
26. [components/navbar.tsx](../components/navbar.tsx) — Primary navigation with auth-aware links and mobile menu.
27. [components/logout-button.tsx](../components/logout-button.tsx) — Sign-out UX and transition handling.
28. [app/(home)/page.tsx](../app/%28home%29/page.tsx) — Marketing landing page, visitor counter wiring, auth-aware CTA.
29. [components/visitor-counter.tsx](../components/visitor-counter.tsx) — Client hook for registering visitors via `/api/metrics/visitor`.
30. [app/login/page.tsx](../app/login/page.tsx) — Server-side redirect guard and auth entry point.
31. [components/auth-switcher.tsx](../components/auth-switcher.tsx) — Tabbed UI toggling between login and registration flows.
32. [components/auth-form.tsx](../components/auth-form.tsx) — Credential sign-in form with NextAuth integration.
33. [app/register/page.tsx](../app/register/page.tsx) — Standalone registration route with friendly copy.
34. [components/register-form.tsx](../components/register-form.tsx) — Account creation form hitting `/api/register`.
35. [app/dashboard/page.tsx](../app/dashboard/page.tsx) — Owner poll overview, DB fetch with retries, call-to-action for drafts.
36. [app/dashboard/polls/new/page.tsx](../app/dashboard/polls/new/page.tsx) — Draft creation route gating on auth.
37. [components/poll-builder.tsx](../components/poll-builder.tsx) — Rich client-side poll editor, validation, POST payload construction.
38. [components/commit-poll-button.tsx](../components/commit-poll-button.tsx) — Commit action calling API and refreshing state.
39. [app/dashboard/polls/[pollId]/page.tsx](../app/dashboard/polls/%5BpollId%5D/page.tsx) — Owner detail view including aggregates, participant tracking, and commit visibility logic.
40. [components/share-poll-button.tsx](../components/share-poll-button.tsx) — Clipboard helper for vote/details/statistics links.
41. [app/polls/page.tsx](../app/polls/page.tsx) — Public poll browser with SQL search, personalisation, and share buttons.
42. [app/polls/[pollId]/page.tsx](../app/polls/%5BpollId%5D/page.tsx) — Voting surface loader with open/close guards and question snapshots.
43. [components/vote-form.tsx](../components/vote-form.tsx) — Ballot creation, device token persistence, and submission handling.
44. [app/vote/[pollId]/page.tsx](../app/vote/%5BpollId%5D/page.tsx) — Alternate route exporting the same voting experience.
45. [app/polls/[pollId]/details/page.tsx](../app/polls/%5BpollId%5D/details/page.tsx) — Public detail view showing definition metadata.
46. [app/polls/[pollId]/statistics/page.tsx](../app/polls/%5BpollId%5D/statistics/page.tsx) — SSR stats fetch and client SSE hookup.
47. [components/poll-statistics.tsx](../components/poll-statistics.tsx) — Live ECharts rendering and SSE event management.
48. [app/r/[token]/page.tsx](../app/r/%5Btoken%5D/page.tsx) — Placeholder for future share-link powered reports.
49. [app/api/polls/route.ts](../app/api/polls/route.ts) — Poll listing/creation, validation, eligibility list seeding.
50. [app/api/polls/[id]/commit/route.ts](../app/api/polls/%5Bid%5D/commit/route.ts) — Definition locking, email invites, hash recording.
51. [app/api/polls/[id]/ballots/route.ts](../app/api/polls/%5Bid%5D/ballots/route.ts) — Ballot issuance, duplication checks, rate limiting.
52. [app/api/ballots/[id]/submit/route.ts](../app/api/ballots/%5Bid%5D/submit/route.ts) — Vote validation, persistence, and realtime event publishing.
53. [app/api/polls/[id]/results/route.ts](../app/api/polls/%5Bid%5D/results/route.ts) — REST endpoint exposing aggregated statistics.
54. [app/api/polls/[id]/events/route.ts](../app/api/polls/%5Bid%5D/events/route.ts) — SSE stream for live updates.
55. [app/api/metrics/visitor/route.ts](../app/api/metrics/visitor/route.ts) — Visitor token registration and cookie management.
56. [app/api/register/route.ts](../app/api/register/route.ts) — User onboarding API writing to users/password credentials.
57. [app/api/auth/[...nextauth]/route.ts](../app/api/auth/%5B...nextauth%5D/route.ts) — NextAuth handler binding the credential provider.
