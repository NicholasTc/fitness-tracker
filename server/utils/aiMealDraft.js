const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function extractTextFromGemini(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("\n")
    .trim();
}

function stripCodeFences(text) {
  const cleaned = text.trim();
  if (!cleaned.startsWith("```")) return cleaned;
  return cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function normalizeMealLabel(value) {
  const allowed = new Set(["Breakfast", "Lunch", "Dinner", "Snack"]);
  const label = typeof value === "string" ? value.trim() : "";
  return allowed.has(label) ? label : null;
}

export async function generateMealIngredientDraft(text) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = [
    "You are a meal parsing assistant.",
    "Given one meal description, return STRICT JSON only with this exact shape:",
    '{"mealName":"string","mealLabel":"Breakfast|Lunch|Dinner|Snack|null","ingredients":[{"name":"string","grams":number}]}',
    "Rules:",
    "- Do not include calories or macros.",
    "- grams should be realistic positive numbers.",
    "- keep max 8 ingredients.",
    "- If uncertain, still provide best-effort common ingredients.",
    `Meal: ${text}`,
  ].join("\n");

  const url = `${GEMINI_BASE}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 700,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 220)}`);
  }

  const data = await res.json();
  const rawText = extractTextFromGemini(data);
  if (!rawText) {
    throw new Error("Gemini returned empty response");
  }
  const parsed = JSON.parse(stripCodeFences(rawText));
  const draftIngredients = Array.isArray(parsed?.ingredients) ? parsed.ingredients : [];
  const ingredients = draftIngredients
    .map((row) => ({
      name: typeof row?.name === "string" ? row.name.trim() : "",
      grams: clamp(Number(row?.grams) || 100, 1, 2000),
    }))
    .filter((row) => row.name)
    .slice(0, 8);

  if (ingredients.length === 0) {
    throw new Error("Could not parse ingredients from AI response");
  }

  return {
    mealName:
      typeof parsed?.mealName === "string" && parsed.mealName.trim()
        ? parsed.mealName.trim().slice(0, 120)
        : "AI meal draft",
    mealLabel: normalizeMealLabel(parsed?.mealLabel),
    ingredients,
  };
}

export function generateMockMealIngredientDraft(text) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[^\w\s,]/g, " ")
    .trim();
  const parts = normalized
    .split(/,|\band\b|\bwith\b|\+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  const base = parts.length > 0 ? parts : [normalized || "meal"];

  const ingredients = base.map((name) => ({
    name: name.replace(/\s+/g, " ").slice(0, 120),
    grams: 100,
  }));

  return {
    mealName: text.trim().slice(0, 120) || "AI meal draft",
    mealLabel: null,
    ingredients,
  };
}
