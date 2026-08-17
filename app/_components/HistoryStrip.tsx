"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCalories } from "@/lib/format";
import { formatDayShort } from "@/lib/date";
import { goalProgress } from "@/lib/nutrition";
import type { DayTotal } from "./types";

/**
 * Seven days as seven small measures — the same object as the day's vessel,
 * scaled down, so a week needs no second visual language to read. Days with
 * nothing logged stay in the window at zero rather than dropping out.
 */
export default function HistoryStrip({
  days,
  goal,
  selectedDate,
}: {
  days: DayTotal[];
  goal: number;
  selectedDate: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <section aria-label="The last seven days">
      <h2 className="eyebrow mb-3">This week</h2>

      <ol className="flex gap-2">
        {days.map((day) => {
          const progress = goalProgress(day.calories, goal);
          const isSelected = day.date === selectedDate;

          return (
            <li key={day.date} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(() => router.push(`/?date=${day.date}`))
                }
                aria-current={isSelected ? "date" : undefined}
                aria-label={`${formatDayShort(day.date)}, ${formatCalories(
                  day.calories,
                )} kilocalories`}
                title={`${formatDayShort(day.date)} · ${formatCalories(
                  day.calories,
                )} kcal`}
                className="weekday w-full text-center disabled:opacity-60"
              >
                <span className="dayjug">
                  <span
                    style={{ height: `${progress.percent}%` }}
                    className={`dayjug__fill ${
                      progress.exceeded ? "dayjug__fill--over" : ""
                    }`}
                  />
                </span>
                <span
                  className={`mt-2 block truncate text-[11px] ${
                    isSelected
                      ? "font-bold text-pine"
                      : "text-pine-soft"
                  }`}
                >
                  {formatDayShort(day.date)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
