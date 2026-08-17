## 1. Validation and Server Action

- [x] 1.1 Add a Zod schema in `lib/validation.ts` for `logAiNutritionItems` input: `items: { name, calories, protein, carbs, fat }[]` (non-empty) + `date` (reuse `dateSchema`)
- [x] 1.2 Add `logAiNutritionItems` to `app/actions.ts`: validate input, then in a single `prisma.$transaction`, for each item — find an existing `Food` by case-insensitive name match (same rule as `createFood`), else create a new one (`unit: "serving"`, `isCustom: true`, AI values) — then create a `LogEntry` (`quantity: 1`, the given `date`) against it
- [x] 1.3 Handle a `P2002` race on food creation inside the transaction: re-query for the now-existing food by name and log against it instead of failing the whole confirm
- [x] 1.4 Call `revalidatePath("/")` on success; return `ActionResult`-shaped `{ ok: true } | { ok: false, error }`

## 2. AddEntryForm: text quick-log

- [x] 2.1 Add a text-description input + trigger to `AddEntryForm`'s "Add something" section, separate from the existing catalog search box
- [x] 2.2 On trigger, call `/api/nutrition/text`; show a pending state on the trigger while in flight
- [x] 2.3 On success, render a review list of identified items (name + calories), each with a checkbox defaulting to checked; do not write to the database yet
- [x] 2.4 On failure, show an inline error (reuse the form's existing `issue` pattern) and leave the description/review list untouched

## 3. AddEntryForm: image quick-log

- [x] 3.1 Add a photo upload control to the same section, with its own pending state
- [x] 3.2 On file selection, call `/api/nutrition/image`; show a pending state while in flight
- [x] 3.3 On success, render the same checkbox review list as the text flow
- [x] 3.4 On "no food recognized" (`200`, `ok: false`), show that message distinctly from other failures
- [x] 3.5 On any other failure, show an inline error and leave the selected photo/review list untouched

## 4. Confirm and clear

- [x] 4.1 Add a "Log it" confirm control below the review list, calling `logAiNutritionItems` with the checked items and the form's current `date`
- [x] 4.2 Disable the confirm control while the action is pending; show a distinct pending state
- [x] 4.3 On success, clear the description text, selected file, and review list entirely
- [x] 4.4 On failure, show an inline error and leave the description/file/review list as they were so the user can retry
- [x] 4.5 Add a "Discard" control that clears the review list (and description/file) without logging anything

## 5. Verification

- [x] 5.1 Run `npm run typecheck` and `npm run lint`; fix any new errors
- [ ] 5.2 Manually test: single-item text quick-log end to end (review → confirm → entry appears in the day list → input cleared), multi-item confirm with one item unchecked (only checked items logged), image quick-log, discarding a review list, a forced failure on confirm (leaves input intact), and confirming an item whose name matches an existing catalog food (reuses it, no duplicate `Food` row)
- [ ] 5.3 Confirm quick-logged entries show correctly in the existing day totals/history (via `lib/nutrition.ts`, unmodified) since they're ordinary `LogEntry` rows

## 6. Documentation

- [ ] 6.1 Update `CLAUDE.md`: note `AddEntryForm`'s new AI quick-log section and the `logAiNutritionItems` Server Action in the Architecture section
- [ ] 6.2 Add a new dated entry under `docs/` recording what was added, the key decisions (new Server Action vs extending `addEntry`, per-item logging, food-reuse-by-name, transaction/race handling, `unit: "serving"`) and why
