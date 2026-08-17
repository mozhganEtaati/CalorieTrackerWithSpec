import { NextResponse } from "next/server";
import { nutritionDescriptionSchema, lookupNutritionFromText } from "@/lib/aiNutrition";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const description = (body as { description?: unknown })?.description;
  const parsed = nutritionDescriptionSchema.safeParse(description);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid description" },
      { status: 400 },
    );
  }

  const result = await lookupNutritionFromText(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, data: result.data }, { status: 200 });
}
