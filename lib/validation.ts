import { z } from "zod";
import { isValidDateString } from "./date";

// Every message names the field it belongs to, so the page can render it inline.

/** Coerce a form value to a number, distinguishing "not a number" from "invalid". */
function numberField(label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return Number.NaN;
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? Number.NaN : parsed;
      }
      return value;
    },
    z.number({ invalid_type_error: `${label} must be a number` }).refine(
      (value) => Number.isFinite(value),
      { message: `${label} must be a number` },
    ),
  );
}

export const quantitySchema = numberField("Quantity").refine(
  (value) => value > 0,
  { message: "Quantity must be greater than zero" },
);

export const goalSchema = numberField("Goal")
  .refine((value) => Number.isInteger(value), {
    message: "Goal must be a whole number",
  })
  .refine((value) => value > 0, {
    message: "Goal must be greater than zero",
  });

export const dateSchema = z
  .string()
  .refine((value) => isValidDateString(value), { message: "Invalid date" });

const nonNegative = (label: string) =>
  numberField(label).refine((value) => value >= 0, {
    message: `${label} cannot be negative`,
  });

export const foodNameSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: "Name is required" });

export const foodUnitSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: "Unit is required" });

export const customFoodSchema = z.object({
  name: foodNameSchema,
  unit: foodUnitSchema,
  caloriesPerUnit: nonNegative("Calories"),
  protein: nonNegative("Protein"),
  carbs: nonNegative("Carbs"),
  fat: nonNegative("Fat"),
});

export const addEntrySchema = z.object({
  foodId: numberField("Food").refine((value) => Number.isInteger(value) && value > 0, {
    message: "Select a food",
  }),
  quantity: quantitySchema,
  date: dateSchema,
});

export const updateEntrySchema = z.object({
  id: numberField("Entry").refine((value) => Number.isInteger(value) && value > 0, {
    message: "Invalid entry",
  }),
  quantity: quantitySchema,
});

export const deleteEntrySchema = z.object({
  id: numberField("Entry").refine((value) => Number.isInteger(value) && value > 0, {
    message: "Invalid entry",
  }),
});

export const setGoalSchema = z.object({
  dailyCalorieTarget: goalSchema,
});

const aiNutritionItemSchema = z.object({
  name: foodNameSchema,
  calories: nonNegative("Calories"),
  protein: nonNegative("Protein"),
  carbs: nonNegative("Carbs"),
  fat: nonNegative("Fat"),
});

export const logAiNutritionItemsSchema = z.object({
  items: z.array(aiNutritionItemSchema).min(1, "Pick at least one item"),
  date: dateSchema,
});

/** First Zod issue as a { field, error } pair for inline rendering. */
export function firstIssue(error: z.ZodError): { field: string; error: string } {
  const issue = error.issues[0];
  return {
    field: issue?.path.join(".") || "form",
    error: issue?.message ?? "Invalid input",
  };
}
