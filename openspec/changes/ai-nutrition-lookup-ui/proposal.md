## Why

`ai-nutrition-lookup` shipped two working backend routes (`/api/nutrition/text`, `/api/nutrition/image`) but no UI calls them yet — a user adding a food with no catalog match still has to type calories/protein/carbs/fat by hand into `CustomFoodForm`. Wiring the AI routes into that form removes the manual-entry burden while keeping a human review step before anything is saved, since AI estimates are approximate.

## What Changes

- Add two AI-assist entry points inside `CustomFoodForm`: a text-description input ("توصیف کن" / "Describe it") that calls `POST /api/nutrition/text`, and a photo upload ("عکس بگیر/آپلود کن" / "Upload a photo") that calls `POST /api/nutrition/image`.
- On a successful lookup, prefill the form's `caloriesPerUnit`, `protein`, `carbs`, `fat` fields (and `name` if empty) from the first/primary identified item in the AI response — the user can edit any field before clicking "Save food", same as today.
- If the AI response contains multiple identified items (e.g. "chicken with rice and salad"), surface all items so the user picks which one becomes this custom food's values, rather than silently summing or guessing.
- Add a pending/loading state on both AI actions (network round-trip, image analysis can take several seconds) and an inline error message on failure (400/502/no-food-found), reusing the form's existing `issue` display pattern.
- `AddEntryForm`'s existing "Add it yourself" flow (opens `CustomFoodForm` with `initialName` from the search query) is unchanged; the AI text-description field is a separate, optional input inside the custom-food form, not a replacement for the search box.
- No backend changes — `app/api/nutrition/*` and `lib/aiNutrition.ts` from `ai-nutrition-lookup` are consumed as-is.
- No database schema changes — AI-assist only prefills form fields; saving still goes through the existing `createFood` Server Action and its validation.
- Update `CLAUDE.md` and add a dated `docs/` entry recording this change.

## Capabilities

### New Capabilities
- `ai-nutrition-lookup-ui`: Client-side integration that lets a user prefill the custom-food form's nutrition fields via AI (text description or photo), with mandatory human review before save.

### Modified Capabilities
(none — `CustomFoodForm`'s save behavior and validation are unchanged; this only adds an optional prefill path ahead of the existing manual-entry flow)

## Impact

- **Modified files**: `app/_components/CustomFoodForm.tsx` (new AI-assist UI + client-side fetch calls to the existing API routes).
- **Possibly new files**: a small client helper/hook if the fetch + loading-state logic doesn't fit cleanly inline (decided in design.md).
- **Not affected**: `app/actions.ts`, `lib/validation.ts`, `prisma/schema.prisma`, `app/api/nutrition/*`, `lib/aiNutrition.ts`, `lib/gemini.ts`, `AddEntryForm.tsx`'s search/select flow.
- **Docs**: `CLAUDE.md` Architecture section (note `CustomFoodForm`'s new AI-assist dependency on `app/api/nutrition/*`), new dated `docs/` entry.
