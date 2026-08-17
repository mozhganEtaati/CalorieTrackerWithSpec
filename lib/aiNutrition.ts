import { z } from "zod";
import { createPartFromBase64, Type } from "@google/genai";
import { getGeminiClient, GEMINI_MODEL } from "./gemini";

export const nutritionDescriptionSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: "Description is required" })
  .refine((value) => value.length <= 500, {
    message: "Description must be 500 characters or fewer",
  });

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const nutritionItemSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

export const nutritionResultSchema = z.object({
  items: z.array(nutritionItemSchema),
});

export type NutritionItem = z.infer<typeof nutritionItemSchema>;

export type NutritionData = {
  items: NutritionItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

export type NutritionLookupResult =
  | { ok: true; data: NutritionData }
  | { ok: false; error: string };

const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
        },
        required: ["name", "calories", "protein", "carbs", "fat"],
      },
    },
  },
  required: ["items"],
};

const SYSTEM_PROMPT =
  "You are a nutrition estimation assistant. Identify each distinct food item and estimate its " +
  "calories (kcal) and macros in grams (protein, carbs, fat) for the portion described or shown. " +
  "If nothing edible is identifiable, return an empty items array. Respond only with JSON matching " +
  "the provided schema.";

function toNutritionData(items: NutritionItem[]): NutritionData {
  return {
    items,
    totalCalories: items.reduce((sum, item) => sum + item.calories, 0),
    totalProtein: items.reduce((sum, item) => sum + item.protein, 0),
    totalCarbs: items.reduce((sum, item) => sum + item.carbs, 0),
    totalFat: items.reduce((sum, item) => sum + item.fat, 0),
  };
}

function parseGeminiText(text: string | undefined): NutritionLookupResult {
  if (!text) {
    return { ok: false, error: "AI lookup returned no data" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "AI lookup returned an unreadable response" };
  }
  const result = nutritionResultSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: "AI lookup returned an unexpected response shape" };
  }
  return { ok: true, data: toNutritionData(result.data.items) };
}

export async function lookupNutritionFromText(description: string): Promise<NutritionLookupResult> {
  const clientResult = getGeminiClient();
  if (!clientResult.ok) return clientResult;

  try {
    const response = await clientResult.client.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${SYSTEM_PROMPT}\n\nMeal description: ${description}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema,
      },
    });
    return parseGeminiText(response.text);
  } catch (err) {
    console.error("Gemini text lookup failed:", err);
    return { ok: false, error: "AI lookup failed" };
  }
}

export async function lookupNutritionFromImage(
  imageBytes: Buffer,
  mimeType: string,
): Promise<NutritionLookupResult> {
  const clientResult = getGeminiClient();
  if (!clientResult.ok) return clientResult;

  try {
    const imagePart = createPartFromBase64(imageBytes.toString("base64"), mimeType);
    const response = await clientResult.client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [SYSTEM_PROMPT, imagePart],
      config: {
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema,
      },
    });
    return parseGeminiText(response.text);
  } catch (err) {
    console.error("Gemini image lookup failed:", err);
    return { ok: false, error: "AI lookup failed" };
  }
}
