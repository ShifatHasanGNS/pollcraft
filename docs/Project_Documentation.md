# PollCraft — Architecture Notes

PollCraft is a dark-first polling platform running on Vercel with Next.js 15, Neon Postgres, Drizzle ORM, and Auth.js (NextAuth). This document captures the current shape of the project so new contributors can orient themselves quickly.

---

## Product Snapshot

- **Owners** create polls with multiple question types, commit the definition, and invite voters from an eligibility list.
- **Voters** receive a single ballot (enforced via device token + optional email) and submit responses through the voting surface.
- **Realtime statistics** update over SSE; dashboards also expose participant-level answers for identified polls.
- **Visitor analytics** record unique visitors in Postgres so the landing page can display a live count.
- **Email notifications** are sent through Resend as soon as a listed poll is committed (if credentials are present).

Removed in this iteration: AI summaries and unused SSE helpers—focus is on core polling UX.

---

## Tech Stack

| Concern            | Implementation                                  |
| ------------------ | ----------------------------------------------- |
| Runtime            | Next.js 15 App Router (Node runtime)            |
| Database           | Neon Postgres via `@neondatabase/serverless`    |
| ORM / Migrations   | Drizzle ORM + Drizzle Kit                       |
| Auth               | NextAuth credentials provider + Drizzle adapter |
| Forms & Validation | React Hook Form + Zod                           |
| Charts             | `echarts` + `echarts-for-react`                 |
| Email              | Resend REST API                                 |
| Styling            | Tailwind CSS 4 (custom tokens)                  |

---

## Repository Layout

```.
app/
  (home)/page.tsx                 # Landing page + visitor counter
  dashboard/page.tsx              # Owner overview
  dashboard/polls/[pollId]/page.tsx
  polls/page.tsx                  # Poll list for owners
  polls/[pollId]/page.tsx         # Voting surface
  polls/[pollId]/details/page.tsx # Public poll details
  polls/[pollId]/statistics/page.tsx
  api/
    auth/[...nextauth]/route.ts
    polls/route.ts
    polls/[id]/commit/route.ts
    polls/[id]/ballots/route.ts
    polls/[id]/events/route.ts
    ballots/[id]/submit/route.ts
    polls/[id]/results/route.ts
components/                       # UI building blocks
drizzle/schema.ts                 # Source-of-truth schema
drizzle/migrations/               # Generated SQL
lib/                              # Server utilities (auth, db, email, metrics, stats)
docs/Project_Documentation.md     # This file
```

---

## Data Model Highlights

- **Poll definition**: `polls`, `questions`, `options`
- **Ballots**: `ballots` (issue) and `votes` (responses)
- **Aggregates**: `vote_aggregates` stores per-question counts for fast dashboards (PK: pollId + questionId + optionId)
- **Eligibility**: `eligibility_lists` + `eligibility_list_items`, including `invited` flag for email notifications
- **Metrics**: `app_metrics` (key/value) and `visitor_tokens` (hashed identifiers) power the landing-page visitor badge
- **Auth**: standard NextAuth tables plus `password_credentials` for the credentials provider

`pnpm db:generate` emits migrations, `pnpm db:push` applies them to Neon.

---

## Key Request Flows

### Poll Creation

1. `app/dashboard/polls/new` renders the builder (`components/poll-builder.tsx`).
2. Submitting POSTs to `app/api/polls/route.ts`, which:
   - Inserts the poll, questions, options.
   - Creates an eligibility list (if visibility is `listed`).

### Poll Commitment

1. Owners trigger `POST /api/polls/:id/commit`.
2. Route locks the definition (definition hash + `committed_at`).
3. Eligibility rows are deduped and, if Resend is configured, emails are delivered.
4. Successful sends mark `eligibility_list_items.invited = true`.

### Ballot Lifecycle

1. Voting page calls `POST /api/polls/:id/ballots` to obtain a ballot ID/device token.
2. Submitting responses hits `POST /api/ballots/:id/submit`, recording votes and marking the ballot submitted.
3. Submission publishes a `votes:updated` event via `lib/realtime.ts`.

### Realtime Statistics

1. Client subscribes to `/api/polls/:id/events` SSE stream.
2. Server sends an initial snapshot plus updates whenever votes arrive.
3. `components/poll-statistics.tsx` renders charts with padded axes to avoid label clipping.

### Visitor Tracking

1. `app/(home)/page.tsx` hashes a long-lived cookie and registers visitors through `lib/metrics.ts`.
2. `app_metrics` stores the running total, exposed near the hero pill.

---

## Environment Variables

| Variable                        | Description                                                      |
| ------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`                  | Neon/Postgres connection string (required)                       |
| `NEXTAUTH_URL`                  | Base URL for NextAuth callbacks                                  |
| `NEXTAUTH_SECRET`               | Session/JWT secret; also used for visitor-token hashing fallback |
| `RESEND_API_KEY` & `EMAIL_FROM` | Enable invite notifications after poll commit                    |
| `APP_URL`                       | Public URL used when composing email links                       |
| `NEXT_PUBLIC_APP_URL`           | Optional, used client-side for share URLs                        |
| `METRICS_SECRET`                | Optional salt for visitor hashing                                |

Missing email env vars will skip notifications with a console warning.

---

## Tooling & Quality

- **Linting**: `pnpm lint` (React Compiler) — addresses purity warnings and incompatible hooks.
- **Database**: `pnpm db:generate`, `pnpm db:push`, `pnpm db:studio`.
- **Testing**: No automated tests yet; focus on manual QA. Future work could add Vitest + Playwright.

---

## Future Work

- Shared read-only results route still surfaces placeholder copy (`app/r/[token]/page.tsx`).
- AI summaries were removed; reintroduce by adding a provider and wiring totals into a summariser.
- CSV export and richer analytics (per-question filters, cross-tabs).
- Rate-limit or abuse mitigations beyond the current device/email hashing.
- OAuth providers or passwordless auth to improve voter onboarding.

---

Keep this document in sync with structural changes—especially API contracts, schema updates, and new infrastructure pieces. It should remain the single source of truth for the architectural intent behind PollCraft.
