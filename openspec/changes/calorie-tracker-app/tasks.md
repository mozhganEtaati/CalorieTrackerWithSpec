## 1. Scaffold

- [x] 1.1 Extend `.gitignore` with `node_modules/`, `.next/`, `prisma/dev.db`, `prisma/dev.db-journal` before any dependency is installed or migration is run
- [x] 1.2 Initialize a Next.js 15 App Router project in TypeScript at the repository root (`package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`)
- [x] 1.3 Install and configure Tailwind CSS (`tailwind.config.ts`, `postcss.config.mjs`, base styles imported in `app/layout.tsx`)
- [x] 1.4 Install `@prisma/client`, `zod`, and dev dependencies `prisma`, `tsx`; verify `npm run dev` serves a page at `/`

## 2. Data layer

- [x] 2.1 Add `prisma/schema.prisma` with a SQLite datasource pointing at `file:./dev.db`
- [x] 2.2 Define the `Food` model: `id`, `name` (unique), `unit`, `caloriesPerUnit`, `protein`, `carbs`, `fat`, `isCustom` (default `false`), relation to entries
- [x] 2.3 Define the `LogEntry` model: `id`, `foodId` + relation, `quantity` (Float), `date` (String, `YYYY-MM-DD`), `createdAt`, with an index on `date`
- [x] 2.4 Define the `UserGoal` singleton model: `id` pinned to `1`, `dailyCalorieTarget` (Int, default `2000`)
- [x] 2.5 Run the initial migration and confirm `prisma/dev.db` is created and untracked by git
- [x] 2.6 Add `lib/db.ts` exporting a `PrismaClient` singleton cached on `globalThis` in development, with a comment explaining why

## 3. Seed data

- [x] 3.1 Write `prisma/seed.ts` with ~26 foods across protein, grains/starch, fruit/veg, dairy/fat, and other, each with name, unit, calories per unit, protein, carbs, fat
- [x] 3.2 Make the seed idempotent by upserting on `name` and never deleting rows it does not own
- [x] 3.3 Wire `prisma.seed` in `package.json` to run the script via `tsx`; run it and confirm at least 20 foods exist
- [x] 3.4 Verify idempotency: run the seed a second time against a database that already contains log entries, and confirm the food count is unchanged and no entry is lost

## 4. Shared logic

- [x] 4.1 Add `lib/date.ts`: `todayLocal()` (client-side, returns `YYYY-MM-DD`), `parseDateParam()` with fallback to today for missing or malformed input, `isFuture()`, and `lastNDays(endDate, n)` operating on date strings
- [x] 4.2 Add `lib/nutrition.ts`: per-entry calories and macros as food per-unit values times quantity, and day totals as the unrounded sum over entries
- [x] 4.3 Add `lib/format.ts`: whole-number calories and at-most-one-decimal macro grams; this is the only module that rounds
- [x] 4.4 Add `lib/validation.ts`: Zod schemas for entry quantity (positive number), goal (positive integer), and custom food fields, each producing a field-level error message

## 5. Read path

- [x] 5.1 Make `app/page.tsx` a Server Component that reads `searchParams.date`, resolves it via `parseDateParam`, and loads that day's entries with their related food
- [x] 5.2 Load the `UserGoal` singleton, creating it with the 2000 default if absent
- [x] 5.3 Render the entry list: food name, quantity with unit, and calories per entry, in a stable order (`createdAt`, then `id`)
- [x] 5.4 Render the summary: consumed calories, remaining calories, protein/carbs/fat totals, and a progress indicator capped at full when the goal is exceeded
- [x] 5.5 Render the empty state when the selected day has no entries (0 consumed, explanatory message)
- [x] 5.6 On first load with no `date` param, resolve the local day on the client and replace the URL with `?date=<today>`, avoiding a hydration mismatch

## 6. Server Actions

- [x] 6.1 Create `app/actions.ts` with the `{ ok: true } | { ok: false, error, field? }` result type used by every action
- [x] 6.2 Implement `addEntry(foodId, quantity, date)`: validate, insert, revalidate `/`; reject zero, negative, and non-numeric quantities without writing
- [x] 6.3 Implement `updateEntry(id, quantity)`: validate and update quantity only; reject invalid values leaving the entry untouched
- [x] 6.4 Implement `deleteEntry(id)`: hard delete and revalidate
- [x] 6.5 Implement `setGoal(dailyCalorieTarget)`: upsert the `id = 1` row; reject zero, negative, and non-numeric values
- [x] 6.6 Implement `createFood(name, unit, caloriesPerUnit, protein, carbs, fat)`: trim and case-fold the name to reject duplicates, reject blank names and negative numbers, persist with `isCustom: true`

## 7. Write UI

- [x] 7.1 Build the add-entry row: searchable food selector, quantity input, unit label, submit; wire to `addEntry` against the selected day
- [x] 7.2 Implement case-insensitive substring food search over the catalog, with a no-match empty state offering custom food creation
- [x] 7.3 Build the custom food form (name, unit, calories, macros) wired to `createFood`, with inline field errors; mark custom foods visibly in search results and entry rows
- [x] 7.4 Build inline row editing: an edit control swaps the quantity into a number input with save and cancel; cancel restores the original value untouched
- [x] 7.5 Build entry deletion with `useOptimistic` removal, wired to `deleteEntry`
- [x] 7.6 Build the goal editor in the header, wired to `setGoal`, with the summary recomputing on save without a reload
- [x] 7.7 Render inline validation errors returned by every action next to the field they name

## 8. History

- [x] 8.1 Add the date picker in the header; changing it pushes `?date=` on the same route with no page-to-page navigation
- [x] 8.2 Prevent selecting dates after today in the picker
- [x] 8.3 Build the last-7-days strip using a single grouped query over the date range, one bar per day showing consumed calories against the goal, with zero-entry days rendered as zero rather than omitted
- [x] 8.4 Make a bar in the strip select that day, updating the entry list and summary
- [x] 8.5 Confirm add, edit, and delete on a selected past day write to that day and leave today's totals unchanged

## 9. Verification and polish

- [x] 9.1 Walk each spec file's scenarios against the running app and confirm the observable behavior matches; note any gap before closing this task
- [x] 9.2 Verify the late-evening case: log an entry with the clock at 23:30 local and confirm it stays on that calendar day after a reload
- [x] 9.3 Verify rounding: log several fractional quantities and confirm the day total equals the rounded sum of unrounded values, not the sum of rounded per-entry values
- [x] 9.4 Verify the over-goal state: exceed the goal and confirm the excess is reported and the progress indicator does not overflow its container
- [x] 9.5 Verify persistence: restart the app and confirm entries, custom foods, and the goal survive
- [x] 9.6 Confirm the app has exactly one route, presents no login or account prompt, and makes no external network requests at runtime
- [x] 9.7 Add responsive layout adjustments so the single page is usable at a narrow viewport width
- [x] 9.8 Delete the superseded draft at `specs/calorie-tracker-app.proposal.md`
- [x] 9.9 Add a `README.md` covering install, migrate, seed, and run
