## Context

Greenfield: the repository contains no application code, only OpenSpec scaffolding. See `proposal.md` — Why for motivation, and the five spec deltas under `specs/` for the behavior contract.

The hard constraints that shape everything below:

- **One route.** Every feature lives at `/`. No second page, no navigation, no auth screens.
- **Local only.** SQLite on disk, Prisma as the ORM, no external HTTP calls at runtime.
- **Teaching project.** Readability beats cleverness. A reader should be able to follow a mutation from the button to the database in a couple of files.
- **Single user.** No accounts, no ownership columns, no row-level scoping.

## Goals / Non-Goals

**Goals:**

- A mutation path short enough to read in one sitting: form → Server Action → Prisma → revalidate.
- Date handling that cannot silently move an entry to the wrong calendar day.
- A single arithmetic module for nutrition math, so entry rows, day totals, and the 7-day strip cannot disagree.
- Every state the specs describe (empty day, over goal, invalid input, no search match) has a visible rendering.

**Non-Goals:**

- No REST/GraphQL API layer. Nothing outside this app consumes the data.
- No client state management library, no data-fetching library.
- No test infrastructure beyond what the tasks specify; this is a demo, not a production service.
- No service worker, offline cache, or PWA manifest (see Decision 6).

## Decisions

### 1. Server Actions instead of Route Handlers

**Choice:** All five mutations (`addEntry`, `updateEntry`, `deleteEntry`, `setGoal`, `createFood`) are Server Actions in `app/actions.ts`, invoked from forms.

**Why:** The single-page constraint makes an HTTP API pure overhead — there would be exactly one consumer, in the same codebase. Server Actions remove the fetch wiring, the request/response types, and the URL design, which is most of what a reader would otherwise have to hold in their head.

**Alternative considered:** Route Handlers under `app/api/*` with client-side `fetch`. Rejected: more moving parts, and `app/api/**` routes would muddy the "one route" story even though they are not pages.

**Consequence:** Actions must not throw for expected failures. Each returns a discriminated result — `{ ok: true }` or `{ ok: false, error, field? }` — so the page can render an inline message instead of hitting an error boundary. Unexpected failures (database unreachable) are allowed to throw and surface via `error.tsx`.

### 2. Dates are `YYYY-MM-DD` strings, computed client-side

**Choice:** `LogEntry.date` is a `String` in `YYYY-MM-DD` form, not a `DateTime`. The string is derived from the user's local clock in the browser and passed to the server. `createdAt` stays a real `DateTime` for ordering only.

**Why:** The spec requires that an entry logged at 23:30 stays on that calendar day (`food-log` — "Entries belong to a local calendar day"). A `DateTime` stored as UTC and re-derived on the server would put that entry on the next day for any user east of UTC, and the server has no reliable knowledge of the browser's timezone. Treating the calendar day as an opaque label the client computes removes the whole class of bug. It also makes "entries for a day" and "last 7 days" plain string equality and range queries.

**Alternative considered:** `DateTime` stored at local midnight. Rejected: still ambiguous on the server, and any timezone change corrupts historical grouping.

**Consequence:** Date arithmetic (previous day, 7-day window) happens on strings via a small `lib/date.ts`. Nothing in the app calls `new Date()` on the server to decide what "today" is.

### 3. Selected day in a search param, not React state

**Choice:** The selected day is `?date=YYYY-MM-DD` on `/`. `app/page.tsx` is a Server Component that reads `searchParams`, queries for that day, and renders.

**Why:** It satisfies "reload preserves the day" (`log-history`) for free, keeps the data fetch on the server where Prisma lives, and avoids a client-side loading state for the primary read path. A search param is not a route, so the single-page constraint holds.

**Alternative considered:** `useState` in a client component plus an action to fetch a day's data. Rejected: reload loses the day, and it pushes the whole read path into the client.

**Consequence:** Changing the day is a navigation to the same route with a different query string (`router.push`). An invalid or missing `date` param falls back to today rather than erroring, as the spec requires.

### 4. `quantity` is a unit multiplier

**Choice:** `LogEntry.quantity` is a `Float` multiplier applied to the food's per-unit values. `Food.unit` is a string label (`100g`, `piece`, `slice`, `cup`, `tbsp`).

**Why:** One field covers both weight-based and count-based foods without a unit-conversion layer. `1.5 × 100g` and `2 × piece` are the same arithmetic.

**Alternative considered:** Store grams and convert per food. Rejected: needs a grams-per-piece figure for every discrete food, which is exactly the kind of data a demo should not have to be right about.

**Consequence:** The UI must always show the unit next to the quantity, or `2` is meaningless. Entry rows read `Chicken breast — 1.5 × 100g`.

### 5. Macros live on `Food`; entry nutrition is derived

**Choice:** `LogEntry` stores no nutrition values. Entry calories and macros are computed at read time from the related `Food`.

**Why:** No denormalized copies to keep in sync, and the arithmetic exists in exactly one place (`lib/nutrition.ts`).

**Trade-off:** If a food's nutrition ever changed, history would retroactively change. Acceptable here because seed foods are static and food editing is out of scope (`food-catalog` — "Seeded foods are immutable").

### 6. "Offline" means localhost-only — no service worker

**Choice:** No service worker, no client-side database, no offline cache. Confirmed with the user during planning.

**Why:** The app and its database both run on `localhost`. After initial load there is no network dependency that could be lost, so the requirement is already satisfied. A service worker would add cache-invalidation complexity and a stale-asset failure mode for zero behavioral gain, and a client-side database would mean deleting Prisma and SQLite — the stack the request specifies.

**Consequence:** The app does not work with the dev server stopped. This is stated in `proposal.md` — Decisions.

### 7. Custom foods share the `Food` table

**Choice:** One `Food` table with an `isCustom Boolean @default(false)` flag, rather than a separate `CustomFood` model.

**Why:** Custom foods are selectable "exactly like a seeded food" per the spec. A second table would force a union at every read site — search, entry rows, totals — for one boolean's worth of difference.

**Consequence:** The seed script must not clobber custom foods. It upserts by `name` on its own fixed list and touches nothing else, which also gives idempotent re-seeding.

### 8. Uniqueness on food name is case-insensitive

**Choice:** `Food.name` carries a `@unique` constraint, and `createFood` additionally trims and case-folds the submitted name to check for a collision before inserting.

**Why:** SQLite's default collation is case-sensitive, so `@unique` alone would let `Banana` and `banana` coexist — the spec requires rejecting a duplicate "ignoring case and surrounding whitespace". The explicit pre-check in the action is what enforces the spec; the database constraint is the backstop against a race.

**Consequence:** The stored name keeps the user's original casing; only the comparison is folded.

### 9. Rounding at the display boundary only

**Choice:** All arithmetic runs on unrounded floats. Rounding happens in the formatting helpers that render a value.

**Why:** The spec requires the day total to equal the rounded sum, not the sum of rounded values (`daily-summary` — "Rounding of displayed values"). Rounding early makes those diverge visibly once several fractional quantities are logged.

**Consequence:** Formatting lives in `lib/format.ts` and is the only place `Math.round` / `toFixed` appear.

### 10. Optimistic UI limited to delete

**Choice:** `useOptimistic` for entry deletion only. Add, edit, goal, and food creation wait for the action to resolve.

**Why:** Deletion is the one mutation where the result is certain and the latency is most annoying. The others can fail validation, and an optimistic row that then vanishes with an error is worse than a brief spinner — especially in a codebase meant to be read and learned from.

### 11. Prisma client singleton

**Choice:** `lib/db.ts` caches the `PrismaClient` on `globalThis` in development.

**Why:** Standard guard against connection exhaustion from hot-reload creating a client per reload. Non-obvious to a reader, so it gets a comment.

## Risks / Trade-offs

- **Client-computed date can be wrong if the user's clock is wrong** → Accepted. Any alternative requires trusting a different clock; the user's own calendar day is the definition the spec uses.
- **Hydration mismatch on "today"** — the server cannot know the client's local date, so rendering "today" server-side risks a mismatch → The `date` param is resolved on the client on first load and pushed into the URL; the server only ever renders the day it is explicitly given.
- **Deriving nutrition at read time means a join on every render** → Negligible at demo scale (one user, tens of rows per day). Documented rather than optimized.
- **7-day strip is 7 aggregates** → Computed with a single `groupBy` over a date range, not seven queries.
- **Floating-point drift in totals** → Bounded by rounding at display only (Decision 9); at these magnitudes the error is far below one displayed calorie.
- **`prisma/dev.db` accidentally committed** → Added to `.gitignore` in the first task, before any migration runs.
- **Seed script overwriting a user's data** → Seed only upserts its own fixed name list and never deletes; verified by a task that re-runs it against a database containing log entries.

## Migration Plan

Not applicable — new application, no existing data, no deployment target. Rollback is deleting the working tree changes and `prisma/dev.db`.

## Open Questions

None. The two questions raised in the earlier draft (offline definition, custom foods) were resolved with the user before planning and are recorded in `proposal.md` — Decisions.
