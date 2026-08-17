## Context

`CustomFoodForm` (`app/_components/CustomFoodForm.tsx`) is a client component holding `form` state (`name`, `unit`, `caloriesPerUnit`, `protein`, `carbs`, `fat`) and an `issue` field-error state, submitted via the `createFood` Server Action. `ai-nutrition-lookup` already shipped `POST /api/nutrition/text` and `POST /api/nutrition/image`, both returning `{ ok: true, data: { items: [...], totalCalories, ... } } | { ok: false, error }`. See proposal.md - Why. This design covers only how the form calls those routes and merges a chosen item into its existing state — the routes themselves are unchanged.

## Goals / Non-Goals

**Goals:**
- Reuse `CustomFoodForm`'s existing field state and `issue` error display — no parallel state model.
- Keep the AI call client-side (`fetch` from the browser to the Route Handler), since Server Actions aren't part of this path and the routes are already public POST endpoints.
- Make multi-item responses (e.g. "chicken with rice and salad") resolve to one set of values before touching form fields — the form has one `caloriesPerUnit` etc., not a list.

**Non-Goals:**
- No changes to `AddEntryForm`'s search/select flow or the `addEntry` action.
- No persistence of the raw AI response or which item was picked.
- No retry/backoff logic for failed lookups — a failed lookup just shows an error; the user can retry manually by triggering the control again.
- No image preview/crop UI beyond the browser's native file picker.

## Decisions

**Client-side `fetch`, no new Server Action.** The AI routes are already stateless JSON/multipart HTTP endpoints designed for direct calls (`ai-nutrition-lookup` design.md). Wrapping them in a Server Action would add a hop for no benefit and would need `FormData`-to-`FormData` passthrough for the image case. `CustomFoodForm` calls `fetch("/api/nutrition/text", ...)` / `fetch("/api/nutrition/image", ...)` directly.

**Multi-item resolution: inline picker, not auto-pick-first.** The proposal considered auto-selecting the first item, but a description like "chicken with rice and salad" has no well-defined "first" that the user would expect — silently picking one risks prefilling the wrong values with no indication anything was dropped. Instead, when `items.length > 1`, the form renders the identified items as a small selectable list (name + calories per item) and only prefills the four nutrition fields once the user taps one. `items.length === 1` skips the picker and prefills immediately.

**Two separate pending states, not one shared "loading" flag.** Text lookup and image lookup are independent actions a user could reach in either order; sharing one boolean would incorrectly disable the text button while an image is uploading (or vice versa). Two `useState<boolean>` flags (`textPending`, `imagePending`), each disabling only its own control, mirroring the existing `isPending` pattern already used for form submission.

**Errors reuse the existing `issue` state shape.** `CustomFoodForm` already renders `issue: { field, error } | null` for `createFood` validation errors. AI lookup errors reuse the same state and rendering path with a synthetic field name (e.g. `"aiText"` / `"aiImage"`) so no second error-display UI is needed — consistent with the project's existing pattern instead of introducing a new one.

**Image upload uses a plain `<input type="file">` + `FormData`**, matching the API route's expected `multipart/form-data` with a `file` field (`ai-nutrition-lookup` design.md). No drag-and-drop or camera-capture affordance beyond what the native file input provides on the browser/OS (mobile browsers already surface a camera option from a file input).

**No `AbortController`/cancel-in-flight handling.** Out of scope: if a user fires a lookup and navigates away or triggers another lookup, the in-flight request's result is simply ignored when it lands after the component state has moved on (checked via a request-generation counter or ignoring stale response if a newer request started) — this is enough to avoid a stale response overwriting fresher form state, without full cancellation.

## Risks / Trade-offs

- **[Risk]** A stale AI response arriving after the user already edited fields by hand could clobber their edits. **Mitigation**: track a per-lookup-type request counter; only apply a response if it's still the latest request of its type when it resolves.
- **[Risk]** Image lookups can take several seconds; a user might think the button is unresponsive. **Mitigation**: pending state changes button text/appearance immediately, per the spec's "Loading state during AI lookup" requirement.
- **[Risk]** AI-estimated values could be saved unedited and be wrong. **Mitigation**: values are always editable pre-save, no auto-submit — enforced by the "review step, not auto-save" requirement; no code changes needed to `createFood`'s existing validation, which still runs.

## Migration Plan

Purely additive UI change to one existing client component. No schema change, no route change. Deploy is shipping the updated `CustomFoodForm.tsx`; rollback is reverting that file.
