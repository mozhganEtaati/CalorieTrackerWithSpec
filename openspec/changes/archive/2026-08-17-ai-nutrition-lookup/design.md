## Context

App today has no external HTTP calls at runtime (CLAUDE.md architecture note) and no route beyond `/`. This change adds the first outbound network dependency (Gemini) and the first API routes (`app/api/nutrition/text`, `app/api/nutrition/image`), as Next.js Route Handlers rather than Server Actions — Server Actions can't easily accept raw `multipart/form-data` file uploads or be called with a plain `fetch` from a future non-form client, and Route Handlers give explicit control over HTTP status codes (`400` vs `502`) that the spec requires. `GEMINI_API_KEY` already exists in `.env` (gitignored) and is read only server-side. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Two working Route Handlers returning validated, structured nutrition JSON.
- Shared Gemini client + response schema so both routes parse/validate identically.
- Fail closed: any unparseable or missing AI output becomes a typed error, never a thrown 500 with a stack trace.

**Non-Goals:**
- No frontend wiring (AddEntryForm, CustomFoodForm) — follow-up change.
- No persistence of AI results — read-only estimate endpoints (see spec: "Nutrition estimates are not persisted").
- No caching/rate-limiting of Gemini calls — out of scope for this pass; noted as a risk below.
- No support for multiple images or multi-turn conversation — single description or single image per request.

## Decisions

**Route Handlers over Server Actions.** Server Actions are the app's existing mutation boundary (CLAUDE.md: "Keep Server Actions as the mutation boundary"), but that convention targets *mutations* invoked from client components via form actions. These endpoints are read-only lookups, one of which needs raw multipart file upload handling that Route Handlers do more directly via `request.formData()`. Alternative considered: a Server Action taking `FormData` with a `File` field — works for a same-app client, but forecloses standalone HTTP testing (curl/Postman) and mixes lookup semantics into the mutation-boundary convention. Route Handlers keep the two concerns separate.

**Shared validation module (`lib/aiNutrition.ts`).** Both routes need the same output shape (list of food items + totals) and the same Gemini prompt/parsing logic. Centralizing avoids duplicating the Zod response schema and prompt text, matching the existing project pattern of centralizing validation in one module (CLAUDE.md: "Do not duplicate ... calculations outside lib/..."). This module exports: a Zod schema for the expected Gemini JSON response, a function to build the text prompt, a function to build the image prompt, and a function that calls Gemini and returns `{ ok: true, data } | { ok: false, error }`.

**Response shape.** Modeled after the existing Server Action `ActionResult` pattern (`{ ok: true } | { ok: false, error, field? }`) for consistency, but returned as a JSON HTTP body with an explicit status code per the spec's WHEN/THEN table, since Route Handlers don't have Server Actions' built-in error channel. `data` on success is:
```
{
  items: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>,
  totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number
}
```
This mirrors `lib/nutrition.ts`'s existing `entryNutrition`/`totalNutrition` field names for a smoother follow-up integration, without importing from `lib/nutrition.ts` itself (that module operates on `Food`/`LogEntry` records, not AI output).

**Prompting Gemini for structured output.** Use Gemini's JSON response mode (`responseMimeType: "application/json"` with a `responseSchema`) rather than free-text parsing with regex/markdown-fence stripping — reduces parse failures and keeps `lib/aiNutrition.ts` simple: call Gemini, `JSON.parse`, validate with Zod, map Zod failure to the `502` "unparseable" case.

**Image handling.** Accept `multipart/form-data` with a single `file` field, read via `request.formData()`, validate content-type (`image/jpeg`, `image/png`) and size (cap at 8MB — comfortably above a phone photo after typical client compression, small enough to stay well under Gemini's inline-image request limits) before base64-encoding and sending inline to Gemini. No temp file writes; everything stays in memory for the duration of the request.

**Model:** `gemini-3.5-flash-lite` — fast/cheap, adequate for a rough nutrition estimate (not a medical-grade tool). Originally specified as `gemini-2.5-flash-lite` per user instruction, but that model returned `404 NOT_FOUND` from the live API during manual testing (task 5.2): "This model models/gemini-2.5-flash-lite is no longer available to new users. Please update your code to use models/gemini-3.5-flash-lite." Switched to Google's suggested replacement.

## Risks / Trade-offs

- **[Risk]** No rate-limiting or per-IP throttling on either endpoint → a bug or malicious caller could run up Gemini API cost. **Mitigation**: out of scope for this change since there's no frontend wired yet (no real traffic path); flagged in the docs/ entry as a follow-up before frontend wiring ships.
- **[Risk]** Gemini nutrition estimates are inherently approximate and can be wrong (misidentified food, bad portion guess). **Mitigation**: spec requires the response to clearly be an *estimate* structure the caller can review before persisting; no auto-write to `LogEntry` (enforced by the spec's persistence requirement).
- **[Risk]** Gemini API latency (image analysis can take several seconds) with no client wired yet to show loading state. **Mitigation**: not addressed in this change; the follow-up frontend-wiring change owns loading/error UX.
- **[Risk]** `GEMINI_API_KEY` misconfiguration (missing/invalid) would currently throw an unhandled error. **Mitigation**: `lib/gemini.ts` checks for the env var at call time and returns the same typed `502`-style error rather than a raw throw, so the route handler's error path stays consistent.

## Migration Plan

Purely additive — new files, no schema change, no existing route touched. Deploy is just "ship the new files"; rollback is deleting/reverting them. No data migration.
