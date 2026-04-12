const USDA_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.net/cgi/search.pl";
const PROVIDER_TIMEOUT_MS = 2500;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function clampLimit(rawLimit) {
  const n = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(n)) return 12;
  return Math.min(Math.max(n, 1), 25);
}

function normNum(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

function cacheKey(query, limit) {
  return `${query.trim().toLowerCase()}::${limit}`;
}

function readCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  return cached.value;
}

function writeCache(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function pickUsdaNutrient(foodNutrients, names) {
  if (!Array.isArray(foodNutrients)) return null;
  const hit = foodNutrients.find((n) => {
    const name = String(n?.nutrientName || "").toLowerCase();
    return names.some((target) => name === target || name.includes(target));
  });
  return normNum(hit?.value);
}

function normalizeUsdaFood(food, queryText) {
  const name = String(food?.description || "").trim();
  if (!name) return null;

  const kcal = pickUsdaNutrient(food.foodNutrients, ["energy"]);
  const protein = pickUsdaNutrient(food.foodNutrients, ["protein"]);
  const carbs = pickUsdaNutrient(food.foodNutrients, ["carbohydrate"]);
  const fat = pickUsdaNutrient(food.foodNutrients, ["total lipid", "fat"]);

  const qualityFlags = [];
  if (kcal == null || protein == null || carbs == null || fat == null) {
    qualityFlags.push("missingNutrients");
  }
  if (
    String(food?.dataType || "")
      .toUpperCase()
      .includes("BRANDED")
  ) {
    qualityFlags.push("branded");
  }

  return {
    source: "usda",
    externalId: String(food?.fdcId || ""),
    name,
    brand: food?.brandOwner ? String(food.brandOwner).trim() : null,
    per100g: {
      calories: kcal,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
    },
    servingInfo:
      food?.servingSize && food?.servingSizeUnit
        ? {
            amount: normNum(food.servingSize),
            unit: String(food.servingSizeUnit),
          }
        : null,
    qualityFlags,
    _score: relevanceScore({ name, queryText, qualityFlags }),
  };
}

function normalizeOffProduct(product, queryText) {
  const name = String(product?.product_name || product?.product_name_en || "").trim();
  if (!name) return null;
  const nutriments = product?.nutriments || {};
  const kcal = normNum(
    nutriments["energy-kcal_100g"] ??
      nutriments["energy-kcal"] ??
      nutriments["energy_100g"],
  );
  const protein = normNum(nutriments.proteins_100g);
  const carbs = normNum(nutriments.carbohydrates_100g);
  const fat = normNum(nutriments.fat_100g);
  const qualityFlags = [];
  if (kcal == null || protein == null || carbs == null || fat == null) {
    qualityFlags.push("missingNutrients");
  }
  qualityFlags.push("packaged");

  return {
    source: "openfoodfacts",
    externalId: String(product?.code || ""),
    name,
    brand: product?.brands ? String(product.brands).split(",")[0].trim() : null,
    per100g: {
      calories: kcal,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
    },
    servingInfo: null,
    qualityFlags,
    _score: relevanceScore({ name, queryText, qualityFlags }),
  };
}

function relevanceScore({ name, queryText, qualityFlags }) {
  const n = name.toLowerCase();
  const q = queryText.toLowerCase();
  const startsWith = n.startsWith(q) ? 12 : 0;
  const includes = n.includes(q) ? 6 : 0;
  const qualityPenalty = qualityFlags.includes("missingNutrients") ? -4 : 4;
  return startsWith + includes + qualityPenalty;
}

async function searchUsdaFoods(query, limit) {
  const apiKey = process.env.USDA_API_KEY?.trim();
  if (!apiKey) {
    return {
      provider: "usda",
      ok: false,
      reason: "USDA_API_KEY is not configured",
      items: [],
    };
  }
  const params = new URLSearchParams({
    query,
    pageSize: String(limit),
    api_key: apiKey,
  });
  try {
    const data = await fetchJsonWithTimeout(
      `${USDA_URL}?${params.toString()}`,
      PROVIDER_TIMEOUT_MS,
    );
    const foods = Array.isArray(data?.foods) ? data.foods : [];
    const items = foods
      .map((food) => normalizeUsdaFood(food, query))
      .filter(Boolean)
      .slice(0, limit);
    return { provider: "usda", ok: true, items };
  } catch (err) {
    return {
      provider: "usda",
      ok: false,
      reason: err?.name === "AbortError" ? "Timeout" : err?.message || "Failed",
      items: [],
    };
  }
}

async function searchOpenFoodFacts(query, limit) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(limit),
    fields:
      "code,product_name,product_name_en,brands,nutriments,quantity,serving_size",
  });

  try {
    const data = await fetchJsonWithTimeout(
      `${OPEN_FOOD_FACTS_URL}?${params.toString()}`,
      PROVIDER_TIMEOUT_MS,
    );
    const products = Array.isArray(data?.products) ? data.products : [];
    const items = products
      .map((p) => normalizeOffProduct(p, query))
      .filter(Boolean)
      .slice(0, limit);
    return { provider: "openfoodfacts", ok: true, items };
  } catch (err) {
    return {
      provider: "openfoodfacts",
      ok: false,
      reason: err?.name === "AbortError" ? "Timeout" : err?.message || "Failed",
      items: [],
    };
  }
}

function mergeAndRank(providerResults, limit) {
  const merged = providerResults.flatMap((p) => p.items || []);
  const dedup = new Map();
  for (const item of merged) {
    const key = `${item.source}:${item.externalId || item.name.toLowerCase()}`;
    if (!dedup.has(key) || (dedup.get(key)?._score || 0) < item._score) {
      dedup.set(key, item);
    }
  }
  return Array.from(dedup.values())
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, limit)
    .map(({ _score, ...rest }) => rest);
}

export async function searchNutritionProviders(query, rawLimit) {
  const q = String(query || "").trim();
  const limit = clampLimit(rawLimit);
  const key = cacheKey(q, limit);
  const cached = readCache(key);
  if (cached) {
    return { ...cached, cached: true };
  }

  const providerResults = await Promise.all([
    searchUsdaFoods(q, limit),
    searchOpenFoodFacts(q, limit),
  ]);
  const results = mergeAndRank(providerResults, limit);

  const payload = {
    query: q,
    limit,
    providers: providerResults.map((p) => ({
      provider: p.provider,
      ok: p.ok,
      reason: p.ok ? null : p.reason,
      count: p.items.length,
    })),
    partial: providerResults.some((p) => !p.ok),
    results,
    cached: false,
  };
  writeCache(key, payload);
  return payload;
}
