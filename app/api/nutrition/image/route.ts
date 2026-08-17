import { NextResponse } from "next/server";
import {
  lookupNutritionFromImage,
  MAX_IMAGE_BYTES,
  SUPPORTED_IMAGE_TYPES,
} from "@/lib/aiNutrition";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Image file is required" }, { status: 400 });
  }

  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    return NextResponse.json(
      { ok: false, error: `Unsupported file type. Accepted types: ${SUPPORTED_IMAGE_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Image must be ${MAX_IMAGE_BYTES / (1024 * 1024)}MB or smaller` },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await lookupNutritionFromImage(bytes, file.type);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  if (result.data.items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No food recognized in the image" },
      { status: 200 },
    );
  }
  return NextResponse.json({ ok: true, data: result.data }, { status: 200 });
}
