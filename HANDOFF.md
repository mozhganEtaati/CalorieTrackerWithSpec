# Handoff — Calorie Tracker (OpenSpec change: `calorie-tracker-app`)

Written 2026-08-17. Everything below reflects the working tree at that moment.

## Where things stand

A single-page calorie tracker is built and running. Planning artifacts are complete and
validated. **48 of 51 tasks are checked**; the three open ones are listed at the bottom and
were deliberately left open, not forgotten.

**Nothing is committed.** `git status` shows the entire application as untracked
(`app/`, `lib/`, `prisma/`, `openspec/`, config files, `README.md`, `design-direction-b.html`)
plus a modified `.gitignore`. The last two commits are hook/permission setup only. If the
next session's first job is a commit, that is the state to start from.

## The brief, in one paragraph

Next.js App Router + TypeScript, SQLite via Prisma, no external APIs, food data hardcoded as
seed data. The hard constraint is **one page**: search, log, summary, and history all live on
a single route with no auth, no navigation, no second page. Single user, teaching/demo
quality, not production-grade.

## Commands

```bash
npm install
npx prisma migrate dev      # creates prisma/dev.db
npx prisma db seed          # idempotent — safe to re-run, never deletes
npm run dev                 # http://localhost:3000
npm run build               # production build
npx tsc --noEmit            # type check
```

Both the type check and the production build were clean at handoff time.

**Do not run `npm run build` while `next dev` is serving.** The build overwrites `.next`
chunks under the running server and produces
`__webpack_modules__[moduleId] is not a function`. Stop the dev server first, or
`rm -rf .next` and restart if it already happened.

**Watch the port.** A dev server surviving from an earlier session silently pushes the new
one to 3001/3002; you then test a stale build and conclude nothing works. Kill the old PID
with PowerShell `Stop-Process` before starting.

## Architecture, and why

- **Server Actions, not Route Handlers.** A route handler would be a second route, which the
  brief forbids. All five mutations live in `app/actions.ts` behind `"use server"`.
- **Days are `YYYY-MM-DD` strings computed on the client.** The server has no local clock, so
  a late-evening entry would drift across the UTC boundary if the server picked the day.
  `app/page.tsx` treats an absent or invalid `?date=` as the sentinel `""` and renders
  `<TodayRedirect />` rather than inventing a day.
- **The selected day is a URL search param**, not React state. It survives reload, keeps the
  read path on the server, and a query string is not a new route.
- **`quantity` is a unit multiplier**, not grams.
- **Nutrition is derived at read time.** Macros live on `Food` only and are never
  denormalized onto `LogEntry`, so correcting a food's data corrects history.
- **Rounding happens only at the display boundary** (`lib/format.ts` is the only module that
  rounds). This is why a day total can differ from the sum of the rounded rows on screen —
  that is correct and was verified: three 0.33 × chicken entries render `54` each and the day
  totals `163`, not `162`.
- **Actions return `{ok:false, error, field}` instead of throwing**, so the client can attach
  the message to the right field.
- **Case-insensitive food-name uniqueness is enforced in application code.** SQLite collation
  is case-sensitive and Prisma has no `mode: "insensitive"` for the sqlite provider, so
  `createFood` does an in-memory case-fold-and-trim check before inserting, with Prisma's
  `P2002` as the race backstop. `deleteEntry` treats `P2025` (already gone) as success.
- `useOptimistic` is used for deletion only.

Fuller reasoning, including the alternatives that were rejected, is in
`openspec/changes/calorie-tracker-app/design.md` (11 decisions).

## File map

| Path | What it holds |
|---|---|
| `app/page.tsx` | The only route. Server Component, `force-dynamic`, parallel reads. |
| `app/actions.ts` | Five server actions, all returning `ActionResult`. |
| `app/_components/FactsPanel.tsx` | The signature element: the day as a nutrition-facts panel. Also owns the goal setter. |
| `app/_components/AddEntryForm.tsx` | Search, select, quantity; opens `CustomFoodForm` when nothing matches. |
| `app/_components/DayControls.tsx` | Prev / date input / next / today. Pushes `?date=`. |
| `app/_components/HistoryStrip.tsx` | Seven-day bars; zero-entry days are kept in the window. |
| `app/_components/EntryList.tsx` | Inline edit and optimistic delete. |
| `lib/date.ts` | Day-string math. `isFuture` compares lexically — `YYYY-MM-DD` is fixed-width, so string order is date order. |
| `lib/nutrition.ts` | `entryNutrition`, `totalNutrition`, `goalProgress`. Exactly at goal is *not* exceeded. |
| `lib/format.ts` | The only rounding. |
| `lib/validation.ts` | Zod schemas at the action boundary. |
| `prisma/seed.ts` | 29 foods, upsert by name; also upserts `UserGoal` id=1 without clobbering a user-set target. |

## Gotchas that cost time before

- **`openspec validate` takes `--changes` (plural)**, not `--change`. The other subcommands
  take `--change`.
- **`create-next-app` cannot be used here** — it refuses a non-empty directory. The scaffold
  was hand-written.
- **A hydration warning on `<body>` is Grammarly**, not an app bug. `app/layout.tsx` carries
  `suppressHydrationWarning` on `<body>` only, with a comment saying why. Do not widen it.
- **After the redesign, dev may report `The 'bg-ground' class does not exist`** while the
  production build compiles fine. That is a cached Tailwind config in the dev server —
  restart it.
- **`npm audit` reports 3 high-severity advisories** in `postcss`/`sharp` bundled by Next 15.
  The fix is Next 16, which the design pinned against. Known, reported, deliberately not
  changed.

## The two visual directions

Direction A is what is built and running: ink on paperboard, near-monochrome, Oswald +
Public Sans, the nutrition-facts panel as hero, the question being *what did I consume*.

Direction B exists only as a standalone comp at `design-direction-b.html` in the project
root. It is not wired into the app and nothing in `app/` depends on it. Honey ground, pine
ink, coral overflow, Bricolage Grotesque + Karla, a vessel that fills toward a rim, the
question being *how much room is left*. It has a four-button state switcher for
under/at-goal/over/empty. Two known issues, both unfixed: the overflow renders as a detached
coral bar beside the rim rather than a pour down the outside, and early in the day the vessel
reads as inert because it is nearly empty.

The user has not asked for B to be ported. Do not start that without being asked.

## Open tasks

All three need a browser or a real clock change, which is why they are still open — the user
stopped browser testing partway through and asked that it not resume.

- **8.5** — Confirm **edit and delete** on a selected past day write to that day and leave
  today's totals unchanged. Add-on-a-past-day is already verified; edit and delete are not.
- **9.1** — Walk every scenario in every spec file against the running app. Most were walked;
  not all.
- **9.2** — Log an entry with the local clock at 23:30 and confirm it stays on that calendar
  day after reload. The design defends this case but it was never proven.

**Do not resume browser testing without the user asking.** They stopped it explicitly.

One methodology note if browser testing does resume: element references returned by `find`
go stale across re-renders. Reusing one after a mutation clicks whatever now occupies that
position — which once sent an entry to the wrong day and looked convincingly like a silent
write failure. Re-read references after every mutation.

## What is verified

Add and multiply (165 × 2 = 330), aggregation across foods (435 kcal / 63.3 P / 27 C / 7.6 F),
goal of 0 rejected, over-goal state with the bar capped, exactly-at-goal showing 0 remaining
and not flagged as exceeded, invalid edit rejected leaving the entry untouched, cancelled edit
restored, valid edit 1 → 3 = 315, case-insensitive and mid-name search, the no-match state,
custom-food rejections (negative, blank, duplicate), custom food created and logged with its
badge, history-bar navigation, seed idempotency (30 foods stayed 30, a custom probe survived),
and persistence across several dev-server restarts.
