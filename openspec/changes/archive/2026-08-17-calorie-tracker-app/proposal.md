## Why

There is no application in this repository yet. The goal is a small, readable teaching/demo project that shows a full local stack — Next.js App Router, TypeScript, Prisma, SQLite — end to end without the distractions of authentication, external APIs, or multi-page routing.

A calorie tracker is a good fit for this: it needs real persistence, real mutations (create, edit, delete), derived aggregates, and a date dimension, while still fitting on one page.

## What Changes

- Scaffold a new Next.js 15 (App Router, TypeScript) application at the repository root, styled with Tailwind CSS.
- Add Prisma with a SQLite datasource and three models: `Food`, `LogEntry`, `UserGoal`.
- Ship a seed script with ~26 common foods (name, unit, calories and macros per unit). Seeding is idempotent.
- Build a **single page** (`/`) containing every feature: food selection, quantity entry, the day's log, the daily summary, goal editing, custom-food creation, and history. No second route, no navigation, no auth screens.
- Mutations run through Next.js Server Actions (`addEntry`, `updateEntry`, `deleteEntry`, `setGoal`, `createFood`), validated with Zod at the action boundary.
- The selected date lives in a URL search param (`?date=YYYY-MM-DD`) so the server component can read it. This is a query param on the same route, not a new route.
- Users can create their own foods in addition to the seeded ones (decision recorded below).

Not breaking: this is greenfield: there is no prior behavior to break.

## Capabilities

### New Capabilities

- `food-catalog`: The list of selectable foods — seeded reference foods plus user-created custom foods, each with a unit and per-unit calories and macros; and searching/filtering that list.
- `food-log`: Creating, editing, and deleting log entries that attach a food and a quantity to a calendar day.
- `daily-summary`: Derived totals for a selected day — calories and macros consumed, compared against the daily calorie goal.
- `calorie-goal`: A single-user daily calorie target that the user can read and change, persisted across sessions.
- `log-history`: Browsing any past day's entries and summary from the same page, plus a compact recent-days overview.

### Modified Capabilities

None — `openspec/specs/` is currently empty, so every capability above is new.

## Impact

**New code** (all created by this change):

- `app/` — `layout.tsx`, `page.tsx`, and the page's client components.
- `app/actions.ts` — the five Server Actions.
- `lib/` — Prisma client singleton, date helpers, nutrition math.
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/`.
- Config: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`.

**Dependencies added**: `next`, `react`, `react-dom`, `@prisma/client`, `zod`; dev: `prisma`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `tsx`, `@types/*`.

**Data**: a local SQLite file at `prisma/dev.db`, gitignored. No production data, no migration of existing records.

**Existing files touched**: `.gitignore` (add `node_modules`, `.next`, `prisma/dev.db`). The existing draft at `specs/calorie-tracker-app.proposal.md` is superseded by this change and can be deleted during implementation.

## Decisions

Two open questions in the earlier draft were resolved with the user before this proposal:

1. **"Works offline" means localhost-only.** The app and its database both run on `localhost`, so after initial load there is no network dependency to lose. No service worker and no client-side database. Prisma + SQLite stay. The app is not required to keep working with the dev server stopped.
2. **Custom foods are in scope.** Users can add a food that is not in the seed list, supplying name, unit, calories, and macros. Custom foods are flagged so they can be distinguished from seeded ones.

## Out of Scope

Excluded by the request: authentication of any kind, user accounts or multi-user support, multi-page routing, real nutrition APIs (USDA and others), mobile apps.

Excluded by this proposal's own judgment: barcode scanning, weight/body-metric tracking, meal grouping (breakfast/lunch/dinner), data export/import, macro goals (only a calorie goal is settable), and editing or deleting seeded foods.
