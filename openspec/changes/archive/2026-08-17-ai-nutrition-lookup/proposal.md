## Why

Food entry today requires picking an existing seeded/custom food from the catalog — user must already know exact calorie/macro values or create a custom food manually. Gemini can estimate nutrition from a free-text meal description or a photo, removing that lookup burden. This change adds the backend capability only; the AddEntryForm / CustomFoodForm UI stays wired to the existing flow until a follow-up change connects it.

## What Changes

- Add server-side Gemini client wrapper (`lib/gemini.ts`) using `gemini-3.5-flash-lite`, reading `GEMINI_API_KEY` from env.
- Add POST route `app/api/nutrition/text/route.ts` — accepts a free-text meal description, returns structured nutrition (calories, protein, carbs, fat) for one or more identified food items.
- Add POST route `app/api/nutrition/image/route.ts` — accepts an uploaded meal photo (multipart/form-data), returns the same structured nutrition shape from Gemini's image analysis.
- Add `lib/aiNutrition.ts` (or similar) holding the shared Zod response schema, prompt templates, and Gemini-response parsing/validation so both routes stay thin.
- Both routes validate input via `lib/validation.ts`-style Zod schemas before calling Gemini, and return `{ ok: true, data } | { ok: false, error }` consistent with the app's existing Server Action result shape (adapted to a JSON HTTP response since these are Route Handlers, not Server Actions).
- No changes to `app/page.tsx`, `app/_components/*`, or `app/actions.ts` — frontend is untouched.
- No database schema changes — these routes do not write to `Food` or `LogEntry`; they only return nutrition estimates for the caller to use later.
- Update `CLAUDE.md` to document the new `app/api/nutrition/*` routes and `lib/gemini.ts`/`lib/aiNutrition.ts`.
- Add a dated entry under `docs/` recording what was added and why (new decision log entry, e.g. `docs/2026-08-17-ai-nutrition-lookup.md`).

## Capabilities

### New Capabilities
- `ai-nutrition-lookup`: Backend API routes that use Gemini to estimate structured nutrition data (calories, protein, carbs, fat, identified food items) from either a free-text meal description or an uploaded meal photo.

### Modified Capabilities
(none — no existing capability's requirements change; this is purely additive backend surface)

## Impact

- **New files**: `app/api/nutrition/text/route.ts`, `app/api/nutrition/image/route.ts`, `lib/gemini.ts`, `lib/aiNutrition.ts`.
- **New dependency**: Gemini SDK (`@google/genai` or equivalent) — first external HTTP call the app makes at runtime; CLAUDE.md's "no external HTTP calls at runtime" architecture note becomes stale and needs updating.
- **Env**: relies on existing `GEMINI_API_KEY` in `.env` (already present, gitignored).
- **Docs**: `CLAUDE.md` architecture section, new `docs/` dated entry.
- **Not affected**: `prisma/schema.prisma`, `app/actions.ts`, any `app/_components/*`, `lib/date.ts`, `lib/nutrition.ts`, `lib/format.ts`.
