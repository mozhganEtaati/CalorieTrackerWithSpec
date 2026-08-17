"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, formatDateLabel, todayLocal } from "@/lib/date";

/**
 * Selecting a day changes `?date=` on the same route. This is a query string,
 * not a second page: the app has exactly one route.
 */
export default function DayControls({ date }: { date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Resolved after hydration: the server has no local clock to render from.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayLocal()), []);

  function goTo(next: string) {
    if (today !== null && next > today) return;
    startTransition(() => router.push(`/?date=${next}`));
  }

  const isToday = today !== null && date === today;
  const atLatest = today === null || isToday;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(addDays(date, -1))}
          disabled={isPending}
          aria-label="Previous day"
          className="pill"
        >
          ←
        </button>

        <div className="min-w-0 text-center">
          <p className="display-wide truncate font-display text-[1.0625rem] font-semibold">
            {formatDateLabel(date)}
          </p>
          {/* Reserved height, so the day name does not jump when it is today. */}
          <p className="h-4 text-xs text-pine-soft">{isToday ? "today" : ""}</p>
        </div>

        <button
          type="button"
          onClick={() => goTo(addDays(date, 1))}
          disabled={isPending || atLatest}
          aria-label="Next day"
          className="pill"
        >
          →
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <input
          type="date"
          aria-label="Jump to a day"
          value={date}
          max={today ?? undefined}
          onChange={(event) => {
            const next = event.target.value;
            // Empty means the field was cleared; keep the current day.
            if (next) goTo(next);
          }}
          className="num rounded-full border-[1.5px] border-pine/30 bg-porcelain px-3 py-1 text-xs text-pine focus:border-pine focus:outline-none"
        />
        <button
          type="button"
          onClick={() => today && goTo(today)}
          disabled={atLatest || isPending}
          className="chip"
        >
          Today
        </button>
      </div>
    </div>
  );
}
