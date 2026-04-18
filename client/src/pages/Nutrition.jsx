import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, jsonAuthHeaders, parseJsonSafe } from "../lib/api.js";
import { addDaysLocalYmd, toLocalYmd } from "../lib/date.js";
import {
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoSearchOutline,
} from "../icons/fitflowIonIcons.js";
import LogModeToggle from "../components/nutrition/LogModeToggle.jsx";
import QuickLogForm from "../components/nutrition/QuickLogForm.jsx";
import MealLogForm from "../components/nutrition/MealLogForm.jsx";
import TodayLogsList from "../components/nutrition/TodayLogsList.jsx";
import { normalizeMealTag } from "../components/nutrition/constants.js";

export default function Nutrition() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [day, setDay] = useState(() => toLocalYmd());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [entries, setEntries] = useState([]);
  const [rangeTotalCalories, setRangeTotalCalories] = useState(0);
  const [mealEntries, setMealEntries] = useState([]);
  const [mealRangeTotalCalories, setMealRangeTotalCalories] = useState(0);
  const [effectiveTargetCalories, setEffectiveTargetCalories] = useState(null);

  const [logMode, setLogMode] = useState("quick");
  const [quickForm, setQuickForm] = useState({
    note: "",
    calories: "",
    mealLabel: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });
  const [savingQuick, setSavingQuick] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);

  const [mealForm, setMealForm] = useState({
    mealName: "",
    mealLabel: "",
    note: "",
    ingredients: [
      {
        name: "",
        grams: "100",
        caloriesPer100g: "",
        proteinPer100g: "",
        carbsPer100g: "",
        fatPer100g: "",
        source: "manual",
        externalId: "",
      },
    ],
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [mealSearch, setMealSearch] = useState({
    query: "",
    loading: false,
    error: null,
    results: [],
    meta: null,
  });
  const [aiMealText, setAiMealText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiDraft, setAiDraft] = useState(null);
  const [aiParserMode, setAiParserMode] = useState("gemini");

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

  function updateQuickForm(field, value) {
    setQuickForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleQuickAdd(e) {
    e.preventDefault();
    const c = Number(quickForm.calories);
    if (!token || !Number.isFinite(c) || c < 1) return;

    setSavingQuick(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/food-logs`, {
        method: "POST",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify({
          date: day,
          calories: c,
          proteinG: quickForm.proteinG === "" ? undefined : Number(quickForm.proteinG),
          carbsG: quickForm.carbsG === "" ? undefined : Number(quickForm.carbsG),
          fatG: quickForm.fatG === "" ? undefined : Number(quickForm.fatG),
          mealLabel: quickForm.mealLabel || undefined,
          note: quickForm.note.trim() || undefined,
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
      setQuickForm({
        note: "",
        calories: "",
        mealLabel: "",
        proteinG: "",
        carbsG: "",
        fatG: "",
      });
      await load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSavingQuick(false);
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

  function updateMealField(field, value) {
    setMealForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateMealIngredient(idx, field, value) {
    setMealForm((prev) => {
      const ingredients = prev.ingredients.map((item, i) => {
        if (i !== idx) return item;
        if (field !== "grams") {
          return { ...item, [field]: value };
        }
        const prevGrams = Number(item.grams);
        const nextGrams = Number(value);
        if (!Number.isFinite(prevGrams) || prevGrams <= 0 || !Number.isFinite(nextGrams)) {
          return { ...item, grams: value };
        }
        const ratio = nextGrams / prevGrams;
        return {
          ...item,
          grams: value,
          caloriesPer100g:
            item.caloriesPer100g === ""
              ? ""
              : String(Math.round(Number(item.caloriesPer100g) * ratio * 10) / 10),
          proteinPer100g:
            item.proteinPer100g === ""
              ? ""
              : String(Math.round(Number(item.proteinPer100g) * ratio * 10) / 10),
          carbsPer100g:
            item.carbsPer100g === ""
              ? ""
              : String(Math.round(Number(item.carbsPer100g) * ratio * 10) / 10),
          fatPer100g:
            item.fatPer100g === ""
              ? ""
              : String(Math.round(Number(item.fatPer100g) * ratio * 10) / 10),
        };
      });
      return { ...prev, ingredients };
    });
  }

  function addMealIngredient() {
    setMealForm((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          name: "",
          grams: "100",
          caloriesPer100g: "",
          proteinPer100g: "",
          carbsPer100g: "",
          fatPer100g: "",
          source: "manual",
          externalId: "",
        },
      ],
    }));
  }

  function removeMealIngredient(idx) {
    setMealForm((prev) => ({
      ...prev,
      ingredients:
        prev.ingredients.length <= 1
          ? prev.ingredients
          : prev.ingredients.filter((_, i) => i !== idx),
    }));
  }

  async function searchMealIngredient() {
    const q = mealSearch.query.trim();
    if (!token || q.length < 2) return;
    setMealSearch((prev) => ({ ...prev, loading: true, error: null }));
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
      setMealSearch((prev) => ({
        ...prev,
        loading: false,
        error: null,
        results: Array.isArray(data?.results) ? data.results : [],
        meta: {
          partial: Boolean(data?.partial),
          cached: Boolean(data?.cached),
        },
      }));
    } catch (err) {
      setMealSearch((prev) => ({
        ...prev,
        loading: false,
        error: err.message || String(err),
        results: [],
        meta: null,
      }));
    }
  }

  function appendMealIngredientFromSearch(row) {
    setMealForm((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          name: row.name || "",
          grams: "100",
          caloriesPer100g:
            row?.per100g?.calories == null ? "" : String(row.per100g.calories),
          proteinPer100g:
            row?.per100g?.proteinG == null ? "" : String(row.per100g.proteinG),
          carbsPer100g: row?.per100g?.carbsG == null ? "" : String(row.per100g.carbsG),
          fatPer100g: row?.per100g?.fatG == null ? "" : String(row.per100g.fatG),
          source: row.source || "manual",
          externalId: row.externalId || "",
        },
      ],
    }));
  }

  async function handleGenerateAiDraft() {
    const text = aiMealText.trim();
    if (!token || text.length < 6) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/meal-breakdown/draft`, {
        method: "POST",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify({ text, date: day }),
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
      setAiDraft(data?.draft || null);
      setAiParserMode(data?.parserMode || "gemini");
    } catch (err) {
      setAiDraft(null);
      setAiParserMode("gemini");
      setAiError(err.message || String(err));
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiDraftToBuilder() {
    if (!aiDraft) return;
    setMealForm({
      mealName: aiDraft.mealName || "",
      mealLabel: aiDraft.mealLabel || "",
      note: "",
      ingredients: Array.isArray(aiDraft.ingredients) && aiDraft.ingredients.length > 0
        ? aiDraft.ingredients.map((i) => ({
            grams: String(i.grams ?? 100),
            name: i.name || "",
            caloriesPer100g: String(
              Math.round(((i.caloriesPer100g ?? 0) * (i.grams ?? 100) / 100) * 10) / 10,
            ),
            proteinPer100g: String(
              Math.round(((i.proteinPer100g ?? 0) * (i.grams ?? 100) / 100) * 10) / 10,
            ),
            carbsPer100g: String(
              Math.round(((i.carbsPer100g ?? 0) * (i.grams ?? 100) / 100) * 10) / 10,
            ),
            fatPer100g: String(
              Math.round(((i.fatPer100g ?? 0) * (i.grams ?? 100) / 100) * 10) / 10,
            ),
            source: i.source || "manual",
            externalId: i.externalId || "",
          }))
        : mealForm.ingredients,
    });
    setLogMode("meal");
  }

  const mealTotals = useMemo(() => {
    const sum = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    for (const one of mealForm.ingredients) {
      const c = Number(one.caloriesPer100g);
      const p = Number(one.proteinPer100g);
      const cb = Number(one.carbsPer100g);
      const f = Number(one.fatPer100g);
      if (Number.isFinite(c)) sum.calories += c;
      if (Number.isFinite(p)) sum.proteinG += p;
      if (Number.isFinite(cb)) sum.carbsG += cb;
      if (Number.isFinite(f)) sum.fatG += f;
    }
    return {
      calories: Math.round(sum.calories * 10) / 10,
      proteinG: Math.round(sum.proteinG * 10) / 10,
      carbsG: Math.round(sum.carbsG * 10) / 10,
      fatG: Math.round(sum.fatG * 10) / 10,
    };
  }, [mealForm.ingredients]);

  async function handleMealSave(e) {
    e.preventDefault();
    if (!token) return;
    const normalizedMealName = mealForm.mealName.trim();
    if (!normalizedMealName) {
      setError("Meal name is required");
      return;
    }
    if (!Array.isArray(mealForm.ingredients) || mealForm.ingredients.length < 1) {
      setError("Add at least one ingredient");
      return;
    }
    const payloadIngredients = [];
    for (const one of mealForm.ingredients) {
      const name = one.name.trim();
      const grams = Number(one.grams);
      const caloriesTotal = Number(one.caloriesPer100g);
      const proteinTotal = one.proteinPer100g === "" ? 0 : Number(one.proteinPer100g);
      const carbsTotal = one.carbsPer100g === "" ? 0 : Number(one.carbsPer100g);
      const fatTotal = one.fatPer100g === "" ? 0 : Number(one.fatPer100g);
      if (!name) {
        setError("Each ingredient needs a name");
        return;
      }
      if (!Number.isFinite(grams) || grams < 1) {
        setError("Each ingredient needs grams >= 1");
        return;
      }
      if (!Number.isFinite(caloriesTotal) || caloriesTotal < 0) {
        setError("Each ingredient needs valid calories");
        return;
      }
      if (!Number.isFinite(proteinTotal) || proteinTotal < 0) {
        setError("Each ingredient needs valid protein grams");
        return;
      }
      if (!Number.isFinite(carbsTotal) || carbsTotal < 0) {
        setError("Each ingredient needs valid carbs grams");
        return;
      }
      if (!Number.isFinite(fatTotal) || fatTotal < 0) {
        setError("Each ingredient needs valid fat grams");
        return;
      }
      payloadIngredients.push({
        name,
        grams,
        caloriesPer100g: Math.round((caloriesTotal * 100) / grams * 10) / 10,
        proteinPer100g: Math.round((proteinTotal * 100) / grams * 10) / 10,
        carbsPer100g: Math.round((carbsTotal * 100) / grams * 10) / 10,
        fatPer100g: Math.round((fatTotal * 100) / grams * 10) / 10,
        source: one.source || "manual",
        externalId: one.externalId || undefined,
      });
    }

    setSavingMeal(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/meal-logs`, {
        method: "POST",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify({
          date: day,
          mealName: normalizedMealName,
          mealLabel: mealForm.mealLabel || undefined,
          note: mealForm.note.trim() || undefined,
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
      setMealForm({
        mealName: "",
        mealLabel: "",
        note: "",
        ingredients: [
          {
            name: "",
            grams: "100",
            caloriesPer100g: "",
            proteinPer100g: "",
            carbsPer100g: "",
            fatPer100g: "",
            source: "manual",
            externalId: "",
          },
        ],
      });
      setMealSearch({ query: "", loading: false, error: null, results: [], meta: null });
      await load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSavingMeal(false);
    }
  }

  const groupedItems = useMemo(() => {
    const combined = [
      ...entries.map((row) => ({
        key: `quick-${row.id}`,
        id: row.id,
        type: "quick",
        label: normalizeMealTag(row.mealLabel),
        title: row.note || "Quick log entry",
        calories: row.calories ?? 0,
        proteinG: row.proteinG,
        carbsG: row.carbsG,
        fatG: row.fatG,
        createdAt: row.createdAt,
        raw: row,
      })),
      ...mealEntries.map((row) => ({
        key: `meal-${row.id}`,
        id: row.id,
        type: "meal",
        label: normalizeMealTag(row.mealLabel),
        title: row.mealName || "Meal",
        calories: row.totals?.calories ?? 0,
        proteinG: row.totals?.proteinG ?? null,
        carbsG: row.totals?.carbsG ?? null,
        fatG: row.totals?.fatG ?? null,
        createdAt: row.createdAt,
        raw: row,
      })),
    ];

    const grouped = new Map();
    for (const item of combined) {
      if (!grouped.has(item.label)) grouped.set(item.label, []);
      grouped.get(item.label).push(item);
    }

    const order = ["Breakfast", "Lunch", "Dinner", "Snack", "Uncategorized"];
    return order
      .filter((label) => grouped.has(label))
      .map((label) => ({
        label,
        items: grouped
          .get(label)
          .slice()
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
      }));
  }, [entries, mealEntries]);

  const combinedRangeCalories = rangeTotalCalories + mealRangeTotalCalories;
  const combinedMacroTotals = useMemo(() => {
    const totals = { proteinG: 0, carbsG: 0, fatG: 0 };
    for (const row of entries) {
      const protein = Number(row?.proteinG);
      const carbs = Number(row?.carbsG);
      const fat = Number(row?.fatG);
      if (Number.isFinite(protein)) totals.proteinG += protein;
      if (Number.isFinite(carbs)) totals.carbsG += carbs;
      if (Number.isFinite(fat)) totals.fatG += fat;
    }
    for (const row of mealEntries) {
      const protein = Number(row?.totals?.proteinG);
      const carbs = Number(row?.totals?.carbsG);
      const fat = Number(row?.totals?.fatG);
      if (Number.isFinite(protein)) totals.proteinG += protein;
      if (Number.isFinite(carbs)) totals.carbsG += carbs;
      if (Number.isFinite(fat)) totals.fatG += fat;
    }
    return {
      proteinG: Math.round(totals.proteinG * 10) / 10,
      carbsG: Math.round(totals.carbsG * 10) / 10,
      fatG: Math.round(totals.fatG * 10) / 10,
    };
  }, [entries, mealEntries]);
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
          onClick={() => setDay((d) => addDaysLocalYmd(d, -1))}
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
          onClick={() => setDay((d) => addDaysLocalYmd(d, 1))}
          aria-label="Next day"
        >
          <IoChevronForwardOutline size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="ff-btn-secondary"
          onClick={() => setDay(toLocalYmd())}
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
            <p className="ff-meta">
              Macros: <strong>P {combinedMacroTotals.proteinG}g</strong> ·{" "}
              <strong>C {combinedMacroTotals.carbsG}g</strong> ·{" "}
              <strong>F {combinedMacroTotals.fatG}g</strong>
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

      <section className="ff-card ff-ai-helper-card" aria-labelledby="ai-helper-heading">
        <h2 id="ai-helper-heading" className="ff-section-title">
          Need help breaking down a meal?
        </h2>
        <p className="ff-meta">
          Describe your meal and AI drafts ingredients for review. Nothing is saved
          until you confirm and press Save.
        </p>
        <div className="ff-ai-helper-row">
          <input
            value={aiMealText}
            onChange={(e) => setAiMealText(e.target.value)}
            placeholder="e.g. chicken rice with fried egg"
            maxLength={300}
          />
          <button
            type="button"
            className="ff-btn-primary"
            disabled={aiLoading || aiMealText.trim().length < 6}
            onClick={handleGenerateAiDraft}
          >
            {aiLoading ? "Analyzing meal…" : "Use AI meal helper"}
          </button>
        </div>
        {aiError && <p className="ff-err">{aiError}</p>}
        {aiDraft && (
          <div className="ff-ai-draft-preview">
            <p className="ff-meta">
              Draft: <strong>{aiDraft.mealName || "Meal draft"}</strong>
              {aiDraft.mealLabel ? ` · ${aiDraft.mealLabel}` : ""}
            </p>
            <ul className="ff-ai-draft-list">
              {aiDraft.ingredients?.map((ing, idx) => (
                <li key={`${ing.name}-${idx}`}>
                  <strong>{ing.name}</strong> · {ing.grams}g ·{" "}
                  {Math.round(((ing.caloriesPer100g ?? 0) * (ing.grams ?? 100)) / 10) / 10} kcal
                  {ing.unresolved ? " · needs review" : ""}
                </li>
              ))}
            </ul>
            <p className="ff-meta">
              Est. total: {aiDraft.totals?.calories ?? 0} kcal · P{" "}
              {aiDraft.totals?.proteinG ?? 0}g · C {aiDraft.totals?.carbsG ?? 0}g · F{" "}
              {aiDraft.totals?.fatG ?? 0}g
            </p>
            <p className="ff-meta">
              Review required: confirm once to prefill Build a meal, then edit as needed.
            </p>
            {aiParserMode === "mock_fallback" && (
              <p className="ff-meta">
                AI parser is in fallback mode right now (provider quota/availability).
                Review and adjust ingredient names/grams carefully.
              </p>
            )}
            <div className="ff-ai-draft-actions">
              <button type="button" className="ff-btn-secondary" onClick={handleGenerateAiDraft}>
                Regenerate
              </button>
              <button type="button" className="ff-btn-primary" onClick={applyAiDraftToBuilder}>
                Confirm draft and continue
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="ff-card" aria-labelledby="ingredient-search-heading">
        <h2 id="ingredient-search-heading" className="ff-section-title">
          Ingredient search (per 100g)
        </h2>
        <p className="ff-meta">
          Search first, then add ingredients while in Build a meal mode.
        </p>
        <div className="ff-nutrition-search-form">
          <input
            value={mealSearch.query}
            onChange={(e) => setMealSearch((prev) => ({ ...prev, query: e.target.value }))}
            placeholder="Search ingredient e.g. chicken breast"
            minLength={2}
          />
          <button
            type="button"
            className="ff-btn-secondary ff-nutrition-search-btn"
            disabled={mealSearch.loading || mealSearch.query.trim().length < 2}
            onClick={searchMealIngredient}
          >
            <IoSearchOutline size={16} aria-hidden />
            {mealSearch.loading ? "Searching…" : "Search"}
          </button>
        </div>
        {mealSearch.error && <p className="ff-err">{mealSearch.error}</p>}
        {mealSearch.meta?.partial && (
          <p className="ff-meta">
            One provider is temporarily unavailable. Showing partial results.
          </p>
        )}
        {mealSearch.meta?.cached && (
          <p className="ff-meta">Showing cached results for faster response.</p>
        )}
        {mealSearch.results.length > 0 && (
          <ul className="ff-nutrition-results">
            {mealSearch.results.map((row) => (
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
                  onClick={() => {
                    appendMealIngredientFromSearch(row);
                    setLogMode("meal");
                  }}
                >
                  Add to meal
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ff-card" aria-labelledby="log-food-heading">
        <h2 id="log-food-heading" className="ff-section-title">
          Log food
        </h2>
        <LogModeToggle mode={logMode} onChange={setLogMode} />
        {logMode === "quick" ? (
          <QuickLogForm
            values={quickForm}
            onChange={updateQuickForm}
            onSubmit={handleQuickAdd}
            saving={savingQuick}
            helperText="Best for simple items or rough estimates."
          />
        ) : (
          <MealLogForm
            meal={mealForm}
            setMealField={updateMealField}
            totals={mealTotals}
            onIngredientChange={updateMealIngredient}
            addIngredient={addMealIngredient}
            removeIngredient={removeMealIngredient}
            onSubmit={handleMealSave}
            saving={savingMeal}
            helperText="Best for meals with multiple ingredients and automatic totals."
          />
        )}
        <p className="ff-meta">
          Data sources: USDA FoodData Central and Open Food Facts.
        </p>
      </section>

      <TodayLogsList
        loading={loading}
        groupedItems={groupedItems}
        editingId={editingId}
        editForm={editForm}
        updating={updating}
        setEditForm={setEditForm}
        beginEdit={beginEdit}
        cancelEdit={cancelEdit}
        saveEdit={saveEdit}
        onDeleteQuick={handleDelete}
        onDeleteMeal={handleDeleteMeal}
      />

      <p className="ff-meta">
        Totals are computed on the server from your saved logs.
      </p>
    </div>
  );
}
