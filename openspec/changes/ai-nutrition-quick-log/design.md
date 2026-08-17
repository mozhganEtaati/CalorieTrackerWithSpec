## Context

`AddEntryForm` (`app/_components/AddEntryForm.tsx`) is a client component that already calls `addEntry` (a Server Action) to log a catalog food for the `date` prop it receives. `ai-nutrition-lookup` provides `/api/nutrition/text` and `/api/nutrition/image`, both read-only. `ai-nutrition-lookup-ui` added a similar text/image AI-assist to `CustomFoodForm`, but that flow only prefills form fields for a food the user is *defining*, never writes to the database itself. This change is the first to persist AI-derived data, so it needs the same validation/mutation discipline as `addEntry`/`createFood`. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Reuse the existing AI routes as-is (no route changes).
- One new Server Action (`logAiNutritionItems`) as the sole write path — client code never writes to Prisma directly.
- Match `AddEntryForm`'s existing `date` prop so quick-logged entries land on the currently viewed day, exactly like a catalog pick would.
- Keep the review-before-write guarantee airtight: the Server Action only runs on explicit user confirm, never on lookup response arrival.

**Non-Goals:**
- No editing of individual item values in the review list before confirm (e.g. adjusting calories) — out of scope; a user who wants control over the numbers already has `CustomFoodForm`'s AI-assist path.
- No `quantity` control on quick-logged items — always `1` unit of whatever the AI estimated for the described/photographed portion.
- No dedup against `LogEntry` history (e.g. warning "you already logged chicken today") — out of scope.

## Decisions

**New Server Action instead of extending `addEntry`.** `addEntry` takes a `foodId` for an existing catalog row; quick-log items may not exist as `Food` rows yet. Rather than overload `addEntry` with "create-if-missing" semantics, `logAiNutritionItems` is a distinct action whose contract is "these AI-estimated items, log them for this date," internally handling the find-or-create step. Keeps `addEntry`'s existing contract and tests (informal, via spec scenarios) unchanged.

**Food matching reuses `createFood`'s exact case-insensitive rule.** Same in-memory trim + lowercase comparison against all `Food.name` values that `createFood` already uses (`app/actions.ts`), for consistency — two code paths creating foods should agree on what counts as a duplicate. If Prisma's `@unique` constraint still races (two quick-logs of the same new name concurrently), the transaction's create will throw `P2002`; caught and retried once by re-querying for the now-existing row, since (unlike `createFood`, which reports "already exists" as a user-facing validation error) a race here is not user error — the item should still log successfully against whichever row won.

**One Prisma transaction per confirm.** All food-lookups/creates and log-entry creates for a single confirm run inside `prisma.$transaction(...)`, so a failure partway through (e.g. a DB error on item 2 of 3) leaves zero entries logged rather than a partial meal — matches the spec's "failed confirm does not clear the input" requirement, which implies the whole confirm is atomic and retryable.

**New `Food` rows get `unit: "serving"`.** AI estimates are for "the portion described/shown," not a per-100g or per-piece basis the user can meaningfully reuse a multiplier against. `"serving"` documents that the stored values represent that one instance; `quantity` is fixed at `1` (Non-Goals). These foods are still visible afterward in `AddEntryForm`'s catalog search like any other food (`isCustom: true`, same as `createFood`'s output) — a user could deliberately log another `1 × serving` of it later, but adjusting the multiplier wouldn't scale correctly the way `100g` does. Accepted trade-off given quick-log's goal is "log this meal now," not "define a reusable unit."

**Review list UI reuses `AddEntryForm`'s existing patterns**, not `CustomFoodForm`'s: a checkbox list of items (name, calories) shown inline below the AI input, a "Log it" confirm button (mirrors `AddEntryForm`'s existing "Log it" button for a catalog pick), and a "Discard" cancel. Loading/error states follow the same `isPending`/`issue` shape already used elsewhere in the file.

**Clearing on success is scoped to the quick-log input only.** `AddEntryForm`'s existing search/select state (`query`, `selectedId`, etc.) is untouched by this feature — the two entry points share the section but not state.

## Risks / Trade-offs

- **[Risk]** A `Food` row auto-created from an AI estimate could have inaccurate values that later pollute the catalog if reused. **Mitigation**: out of scope to prevent here; `isCustom: true` and the food is visible/editable through the same mechanisms as any custom food today (no dedicated edit-food UI exists yet in this app, which is a pre-existing gap, not introduced by this change).
- **[Risk]** Logging multiple items per confirm means a partial UI state (some checked, some not) could confuse a user about what "Log it" will do. **Mitigation**: each checkbox is clearly tied to one item's name + calories; unchecked items are visually distinguished (per implementation, e.g. dimmed).
- **[Risk]** Race on Food name creation across two concurrent quick-log confirms. **Mitigation**: retry-on-`P2002` covered under Decisions above.

## Migration Plan

Purely additive. New Server Action, new client UI section, no schema change. Deploy is shipping the updated files; rollback is reverting them.
