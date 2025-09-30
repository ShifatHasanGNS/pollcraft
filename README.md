# PollCraft (Proof of Concept)

PollCraft is a dark-only polling platform prototype built with Next.js 15, Drizzle ORM, Neon Postgres, and NextAuth. It runs on Vercel and aims to demonstrate the end-to-end polling workflow: create, commit, invite, vote, and share.

## Getting Started

1. Install dependencies: `pnpm install`
2. Copy `.env.example` → `.env.local` and populate the values (Neon, NextAuth, Resend, Gemini).
3. Apply migrations once your database is ready: `pnpm db:push`
4. Launch the dev server: `pnpm dev`
5. Visit `http://localhost:3000`

## Scripts

- `pnpm dev` — start the Next.js dev server.
- `pnpm build` — production build for Vercel.
- `pnpm start` — run the compiled output locally.
- `pnpm lint` — run ESLint.
- `pnpm db:generate` — emit SQL migrations from the Drizzle schema.
- `pnpm db:push` — apply migrations to the target database.
- `pnpm db:studio` — open Drizzle Studio (optional).

## Directory Layout

- `app/` — marketing route, auth pages, dashboard, voting surfaces, API handlers.
- `components/` — shared UI (forms, auth widgets, future shadcn/ui components).
- `drizzle/` — schema definitions and SQL migrations.
- `lib/` — server utilities (database, auth, rate limiting, email, AI, hashing helpers).
- `docs/` — planning + architecture notes.

## Deployment

1. Connect the repository to Vercel (or run `vercel deploy`).
2. Set environment variables in Vercel (`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `GEMINI_API_KEY`, `MODEL_NAME`, `APP_URL`).
3. Run migrations against Neon via GitHub Action or local CLI.

## Status & Next Steps

- Authentication uses NextAuth with credentials and Drizzle adapter.
- Poll APIs and voting flows are being built out following the plan in `docs/Project_Documentation.md`.
- For production hardening (rate limits, SSE, advanced analytics), extend the POC when requirements grow.
