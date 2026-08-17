# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run db:migrate   # prisma migrate dev — creates prisma/dev.db
npm run db:seed      # idempotent — never duplicates foods, never deletes logged entries
npm run dev           # http://localhost:3000
npm run build         # production build
npm start              # production server
npm run typecheck     # tsc --noEmit
npm run lint           # next lint
npm run db:reset       # prisma migrate reset, then re-seed
```

There is no test suite in this repo (teaching project, no test infra beyond the spec tasks in `openspec/`).

**Do not run `npm run build` while `npm run dev` is serving** — the build overwrites `.next` chunks under the running server and produces `__webpack_modules__[moduleId] is not a function`. Stop the dev server first, or `rm -rf .next` and restart if it already happened.

**Watch for port squatting.** A dev server surviving from an earlier session keeps port 3000, silently pushing a newly started one to 3001/3002 — you then edit code, test against the old stale build on 3000, and conclude nothing works. Before starting `npm run dev`, check what's already listening (`netstat -ano | grep :3000` on Windows) and kill stale `node` processes if the port is taken.

**Never run `npm run db:reset` unless explicitly asked.** It wipes every logged entry (`LogEntry` rows), not just re-seeds reference data. There is no undo.

## Verification before finishing a task

Since there is no test suite, treat this as the minimum bar before considering a change done:

```bash
npm run typecheck
npm run lint
```

Both must pass with no new errors. If the change touches `app/actions.ts`, `lib/validation.ts`, `lib/date.ts`, or `lib/nutrition.ts`, manually re-check the relevant spec scenario in `openspec/` still holds (see below) — typecheck/lint won't catch a logic drift from the spec.

## Architecture

Single-page app: everything lives at `/`. No auth, no second route, no external HTTP calls at runtime — SQLite via Prisma is the only persistence.

- **`app/page.tsx`** — the only route. Server Component (`force-dynamic`), reads `searchParams.date`, resolves it via `parseDateParam` (falls back to today on missing/malformed input), loads that day's entries + the goal singleton in parallel, and renders.
- **`app/actions.ts`** — all five mutations (`addEntry`, `updateEntry`, `deleteEntry`, `setGoal`, `createFood`) as Server Actions behind `"use server"`, each returning `{ ok: true } | { ok: false, error, field? }` instead of throwing for expected failures (bad input, duplicate name). Unexpected failures (DB unreachable) still throw and surface via `error.tsx`. Every action validates through `lib/validation.ts` (Zod) before touching Prisma, then calls `revalidatePath("/")`.
- **`app/_components/`** — client components: `DayVessel.tsx` (the day-as-a-vessel summary/progress display), `GoalSetter.tsx`, `AddEntryForm.tsx` (search + select + quantity, opens `CustomFoodForm` on no match), `CustomFoodForm.tsx`, `DayControls.tsx` (prev/date-input/next/today, pushes `?date=`), `HistoryStrip.tsx` (7-day strip ending at the selected day), `EntryList.tsx` (inline edit + optimistic delete via `useOptimistic`), `TodayRedirect.tsx` (client-resolves local "today" and pushes it into the URL when `?date=` is absent, avoiding a server/client hydration mismatch on "today").
- **`lib/date.ts`** — calendar days are `YYYY-MM-DD` strings computed from the browser's local clock, never `DateTime`. This is deliberate: the server has no reliable timezone knowledge, so if it picked "today" a late-evening entry could drift to the next calendar day. `isFuture` compares the strings lexically, which is valid because `YYYY-MM-DD` is fixed-width. `lastNDays(endDate, n)` powers the history strip.
- **`lib/nutrition.ts`** — `entryNutrition`, `totalNutrition`, `goalProgress`. Nutrition is derived at read time from `Food`, never denormalized onto `LogEntry` — correcting a food's data corrects history. Exactly-at-goal is defined as *not* exceeded (`exceeded: consumed > goal`, not `>=`).
- **`lib/format.ts`** — the *only* module that rounds (whole-number calories, ≤1 decimal for macro grams). All arithmetic elsewhere runs on unrounded floats, so a day total is the rounded sum of unrounded entries, not the sum of rounded rows — these can visibly differ and that's correct.
- **`lib/validation.ts`** — Zod schemas at the action boundary; each produces a field-level error message consumed by `ActionResult`.
- **`lib/db.ts`** — Prisma client singleton cached on `globalThis` in dev, guarding against connection exhaustion from hot-reload.
- **`prisma/schema.prisma`** — `Food` (name unique, `isCustom` flag — custom and seeded foods share one table), `LogEntry` (`foodId`, `quantity` as a unit multiplier — not grams — `date` string, indexed), `UserGoal` (singleton pinned to `id: 1`).
- **`prisma/seed.ts`** — ~29 reference foods, upserted by name; also upserts `UserGoal` id=1 without clobbering a user-set target. Idempotent: never deletes, never touches custom foods.

### Non-obvious invariants worth knowing before touching code

- `quantity` is a multiplier of the food's per-unit values (`1.5 × 100g` = 150g, `2 × piece` = two pieces), not grams — the unit must always be shown alongside the number or it's meaningless.
- SQLite's default collation is case-sensitive and Prisma has no `insensitive` mode for the sqlite provider, so case-insensitive food-name uniqueness (`createFood`) is enforced in application code via an in-memory trim+case-fold check, with the DB's `@unique` constraint (`P2002`) as the race backstop. `deleteEntry` treats a `P2025` (already gone) as success, not an error.
- The selected day lives in the URL (`?date=`), not React state — this is what makes reload/bookmark preserve the day and keeps the primary read on the server.
- `useOptimistic` is used for entry deletion only; add/edit/goal/food-creation wait for the action to resolve, since those can fail validation and a row that appears then vanishes reads worse than a brief pending state.
- A hydration warning on `<body>` in dev is the Grammarly browser extension, not an app bug — `app/layout.tsx` carries `suppressHydrationWarning` on `<body>` only, with a comment explaining why. Don't widen it.

## Planning artifacts

`openspec/changes/calorie-tracker-app/` holds the spec this app was built against: `proposal.md`, `design.md` (11 numbered architecture decisions with rejected alternatives), `tasks.md`, and per-capability spec deltas under `specs/` (`food-catalog`, `food-log`, `daily-summary`, `calorie-goal`, `log-history`), each with `SHALL`-worded requirements and `WHEN/THEN` scenarios. When changing behavior in one of these five areas, check the matching spec file for the contract it's expected to satisfy.

## Engineering Rules

- Read the relevant OpenSpec before modifying behavior.
- Do not introduce new dependencies unless necessary.
- Do not change database schema without checking the corresponding spec.
- Do not move business logic into client components.
- Keep Server Actions as the mutation boundary.
- Validate all external/user input through lib/validation.ts.
- Do not duplicate date or nutrition calculations outside lib/date.ts and lib/nutrition.ts.
- Preserve existing behavior unless the task explicitly changes it.
- Prefer the smallest change that satisfies the requirement.
- Do not refactor unrelated code while implementing a feature.
- Run `npm run typecheck && npm run lint` before considering any change complete.