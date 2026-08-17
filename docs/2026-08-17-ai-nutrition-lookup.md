# 2026-08-17 — AI nutrition lookup backend

## What was added

Two new POST Route Handlers that use Gemini to estimate nutrition data, backend-only (no frontend wiring in this change):

- `app/api/nutrition/text/route.ts` — free-text meal description in, structured `{ items, totalCalories, totalProtein, totalCarbs, totalFat }` out.
- `app/api/nutrition/image/route.ts` — uploaded meal photo (JPEG/PNG, ≤8MB) in, same structured shape out.

Supporting code: `lib/gemini.ts` (client singleton), `lib/aiNutrition.ts` (input validation, prompts, Gemini calls, response parsing). Full spec/design/task breakdown: `openspec/changes/ai-nutrition-lookup/`.

## Key decisions and why

- **Route Handlers, not Server Actions.** The app's existing mutation boundary is Server Actions, but these are read-only lookups and one needs raw `multipart/form-data` file handling that Route Handlers do more directly, plus explicit HTTP status control (`400` vs `502` vs `200`/`ok:false`) the spec requires.
- **No persistence.** Neither route touches `Food` or `LogEntry` — they only return an estimate. Verified structurally (no Prisma import in either file or in `lib/aiNutrition.ts`) and empirically (row counts unchanged across manual testing).
- **Gemini structured output mode** (`responseMimeType: "application/json"` + `responseSchema`) instead of free-text parsing, to minimize parse failures.
- **Response shape mirrors `lib/nutrition.ts` field names** (`totalCalories`, `totalProtein`, etc.) without importing from it, so a future frontend-wiring change can drop the AI result into the existing display code with minimal translation.
- **Model:** started as `gemini-2.5-flash-lite` per the original instruction, but that model returned `404 NOT_FOUND` from the live API during manual testing ("no longer available to new users ... use models/gemini-3.5-flash-lite"). Switched to `gemini-3.5-flash-lite`.
- **8MB image cap** — comfortably above a typical phone photo, well under Gemini's inline-image request limits.
- **Image-recognized-nothing is a `200`, not a `502`** — the request was valid and Gemini responded successfully; it just found no food. Distinguishes "you did something wrong" (`400`), "we couldn't get a usable answer from the AI" (`502`), and "the AI understood but found nothing" (`200 ok:false`).
- **`eslint.config.mjs` added.** The repo had no ESLint config at all — `npm run lint` (already in `package.json`) was un-runnable and prompted interactively. Added flat config (`next/core-web-vitals` + `next/typescript`) plus the `eslint`/`eslint-config-next` devDependencies so the CLAUDE.md-mandated `npm run lint` gate actually works.

## Known follow-ups (not done in this change)

- No rate-limiting/throttling on either route — acceptable now since no frontend calls them yet; must be addressed before wiring up the UI.
- Frontend integration (AddEntryForm / CustomFoodForm) is a separate, not-yet-started change.
- Gemini call latency (multi-second, especially for images) has no loading-state UI yet — owned by the frontend-wiring change.

## Verification performed

- `npm run typecheck` — clean.
- `npm run lint` — clean (after adding ESLint config).
- Manual testing against a throwaway `next dev -p 3005` instance (left port 3000's existing process untouched): valid text description (200), empty/missing description (400 each), missing image file (400), wrong file type (400), oversized image (400), valid tiny image with no recognizable food (200 `ok:false`). The `502` path was exercised naturally while diagnosing the `gemini-2.5-flash-lite` 404 before the model switch.
- Confirmed `Food` and `LogEntry` row counts unchanged across all manual testing.
