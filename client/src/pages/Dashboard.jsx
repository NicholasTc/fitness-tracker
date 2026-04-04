import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, parseJsonSafe } from "../lib/api.js";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function monthGridBounds(year, monthIndex) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const last = new Date(Date.UTC(year, monthIndex + 1, 0));
  const pad = first.getUTCDay();
  const gridStart = new Date(Date.UTC(year, monthIndex, 1 - pad));
  const lastDay = last.getUTCDate();
  const lastDow = last.getUTCDay();
  const tail = 6 - lastDow;
  const gridEnd = new Date(Date.UTC(year, monthIndex, lastDay + tail));
  return {
    start: gridStart.toISOString().slice(0, 10),
    end: gridEnd.toISOString().slice(0, 10),
  };
}

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [todayWorkouts, setTodayWorkouts] = useState([]);
  const [primaryWorkout, setPrimaryWorkout] = useState(null);
  const [kcalLogged, setKcalLogged] = useState(0);
  const [targetCal, setTargetCal] = useState(null);
  const [assistantTab, setAssistantTab] = useState("coach");

  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return { y: n.getUTCFullYear(), m: n.getUTCMonth() };
  });
  const [calWorkoutDays, setCalWorkoutDays] = useState(new Set());

  const [completeOpen, setCompleteOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [completedToday, setCompletedToday] = useState(() => {
    try {
      return sessionStorage.getItem(`ff_done_${todayYmd()}`) === "1";
    } catch {
      return false;
    }
  });

  const displayName = useMemo(() => {
    const em = user?.email || "";
    return em.includes("@") ? em.split("@")[0] : em || "there";
  }, [user]);

  const dateBadge = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const loadToday = useCallback(async () => {
    if (!token) return;
    const day = todayYmd();
    setLoading(true);
    setError(null);
    try {
      const [calRes, foodRes, profRes] = await Promise.all([
        fetch(`${API_BASE}/api/calendar?start=${day}&end=${day}`, {
          headers: bearerAuth(token),
        }),
        fetch(`${API_BASE}/api/food-logs?start=${day}&end=${day}`, {
          headers: bearerAuth(token),
        }),
        fetch(`${API_BASE}/api/profile`, { headers: bearerAuth(token) }),
      ]);

      const calData = await parseJsonSafe(calRes);
      if (!calRes.ok) {
        throw new Error(calData?.error || calRes.statusText);
      }
      const w = Array.isArray(calData.workouts) ? calData.workouts : [];
      setTodayWorkouts(w);
      setPrimaryWorkout(w[0] || null);

      const foodData = await parseJsonSafe(foodRes);
      if (foodRes.ok) {
        setKcalLogged(foodData?.totals?.rangeTotalCalories ?? 0);
      }

      const profData = await parseJsonSafe(profRes);
      if (profRes.ok) {
        setTargetCal(profData?.effectiveTargetCalories ?? null);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadMonthDots = useCallback(async () => {
    if (!token) return;
    const { start, end } = monthGridBounds(calMonth.y, calMonth.m);
    try {
      const res = await fetch(
        `${API_BASE}/api/calendar?start=${start}&end=${end}`,
        { headers: bearerAuth(token) },
      );
      const data = await parseJsonSafe(res);
      if (!res.ok) return;
      const set = new Set();
      for (const w of data.workouts || []) {
        if (w.date) set.add(w.date.slice(0, 10));
      }
      setCalWorkoutDays(set);
    } catch {
      /* ignore */
    }
  }, [token, calMonth]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    loadMonthDots();
  }, [loadMonthDots]);

  const planName = primaryWorkout?.name || "No workout scheduled";
  const exerciseList = primaryWorkout?.exercises || [];
  const exCount = exerciseList.length;
  const durationGuess = exCount ? `~${Math.max(20, exCount * 8)} min` : "—";

  const ringPct = useMemo(() => {
    if (!targetCal || targetCal <= 0) return 0;
    return Math.min(100, Math.round((kcalLogged / targetCal) * 100));
  }, [kcalLogged, targetCal]);

  const miniCalCells = useMemo(() => {
    const { y, m } = calMonth;
    const { start } = monthGridBounds(y, m);
    const [ys, ms, ds] = start.split("-").map((x) => parseInt(x, 10));
    const gridStart = new Date(Date.UTC(ys, ms - 1, ds));
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setUTCDate(gridStart.getUTCDate() + i);
      const ymd = d.toISOString().slice(0, 10);
      const inMonth = d.getUTCMonth() === m;
      const isToday = ymd === todayYmd();
      cells.push({ ymd, dayNum: d.getUTCDate(), inMonth, isToday });
    }
    return cells;
  }, [calMonth]);

  const monthLabel = new Date(
    Date.UTC(calMonth.y, calMonth.m, 1),
  ).toLocaleString("default", { month: "long", year: "numeric", timeZone: "UTC" });

  const [upcomingRows, setUpcomingRows] = useState([]);

  const loadUpcoming = useCallback(async () => {
    if (!token) return;
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 1);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 21);
    const a = start.toISOString().slice(0, 10);
    const b = end.toISOString().slice(0, 10);
    try {
      const res = await fetch(
        `${API_BASE}/api/calendar?start=${a}&end=${b}`,
        { headers: bearerAuth(token) },
      );
      const data = await parseJsonSafe(res);
      if (!res.ok) return;
      const rows = (data.workouts || [])
        .map((w) => ({
          name: w.name,
          ymd: w.date ? w.date.slice(0, 10) : "",
          id: w.id,
        }))
        .filter((r) => r.ymd && r.ymd >= a)
        .sort((x, y) => x.ymd.localeCompare(y.ymd))
        .slice(0, 4);
      setUpcomingRows(rows);
    } catch {
      setUpcomingRows([]);
    }
  }, [token]);

  useEffect(() => {
    loadUpcoming();
  }, [loadUpcoming]);

  function confirmComplete() {
    try {
      sessionStorage.setItem(`ff_done_${todayYmd()}`, "1");
    } catch {
      /* ignore */
    }
    setCompletedToday(true);
    setCompleteOpen(false);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2200);
  }

  const progressWidth = completedToday ? 100 : exCount ? 8 : 4;

  return (
    <>
      <div className="ff-topbar">
        <div className="ff-greeting">
          <h1>
            {greetingLabel()}, {displayName}
          </h1>
          <p>Here&apos;s your plan for today</p>
        </div>
        <div className="ff-topbar-actions">
          <span className="ff-date-badge">📅 {dateBadge}</span>
          <span className="ff-icon-btn" title="Notifications" aria-hidden>
            🔔
          </span>
        </div>
      </div>

      {error && (
        <p className="ff-err" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="ff-meta">Loading…</p>}

      <div className="ff-dashboard-grid">
        <div className="ff-col-primary">
          <section className="ff-hero-action">
            <div className="ff-hero-text">
              <div className="ff-hero-label">Today&apos;s Workout</div>
              <div className="ff-hero-title">{planName}</div>
              <div className="ff-hero-meta">
                {exCount
                  ? `${exCount} exercise${exCount === 1 ? "" : "s"} · ${durationGuess}`
                  : primaryWorkout
                    ? "Open to view exercises"
                    : "Add a session or pick a template"}
              </div>
              {completedToday && (
                <div className="ff-muted-note" style={{ marginTop: 8 }}>
                  Completed today
                </div>
              )}
            </div>
            {primaryWorkout ? (
              <Link
                className={`ff-hero-cta${completedToday ? " ff-is-completed" : ""}`}
                to={`/workouts/${primaryWorkout.id}`}
              >
                {!completedToday && <span className="ff-play-icon">▶</span>}
                {completedToday ? "View workout" : "Open workout"}
              </Link>
            ) : (
              <Link className="ff-hero-cta" to="/workouts/new">
                <span className="ff-play-icon">▶</span>
                New workout
              </Link>
            )}
          </section>

          <section className="ff-focus-card">
            <div className="ff-focus-header">
              <span className="ff-focus-title">Today&apos;s Plan</span>
              <span className="ff-focus-badge">
                {completedToday ? "Completed" : "Planned"}
              </span>
            </div>
            <div className="ff-focus-bar">
              <div
                className="ff-focus-bar-fill"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
            <div className="ff-plan-utility-row">
              <div className="ff-plan-utility-left">
                <span>
                  {completedToday
                    ? "Completed for today"
                    : `${exCount} exercise${exCount === 1 ? "" : "s"}`}
                </span>
                <span>•</span>
                <span>{durationGuess}</span>
              </div>
              <div>
                <span className="ff-plan-chip">{planName}</span>
              </div>
            </div>
            <div className="ff-plan-list">
              {exerciseList.length === 0 && (
                <div className="ff-muted" style={{ padding: "8px 10px" }}>
                  No exercises in this session yet.
                </div>
              )}
              {exerciseList.map((ex) => (
                <div key={ex.id || ex.name} className="ff-plan-item">
                  <span
                    className={`ff-plan-dot${completedToday ? " ff-completed" : ""}`}
                  />
                  <div className="ff-plan-meta">
                    <div className="ff-plan-name">{ex.name}</div>
                    <div className="ff-plan-rx">
                      {ex.sets} sets × {ex.reps} reps
                      {ex.weightKg != null ? ` · ${ex.weightKg} kg` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="ff-plan-footer">
              <span>Review your routine before heading to the gym.</span>
              {primaryWorkout ? (
                <Link className="ff-plan-edit-btn" to={`/workouts/${primaryWorkout.id}`}>
                  Edit Plan
                </Link>
              ) : (
                <Link className="ff-plan-edit-btn" to="/workouts/new">
                  Create plan
                </Link>
              )}
            </div>
          </section>

        </div>

        <div className="ff-col-secondary">
          <div className="ff-assistant-panel">
            <div className="ff-assistant-title">Assistant Panel</div>
            <div className="ff-assistant-tabs">
              {[
                ["coach", "Coach"],
                ["nutrition", "Nutrition"],
                ["calendar", "Calendar"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`ff-assistant-tab${assistantTab === id ? " ff-active" : ""}`}
                  onClick={() => setAssistantTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {assistantTab === "coach" && (
              <div className="ff-assistant-pane ff-active">
                <div className="ff-sec-header">
                  <span className="ff-sec-title">🤖 AI Coach</span>
                  <span className="ff-muted-note" style={{ fontSize: "0.72rem" }}>
                    Post-MVP
                  </span>
                </div>
                <div className="ff-ai-bubble">
                  AI Coach isn&apos;t connected yet. After MVP, you&apos;ll get
                  personalized tips here using your workouts and nutrition data.
                </div>
                <p className="ff-muted-note">Check back after Stage 8.</p>
              </div>
            )}

            {assistantTab === "nutrition" && (
              <div className="ff-assistant-pane ff-active">
                <div className="ff-sec-header">
                  <span className="ff-sec-title">🔥 Nutrition</span>
                  <Link className="ff-sec-link" to="/nutrition">
                    Full Log
                  </Link>
                </div>
                <div className="ff-nutrition-row">
                  <div className="ff-nut-ring">
                    <svg viewBox="0 0 100 100">
                      <circle className="ff-nr-bg" cx="50" cy="50" r="40" />
                      <circle
                        className="ff-nr-fill"
                        cx="50"
                        cy="50"
                        r="40"
                        strokeDasharray="251"
                        strokeDashoffset={251 * (1 - ringPct / 100)}
                      />
                    </svg>
                    <div className="ff-nut-ring-center">
                      <span className="ff-nr-val">{kcalLogged.toLocaleString()}</span>
                      <span className="ff-nr-unit">
                        {targetCal ? `/ ${targetCal}` : "kcal"}
                      </span>
                    </div>
                  </div>
                  <div className="ff-macro-list">
                    <div className="ff-macro-row">
                      <span
                        className="ff-macro-dot"
                        style={{ background: "var(--primary)" }}
                      />
                      <span className="ff-macro-text">Logged today</span>
                      <span className="ff-macro-val">{kcalLogged} kcal</span>
                    </div>
                    <div className="ff-macro-row">
                      <span
                        className="ff-macro-dot"
                        style={{ background: "var(--orange)" }}
                      />
                      <span className="ff-macro-text">Target</span>
                      <span className="ff-macro-val">
                        {targetCal != null ? `${targetCal} kcal` : "Set profile"}
                      </span>
                    </div>
                  </div>
                </div>
                <Link className="ff-log-meal-btn" to="/nutrition">
                  + Log a meal
                </Link>
              </div>
            )}

            {assistantTab === "calendar" && (
              <div className="ff-assistant-pane ff-active">
                <div className="ff-sec-header">
                  <span className="ff-sec-title">📅 Calendar</span>
                  <Link className="ff-sec-link" to="/calendar">
                    Full View
                  </Link>
                </div>
                <div className="ff-cal-header">
                  <span className="ff-cal-month">{monthLabel}</span>
                  <div className="ff-cal-nav">
                    <button
                      type="button"
                      onClick={() =>
                        setCalMonth((c) => ({
                          y: c.m === 0 ? c.y - 1 : c.y,
                          m: c.m === 0 ? 11 : c.m - 1,
                        }))
                      }
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCalMonth((c) => ({
                          y: c.m === 11 ? c.y + 1 : c.y,
                          m: c.m === 11 ? 0 : c.m + 1,
                        }))
                      }
                    >
                      ›
                    </button>
                  </div>
                </div>
                <div className="ff-cal-grid">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <span key={d} className="ff-cal-day-label">
                      {d}
                    </span>
                  ))}
                  {miniCalCells.map((cell) => (
                    <span
                      key={cell.ymd}
                      className={`ff-cal-day${cell.isToday ? " ff-today" : ""}${calWorkoutDays.has(cell.ymd) ? " ff-has-workout" : ""}${!cell.inMonth ? " ff-empty" : ""}`}
                    >
                      {cell.inMonth ? cell.dayNum : ""}
                    </span>
                  ))}
                </div>
                <div className="ff-upcoming">
                  {upcomingRows.length === 0 && (
                    <div className="ff-muted-note" style={{ fontSize: "0.78rem" }}>
                      No upcoming sessions in the next few weeks.
                    </div>
                  )}
                  {upcomingRows.map((u) => (
                    <Link
                      key={u.id + u.ymd}
                      to={`/workouts/${u.id}`}
                      className="ff-upcoming-item"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <span
                        className="ff-upcoming-dot"
                        style={{ background: "var(--primary)" }}
                      />
                      <span>{u.name}</span>
                      <span className="ff-upcoming-day">
                        {new Date(u.ymd + "T12:00:00.000Z").toLocaleDateString(
                          "en-US",
                          { weekday: "short", month: "short", day: "numeric" },
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ff-quiet-widget">
            <div className="ff-quiet-widget-title">🔥 Nutrition Snapshot</div>
            <div className="ff-compact-macro-list">
              <div className="ff-compact-macro-row">
                <span
                  className="ff-macro-dot"
                  style={{ background: "var(--primary)" }}
                />
                Today
                <strong>{kcalLogged.toLocaleString()} kcal</strong>
              </div>
              <div className="ff-compact-macro-row">
                <span
                  className="ff-macro-dot"
                  style={{ background: "var(--orange)" }}
                />
                Target
                <strong>{targetCal != null ? targetCal : "—"}</strong>
              </div>
            </div>
            <button
              type="button"
              className="ff-compact-link"
              onClick={() => setAssistantTab("nutrition")}
            >
              Open Nutrition tab →
            </button>
          </div>

          <div className="ff-quiet-widget">
            <div className="ff-quiet-widget-title">📅 Upcoming Workouts</div>
            <div className="ff-upcoming-mini-list">
              {todayWorkouts.slice(0, 3).map((w) => (
                <div key={w.id} className="ff-upcoming-mini-item">
                  <span
                    className="ff-upcoming-mini-dot"
                    style={{ background: "var(--primary)" }}
                  />
                  <span className="ff-upcoming-mini-name">{w.name}</span>
                  <span className="ff-upcoming-mini-day">Today</span>
                </div>
              ))}
              {todayWorkouts.length === 0 && (
                <div className="ff-muted-note" style={{ fontSize: "0.78rem" }}>
                  Nothing today — start one from Workouts.
                </div>
              )}
            </div>
            <button
              type="button"
              className="ff-compact-link"
              onClick={() => setAssistantTab("calendar")}
            >
              Open Calendar tab →
            </button>
          </div>
        </div>
      </div>

      {primaryWorkout && !completedToday && (
        <button
          type="button"
          style={{
            marginTop: 16,
            padding: "12px 20px",
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--border-light)",
            background: "var(--surface)",
            fontFamily: "var(--font-h)",
            fontWeight: 700,
            cursor: "pointer",
          }}
          onClick={() => setCompleteOpen(true)}
        >
          Mark workout complete (demo)
        </button>
      )}

      <div
        className={`ff-modal-overlay${completeOpen ? " ff-open" : ""}`}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) setCompleteOpen(false);
        }}
      >
        <div className="ff-confirm-modal">
          <div className="ff-confirm-title">Complete today&apos;s workout?</div>
          <div className="ff-confirm-text">
            Mark &apos;{planName}&apos; as completed for today (saved on this device
            only).
          </div>
          <div className="ff-confirm-summary">
            <span className="ff-confirm-pill">
              {exCount} exercise{exCount === 1 ? "" : "s"}
            </span>
            <span className="ff-confirm-pill">{durationGuess}</span>
          </div>
          <div className="ff-confirm-actions">
            <button
              type="button"
              className="ff-confirm-btn"
              onClick={() => setCompleteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ff-confirm-btn ff-primary"
              onClick={confirmComplete}
            >
              Confirm Completion
            </button>
          </div>
        </div>
      </div>

      <div className={`ff-success-toast${toastVisible ? " ff-visible" : ""}`}>
        Workout completed. Nice work.
      </div>
    </>
  );
}
