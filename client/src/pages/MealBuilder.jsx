import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, jsonAuthHeaders, parseJsonSafe } from "../lib/api.js";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function emptyIngredient() {
  return {
    name: "",
    grams: "100",
    caloriesPer100g: "",
    proteinPer100g: "",
    carbsPer100g: "",
    fatPer100g: "",
    source: "manual",
    externalId: "",
  };
}

export default function MealBuilder() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [day, setDay] = useState(todayYmd);
  const [mealName, setMealName] = useState("");
  const [note, setNote] = useState("");
  const [ingredients, setIngredients] = useState([emptyIngredient()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const totals = useMemo(() => {
    const sum = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    for (const one of ingredients) {
      const grams = Number(one.grams);
      if (!Number.isFinite(grams) || grams <= 0) continue;
      const factor = grams / 100;
      const c = Number(one.caloriesPer100g);
      const p = Number(one.proteinPer100g);
      const cb = Number(one.carbsPer100g);
      const f = Number(one.fatPer100g);
      if (Number.isFinite(c)) sum.calories += c * factor;
      if (Number.isFinite(p)) sum.proteinG += p * factor;
      if (Number.isFinite(cb)) sum.carbsG += cb * factor;
      if (Number.isFinite(f)) sum.fatG += f * factor;
    }
    return {
      calories: Math.round(sum.calories * 10) / 10,
      proteinG: Math.round(sum.proteinG * 10) / 10,
      carbsG: Math.round(sum.carbsG * 10) / 10,
      fatG: Math.round(sum.fatG * 10) / 10,
    };
  }, [ingredients]);

  function updateIngredient(idx, field, value) {
    setIngredients((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  }

  function removeIngredient(idx) {
    setIngredients((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function appendFromSearch(item) {
    setIngredients((prev) => [
      ...prev,
      {
        name: item.name || "",
        grams: "100",
        caloriesPer100g:
          item?.per100g?.calories == null ? "" : String(item.per100g.calories),
        proteinPer100g:
          item?.per100g?.proteinG == null ? "" : String(item.per100g.proteinG),
        carbsPer100g:
          item?.per100g?.carbsG == null ? "" : String(item.per100g.carbsG),
        fatPer100g: item?.per100g?.fatG == null ? "" : String(item.per100g.fatG),
        source: item.source || "manual",
        externalId: item.externalId || "",
      },
    ]);
  }

  async function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!token || q.length < 2) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const qs = new URLSearchParams({ q, limit: "8" });
      const res = await fetch(`${API_BASE}/api/nutrition/search?${qs}`, {
        headers: bearerAuth(token),
      });
      const data = await parseJsonSafe(res);
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
      }
      setSearchResults(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      setSearchResults([]);
      setSearchError(err.message || String(err));
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!token) return;
    const normalizedMealName = mealName.trim();
    if (!normalizedMealName) {
      setError("Meal name is required");
      return;
    }
    if (!Array.isArray(ingredients) || ingredients.length < 1) {
      setError("Add at least one ingredient");
      return;
    }
    const payloadIngredients = [];
    for (const one of ingredients) {
      const name = one.name.trim();
      const grams = Number(one.grams);
      const caloriesPer100g = Number(one.caloriesPer100g);
      if (!name) {
        setError("Each ingredient needs a name");
        return;
      }
      if (!Number.isFinite(grams) || grams < 1) {
        setError("Each ingredient needs grams >= 1");
        return;
      }
      if (!Number.isFinite(caloriesPer100g) || caloriesPer100g < 0) {
        setError("Each ingredient needs valid calories per 100g");
        return;
      }
      payloadIngredients.push({
        name,
        grams,
        caloriesPer100g,
        proteinPer100g: one.proteinPer100g === "" ? 0 : Number(one.proteinPer100g),
        carbsPer100g: one.carbsPer100g === "" ? 0 : Number(one.carbsPer100g),
        fatPer100g: one.fatPer100g === "" ? 0 : Number(one.fatPer100g),
        source: one.source || "manual",
        externalId: one.externalId || undefined,
      });
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/meal-logs`, {
        method: "POST",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify({
          date: day,
          mealName: normalizedMealName,
          note: note.trim() || undefined,
          ingredients: payloadIngredients,
        }),
      });
      const data = await parseJsonSafe(res);
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
      }
      navigate("/nutrition", { replace: true });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ff-page">
      <p className="ff-meta-back">
        <Link to="/nutrition">← Back to Nutrition</Link>
      </p>
      <h1 className="ff-page-title">Log meal (ingredients)</h1>
      <p className="ff-meta">
        Build one meal from multiple ingredients. We compute meal totals from grams +
        per-100g values.
      </p>

      {error && (
        <p className="ff-err" role="alert">
          {error}
        </p>
      )}

      <section className="ff-card">
        <h2 className="ff-section-title">Search ingredients</h2>
        <form className="ff-nutrition-search-form" onSubmit={handleSearch}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredient e.g. chicken breast"
            minLength={2}
          />
          <button
            type="submit"
            className="ff-btn-secondary ff-nutrition-search-btn"
            disabled={searchLoading || searchQuery.trim().length < 2}
          >
            {searchLoading ? "Searching…" : "Search"}
          </button>
        </form>
        {searchError && <p className="ff-err">{searchError}</p>}
        {searchResults.length > 0 && (
          <ul className="ff-nutrition-results">
            {searchResults.map((row) => (
              <li
                key={`${row.source}:${row.externalId || row.name}`}
                className="ff-nutrition-result-card"
              >
                <div>
                  <p className="ff-nutrition-result-title">
                    {row.name}
                    {row.brand ? ` (${row.brand})` : ""}
                  </p>
                  <p className="ff-nutrition-result-macros">
                    {[
                      row?.per100g?.calories != null
                        ? `${row.per100g.calories} kcal`
                        : "kcal —",
                      row?.per100g?.proteinG != null
                        ? `P ${row.per100g.proteinG}g`
                        : "P —",
                      row?.per100g?.carbsG != null
                        ? `C ${row.per100g.carbsG}g`
                        : "C —",
                      row?.per100g?.fatG != null ? `F ${row.per100g.fatG}g` : "F —",
                    ].join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  className="ff-btn-primary ff-nutrition-use-btn"
                  onClick={() => appendFromSearch(row)}
                >
                  Add ingredient
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ff-card">
        <h2 className="ff-section-title">Meal builder</h2>
        <form onSubmit={handleSave}>
          <div className="ff-form-grid">
            <label htmlFor="mealDate">Date</label>
            <input
              id="mealDate"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              required
            />
            <label htmlFor="mealName">Meal name</label>
            <input
              id="mealName"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="Dinner, lunch, post-workout bowl..."
              maxLength={120}
              required
            />
            <label htmlFor="mealNote">Meal note (optional)</label>
            <input
              id="mealNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any context for this meal"
              maxLength={500}
            />
          </div>

          <div className="ff-meal-ingredients">
            {ingredients.map((ing, idx) => (
              <article key={idx} className="ff-meal-ingredient-card">
                <div className="ff-meal-ingredient-top">
                  <h3>Ingredient {idx + 1}</h3>
                  <button
                    type="button"
                    className="ff-linkish"
                    onClick={() => removeIngredient(idx)}
                  >
                    Remove
                  </button>
                </div>
                <div className="ff-form-grid ff-meal-grid">
                  <label>Name</label>
                  <input
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                    placeholder="e.g. Chicken breast"
                  />
                  <label>Grams</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    step={1}
                    value={ing.grams}
                    onChange={(e) => updateIngredient(idx, "grams", e.target.value)}
                  />
                  <label>Calories / 100g</label>
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    step={0.1}
                    value={ing.caloriesPer100g}
                    onChange={(e) =>
                      updateIngredient(idx, "caloriesPer100g", e.target.value)
                    }
                  />
                  <label>Protein / 100g</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    step={0.1}
                    value={ing.proteinPer100g}
                    onChange={(e) =>
                      updateIngredient(idx, "proteinPer100g", e.target.value)
                    }
                  />
                  <label>Carbs / 100g</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    step={0.1}
                    value={ing.carbsPer100g}
                    onChange={(e) => updateIngredient(idx, "carbsPer100g", e.target.value)}
                  />
                  <label>Fat / 100g</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    step={0.1}
                    value={ing.fatPer100g}
                    onChange={(e) => updateIngredient(idx, "fatPer100g", e.target.value)}
                  />
                </div>
              </article>
            ))}
          </div>
          <button type="button" className="ff-btn-secondary" onClick={addIngredient}>
            + Add manual ingredient
          </button>
          <p className="ff-meal-total-preview">
            Meal total: <strong>{totals.calories} kcal</strong> · P {totals.proteinG}g · C{" "}
            {totals.carbsG}g · F {totals.fatG}g
          </p>
          <button type="submit" className="ff-btn-primary" disabled={saving}>
            {saving ? "Saving meal…" : "Save meal"}
          </button>
        </form>
      </section>
    </div>
  );
}
