# PollCraft

PollCraft is a dark-mode polling platform built with Next.js 15 (App Router), Drizzle ORM, Neon Postgres, and NextAuth. It demonstrates the full poll lifecycle: build questions, commit the definition, email invited voters, collect ballots, and review realtime statistics.

## Highlights

- Credentials-based auth with NextAuth + Drizzle adapter
- Poll builder with per-question types (single, multi, ranked, text)
- Eligibility lists and automatic invite emails when a poll is committed
- Ballot issue + submission APIs with basic device/email enforcement
- Live statistics dashboard powered by SSE and ECharts
- Owner-only breakdown of responses for identified polls
- Visitor counter stored in Postgres (`app_metrics`, `visitor_tokens`)

## Prerequisites

- Node 20+
- pnpm 9+
- Neon (or compatible Postgres) connection URL
- Resend account for transactional email (optional but recommended)

## Getting Started

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` (or `.env`) and fill in required values.
3. Apply database migrations

   ```bash
   pnpm db:push
   ```

4. Start the development server

   ```bash
   pnpm dev
   ```

5. Visit <http://localhost:3000>

## Available Scripts

- `pnpm dev` – run the Next.js dev server
- `pnpm build` – create a production build
- `pnpm start` – serve the built app locally
- `pnpm lint` – run ESLint (React Compiler enabled)
- `pnpm db:generate` – emit SQL migrations from `drizzle/schema.ts`
- `pnpm db:push` – push migrations to the configured database
- `pnpm db:studio` – open Drizzle Studio

## Environment Variables

| Variable              | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`        | Neon/Postgres connection string                             |
| `NEXTAUTH_URL`        | Base URL for NextAuth callbacks                             |
| `NEXTAUTH_SECRET`     | Session/JWT secret (also used for visitor hashing fallback) |
| `RESEND_API_KEY`      | Resend API key for notification emails                      |
| `EMAIL_FROM`          | Default From address for Resend                             |
| `APP_URL`             | Public app URL used in emails (fallback for hero links)     |
| `NEXT_PUBLIC_APP_URL` | Optional: expose the public URL client-side                 |
| `METRICS_SECRET`      | Optional override for visitor-hash secret                   |

## Project Structure

```.
app/                 # Routes (marketing, auth, dashboard, API)
  (home)/            # Landing page with visitor badge
  dashboard/         # Owner dashboards and poll details
  polls/             # Public poll surfaces (vote, statistics, details)
  api/               # REST endpoints for polls, ballots, SSE events
components/          # Reusable UI (forms, nav, charts)
drizzle/             # Schema definition and SQL migrations
lib/                 # Server helpers (auth, db, email, metrics, polling logic)
docs/                # Architecture and planning notes
```

## Data Model

`drizzle/schema.ts` defines the full relational model. Key tables:

- `polls`, `questions`, `options` – poll definition
- `ballots`, `votes` – submitted answers
- `eligibility_lists`, `eligibility_list_items` – voter allow lists
- `vote_aggregates` – aggregate counts for realtime dashboards
- `app_metrics`, `visitor_tokens` – visitor tracking
- `users`, `accounts`, `sessions`, `password_credentials` – NextAuth support tables

Run `pnpm db:generate` whenever the schema changes to create matching SQL migrations.

## Deployment

1. Connect the repo to Vercel (or run `vercel deploy`).
2. Configure the environment variables in the project settings.
3. Push Drizzle migrations to Neon (CI step or manual `pnpm db:push`).
4. Trigger a production build (`pnpm build` or Vercel auto-build).

## Notes & Next Steps

- Email notifications require `RESEND_API_KEY`/`EMAIL_FROM`; if missing, messages are skipped with a warning.
- Visitor tracking can be disabled by clearing cookies or overriding the secret.
- AI-powered summaries were removed from this iteration; reintroduce by adding a provider and wiring it to the results view.
- Future ideas: CSV export, richer eligibility workflows, OAuth sign-in, rate limit hardening.
