"use client";

import { useEffect, useState, useTransition } from "react";
import { setGoal } from "../actions";

/** The rim of the vessel is this number. Changing it moves the rim. */
export default function GoalSetter({ goal }: { goal: number }) {
  const [value, setValue] = useState(String(goal));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Keep the field honest when the stored goal changes elsewhere.
  useEffect(() => setValue(String(goal)), [goal]);

  function save() {
    startTransition(async () => {
      const result = await setGoal({ dailyCalorieTarget: value });
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <div className="mt-9 border-t-2 border-dashed border-pine/30 pt-5">
      <label htmlFor="goal-input" className="eyebrow">
        Daily goal
      </label>
      <div className="mt-2.5 flex gap-2">
        <input
          id="goal-input"
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? "goal-error" : undefined}
          className="field num flex-1 rounded-full bg-porcelain font-display text-base font-semibold"
        />
        <button
          type="button"
          onClick={save}
          disabled={isPending || value === String(goal)}
          className="btn-solid"
        >
          {isPending ? "Saving" : "Save"}
        </button>
      </div>
      {error ? (
        <p id="goal-error" role="alert" className="mt-2 text-xs text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
