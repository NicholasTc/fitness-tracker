import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, jsonAuthHeaders, parseJsonSafe } from "../lib/api.js";
import {
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoSearchOutline,
} from "../icons/fitflowIonIcons.js";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDay(ymd, deltaDays) {
  const d = new Date(ymd + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export default function Nutrition() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [day, setDay] = useState(todayYmd);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [entries, setEntries] = useState([]);
  const [rangeTotalCalories, setRangeTotalCalories] = useState(0);
  const [mealEntries, setMealEntries] = useState([]);
  const [mealRangeTotalCalories, setMealRangeTotalCalories] = useState(0);
  const [effectiveTargetCalories, setEffectiveTargetCalories] = useState(null);

  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [mealLabel, setMealLabel] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMeta, setSearchMeta] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ start: day, end: day });
      const [foodRes, mealRes] = await Promise.all([
        fetch(`${API_BASE}/api/food-logs?${qs}`, {
          headers: bearerAuth(token),
        }),
        fetch(`${API_BASE}/api/meal-logs?${qs}`, {
          headers: bearerAuth(token),
        }),
      ]);
      const [foodData, mealData] = await Promise.all([
        parseJsonSafe(foodRes),
        parseJsonSafe(mealRes),
      ]);
      if (foodRes.status === 401 || mealRes.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!foodRes.ok) {
        throw new Error(
          foodData?.error || foodRes.statusText || `HTTP ${foodRes.status}`,
        );
      }
      if (!mealRes.ok) {
        throw new Error(
          mealData?.error || mealRes.statusText || `HTTP ${mealRes.status}`,
        );
      }
      setEntries(Array.isArray(foodData.entries) ? foodData.entries : []);
      setRangeTotalCalories(
        typeof foodData.totals?.rangeTotalCalories === "number"
          ? foodData.totals.rangeTotalCalories
          : 0,
      );
      setMealEntries(Array.isArray(mealData.entries) ? mealData.entries : []);
      setMealRangeTotalCalories(
        typeof mealData.totals?.rangeTotalCalories === "number"
          ? mealData.totals.rangeTotalCalories
          : 0,
      );
      setEffectiveTargetCalories(
        foodData.effectiveTargetCalories != null
          ? foodData.effectiveTargetCalories
          : null,
      );
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [token, day, logout, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    const c = Number(calories);
    if (!token || !Number.isFinite(c) || c < 1) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/food-logs`, {
        method: "POST",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify({
          date: day,
          calories: c,
          proteinG: proteinG === "" ? undefined : Number(proteinG),
          carbsG: carbsG === "" ? undefined : Number(carbsG),
          fatG: fatG === "" ? undefined : Number(fatG),
          mealLabel: mealLabel.trim() || undefined,
          note: note.trim() || undefined,
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
      setCalories("");
      setProteinG("");
      setCarbsG("");
      setFatG("");
      setMealLabel("");
      setNote("");
      await load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!token || !window.confirm("Remove this entry?")) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/food-logs/${id}`, {
        method: "DELETE",
        headers: bearerAuth(token),
      });
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (res.status === 404) {
        await load();
        return;
      }
      if (!res.ok) {
        const data = await parseJsonSafe(res);
        throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function handleDeleteMeal(id) {
    if (!token || !window.confirm("Remove this meal entry?")) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/meal-logs/${id}`, {
        method: "DELETE",
        headers: bearerAuth(token),
      });
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (res.status === 404) {
        await load();
        return;
      }
      if (!res.ok) {
        const data = await parseJsonSafe(res);
        throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  function beginEdit(row) {
    setEditingId(row.id);
    setEditForm({
      date: row.date || day,
      calories: String(row.calories ?? ""),
      proteinG: row.proteinG == null ? "" : String(row.proteinG),
      carbsG: row.carbsG == null ? "" : String(row.carbsG),
      fatG: row.fatG == null ? "" : String(row.fatG),
      mealLabel: row.mealLabel || "",
      note: row.note || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit() {
    if (!token || !editingId || !editForm) return;
    const c = Number(editForm.calories);
    if (!Number.isFinite(c) || c < 1) return;
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/food-logs/${editingId}`, {
        method: "PATCH",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify({
          date: editForm.date,
          calories: c,
          proteinG: editForm.proteinG === "" ? null : Number(editForm.proteinG),
          carbsG: editForm.carbsG === "" ? null : Number(editForm.carbsG),
          fatG: editForm.fatG === "" ? null : Number(editForm.fatG),
          mealLabel: editForm.mealLabel.trim() || null,
          note: editForm.note.trim() || null,
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
      cancelEdit();
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setUpdating(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!token || q.length < 2) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const qs = new URLSearchParams({ q, limit: "12" });
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
      setSearchMeta({
        partial: Boolean(data?.partial),
        cached: Boolean(data?.cached),
      });
    } catch (err) {
      setSearchResults([]);
      setSearchMeta(null);
      setSearchError(err.message || String(err));
    } finally {
      setSearchLoading(false);
    }
  }

  function handleUseResult(row) {
    const kcal = row?.per100g?.calories;
    setCalories(kcal == null ? "" : String(Math.max(1, Math.round(kcal))));
    setProteinG(
      row?.per100g?.proteinG == null ? "" : String(Math.round(row.per100g.proteinG)),
    );
    setCarbsG(
      row?.per100g?.carbsG == null ? "" : String(Math.round(row.per100g.carbsG)),
    );
    setFatG(row?.per100g?.fatG == null ? "" : String(Math.round(row.per100g.fatG)));
    const baseLabel = row?.brand ? `${row.name} (${row.brand})` : row?.name || "";
    setMealLabel(baseLabel.slice(0, 80));
    setNote(
      `Per 100g from ${row?.source === "usda" ? "USDA FDC" : "Open Food Facts"}`.slice(
        0,
        500,
      ),
    );
  }

  const combinedRangeCalories = rangeTotalCalories + mealRangeTotalCalories;
  const remaining =
    effectiveTargetCalories != null
      ? effectiveTargetCalories - combinedRangeCalories
      : null;

  return (
    <div className="ff-page">
      <h1 className="ff-page-title">Calorie Tracker</h1>

      <div className="ff-nutrition-day-nav">
        <button
          type="button"
          className="ff-btn-secondary"
          onClick={() => setDay((d) => shiftDay(d, -1))}
          aria-label="Previous day"
        >
          <IoChevronBackOutline size={18} aria-hidden />
        </button>
        <label>
          <span className="sr-only">Date</span>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="ff-btn-secondary"
          onClick={() => setDay((d) => shiftDay(d, 1))}
          aria-label="Next day"
        >
          <IoChevronForwardOutline size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="ff-btn-secondary"
          onClick={() => setDay(todayYmd())}
        >
          Today
        </button>
      </div>

      <section className="ff-card" aria-live="polite">
        <h2 className="ff-section-title">Day summary</h2>
        {loading && <p className="ff-meta">Loading…</p>}
        {!loading && (
          <>
            <p className="ff-nutrition-big">
              <strong>{combinedRangeCalories}</strong> kcal logged
            </p>
            <p className="ff-meta">
              Quick entries: <strong>{rangeTotalCalories}</strong> kcal · Meals:{" "}
              <strong>{mealRangeTotalCalories}</strong> kcal
            </p>
            {effectiveTargetCalories != null ? (
              <p className="ff-meta">
                Target: <strong>{effectiveTargetCalories}</strong> kcal (from
                profile)
                {remaining != null && (
                  <>
                    {" "}
                    · Remaining:{" "}
                    <strong
                      className={remaining < 0 ? "ff-nutrition-over" : ""}
                    >
                      {remaining}
                    </strong>{" "}
                    kcal
                  </>
                )}
              </p>
            ) : (
              <p className="ff-meta">
                Set your profile or a manual calorie target.{" "}
                <Link to="/profile">Open profile</Link>
              </p>
            )}
          </>
        )}
      </section>

      {error && (
        <p className="ff-err" role="alert">
          {error}
        </p>
      )}

      <section className="ff-card" aria-labelledby="search-heading">
        <h2 id="search-heading" className="ff-section-title">
          Nutrition search (per 100g)
        </h2>
        <form className="ff-nutrition-search-form" onSubmit={handleSearch}>
          <label htmlFor="nutrition-search" className="sr-only">
            Search food
          </label>
          <input
            id="nutrition-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search e.g. chicken breast"
            minLength={2}
          />
          <button
            type="submit"
            className="ff-btn-secondary ff-nutrition-search-btn"
            disabled={searchLoading || searchQuery.trim().length < 2}
          >
            <IoSearchOutline size={16} aria-hidden />
            {searchLoading ? "Searching…" : "Search"}
          </button>
        </form>
        {searchError && (
          <p className="ff-err" role="alert">
            {searchError}
          </p>
        )}
        {!searchLoading && searchResults.length === 0 && searchMeta && (
          <p className="ff-muted">No nutrition results found for this query.</p>
        )}
        {searchMeta?.partial && (
          <p className="ff-meta">
            One provider is temporarily unavailable. Showing partial results.
          </p>
        )}
        {searchMeta?.cached && (
          <p className="ff-meta">Showing cached results for faster response.</p>
        )}
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
                  <p className="ff-meta" style={{ margin: "0.15rem 0 0.35rem" }}>
                    Source: {row.source === "usda" ? "USDA FDC" : "Open Food Facts"}
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
                  onClick={() => handleUseResult(row)}
                >
                  Use this
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="ff-meta">
          Data sources: USDA FoodData Central and Open Food Facts.
        </p>
      </section>

      <section className="ff-card" aria-labelledby="meal-entry-heading">
        <div className="ff-nutrition-entry-actions">
          <h2 id="meal-entry-heading" className="ff-section-title">
            Meal builder
          </h2>
          <Link to="/nutrition/meal/new" className="ff-btn-primary ff-meal-builder-link">
            Log meal (ingredients)
          </Link>
        </div>
        <p className="ff-meta">
          Use this for multi-ingredient meals. Totals roll up into your day summary.
        </p>
      </section>

      <section className="ff-card" aria-labelledby="add-heading">
        <h2 id="add-heading" className="ff-section-title">
          Add entry
        </h2>
        <form onSubmit={handleAdd}>
          <div className="ff-form-grid">
            <label htmlFor="cal">Calories</label>
            <input
              id="cal"
              type="number"
              min={1}
              max={50000}
              step={1}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required
              placeholder="e.g. 350"
            />
            <label htmlFor="meal">Meal (optional)</label>
            <input
              id="meal"
              value={mealLabel}
              onChange={(e) => setMealLabel(e.target.value)}
              maxLength={80}
              placeholder="Breakfast, snack…"
            />
            <label htmlFor="note">Note (optional)</label>
            <input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="What you ate"
            />
            <label htmlFor="proteinG">Protein g (optional)</label>
            <input
              id="proteinG"
              type="number"
              min={0}
              max={1000}
              step={1}
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              placeholder="e.g. 35"
            />
            <label htmlFor="carbsG">Carbs g (optional)</label>
            <input
              id="carbsG"
              type="number"
              min={0}
              max={1000}
              step={1}
              value={carbsG}
              onChange={(e) => setCarbsG(e.target.value)}
              placeholder="e.g. 42"
            />
            <label htmlFor="fatG">Fat g (optional)</label>
            <input
              id="fatG"
              type="number"
              min={0}
              max={1000}
              step={1}
              value={fatG}
              onChange={(e) => setFatG(e.target.value)}
              placeholder="e.g. 12"
            />
          </div>
          <button type="submit" className="ff-btn-primary" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      <section className="ff-card" aria-labelledby="list-heading">
        <h2 id="list-heading" className="ff-section-title">
          Logged for this day
        </h2>
        {!loading && entries.length === 0 && (
          <p className="ff-muted">No entries yet. Add calories above.</p>
        )}
        {!loading && entries.length > 0 && (
          <ul className="ff-food-log-list">
            {entries.map((row) => (
              <li key={row.id}>
                {editingId === row.id && editForm ? (
                  <div className="ff-form-grid ff-food-edit-grid">
                    <label>Date</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                    <label>Calories</label>
                    <input
                      type="number"
                      min={1}
                      max={50000}
                      step={1}
                      value={editForm.calories}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, calories: e.target.value }))
                      }
                    />
                    <label>Protein g</label>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      step={1}
                      value={editForm.proteinG}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, proteinG: e.target.value }))
                      }
                    />
                    <label>Carbs g</label>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      step={1}
                      value={editForm.carbsG}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, carbsG: e.target.value }))
                      }
                    />
                    <label>Fat g</label>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      step={1}
                      value={editForm.fatG}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, fatG: e.target.value }))
                      }
                    />
                    <label>Meal</label>
                    <input
                      value={editForm.mealLabel}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, mealLabel: e.target.value }))
                      }
                    />
                    <label>Note</label>
                    <input
                      value={editForm.note}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, note: e.target.value }))
                      }
                    />
                    <div />
                    <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="ff-btn-primary"
                        disabled={updating}
                        onClick={saveEdit}
                      >
                        {updating ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="ff-btn-secondary"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ff-food-log-row">
                    <span className="ff-food-log-cals">{row.calories} kcal</span>
                    <span className="ff-meta" style={{ flex: "1 1 12rem", margin: 0 }}>
                      {[row.mealLabel, row.note].filter(Boolean).join(" · ") || "—"}
                    </span>
                    <span className="ff-meta" style={{ margin: 0 }}>
                      {[
                        row.proteinG != null ? `P ${row.proteinG}g` : null,
                        row.carbsG != null ? `C ${row.carbsG}g` : null,
                        row.fatG != null ? `F ${row.fatG}g` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Macros —"}
                    </span>
                    <button
                      type="button"
                      className="ff-linkish"
                      onClick={() => beginEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ff-linkish"
                      onClick={() => handleDelete(row.id)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ff-card" aria-labelledby="meal-list-heading">
        <h2 id="meal-list-heading" className="ff-section-title">
          Meals logged for this day
        </h2>
        {!loading && mealEntries.length === 0 && (
          <p className="ff-muted">No meal-builder entries yet.</p>
        )}
        {!loading && mealEntries.length > 0 && (
          <ul className="ff-meal-log-list">
            {mealEntries.map((meal) => (
              <li key={meal.id} className="ff-meal-log-card">
                <div className="ff-meal-log-head">
                  <p className="ff-meal-log-title">{meal.mealName}</p>
                  <button
                    type="button"
                    className="ff-linkish"
                    onClick={() => handleDeleteMeal(meal.id)}
                  >
                    Remove
                  </button>
                </div>
                <p className="ff-meta" style={{ marginTop: 0 }}>
                  {meal.totals?.calories ?? 0} kcal · P {meal.totals?.proteinG ?? 0}g · C{" "}
                  {meal.totals?.carbsG ?? 0}g · F {meal.totals?.fatG ?? 0}g
                </p>
                <p className="ff-meta">
                  {Array.isArray(meal.ingredients) ? meal.ingredients.length : 0} ingredient
                  {Array.isArray(meal.ingredients) && meal.ingredients.length === 1
                    ? ""
                    : "s"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="ff-meta">
        Totals are computed on the server from your saved entries.
      </p>
    </div>
  );
}
