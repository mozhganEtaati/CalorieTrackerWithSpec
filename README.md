# Calorie Tracker

A single-page, single-user calorie tracker that runs entirely on your machine.
Pick a food, log how much of it you ate, and see the day's calories and macros
against a goal you set yourself. No accounts, no sign-in, no external services.

## Stack

- **Next.js 15** (App Router, TypeScript) — one route, `/`
- **Prisma + SQLite** — a local database file at `prisma/dev.db`
- **Server Actions** for every mutation, validated with **Zod**
- **Tailwind CSS**

## Getting started

```bash
npm install          # install dependencies
npm run db:migrate   # create prisma/dev.db and apply the schema
npm run db:seed      # load ~29 reference foods and the default 2000 kcal goal
npm run dev          # http://localhost:3000
```

`db:seed` is idempotent — re-running it will not duplicate foods, touch foods
you created yourself, or delete anything you have logged.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply migrations (`prisma migrate dev`) |
| `npm run db:seed` | Seed reference foods and the default goal |
| `npm run db:reset` | Drop and recreate the database, then re-seed |

## Using it

Everything lives on one page:

- **Day picker** — choose which calendar day you are looking at. The day is kept
  in the URL (`/?date=2026-08-17`), so a reload or a bookmark returns to it.
  Future dates cannot be selected.
- **Summary** — calories consumed against your goal, remaining (or over) calories,
  and protein / carbs / fat totals for the day.
- **Last 7 days** — one bar per day ending at the selected day. Click a bar to
  jump to that day.
- **Add food** — search the catalog (case-insensitive, matches anywhere in the
  name), pick a food, and enter a quantity. Quantity is a multiple of the food's
  unit: `1.5 × 100g` is 150 grams, `2 × piece` is two pieces.
- **Custom foods** — if nothing matches your search, create the food yourself
  with its own calories and macros. Custom foods are marked so you can tell them
  apart from the built-in ones.
- **Entries** — edit an entry's quantity inline, or delete it. Adding, editing
  and deleting all apply to whichever day is selected, including past days.

## Notes on the design

- **Calendar days are stored as `YYYY-MM-DD` strings** computed in your local
  timezone, not as timestamps. An entry logged at 23:30 stays on the day you
  logged it instead of drifting across a UTC boundary.
- **Nutrition is derived, never copied.** A log entry stores only a food and a
  quantity; its calories and macros are computed from the food at read time.
- **Rounding happens only when a value is displayed.** A day's total is the
  rounded sum of the unrounded entries, not the sum of the rounded ones.
- **"Offline" here means localhost.** The app and its database both run on your
  machine, so there is nothing to lose after the page loads. It is not a PWA and
  does not keep working with the dev server stopped.

## Project layout

```
app/
  page.tsx           Server Component: reads ?date=, loads the day, renders it
  actions.ts         The five Server Actions
  _components/       Client components (forms, entry list, history strip)
lib/
  db.ts              Prisma client singleton
  date.ts            Calendar-day string helpers
  nutrition.ts       Per-entry and per-day arithmetic
  format.ts          The only module that rounds
  validation.ts      Zod schemas and field-level error messages
prisma/
  schema.prisma      Food, LogEntry, UserGoal
  seed.ts            Reference foods (idempotent)
```

## Not included

No authentication or user accounts, no additional pages or routes, no real
nutrition API (USDA and friends), no mobile app. Also deliberately left out:
barcode scanning, weight tracking, meal grouping, data export, and macro goals.
