"use client";

import { useState, useTransition } from "react";
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

  function update(field: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
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

      {issue && !FIELDS.includes(issue.field) ? (
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
