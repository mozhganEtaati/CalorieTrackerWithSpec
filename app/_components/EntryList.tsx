"use client";

import { useOptimistic, useState, useTransition } from "react";
import { deleteEntry, updateEntry } from "../actions";
import { formatCalories, formatGrams, formatQuantity } from "@/lib/format";
import { entryNutrition } from "@/lib/nutrition";
import type { EntryView } from "./types";

export default function EntryList({ entries }: { entries: EntryView[] }) {
  // Deletion is the one mutation whose outcome is certain, so it is the one
  // that gets an optimistic update. Add and edit can fail validation, and a row
  // that appears and then vanishes reads worse than a brief pending state.
  const [visibleEntries, removeOptimistically] = useOptimistic(
    entries,
    (current, removedId: number) =>
      current.filter((entry) => entry.id !== removedId),
  );

  return (
    <section aria-label="What you ate">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="eyebrow">What you ate</h2>
        <p className="num text-xs text-pine-soft">
          {visibleEntries.length}{" "}
          {visibleEntries.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      {visibleEntries.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-pine/35 px-5 py-10 text-center text-sm text-pine-soft">
          This day is still empty.
          <br />
          Search above to put something in it.
        </p>
      ) : (
        <ul className="card">
          {visibleEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onDelete={removeOptimistically}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryRow({
  entry,
  onDelete,
}: {
  entry: EntryView;
  onDelete: (id: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(entry.quantity));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nutrition = entryNutrition(entry);

  function save() {
    startTransition(async () => {
      const result = await updateEntry({ id: entry.id, quantity: draft });
      if (result.ok) {
        setError(null);
        setIsEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function cancel() {
    // Restore the stored value; a cancelled edit changes nothing.
    setDraft(String(entry.quantity));
    setError(null);
    setIsEditing(false);
  }

  function remove() {
    startTransition(async () => {
      onDelete(entry.id);
      await deleteEntry({ id: entry.id });
    });
  }

  return (
    <li className="border-b border-pine/15 px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold">
            {entry.food.name}
            {entry.food.isCustom ? (
              <span className="ml-2 rounded-full border-[1.5px] border-pine/30 px-1.5 py-px text-[10px] font-semibold uppercase tracking-eyebrow text-pine-soft">
                yours
              </span>
            ) : null}
          </p>

          <p className="num mt-1 text-xs text-pine-soft">
            {isEditing ? (
              <span className="inline-flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") save();
                    if (event.key === "Escape") cancel();
                  }}
                  aria-label={`Quantity for ${entry.food.name}`}
                  aria-invalid={error !== null}
                  className="w-16 rounded-full border-2 border-pine bg-white px-2.5 py-0.5 text-center font-display text-sm font-semibold text-pine focus:outline-none"
                />
                <span>× {entry.food.unit}</span>
              </span>
            ) : (
              formatQuantity(entry.quantity, entry.food.unit)
            )}
            <span className="mx-2 text-pine/25">·</span>
            {formatGrams(nutrition.protein)}p · {formatGrams(nutrition.carbs)}c
            · {formatGrams(nutrition.fat)}f
          </p>
        </div>

        <p className="num w-[4.5rem] shrink-0 text-right font-display text-xl font-bold leading-none">
          {formatCalories(nutrition.calories)}
        </p>

        <div className="flex shrink-0 gap-1.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="chip"
              >
                Save
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={isPending}
                className="chip"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={isPending}
                className="chip"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={isPending}
                className="chip chip-danger"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-coral">
          {error}
        </p>
      ) : null}
    </li>
  );
}
