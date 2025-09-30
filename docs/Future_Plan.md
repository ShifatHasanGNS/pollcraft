# Future Roadmap for PollCraft

This document outlines a prioritized roadmap for the PollCraft platform. It groups upcoming ideas into focus areas so we can sequence work, track dependencies, and surface open questions before implementation.

## 1. Poll Creation & Authoring
- **Rich question types** – add ranking, matrix, and conditional questions building on the current schema so advanced surveys are possible.
- **Reusable templates** – allow owners to save poll skeletons and clone past polls, reducing set‑up time for recurring runs.
- **Draft collaboration** – invite teammates to co-edit drafts with roles (author, reviewer) and track changes before committing.

## 2. Voting Experience
- **Adaptive flows** – surface progress indicators, autosave partial ballots, and support resuming later with device tokens.
- **Accessibility polish** – pass WCAG AA audits (focus states, screen-reader text, keyboard navigation, reduced motion options).
- **Offline capture** – queue responses when offline and sync automatically once connectivity is restored.

## 3. Results & Analytics
- **Historical snapshots** – persist time-series data so creators can replay vote deltas and download CSV exports.
- **CI for insights** – integrate AI summary generation (existing `lib/ai.ts`) to highlight anomalies, sentiment, and trends.
- **Embeddable widgets** – publish responsive charts for external websites with public or token-gated access levels.

## 4. Sharing & Distribution
- **Invite management UI** – visualize listed participants, toggle reminders, and track invite redemption status.
- **Link governance** – add expiration, rate limits, and scoped permissions (view results, vote, admin) to share links.
- **Notification channels** – integrate email and optional push/webhook signals when polls open, close, or hit thresholds.

## 5. Reliability & Scaling
- **Background job queue** – move expensive work (email blasts, aggregation, AI summaries) to queued workers.
- **Observability stack** – add structured logging, tracing, and dashboards (e.g., OpenTelemetry + a managed backend).
- **Resilience auditing** – expand retry coverage beyond read queries, implement circuit breakers, and add chaos testing for Neon outages.

## 6. Security & Compliance
- **Audit log viewer** – expose `audit_logs` data with filters and export, plus alerts for sensitive actions.
- **Data retention policies** – configurable deletion windows for ballots and personal data, with legal hold support.
- **SSO / OAuth providers** – add enterprise-friendly identity providers and enforce multi-factor auth for admins.

## 7. Developer Experience & Testing
- **Comprehensive test suite** – unit coverage for critical utilities, contract tests for APIs, and Playwright flows for key journeys.
- **Seed fixtures & local tooling** – provide scripts and seed data for rapid local bootstrapping and preview environments.
- **CI automation** – enforce lint/test/build in pipelines, add preview deployments, and automate schema drift checks.

## 8. Product Growth & Monetization
- **Tiered billing** – introduce plans (free, team, enterprise) with limits on active polls, respondents, and analytics depth.
- **Usage dashboards** – show owners their poll performance, plan usage, and recommended upgrades.
- **In-app guidance** – contextual onboarding, empty-state tutorials, and success checklists to improve activation.

---

This roadmap should be revisited quarterly. Track work in an issue board, link design docs before major initiatives, and validate milestones with user testing and instrumentation.
