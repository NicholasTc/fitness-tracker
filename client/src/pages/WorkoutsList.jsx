import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, parseJsonSafe } from "../lib/api.js";
import {
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from "../icons/fitflowIonIcons.js";

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const weekday = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - weekday);
  return d;
}

function shiftDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function weekTitle(start) {
  const end = shiftDays(start, 6);
  const startPart = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endPart = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const yearPart = end.toLocaleDateString("en-US", { year: "numeric" });
  return `${startPart} - ${endPart}, ${yearPart}`;
}

function inWeek(iso, weekStart) {
  if (!iso) return false;
  const d = new Date(iso);
  const end = shiftDays(weekStart, 7);
  return d >= weekStart && d < end;
}

function dayMeta(iso) {
  if (!iso) return "No date";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function estimateDuration(exerciseCount) {
  if (!exerciseCount) return "15m - 20m";
  const min = Math.max(20, exerciseCount * 5);
  const max = min + 12;
  return `${min}m - ${max}m`;
}

export default function WorkoutsList() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/workouts`, {
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
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id) {
    if (!token || !window.confirm("Delete this workout?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/workouts/${id}`, {
        method: "DELETE",
        headers: bearerAuth(token),
      });
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        const data = await parseJsonSafe(res);
        throw new Error(data?.error || res.statusText);
      }
      await load();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  const weekRows = rows
    .filter((r) => inWeek(r.date, weekStart))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const weekExerciseTotal = weekRows.reduce(
    (sum, w) => sum + (w.exercises?.length ?? 0),
    0,
  );

  return (
    <div className="ff-page">
      <h1 className="ff-page-title">Workout Planner</h1>
      <div className="ff-workouts-actions">
        <Link className="ff-btn-primary ff-workouts-new" to="/workouts/new">
          New workout
        </Link>
        <button type="button" className="ff-btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {loading && <p className="ff-meta">Loading…</p>}
      {error && (
        <p className="ff-err" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="ff-muted">No workouts yet. Create one above.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="ff-workout-week-wrap">
          <section className="ff-workout-week-head ff-card">
            <div className="ff-workout-week-top">
              <h2>Week of {weekTitle(weekStart)}</h2>
              <div className="ff-week-nav">
                <button
                  type="button"
                  className="ff-btn-secondary"
                  onClick={() => setWeekStart((d) => shiftDays(d, -7))}
                  aria-label="Previous week"
                >
                  <IoChevronBackOutline size={16} />
                </button>
                <button
                  type="button"
                  className="ff-btn-secondary"
                  onClick={() => setWeekStart((d) => shiftDays(d, 7))}
                  aria-label="Next week"
                >
                  <IoChevronForwardOutline size={16} />
                </button>
              </div>
            </div>
            <div className="ff-workout-week-meta">
              <span>Total workouts: {weekRows.length}</span>
              <span>Total exercises: {weekExerciseTotal}</span>
            </div>
          </section>

          {weekRows.length === 0 ? (
            <p className="ff-muted ff-card">
              No workouts planned for this week yet.
            </p>
          ) : (
            <div className="ff-workout-week-cards">
              {weekRows.map((w, idx) => {
                const exCount = w.exercises?.length ?? 0;
                return (
                  <article
                    key={w.id}
                    className={`ff-workout-item-card${idx % 2 ? " ff-strength" : ""}`}
                  >
                    <div className="ff-workout-item-bar" />
                    <div className="ff-workout-item-main">
                      <div className="ff-workout-item-meta">
                        {dayMeta(w.date)} · {estimateDuration(exCount)}
                      </div>
                      <Link className="ff-workout-item-title" to={`/workouts/${w.id}`}>
                        {w.name}
                      </Link>
                      <div className="ff-workout-item-bottom">
                        <span className="ff-workout-tag">
                          {exCount} exercise{exCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <div className="ff-workout-item-actions">
                      <Link className="ff-linkish" to={`/workouts/${w.id}`}>
                        Open
                      </Link>
                      <button
                        type="button"
                        className="ff-linkish"
                        onClick={() => handleDelete(w.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
