## 1. Text-description AI prefill

- [x] 1.1 Add a text input + trigger control to `CustomFoodForm` for an AI meal description, with its own `textPending` boolean state
- [x] 1.2 On trigger, `fetch("/api/nutrition/text", { method: "POST", body: JSON.stringify({ description }) })`; disable the trigger while `textPending`
- [x] 1.3 On a successful response with exactly one item, prefill `caloriesPerUnit`/`protein`/`carbs`/`fat` (and `name` if empty) from that item
- [x] 1.4 On a successful response with multiple items, render an item picker; prefill fields only once the user selects one
- [x] 1.5 On a failed response (`ok: false` or non-2xx), set the form's `issue` state with a synthetic field (e.g. `aiText`) and the error message; leave nutrition fields untouched
- [x] 1.6 Guard against a stale response overwriting newer state: track a request counter per lookup type, only apply a response if it matches the latest request

## 2. Image AI prefill

- [x] 2.1 Add a file input (`accept="image/jpeg,image/png"`) + trigger control to `CustomFoodForm`, with its own `imagePending` boolean state
- [x] 2.2 On file selection, build `FormData` with the file under `file` and `fetch("/api/nutrition/image", { method: "POST", body: formData })`; disable the trigger while `imagePending`
- [x] 2.3 On a successful response with exactly one item, prefill `caloriesPerUnit`/`protein`/`carbs`/`fat` (and `name` if empty) from that item
- [x] 2.4 On a successful response with multiple items, reuse the same item picker as the text flow; prefill fields only once the user selects one
- [x] 2.5 On the "no food recognized" response (`200`, `ok: false`), show that message distinctly from other failures
- [x] 2.6 On any other failed response, set the form's `issue` state with a synthetic field (e.g. `aiImage`) and the error message; leave nutrition fields untouched
- [x] 2.7 Apply the same stale-response guard as the text flow (separate counter for the image lookup type)

## 3. Shared review-before-save behavior

- [x] 3.1 Confirm prefilled fields remain plain controlled inputs the user can edit — no new read-only state introduced
- [x] 3.2 Confirm neither AI flow calls `createFood` or otherwise submits the form; saving still requires the existing "Save food" button
- [x] 3.3 Confirm canceling the form (existing `onCancel`) after an AI prefill creates no `Food` row

## 4. Verification

- [ ] 4.1 Run `npm run typecheck` and `npm run lint`; fix any new errors
- [ ] 4.2 Manually test in the browser: text lookup with a single-item description, text lookup with a multi-item description (picker appears), image lookup with a real food photo, image lookup with a non-food image (no-food message), a forced failure (e.g. stop the dev server's network briefly or an invalid file type) showing the inline error, editing a prefilled value before save, and canceling after a prefill
- [ ] 4.3 Confirm no `Food` row is created until the user explicitly clicks "Save food"

## 5. Documentation

- [ ] 5.1 Update `CLAUDE.md`: note `CustomFoodForm`'s new client-side calls to `app/api/nutrition/*` in the Architecture section
- [ ] 5.2 Add a new dated entry under `docs/` recording what was added, the key decisions (client fetch vs Server Action, multi-item picker, per-type pending/stale-response handling) and why
