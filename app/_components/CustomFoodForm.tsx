"use client";

import { useRef, useState, useTransition } from "react";
import { createFood } from "../actions";

const UNITS = ["100g", "piece", "slice", "cup", "tbsp"];

const EMPTY = {
  name: "",
  unit: "100g",
  caloriesPerUnit: "",
  protein: "",
  carbs: "",
  fat: "",
};

const FIELDS = ["name", "unit", "caloriesPerUnit", "protein", "carbs", "fat"];

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

export default function CustomFoodForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (name: string) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY, name: initialName });
  const [issue, setIssue] = useState<{ field: string; error: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const [aiDescription, setAiDescription] = useState("");
  const [textPending, setTextPending] = useState(false);
  const [imagePending, setImagePending] = useState(false);
  const [textItems, setTextItems] = useState<AiNutritionItem[] | null>(null);
  const [imageItems, setImageItems] = useState<AiNutritionItem[] | null>(
    null,
  );
  // Guards against a slower, older request landing after a newer one and
  // clobbering fresher form state.
  const textRequestId = useRef(0);
  const imageRequestId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(field: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyAiItem(item: AiNutritionItem) {
    setForm((current) => ({
      ...current,
      name: current.name.trim() === "" ? item.name : current.name,
      caloriesPerUnit: String(item.calories),
      protein: String(item.protein),
      carbs: String(item.carbs),
      fat: String(item.fat),
    }));
  }

  async function runAiTextLookup() {
    const description = aiDescription.trim();
    if (description === "") return;
    const requestId = ++textRequestId.current;
    setTextPending(true);
    setTextItems(null);
    setIssue(null);
    try {
      const response = await fetch("/api/nutrition/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const result = (await response.json()) as AiLookupResponse;
      if (requestId !== textRequestId.current) return;
      if (!result.ok) {
        setIssue({ field: "aiText", error: result.error });
      } else if (result.data.items.length === 1) {
        applyAiItem(result.data.items[0]);
      } else if (result.data.items.length > 1) {
        setTextItems(result.data.items);
      } else {
        setIssue({ field: "aiText", error: "No food recognized" });
      }
    } catch {
      if (requestId !== textRequestId.current) return;
      setIssue({ field: "aiText", error: "AI lookup failed" });
    } finally {
      if (requestId === textRequestId.current) setTextPending(false);
    }
  }

  async function runAiImageLookup(file: File) {
    const requestId = ++imageRequestId.current;
    setImagePending(true);
    setImageItems(null);
    setIssue(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/nutrition/image", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as AiLookupResponse;
      if (requestId !== imageRequestId.current) return;
      if (!result.ok) {
        setIssue({ field: "aiImage", error: result.error });
      } else if (result.data.items.length === 1) {
        applyAiItem(result.data.items[0]);
      } else if (result.data.items.length > 1) {
        setImageItems(result.data.items);
      } else {
        setIssue({ field: "aiImage", error: "No food recognized" });
      }
    } catch {
      if (requestId !== imageRequestId.current) return;
      setIssue({ field: "aiImage", error: "AI lookup failed" });
    } finally {
      if (requestId === imageRequestId.current) setImagePending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function submit() {
    startTransition(async () => {
      const result = await createFood(form);
      if (result.ok) {
        setIssue(null);
        onCreated(form.name.trim());
        setForm({ ...EMPTY });
      } else {
        setIssue({ field: result.field ?? "form", error: result.error });
      }
    });
  }

  const errorFor = (field: string) =>
    issue && issue.field === field ? issue.error : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="card mt-4"
    >
      <header className="border-b-2 border-pine bg-honey/40 px-4 py-3">
        <h3 className="font-display text-sm font-bold">A food of your own</h3>
        <p className="mt-0.5 text-xs text-pine-soft">
          Enter the values for one unit, the way they appear on the package.
        </p>
      </header>

      <div className="flex flex-wrap items-start gap-3 border-b border-pine/20 px-4 py-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="Describe it — grilled chicken with rice…"
            value={aiDescription}
            onChange={(event) => setAiDescription(event.target.value)}
            className="field"
          />
          <button
            type="button"
            onClick={runAiTextLookup}
            disabled={textPending || aiDescription.trim() === ""}
            className="btn-quiet whitespace-nowrap"
          >
            {textPending ? "Thinking…" : "Describe it"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            disabled={imagePending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) runAiImageLookup(file);
            }}
            className="text-xs"
          />
          {imagePending ? (
            <span className="text-xs text-pine-soft">Analyzing…</span>
          ) : null}
        </div>
      </div>

      {errorFor("aiText") ? (
        <p role="alert" className="px-4 pt-2 text-xs text-coral">
          {errorFor("aiText")}
        </p>
      ) : null}
      {errorFor("aiImage") ? (
        <p role="alert" className="px-4 pt-2 text-xs text-coral">
          {errorFor("aiImage")}
        </p>
      ) : null}

      {textItems ? (
        <AiItemPicker
          items={textItems}
          onPick={(item) => {
            applyAiItem(item);
            setTextItems(null);
          }}
        />
      ) : null}
      {imageItems ? (
        <AiItemPicker
          items={imageItems}
          onPick={(item) => {
            applyAiItem(item);
            setImageItems(null);
          }}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
        <Field label="Name" error={errorFor("name")} className="col-span-2">
          <input
            type="text"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            className="field"
          />
        </Field>

        <Field label="Unit" error={errorFor("unit")}>
          <select
            value={form.unit}
            onChange={(event) => update("unit", event.target.value)}
            className="field font-display font-semibold"
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Calories" error={errorFor("caloriesPerUnit")}>
          <NumberInput
            value={form.caloriesPerUnit}
            onChange={(value) => update("caloriesPerUnit", value)}
          />
        </Field>
        <Field label="Protein (g)" error={errorFor("protein")}>
          <NumberInput
            value={form.protein}
            onChange={(value) => update("protein", value)}
          />
        </Field>
        <Field label="Carbs (g)" error={errorFor("carbs")}>
          <NumberInput
            value={form.carbs}
            onChange={(value) => update("carbs", value)}
          />
        </Field>
        <Field label="Fat (g)" error={errorFor("fat")}>
          <NumberInput
            value={form.fat}
            onChange={(value) => update("fat", value)}
          />
        </Field>
      </div>

      {issue && !FIELDS.includes(issue.field) && issue.field !== "aiText" && issue.field !== "aiImage" ? (
        <p role="alert" className="px-4 pb-2 text-xs text-coral">
          {issue.error}
        </p>
      ) : null}

      <div className="flex gap-2 border-t border-pine/20 px-4 py-3">
        <button type="submit" disabled={isPending} className="btn-solid">
          {isPending ? "Saving" : "Save food"}
        </button>
        <button type="button" onClick={onCancel} className="btn-quiet">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AiItemPicker({
  items,
  onPick,
}: {
  items: AiNutritionItem[];
  onPick: (item: AiNutritionItem) => void;
}) {
  return (
    <div className="border-b border-pine/20 px-4 py-3">
      <p className="text-xs text-pine-soft">Which one?</p>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`}>
            <button
              type="button"
              onClick={() => onPick(item)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border-[1.5px] border-pine/30 px-4 py-2.5 text-left text-sm font-semibold hover:bg-honey/25"
            >
              <span className="truncate">{item.name}</span>
              <span className="num shrink-0 text-xs font-normal text-pine-soft">
                {Math.round(item.calories)} kcal
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block">
        <span className="eyebrow">{label}</span>
        <span className="mt-1.5 block">{children}</span>
      </label>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="number"
      step="any"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="field num font-display font-semibold"
    />
  );
}
