"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addEntrySchema,
  customFoodSchema,
  deleteEntrySchema,
  firstIssue,
  logAiNutritionItemsSchema,
  setGoalSchema,
  updateEntrySchema,
} from "@/lib/validation";

/**
 * Expected failures (bad input, duplicate name) are returned, not thrown, so the
 * page can render an inline message instead of hitting an error boundary.
 * Unexpected failures (database unreachable) are still allowed to throw.
 */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; field?: string };

function invalid(error: unknown): ActionResult {
  const issue = firstIssue(error as Parameters<typeof firstIssue>[0]);
  return { ok: false, error: issue.error, field: issue.field };
}

export async function addEntry(input: {
  foodId: unknown;
  quantity: unknown;
  date: unknown;
}): Promise<ActionResult> {
  const parsed = addEntrySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const food = await prisma.food.findUnique({
    where: { id: parsed.data.foodId },
  });
  if (!food) {
    return { ok: false, error: "That food no longer exists", field: "foodId" };
  }

  await prisma.logEntry.create({
    data: {
      foodId: parsed.data.foodId,
      quantity: parsed.data.quantity,
      date: parsed.data.date,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function updateEntry(input: {
  id: unknown;
  quantity: unknown;
}): Promise<ActionResult> {
  const parsed = updateEntrySchema.safeParse(input);
  // A rejected edit must leave the entry untouched, so validation runs first.
  if (!parsed.success) return invalid(parsed.error);

  try {
    await prisma.logEntry.update({
      where: { id: parsed.data.id },
      data: { quantity: parsed.data.quantity },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, error: "That entry no longer exists" };
    }
    throw error;
  }

  revalidatePath("/");
  return { ok: true };
}

export async function deleteEntry(input: { id: unknown }): Promise<ActionResult> {
  const parsed = deleteEntrySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await prisma.logEntry.delete({ where: { id: parsed.data.id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // Already gone: the user's intent is satisfied either way.
      revalidatePath("/");
      return { ok: true };
    }
    throw error;
  }

  revalidatePath("/");
  return { ok: true };
}

export async function setGoal(input: {
  dailyCalorieTarget: unknown;
}): Promise<ActionResult> {
  const parsed = setGoalSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  await prisma.userGoal.upsert({
    where: { id: 1 },
    update: { dailyCalorieTarget: parsed.data.dailyCalorieTarget },
    create: { id: 1, dailyCalorieTarget: parsed.data.dailyCalorieTarget },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function logAiNutritionItems(input: {
  items: unknown;
  date: unknown;
}): Promise<ActionResult> {
  const parsed = logAiNutritionItemsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  await prisma.$transaction(async (tx) => {
    // Same case-insensitive matching rule as createFood, evaluated once per
    // transaction so items sharing a name within one confirm resolve to the
    // same food instead of racing each other.
    const existing = await tx.food.findMany({ select: { id: true, name: true } });
    const byFoldedName = new Map(
      existing.map((food) => [food.name.trim().toLocaleLowerCase(), food.id]),
    );

    for (const item of parsed.data.items) {
      const folded = item.name.toLocaleLowerCase();
      let foodId = byFoldedName.get(folded);

      if (foodId === undefined) {
        try {
          const created = await tx.food.create({
            data: {
              name: item.name,
              unit: "serving",
              caloriesPerUnit: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              isCustom: true,
            },
          });
          foodId = created.id;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            // Lost a race to a concurrent confirm creating the same name.
            const winner = await tx.food.findFirst({ where: { name: item.name } });
            if (!winner) throw error;
            foodId = winner.id;
          } else {
            throw error;
          }
        }
        byFoldedName.set(folded, foodId);
      }

      await tx.logEntry.create({
        data: { foodId, quantity: 1, date: parsed.data.date },
      });
    }
  });

  revalidatePath("/");
  return { ok: true };
}

export async function createFood(input: {
  name: unknown;
  unit: unknown;
  caloriesPerUnit: unknown;
  protein: unknown;
  carbs: unknown;
  fat: unknown;
}): Promise<ActionResult> {
  const parsed = customFoodSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  // SQLite's default collation is case-sensitive and Prisma has no
  // `mode: "insensitive"` for this provider, so the duplicate check is done in
  // memory over the (small) catalog. The @unique constraint below is the
  // backstop against two submissions racing each other.
  const folded = parsed.data.name.toLocaleLowerCase();
  const existing = await prisma.food.findMany({ select: { name: true } });
  if (existing.some((food) => food.name.trim().toLocaleLowerCase() === folded)) {
    return {
      ok: false,
      error: "A food with that name already exists",
      field: "name",
    };
  }

  try {
    await prisma.food.create({
      data: {
        name: parsed.data.name,
        unit: parsed.data.unit,
        caloriesPerUnit: parsed.data.caloriesPerUnit,
        protein: parsed.data.protein,
        carbs: parsed.data.carbs,
        fat: parsed.data.fat,
        isCustom: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        error: "A food with that name already exists",
        field: "name",
      };
    }
    throw error;
  }

  revalidatePath("/");
  return { ok: true };
}
