// All arithmetic here runs on unrounded values. Rounding happens only at the
// display boundary (lib/format.ts) so a day total equals the rounded sum of the
// entries, not the sum of the rounded entries.

export type NutritionPerUnit = {
  caloriesPerUnit: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type EntryLike = {
  quantity: number;
  food: NutritionPerUnit;
};

export const ZERO_NUTRITION: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

/** What one log entry contributes: the food's per-unit values times quantity. */
export function entryNutrition(entry: EntryLike): Nutrition {
  return {
    calories: entry.food.caloriesPerUnit * entry.quantity,
    protein: entry.food.protein * entry.quantity,
    carbs: entry.food.carbs * entry.quantity,
    fat: entry.food.fat * entry.quantity,
  };
}

/** Sum of every entry's contribution for one day. */
export function totalNutrition(entries: EntryLike[]): Nutrition {
  return entries.reduce<Nutrition>((total, entry) => {
    const contribution = entryNutrition(entry);
    return {
      calories: total.calories + contribution.calories,
      protein: total.protein + contribution.protein,
      carbs: total.carbs + contribution.carbs,
      fat: total.fat + contribution.fat,
    };
  }, ZERO_NUTRITION);
}

export type GoalProgress = {
  consumed: number;
  goal: number;
  /** Calories left before the goal; 0 once the goal is met or exceeded. */
  remaining: number;
  /** Calories past the goal; 0 while still under it. */
  over: number;
  exceeded: boolean;
  /** 0-100. Capped so the bar cannot overflow its container. */
  percent: number;
};

export function goalProgress(consumed: number, goal: number): GoalProgress {
  const difference = goal - consumed;
  const raw = goal > 0 ? (consumed / goal) * 100 : 0;
  return {
    consumed,
    goal,
    remaining: Math.max(0, difference),
    over: Math.max(0, -difference),
    // Exactly meeting the goal is not "exceeded".
    exceeded: consumed > goal,
    percent: Math.min(100, Math.max(0, raw)),
  };
}
