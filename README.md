# PollCraft

PollCraft is a dark-mode polling platform built with Next.js 15 (App Router), Drizzle ORM, Neon Postgres, and NextAuth. It demonstrates the full poll lifecycle: build questions, lock the definition, invite voters, collect ballots, and monitor realtime statistics. The production deployment is hosted on Vercel at <https://pollcraft-lime.vercel.app/>.

## Highlights

- Credentials-based auth via NextAuth with the Drizzle adapter
- Poll builder supporting single, multi, ranked, and text questions
- Eligibility lists with automatic invite emails (Resend)
- Ballot issue + submission APIs that enforce one ballot per device/email
- Realtime statistics dashboard powered by SSE and ECharts
- Owner-only breakdown of responses when identity mode is enabled
- Visitor counter stored in Postgres (`app_metrics`, `visitor_tokens`)

## Live Deployment

- **URL**: <https://pollcraft-lime.vercel.app/>
- **Hosting**: Vercel (Node runtime, Next.js App Router)
- **Database**: Neon serverless Postgres

## Prerequisites

- Node 20+
- pnpm 9+
- Neon (or compatible Postgres) connection URL
- Resend account for transactional email (optional but recommended)

## Getting Started

1. Install dependencies.

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` (or `.env`) and populate required values.

3. Apply database migrations.

   ```bash
   pnpm db:push
   ```

4. Start the development server.

   ```bash
   pnpm dev
   ```

5. Visit <http://localhost:3000>.

## Available Scripts

- `pnpm dev` – run the Next.js dev server
- `pnpm build` – produce a production build
- `pnpm start` – serve the production build locally
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
| `APP_URL`             | Public app URL inserted into emails                         |
| `NEXT_PUBLIC_APP_URL` | Optional exposure of the public URL client-side             |
| `METRICS_SECRET`      | Optional override for visitor-hash secret                   |

## Project Structure

```
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

Key tables in `drizzle/schema.ts`:

- `polls`, `questions`, `options` – poll definition
- `ballots`, `votes` – submitted answers
- `eligibility_lists`, `eligibility_list_items` – voter allow lists with invite state
- `vote_aggregates` – realtime counts used by dashboards
- `app_metrics`, `visitor_tokens` – visitor tracking
- `users`, `accounts`, `sessions`, `password_credentials` – NextAuth support tables

Run `pnpm db:generate` whenever the schema changes to produce the corresponding migrations.

## Deployment Workflow

1. Connect the repository to Vercel (or use `vercel deploy`).
2. Configure environment variables in the Vercel dashboard.
3. Push Drizzle migrations to Neon (`pnpm db:push` locally or via CI).
4. Allow Vercel to build/deploy automatically; production is available at <https://pollcraft-lime.vercel.app/>.

## Notes & Roadmap

- Invite emails require `RESEND_API_KEY`/`EMAIL_FROM`; when missing, the commit flow logs a warning and skips notifications.
- Visitor tracking relies on a long-lived cookie hashed server-side; clearing cookies resets the local token but not the aggregate.
- AI-generated summaries were removed in the current iteration; reinstate by wiring a provider into the results view.
- Potential future work: CSV export, richer eligibility workflows, OAuth sign-in, and stronger rate limiting.
