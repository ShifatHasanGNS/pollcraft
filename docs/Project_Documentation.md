# PollCraft — Proof-of-Concept Build Guide (Vercel + Next.js + Neon + NextAuth)

This guide reflects the revised scope: PollCraft is now a proof-of-concept web app
hosted on **Vercel**, using **Next.js (App Router)**, **Neon Postgres**, **Drizzle ORM**,
and **NextAuth** (Auth.js) with credentials-based sign-in.

The goal is to keep everything **functional and pleasant to use**, without the
"military grade" edge/Workers stack from the original plan. Security remains
sensible—hashed passwords, CSRF-safe forms, and session cookies—but we prioritise
shipping a usable product quickly.

---

## 1) Product Goals & MVP Scope

1. Authenticated owners can create, lock, and share polls.
2. Owners invite voters or expose a public link. Voters can submit one ballot
   per poll (enforced by a mix of device cookie + email verification for now).
3. Realtime tallying is optional—initial MVP can refresh results on demand.
4. Generate a lightweight AI summary (Gemini) after a poll closes.
5. Entire experience feels cohesive in dark mode.

Nice-to-haves (stretch): enriched charts, CSV export, invitations via email,
magic-link sign-in.

---

## 2) Architecture Overview

- **Runtime**: Next.js 15 (App Router) on Vercel.
- **Database**: Neon Postgres (HTTP connection via `@neondatabase/serverless`).
- **ORM & Migrations**: Drizzle ORM + Drizzle Kit.
- **Authentication**: NextAuth (Auth.js) with Credentials provider and Drizzle adapter.
- **Styling/UI**: Tailwind CSS 4 + shadcn/ui components (dark theme only).
- **Forms**: React Hook Form + Zod.
- **Charts**: Apache ECharts (React wrapper).
- **Email**: Resend (magic link/invites optional but recommended).
- **AI Summaries**: Google Gemini Flash via REST API.

Why NextAuth over Lucia? Vercel-native, batteries-included session handling, and
fewer moving parts when deployed on Node runtime.

---

## 3) Repository Layout

```
pollcraft/
├─ app/
│  ├─ (marketing)/page.tsx       # Landing/hero content
│  ├─ dashboard/                 # Authenticated owner UI
│  │  ├─ page.tsx
│  │  └─ polls/
│  │     ├─ new/page.tsx         # Poll builder shell
│  │     └─ [pollId]/page.tsx    # Poll management + results
│  ├─ vote/[pollId]/page.tsx     # Voter entry
│  ├─ r/[token]/page.tsx         # Shared read-only results/report
│  └─ api/
│     ├─ auth/[...nextauth]/route.ts   # NextAuth handlers
│     ├─ polls/route.ts                # GET/POST polls
│     ├─ polls/[id]/commit/route.ts    # POST commit
│     ├─ polls/[id]/ballots/route.ts   # POST ballot creation (todo)
│     ├─ ballots/[id]/submit/route.ts  # POST submit votes (todo)
│     ├─ polls/[id]/results/route.ts   # GET aggregates
│     └─ polls/[id]/report/route.ts    # POST AI summary
├─ drizzle/
│  ├─ schema.ts                 # All tables & enums
│  └─ migrations/               # SQL migrations
├─ lib/
│  ├─ db.ts                     # Neon HTTP + Drizzle
│  ├─ auth.ts                   # NextAuth configuration + helpers
│  ├─ email.ts
│  ├─ hash.ts                   # Hashing helpers
│  ├─ ai.ts                     # Gemini interactions (stub)
│  └─ rate-limit.ts             # Device/email heuristics (stub)
├─ styles/
│  └─ globals.css
├─ docs/Project_Documentation.md
├─ README.md
├─ package.json
└─ .env.example
```

---

## 4) Environment Variables

Create `.env.local` for local dev and configure matching variables in Vercel.

```
# Database
DATABASE_URL="postgres://USER:PASSWORD@HOST/db?sslmode=require"

# NextAuth secrets
NEXTAUTH_URL="http://localhost:3000"          # Vercel will override with prod URL
NEXTAUTH_SECRET="random-long-string"

# Resend
RESEND_API_KEY="re_xxx"
EMAIL_FROM="PollCraft <noreply@yourdomain.com>"

# AI
GEMINI_API_KEY="AIza..."
MODEL_NAME="gemini-2.5-flash"

# App config
APP_URL="https://pollcraft.vercel.app"
```

No Cloudflare keys necessary anymore. When deploying to Vercel, set each key via
the dashboard or `vercel env` commands.

---

## 5) Database Schema (Drizzle)

Key tables (see `drizzle/schema.ts` for full definitions):

- `users` — poll owners/voters (email unique). Includes display name.
- `accounts`, `sessions`, `verificationTokens` — required by NextAuth.
- `passwordCredentials` — hashed credentials for credentials provider.
- `polls`, `questions`, `options` — poll definition.
- `ballots`, `votes` — submitted votes (append-only).
- `voteAggregates` — aggregated counts per poll/question/option.
- `shareLinks` — tokens for shared reports/results.
- `auditLogs` — simple audit history (hash chaining optional for MVP).

Use Drizzle Kit to manage SQL migrations:

```bash
pnpm db:generate   # emit SQL from schema changes
pnpm db:push       # apply migrations to Neon
```

---

## 6) Authentication Flow (NextAuth)

- **Sign-up**: custom API route collects email + password, hashes with `bcrypt`,
  inserts user + credential row, then calls `signIn()` (or returns `200` for client).
- **Sign-in**: NextAuth credentials provider verifies the password hash and
  issues a session cookie stored in `sessions` table.
- **Session access**: use `auth()` helper (Auth.js) in server components or
  `getServerSession()` in route handlers.
- **Future**: add OAuth providers by extending the NextAuth config. Magic links
  can be implemented via NextAuth email provider + Resend.

---

## 7) Implementation Checklist

### Phase 1 — Foundation
- [x] Bootstrap Next.js project with Tailwind 4.
- [x] Set up dark-mode design tokens & base pages.
- [x] Configure Drizzle + Neon, add schema + migrations.
- [x] Integrate NextAuth (credentials provider) and secure dashboard routes.
- [x] Implement poll creation & commit API routes.

### Phase 2 — Voting Flows
- [x] Ballot creation (device cookie + optional email verification).
- [x] Vote submission endpoint with validation and aggregate update trigger.
- [ ] Results page for owners (dashboard) and shared token route.

### Phase 3 — Enhancements
- [ ] AI summary generation via Gemini (HTML + PDF export).
- [ ] Email invitations via Resend (optional magic link).
- [ ] ECharts visualisations + CSV export.

---

## 8) Deployment Workflow (Vercel)

1. `pnpm build` locally to ensure no type/lint errors.
2. Connect GitHub repository to Vercel and push to main branch, **or** run:
   ```bash
   vercel deploy --prod
   ```
3. Ensure env vars are set in Vercel project (`vercel env add` or UI).
4. Run migrations separately via Neon console or GitHub Action (Drizzle CLI).

---

## 9) Testing

- **Unit**: validators, password hashing helpers (Vitest recommended).
- **Integration**: NextAuth credentials flow, poll commit, vote submission.
- **E2E**: Playwright for the full create → vote → view results loop (optional).

For the POC, focus on manual QA + targeted unit/integration tests.

---

## 10) Future Considerations

- Upgrade to OAuth or passwordless flows when ready.
- Add WebSocket/SSE for realtime updates if demand grows.
- Harden rate limiting and anti-abuse heuristics once the prototype attracts traffic.
- Reintroduce Cloudflare Workers/Turnstile only if scale or security dictates.

---

**You’re set for the Vercel + NextAuth proof-of-concept.** Follow this document as
the new source of truth while iterating. EOF
