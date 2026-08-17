"use client";

import { useEffect, useState } from "react";
import { formatCalories, formatGrams } from "@/lib/format";
import { goalProgress, type Nutrition } from "@/lib/nutrition";

/**
 * The signature of this interface: the day as a vessel filling toward a rim.
 * The question it answers is not "what did I consume" but "how much room is
 * left", which is the question a person actually has at four in the afternoon.
 */

// A real amount should never render as an invisible sliver. Below this the
// fill is floored, so one apple still reads as something in the vessel.
const MIN_VISIBLE_FILL = 4;

export default function DayVessel({
  totals,
  goal,
}: {
  totals: Nutrition;
  goal: number;
}) {
  const progress = goalProgress(totals.calories, goal);
  const empty = totals.calories === 0;
  const target = empty ? 0 : Math.max(progress.percent, MIN_VISIBLE_FILL);

  // The level rises rather than appearing — on first paint, and again whenever
  // the day's total changes. One orchestrated moment, and the vessel is never
  // completely still on arrival.
  // A timer rather than requestAnimationFrame: rAF never fires in a background
  // tab, which left the vessel stuck empty until the tab was looked at.
  const [level, setLevel] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setLevel(target), 30);
    return () => clearTimeout(timer);
  }, [target]);

  // How far past the goal the day went, as the spread of the pool it makes.
  // In the jug's own pixel units: a hair over the goal puddles, double the goal
  // floods. Beyond that the number does the talking.
  const overRatio = goal > 0 ? Math.min(1, progress.over / goal) : 1;
  const poolRadius = 16 + overRatio * 40;

  return (
    <section aria-label="The day against your goal">
      <div className="flex justify-center">
        <div
          className="jug"
          data-over={progress.exceeded}
          style={{ "--fill": `${level}%` } as React.CSSProperties}
          role="progressbar"
          aria-valuenow={Math.round(progress.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${formatCalories(progress.consumed)} of ${formatCalories(
            progress.goal,
          )} kilocalories`}
        >
          {/* The goal is named at the rim, on the left, leaving the right wall
              clear for an overflow to run down. */}
          <span className="absolute right-[calc(100%+0.85rem)] top-[-0.75rem] text-right">
            <span className="eyebrow block leading-none text-pine">goal</span>
            <span className="num mt-1 block font-display text-sm font-bold leading-none">
              {formatCalories(progress.goal)}
            </span>
          </span>

          <div className="jug__body">
            <span aria-hidden className="tick tick--25" />
            <span aria-hidden className="tick tick--50" />
            <span aria-hidden className="tick tick--75" />
            {empty ? (
              <span aria-hidden className="jug__empty">
                empty
              </span>
            ) : null}
            <div className="jug__fill" />
          </div>

          {progress.exceeded ? (
            /* Coordinates are the jug's own pixel box (9rem × 13.5rem), so the
               path lands on the rim and the wall exactly. */
            <svg
              aria-hidden
              className="pour"
              viewBox="0 0 144 216"
              fill="none"
            >
              <path
                className="pour__run"
                d="M86,-1 L136,-1 C148,-1 152,5 152,16 L152,204
                   C152,212 148,216 145,216 C141,216 138,212 138,204
                   L138,16 C138,9 133,7 126,7 L86,7 Z"
              />
              <ellipse
                className="pour__pool"
                cx="145"
                cy="219"
                rx={poolRadius}
                ry="4.5"
              />
            </svg>
          ) : null}
        </div>
      </div>

      <div className="mt-9 text-center">
        <p className="flex items-baseline justify-center gap-2">
          <span
            className={`num display-tight font-display text-[3.5rem] leading-none ${
              progress.exceeded ? "text-coral" : "text-pine"
            }`}
          >
            {formatCalories(
              progress.exceeded ? progress.over : progress.remaining,
            )}
          </span>
          <span className="text-lg font-medium">
            {progress.exceeded ? "over" : "left"}
          </span>
        </p>
        <p className="num mt-2 text-sm text-pine-soft">
          {empty
            ? "nothing logged yet"
            : `${formatCalories(progress.consumed)} of ${formatCalories(
                progress.goal,
              )} eaten`}
        </p>
      </div>

      <p className="num mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[0.8125rem] text-pine-soft">
        <span>
          <b className="font-display font-bold text-pine">
            {formatGrams(totals.protein)}
          </b>{" "}
          protein
        </span>
        <span>
          <b className="font-display font-bold text-pine">
            {formatGrams(totals.carbs)}
          </b>{" "}
          carbs
        </span>
        <span>
          <b className="font-display font-bold text-pine">
            {formatGrams(totals.fat)}
          </b>{" "}
          fat
        </span>
      </p>
    </section>
  );
}
