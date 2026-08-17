## 1. Dependency and env setup

- [x] 1.1 Add Gemini SDK dependency (e.g. `@google/genai`) to `package.json`
- [x] 1.2 Confirm `GEMINI_API_KEY` is read from `.env` only server-side; do not expose via `NEXT_PUBLIC_*`

## 2. Shared Gemini client and schema

- [x] 2.1 Create `lib/gemini.ts`: Gemini client singleton configured for `gemini-3.5-flash-lite`, reading `GEMINI_API_KEY`, throwing/returning a typed error if the key is missing at call time
- [x] 2.2 Create `lib/aiNutrition.ts` with a Zod schema for the AI response shape: `items: { name, calories, protein, carbs, fat }[]` plus computed totals
- [x] 2.3 In `lib/aiNutrition.ts`, add a function to build the text-lookup prompt and call Gemini with `responseMimeType: "application/json"` + `responseSchema`, returning `{ ok: true, data } | { ok: false, error }`
- [x] 2.4 In `lib/aiNutrition.ts`, add a function to build the image-lookup prompt (base64 inline image + instruction) and call Gemini the same way, returning the same result shape
- [x] 2.5 In `lib/aiNutrition.ts`, add Zod-based parsing/validation of the raw Gemini JSON response, mapping any parse/validation failure to `{ ok: false, error }` (never throw past this boundary)

## 3. Text lookup route

- [x] 3.1 Add Zod input schema (in `lib/validation.ts` or `lib/aiNutrition.ts`) for the text lookup request: required, trimmed, non-empty `description` string with a max length
- [x] 3.2 Create `app/api/nutrition/text/route.ts` (POST): parse JSON body, validate with the schema, return `400` on validation failure without calling Gemini
- [x] 3.3 On valid input, call the text-lookup function from `lib/aiNutrition.ts`; return `200` with `{ ok: true, data }` on success
- [x] 3.4 On Gemini/parsing failure, return `502` with `{ ok: false, error }` that omits upstream internals (no raw SDK error objects/stack traces in the response body)

## 4. Image lookup route

- [x] 4.1 Create `app/api/nutrition/image/route.ts` (POST): read `request.formData()`, extract the `file` field
- [x] 4.2 Validate presence of a file; return `400` if missing, without calling Gemini
- [x] 4.3 Validate content type is `image/jpeg` or `image/png`; return `400` naming accepted types otherwise, without calling Gemini
- [x] 4.4 Validate file size against the configured max (8MB); return `400` stating the limit if exceeded, without calling Gemini
- [x] 4.5 On valid image, base64-encode and call the image-lookup function from `lib/aiNutrition.ts`
- [x] 4.6 If Gemini returns a valid response but identifies no food, return `200` with `{ ok: false, error }` (distinct from the `400`/`502` cases)
- [x] 4.7 On Gemini/parsing failure, return `502` with `{ ok: false, error }` that omits upstream internals

## 5. Verification

- [x] 5.1 Run `npm run typecheck` and `npm run lint`; fix any new errors
- [x] 5.2 Manually exercise both routes (curl/Postman) with: valid text, empty text, valid image, missing image, wrong file type, oversized image, and (if feasible) a forced Gemini failure — confirm status codes and response shapes match the spec scenarios
- [x] 5.3 Confirm no `Food` or `LogEntry` rows are created by either route during manual testing

## 6. Documentation

- [x] 6.1 Update `CLAUDE.md`: add `app/api/nutrition/text/route.ts`, `app/api/nutrition/image/route.ts`, `lib/gemini.ts`, `lib/aiNutrition.ts` to the Architecture section; correct the "no external HTTP calls at runtime" claim to note the new Gemini dependency
- [x] 6.2 Add a new dated entry under `docs/` (e.g. `docs/2026-08-17-ai-nutrition-lookup.md`) recording what was added, the key design decisions (Route Handlers vs Server Actions, no persistence, response shape, model choice) and why
