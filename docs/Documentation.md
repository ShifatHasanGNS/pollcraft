# PollCraft — Architecture Notes

I operate PollCraft as a dark-first polling platform running on Vercel with Next.js 15, Neon Postgres, Drizzle ORM, and Auth.js (NextAuth). I keep these notes so teammates and future me can understand the current shape of the project quickly.

---

## Product Snapshot

- **Owners** (including me) create polls with multiple question types, commit the definition, and invite voters from curated eligibility lists.
- **Voters** receive a single ballot, enforced through device tokens plus optional email checks, and submit through the voting surface.
- **Realtime statistics** stream over SSE so I can watch results update without refreshing; identified poll responses stay owner-only.
- **Visitor analytics** store hashed tokens in Postgres so my landing page can show a live visitor count.
- **Email notifications** fire via Resend immediately after I commit a listed poll (when credentials are configured).

I previously experimented with AI summaries and additional SSE helpers, but I removed them to focus on core polling UX.

---

## Tech Stack

| Concern            | How I handle it                                 |
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
- **Aggregates**: `vote_aggregates` keeps per-question counts for fast dashboards
- **Eligibility**: `eligibility_lists` + `eligibility_list_items` with `invited` flag for notifications
- **Metrics**: `app_metrics` and `visitor_tokens` power the landing-page badge
- **Auth**: standard NextAuth tables plus `password_credentials` for the credentials provider

When I touch the schema I run `pnpm db:generate` to emit migrations and `pnpm db:push` to sync Neon.

---

## Key Request Flows

### Poll Creation

1. I open `app/dashboard/polls/new`, which renders `components/poll-builder.tsx`.
2. Submission hits `POST /api/polls`:
   - Inserts the poll, questions, and options.
   - Creates an eligibility list when the poll is `listed`.

### Poll Commitment

1. I trigger `POST /api/polls/:id/commit`.
2. The route locks the definition (definition hash + `committed_at`).
3. Eligibility rows are deduped; if Resend is configured, emails go out.
4. Successful deliveries flip `eligibility_list_items.invited = true`.

### Ballot Lifecycle

1. The voting page requests `POST /api/polls/:id/ballots` to mint a ballot ID and device token.
2. Responses hit `POST /api/ballots/:id/submit`, which records votes and closes the ballot.
3. Submission publishes a `votes:updated` event through `lib/realtime.ts`.

### Realtime Statistics

1. The client subscribes to `/api/polls/:id/events` (SSE).
2. The server sends an initial snapshot plus incremental updates when votes land.
3. `components/poll-statistics.tsx` renders charts with padding to avoid label clipping.

### Visitor Tracking

1. `app/(home)/page.tsx` hashes a long-lived cookie and calls `lib/metrics.ts`.
2. `app_metrics` holds the running total that I display beside the hero CTA.

---

## Environment Variables I Care About

| Variable                        | What I use it for                                  |
| ------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`                  | Neon/Postgres connection string                    |
| `NEXTAUTH_URL`                  | Base URL for NextAuth callbacks                    |
| `NEXTAUTH_SECRET`               | Session/JWT secret; also salts device/email hashes |
| `RESEND_API_KEY` & `EMAIL_FROM` | Enable invite notifications after I commit a poll  |
| `APP_URL`                       | Public URL inserted into emails                    |
| `NEXT_PUBLIC_APP_URL`           | Optional client-side reference for share URLs      |
| `METRICS_SECRET`                | Optional salt override for visitor hashing         |

If Resend variables are missing, I log a warning and skip emails rather than fail the commit flow.

---

## Tooling & Quality Practices

- **Linting**: `pnpm lint` with the React Compiler — I fix purity warnings before deploying.
- **Database**: `pnpm db:generate`, `pnpm db:push`, and `pnpm db:studio` for migration review.
- **Testing**: I rely on manual QA right now. Adding Vitest + Playwright remains on my backlog.

---

## Current Roadmap

- Finish the public read-only results route (`app/r/[token]/page.tsx`).
- Reintroduce AI summaries once I decide on a provider.
- Add CSV export and richer analytics (filters, cross-tabs).
- Harden rate limiting and consider OAuth or passwordless auth for voters.

I keep this document updated whenever I change APIs, schema, or infrastructure so I always have a reliable reference for PollCraft’s architecture.
