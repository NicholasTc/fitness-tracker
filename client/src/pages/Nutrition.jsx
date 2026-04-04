import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, jsonAuthHeaders, parseJsonSafe } from "../lib/api.js";

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
  const [effectiveTargetCalories, setEffectiveTargetCalories] = useState(null);

  const [calories, setCalories] = useState("");
  const [mealLabel, setMealLabel] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ start: day, end: day });
      const res = await fetch(`${API_BASE}/api/food-logs?${qs}`, {
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
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setRangeTotalCalories(
        typeof data.totals?.rangeTotalCalories === "number"
          ? data.totals.rangeTotalCalories
          : 0,
      );
      setEffectiveTargetCalories(
        data.effectiveTargetCalories != null
          ? data.effectiveTargetCalories
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

  const remaining =
    effectiveTargetCalories != null
      ? effectiveTargetCalories - rangeTotalCalories
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
          ←
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
          →
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
              <strong>{rangeTotalCalories}</strong> kcal logged
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
                <div className="ff-food-log-row">
                  <span className="ff-food-log-cals">{row.calories} kcal</span>
                  <span className="ff-meta" style={{ flex: "1 1 12rem", margin: 0 }}>
                    {[row.mealLabel, row.note].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <button
                    type="button"
                    className="ff-linkish"
                    onClick={() => handleDelete(row.id)}
                  >
                    Remove
                  </button>
                </div>
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
