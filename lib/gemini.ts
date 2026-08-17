import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

let client: GoogleGenAI | null = null;

/** Lazily constructs the Gemini client so a missing key surfaces as a typed error, not a module-load crash. */
export function getGeminiClient(): { ok: true; client: GoogleGenAI } | { ok: false; error: string } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI lookup is not configured" };
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return { ok: true, client };
}
