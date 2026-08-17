import { prisma } from "@/lib/db";
import { lastNDays, parseDateParam } from "@/lib/date";
import { entryNutrition, totalNutrition } from "@/lib/nutrition";
import AddEntryForm from "./_components/AddEntryForm";
import DayControls from "./_components/DayControls";
import DayVessel from "./_components/DayVessel";
import EntryList from "./_components/EntryList";
import GoalSetter from "./_components/GoalSetter";
import HistoryStrip from "./_components/HistoryStrip";
import TodayRedirect from "./_components/TodayRedirect";
import type { DayTotal, EntryView, FoodOption } from "./_components/types";

// Always read the database on request: the page is a live view of local data.
export const dynamic = "force-dynamic";

const HISTORY_DAYS = 7;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // "" is a sentinel for "no usable day in the URL". The server does not invent
  // one, because it cannot know the visitor's local calendar day — a missing or
  // malformed date is handed to the client, which puts its own today in the URL.
  const date = parseDateParam(params.date, "");
  if (!date) return <TodayRedirect />;

  const window = lastNDays(date, HISTORY_DAYS);

  const [foods, entries, goal, windowEntries] = await Promise.all([
    prisma.food.findMany({ orderBy: { name: "asc" } }),
    prisma.logEntry.findMany({
      where: { date },
      include: { food: true },
      // Stable across renders: creation order, with id breaking ties.
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    // Creates the singleton on first run rather than guessing a goal per render.
    prisma.userGoal.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, dailyCalorieTarget: 2000 },
    }),
    // One query for the whole 7-day window, not seven.
    prisma.logEntry.findMany({
      where: { date: { in: window } },
      include: { food: true },
    }),
  ]);

  const foodOptions: FoodOption[] = foods.map(toFoodOption);
  const entryViews: EntryView[] = entries.map((entry) => ({
    id: entry.id,
    quantity: entry.quantity,
    food: toFoodOption(entry.food),
  }));

  const totals = totalNutrition(entryViews);

  // Days with no entries stay in the window at zero rather than dropping out.
  const caloriesByDay = new Map<string, number>(window.map((day) => [day, 0]));
  for (const entry of windowEntries) {
    const contribution = entryNutrition({
      quantity: entry.quantity,
      food: entry.food,
    }).calories;
    caloriesByDay.set(
      entry.date,
      (caloriesByDay.get(entry.date) ?? 0) + contribution,
    );
  }
  const days: DayTotal[] = window.map((day) => ({
    date: day,
    calories: caloriesByDay.get(day) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-lg px-5 pb-24 pt-6 lg:max-w-5xl lg:px-10 lg:pt-10">
      <header className="mb-9 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="font-display text-sm font-bold uppercase tracking-eyebrow">
          Calorie Tracker
        </h1>
        <p className="text-xs text-pine-soft">
          One page, one person, nothing leaves this machine.
        </p>
      </header>

      <div className="grid gap-14 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-20">
        {/* The vessel keeps its place while the working column scrolls, so the
            level is in view at the moment something is logged. */}
        <div className="lg:sticky lg:top-10 lg:self-start">
          <DayControls date={date} />
          <DayVessel totals={totals} goal={goal.dailyCalorieTarget} />
          <GoalSetter goal={goal.dailyCalorieTarget} />
        </div>

        <main className="flex flex-col gap-11">
          <AddEntryForm foods={foodOptions} date={date} />
          <EntryList entries={entryViews} />
          <HistoryStrip
            days={days}
            goal={goal.dailyCalorieTarget}
            selectedDate={date}
          />
        </main>
      </div>
    </div>
  );
}

function toFoodOption(food: {
  id: number;
  name: string;
  unit: string;
  caloriesPerUnit: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom: boolean;
}): FoodOption {
  return {
    id: food.id,
    name: food.name,
    unit: food.unit,
    caloriesPerUnit: food.caloriesPerUnit,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    isCustom: food.isCustom,
  };
}
