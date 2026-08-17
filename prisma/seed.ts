import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedFood = {
  name: string;
  unit: string;
  caloriesPerUnit: number;
  protein: number;
  carbs: number;
  fat: number;
};

// Nutrition is stated per one `unit`. Values are rounded typical figures for a
// demo, not a clinical reference.
const FOODS: SeedFood[] = [
  // Protein
  { name: "Chicken breast", unit: "100g", caloriesPerUnit: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Salmon", unit: "100g", caloriesPerUnit: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Ground beef (85% lean)", unit: "100g", caloriesPerUnit: 250, protein: 26, carbs: 0, fat: 15 },
  { name: "Egg", unit: "piece", caloriesPerUnit: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { name: "Tofu (firm)", unit: "100g", caloriesPerUnit: 144, protein: 15.8, carbs: 3.9, fat: 8.7 },
  { name: "Greek yogurt (plain, 2%)", unit: "100g", caloriesPerUnit: 73, protein: 10, carbs: 3.9, fat: 1.9 },
  { name: "Canned tuna (in water)", unit: "100g", caloriesPerUnit: 116, protein: 26, carbs: 0, fat: 0.8 },
  { name: "Shrimp", unit: "100g", caloriesPerUnit: 99, protein: 24, carbs: 0.2, fat: 0.3 },

  // Grains and starch
  { name: "White rice (cooked)", unit: "100g", caloriesPerUnit: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Brown rice (cooked)", unit: "100g", caloriesPerUnit: 123, protein: 2.7, carbs: 26, fat: 1 },
  { name: "Rolled oats (dry)", unit: "100g", caloriesPerUnit: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { name: "Whole wheat bread", unit: "slice", caloriesPerUnit: 82, protein: 4, carbs: 14, fat: 1.1 },
  { name: "Pasta (cooked)", unit: "100g", caloriesPerUnit: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { name: "Potato (boiled)", unit: "100g", caloriesPerUnit: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { name: "Sweet potato (baked)", unit: "100g", caloriesPerUnit: 90, protein: 2, carbs: 21, fat: 0.2 },

  // Fruit and vegetables
  { name: "Banana", unit: "piece", caloriesPerUnit: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Apple", unit: "piece", caloriesPerUnit: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: "Broccoli", unit: "100g", caloriesPerUnit: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: "Spinach", unit: "100g", caloriesPerUnit: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: "Avocado", unit: "piece", caloriesPerUnit: 240, protein: 3, carbs: 13, fat: 22 },
  { name: "Blueberries", unit: "100g", caloriesPerUnit: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  { name: "Carrot", unit: "100g", caloriesPerUnit: 41, protein: 0.9, carbs: 10, fat: 0.2 },

  // Dairy and fats
  { name: "Whole milk", unit: "cup", caloriesPerUnit: 149, protein: 7.7, carbs: 12, fat: 8 },
  { name: "Cheddar cheese", unit: "100g", caloriesPerUnit: 403, protein: 25, carbs: 1.3, fat: 33 },
  { name: "Butter", unit: "tbsp", caloriesPerUnit: 102, protein: 0.1, carbs: 0, fat: 11.5 },
  { name: "Olive oil", unit: "tbsp", caloriesPerUnit: 119, protein: 0, carbs: 0, fat: 13.5 },
  { name: "Peanut butter", unit: "tbsp", caloriesPerUnit: 94, protein: 4, carbs: 3.1, fat: 8 },

  // Other
  { name: "Almonds", unit: "100g", caloriesPerUnit: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Dark chocolate (70%)", unit: "100g", caloriesPerUnit: 598, protein: 7.8, carbs: 46, fat: 43 },
];

async function main() {
  // Upsert by name so re-running is idempotent. This only ever touches the foods
  // listed above: user-created foods and every log entry are left untouched, and
  // nothing is deleted.
  for (const food of FOODS) {
    await prisma.food.upsert({
      where: { name: food.name },
      update: {
        unit: food.unit,
        caloriesPerUnit: food.caloriesPerUnit,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        isCustom: false,
      },
      create: { ...food, isCustom: false },
    });
  }

  // The goal is a singleton pinned to id 1. Create it if missing, but never
  // overwrite a target the user has already chosen.
  await prisma.userGoal.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, dailyCalorieTarget: 2000 },
  });

  const total = await prisma.food.count();
  console.log(`Seeded ${FOODS.length} reference foods. Catalog now holds ${total} foods.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
