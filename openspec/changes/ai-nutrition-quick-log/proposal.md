## Why

`ai-nutrition-lookup-ui` wired the AI text/image lookup into `CustomFoodForm`, but that only helps when the user is building a reusable custom food. Most of the time a user just ate something and wants it logged for today without first defining it as a catalog entry. This change adds a direct "describe or photograph what you ate → confirm → it's logged" path in the `AddEntryForm` ("Add something") section, then clears that input so it's ready for the next thing.

## What Changes

- Add an AI quick-log section to `AddEntryForm`: a text-description input and a photo upload, both calling the existing `/api/nutrition/text` / `/api/nutrition/image` routes from `ai-nutrition-lookup` (unchanged).
- On a successful lookup, show the identified item(s) with their estimated nutrition as a **review list**, each with a checkbox (all checked by default) — nothing is logged yet.
- On confirm, log the checked items for the currently selected day: **one `LogEntry` per checked item**, not one combined entry — matches how the existing day list already displays one row per food.
- Add a new Server Action, `logAiNutritionItems`, that for each confirmed item either reuses an existing `Food` row with a matching name (case-insensitive, same rule `createFood` already uses) or creates a new one from the AI-estimated values, then creates a `LogEntry` (quantity `1`, the day's date) against it. Runs as one transaction so a partial failure doesn't leave a half-logged meal.
- After a successful confirm, clear the AI quick-log input (description text / selected file) and the review list, per the user's ask ("then clean it from Add something").
- `AddEntryForm`'s existing search/select/quantity flow for picking from the catalog is unchanged; the AI quick-log section is a separate, additional entry point in the same "Add something" area.
- No changes to `app/api/nutrition/*`, `lib/aiNutrition.ts`, `lib/gemini.ts`, or `CustomFoodForm.tsx`'s existing AI-assist (from `ai-nutrition-lookup-ui`) — that flow stays as its own review-then-manually-save path.

## Capabilities

### New Capabilities
- `ai-nutrition-quick-log`: Lets a user log one or more food entries for the current day directly from an AI text/photo analysis, with a mandatory review-and-confirm step before anything is written, and via a new `logAiNutritionItems` Server Action.

### Modified Capabilities
(none — `addEntry`, `createFood`, and their validation are unchanged; this adds a new action alongside them)

## Impact

- **Modified files**: `app/_components/AddEntryForm.tsx` (new AI quick-log UI section).
- **New files**: a Server Action `logAiNutritionItems` in `app/actions.ts`, a new Zod schema in `lib/validation.ts` for its input (array of `{ name, calories, protein, carbs, fat }` + `date`).
- **Database writes**: this is the first AI-related change that writes to `Food`/`LogEntry` — `ai-nutrition-lookup`'s routes and `ai-nutrition-lookup-ui`'s `CustomFoodForm` integration are both explicitly read-only/review-only; this one persists, behind an explicit user confirm step.
- **Not affected**: `prisma/schema.prisma` (no schema change — reuses `Food`/`LogEntry` as-is), `app/api/nutrition/*`, `lib/aiNutrition.ts`, `lib/gemini.ts`, `CustomFoodForm.tsx`.
- **Docs**: `CLAUDE.md` Architecture section, new dated `docs/` entry.
