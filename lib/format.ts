// The ONLY module that rounds. Everything upstream carries full precision, so a
// day total is the rounded sum of unrounded entries rather than the sum of
// rounded ones.

/** Calories as a whole number, e.g. 1450. */
export function formatCalories(value: number): string {
  return Math.round(value).toLocaleString();
}

/** Macro grams to at most one decimal place: 32 -> "32", 31.55 -> "31.6". */
export function formatGrams(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Quantity with its unit, e.g. "1.5 × 100g". Trailing zeros are dropped. */
export function formatQuantity(quantity: number, unit: string): string {
  const rounded = Math.round(quantity * 100) / 100;
  return `${rounded} × ${unit}`;
}
