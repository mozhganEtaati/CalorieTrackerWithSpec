"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addEntry, logAiNutritionItems } from "../actions";
import { formatCalories } from "@/lib/format";
import CustomFoodForm from "./CustomFoodForm";
import type { FoodOption } from "./types";

type AiNutritionItem = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type AiLookupResponse =
  | { ok: true; data: { items: AiNutritionItem[] } }
  | { ok: false; error: string };

type ReviewItem = AiNutritionItem & { checked: boolean };

export default function AddEntryForm({
  foods,
  date,
}: {
  foods: FoodOption[];
  date: string;
}) {
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [issue, setIssue] = useState<{ field: string; error: string } | null>(
    null,
  );
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [aiDescription, setAiDescription] = useState("");
  const [aiTextPending, setAiTextPending] = useState(false);
  const [aiImagePending, setAiImagePending] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null);
  const [confirmPending, startConfirmTransition] = useTransition();
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // Case-insensitive, matches anywhere in the name.
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return foods;
    return foods.filter((food) =>
      food.name.toLocaleLowerCase().includes(needle),
    );
  }, [foods, query]);

  const selected = foods.find((food) => food.id === selectedId) ?? null;

  // The list opens on focus so the catalog can be browsed, and stays open until
  // something is logged: closing it on blur would eat the click that chose a food.
  const listOpen = browsing || query.trim() !== "";

  // A preview of what this entry will cost the day, before it is committed.
  const parsedQuantity = Number(quantity);
  const preview =
    selected && Number.isFinite(parsedQuantity) && parsedQuantity > 0
      ? formatCalories(selected.caloriesPerUnit * parsedQuantity)
      : null;

  function submit() {
    if (selected === null) {
      setIssue({ field: "foodId", error: "Pick a food first" });
      return;
    }
    startTransition(async () => {
      const result = await addEntry({ foodId: selected.id, quantity, date });
      if (result.ok) {
        setIssue(null);
        setQuantity("1");
        // Collapse back to the search field, but keep the food selected so the
        // same thing can be logged again without hunting for it.
        setQuery("");
        setBrowsing(false);
      } else {
        setIssue({ field: result.field ?? "form", error: result.error });
      }
    });
  }

  function clearSelection() {
    setSelectedId(null);
    setQuantity("1");
    setIssue(null);
  }

  function clearAiQuickLog() {
    setAiDescription("");
    setReviewItems(null);
    if (aiFileInputRef.current) aiFileInputRef.current.value = "";
  }

  async function runAiTextQuickLookup() {
    const description = aiDescription.trim();
    if (description === "") return;
    setAiTextPending(true);
    setIssue(null);
    try {
      const response = await fetch("/api/nutrition/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const result = (await response.json()) as AiLookupResponse;
      if (!result.ok) {
        setIssue({ field: "aiQuickLog", error: result.error });
      } else if (result.data.items.length === 0) {
        setIssue({ field: "aiQuickLog", error: "No food recognized" });
      } else {
        setReviewItems(
          result.data.items.map((item) => ({ ...item, checked: true })),
        );
      }
    } catch {
      setIssue({ field: "aiQuickLog", error: "AI lookup failed" });
    } finally {
      setAiTextPending(false);
    }
  }

  async function runAiImageQuickLookup(file: File) {
    setAiImagePending(true);
    setIssue(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/nutrition/image", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as AiLookupResponse;
      if (!result.ok) {
        setIssue({ field: "aiQuickLog", error: result.error });
      } else if (result.data.items.length === 0) {
        setIssue({ field: "aiQuickLog", error: "No food recognized" });
      } else {
        setReviewItems(
          result.data.items.map((item) => ({ ...item, checked: true })),
        );
      }
    } catch {
      setIssue({ field: "aiQuickLog", error: "AI lookup failed" });
    } finally {
      setAiImagePending(false);
      if (aiFileInputRef.current) aiFileInputRef.current.value = "";
    }
  }

  function toggleReviewItem(index: number) {
    setReviewItems((current) =>
      current
        ? current.map((item, i) =>
            i === index ? { ...item, checked: !item.checked } : item,
          )
        : current,
    );
  }

  function confirmAiQuickLog() {
    if (!reviewItems) return;
    const checked = reviewItems.filter((item) => item.checked);
    if (checked.length === 0) {
      setIssue({ field: "aiQuickLog", error: "Pick at least one item" });
      return;
    }
    startConfirmTransition(async () => {
      const result = await logAiNutritionItems({
        items: checked.map((item) => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        })),
        date,
      });
      if (result.ok) {
        setIssue(null);
        clearAiQuickLog();
      } else {
        setIssue({ field: "aiQuickLog", error: result.error });
      }
    });
  }

  return (
    <section aria-label="Add a food">
      <h2 className="eyebrow mb-3">Add something</h2>

      <div className="card mb-3 flex flex-wrap items-start gap-3 px-4 py-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="What did you eat? — grilled chicken with rice…"
            value={aiDescription}
            onChange={(event) => setAiDescription(event.target.value)}
            className="field"
          />
          <button
            type="button"
            onClick={runAiTextQuickLookup}
            disabled={aiTextPending || aiDescription.trim() === ""}
            className="btn-quiet whitespace-nowrap"
          >
            {aiTextPending ? "Thinking…" : "Analyze"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={aiFileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            disabled={aiImagePending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) runAiImageQuickLookup(file);
            }}
            className="text-xs"
          />
          {aiImagePending ? (
            <span className="text-xs text-pine-soft">Analyzing…</span>
          ) : null}
        </div>
      </div>

      {issue?.field === "aiQuickLog" ? (
        <p role="alert" className="mb-3 text-xs text-coral">
          {issue.error}
        </p>
      ) : null}

      {reviewItems ? (
        <div className="card mb-3">
          <p className="px-4 pt-3 text-xs text-pine-soft">
            Log these for today?
          </p>
          <ul className="mt-1">
            {reviewItems.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="border-b border-pine/15 px-4 py-2 last:border-b-0"
              >
                <label className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleReviewItem(index)}
                    />
                    <span
                      className={`text-sm font-medium ${item.checked ? "" : "text-pine-soft/60 line-through"}`}
                    >
                      {item.name}
                    </span>
                  </span>
                  <span className="num shrink-0 text-xs text-pine-soft">
                    {Math.round(item.calories)} kcal
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 border-t border-pine/20 px-4 py-3">
            <button
              type="button"
              onClick={confirmAiQuickLog}
              disabled={confirmPending}
              className="btn-solid"
            >
              {confirmPending ? "Logging" : "Log it"}
            </button>
            <button
              type="button"
              onClick={clearAiQuickLog}
              disabled={confirmPending}
              className="btn-quiet"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-display text-xl font-bold text-pine-soft"
        >
          +
        </span>
        <input
          id="food-search"
          type="search"
          placeholder="Start typing — chicken, oats, banana…"
          value={query}
          onFocus={() => setBrowsing(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setBrowsing(true);
            setShowCustomForm(false);
          }}
          className="w-full rounded-2xl border-2 border-dashed border-pine/40 bg-porcelain/60 py-4 pl-12 pr-5
                     font-display text-[0.95rem] font-semibold text-pine
                     placeholder:font-body placeholder:font-normal placeholder:text-pine-soft/75
                     focus:border-solid focus:border-pine focus:bg-porcelain focus:outline-none"
        />
      </div>

      {listOpen && matches.length > 0 ? (
        <ul className="card mt-3 max-h-64 overflow-y-auto">
          {matches.map((food) => {
            const isSelected = food.id === selectedId;
            return (
              <li
                key={food.id}
                className="border-b border-pine/15 last:border-b-0"
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedId(food.id);
                    setIssue(null);
                  }}
                  className={`flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-pine text-porcelain"
                      : "hover:bg-honey/25"
                  }`}
                >
                  <span className="min-w-0 truncate text-[0.9375rem] font-medium">
                    {food.name}
                    {food.isCustom ? (
                      <span
                        className={`ml-2 rounded-full border-[1.5px] px-1.5 py-px text-[10px] font-semibold uppercase tracking-eyebrow ${
                          isSelected
                            ? "border-porcelain/50"
                            : "border-pine/30 text-pine-soft"
                        }`}
                      >
                        yours
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`num shrink-0 font-display text-sm font-bold ${
                      isSelected ? "text-porcelain" : "text-pine-soft"
                    }`}
                  >
                    {formatCalories(food.caloriesPerUnit)}
                    <span className="font-body text-[11px] font-normal">
                      {" "}
                      / {food.unit}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {listOpen && matches.length === 0 && !showCustomForm ? (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-pine/35 px-5 py-7 text-center">
          <p className="text-sm text-pine-soft">
            Nothing called &ldquo;{query.trim()}&rdquo; yet.
          </p>
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className="btn-quiet mt-3"
          >
            Add it yourself
          </button>
        </div>
      ) : null}

      {selected ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="card mt-3 flex flex-wrap items-center gap-x-4 gap-y-3 border-pine px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[0.9375rem] font-bold">
              {selected.name}
            </p>
            <p className="num text-xs text-pine-soft">
              {preview ? `${preview} kcal` : "enter an amount"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="quantity-input" className="sr-only">
              How much
            </label>
            <input
              id="quantity-input"
              type="number"
              step="any"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              aria-invalid={issue?.field === "quantity"}
              className="num w-16 rounded-full border-2 border-pine/25 bg-white px-3 py-1.5 text-center font-display font-semibold text-pine focus:border-pine focus:outline-none"
            />
            {/* Without the unit, a bare "2" means nothing. */}
            <span className="text-xs text-pine-soft">× {selected.unit}</span>
          </div>

          <button type="submit" disabled={isPending} className="btn-solid">
            {isPending ? "Logging" : "Log it"}
          </button>

          <button
            type="button"
            onClick={clearSelection}
            aria-label="Clear the selected food"
            className="pill h-8 w-8 border-[1.5px] border-pine/30 text-sm"
          >
            ×
          </button>
        </form>
      ) : null}

      {issue && issue.field !== "aiQuickLog" ? (
        <p role="alert" className="mt-2 text-xs text-coral">
          {issue.error}
        </p>
      ) : null}

      {matches.length > 0 && !showCustomForm ? (
        <button
          type="button"
          onClick={() => setShowCustomForm(true)}
          className="mt-3 text-xs font-semibold text-pine-soft underline underline-offset-4 hover:text-pine"
        >
          Add a food of your own
        </button>
      ) : null}

      {showCustomForm ? (
        <CustomFoodForm
          initialName={query.trim()}
          onCancel={() => setShowCustomForm(false)}
          onCreated={(name) => {
            setShowCustomForm(false);
            // Point the search at the new food so it is easy to pick.
            setQuery(name);
            setBrowsing(true);
            setSelectedId(null);
          }}
        />
      ) : null}
    </section>
  );
}
