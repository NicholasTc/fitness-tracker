import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, parseJsonSafe } from "../lib/api.js";
import { addDaysLocalYmd, parseLocalYmd, toLocalYmd } from "../lib/date.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymdFromIso(iso) {
  if (!iso) return null;
  return iso.slice(0, 10);
}

function localTodayParts() {
  const n = new Date();
  return { year: n.getFullYear(), month: n.getMonth() };
}

/** First Sunday (ymd) of the calendar grid that contains this month; last Saturday ymd. */
function monthGridBounds(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const pad = first.getDay();
  const gridStart = new Date(year, monthIndex, 1 - pad);
  const lastDay = last.getDate();
  const lastDow = last.getDay();
  const tail = 6 - lastDow;
  const gridEnd = new Date(year, monthIndex, lastDay + tail);
  return {
    start: toLocalYmd(gridStart),
    end: toLocalYmd(gridEnd),
  };
}

function monthCells(year, monthIndex) {
  const { start } = monthGridBounds(year, monthIndex);
  const gridStart = parseLocalYmd(start);
  if (!gridStart) return [];
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const ymd = toLocalYmd(d);
    const inMonth = d.getMonth() === monthIndex;
    cells.push({ ymd, inMonth, dayNum: d.getDate() });
  }
  return cells;
}

function sundayWeekContainingYmd(ymd) {
  const d = parseLocalYmd(ymd);
  if (!d) return "";
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return toLocalYmd(d);
}

function weekCellsFromSunday(sundayYmd) {
  const start = parseLocalYmd(sundayYmd);
  if (!start) return [];
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      ymd: toLocalYmd(d),
      dayNum: d.getDate(),
    });
  }
  return cells;
}

function shiftMonth(year, monthIndex, delta) {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function shiftWeek(sundayYmd, deltaWeeks) {
  return sundayWeekContainingYmd(addDaysLocalYmd(sundayYmd, deltaWeeks * 7));
}

export default function Calendar() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("month");
  const [cursor, setCursor] = useState(() => localTodayParts());
  const [weekSunday, setWeekSunday] = useState(() =>
    sundayWeekContainingYmd(toLocalYmd()),
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [nutritionByDay, setNutritionByDay] = useState([]);

  const range = useMemo(() => {
    if (mode === "month") {
      return monthGridBounds(cursor.year, cursor.month);
    }
    const start = weekSunday;
    const cells = weekCellsFromSunday(start);
    return { start, end: cells[6].ymd };
  }, [mode, cursor.year, cursor.month, weekSunday]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ start: range.start, end: range.end });
      const res = await fetch(`${API_BASE}/api/calendar?${qs}`, {
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
      setWorkouts(Array.isArray(data.workouts) ? data.workouts : []);
      setNutritionByDay(
        Array.isArray(data.nutritionByDay) ? data.nutritionByDay : [],
      );
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [token, range.start, range.end, logout, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const workoutsByDay = useMemo(() => {
    const m = new Map();
    for (const w of workouts) {
      const k = ymdFromIso(w.date);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(w);
    }
    return m;
  }, [workouts]);

  const kcalByDay = useMemo(() => {
    const m = new Map();
    for (const row of nutritionByDay) {
      if (row.date) m.set(row.date, row.calories);
    }
    return m;
  }, [nutritionByDay]);

  const monthCellsList = useMemo(
    () => monthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const weekCellsList = useMemo(
    () => weekCellsFromSunday(weekSunday),
    [weekSunday],
  );

  const titleMonth = new Date(cursor.year, cursor.month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const titleWeek = `${weekCellsList[0].ymd} → ${weekCellsList[6].ymd}`;

  return (
    <div className="ff-page ff-page-calendar">
      <h1 className="ff-page-title">Calendar</h1>

      <div className="calendar-toolbar ff-card">
        <label className="calendar-mode">
          View
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            aria-label="Calendar view mode"
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
          </select>
        </label>
        {mode === "month" && (
          <div className="calendar-nav">
            <button
              type="button"
              className="ff-btn-secondary"
              onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
            >
              ← Prev
            </button>
            <span className="calendar-title">{titleMonth}</span>
            <button
              type="button"
              className="ff-btn-secondary"
              onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
            >
              Next →
            </button>
            <button
              type="button"
              className="ff-btn-secondary"
              onClick={() => setCursor(localTodayParts())}
            >
              Today
            </button>
          </div>
        )}
        {mode === "week" && (
          <div className="calendar-nav">
            <button
              type="button"
              className="ff-btn-secondary"
              onClick={() => setWeekSunday((w) => shiftWeek(w, -1))}
            >
              ← Prev week
            </button>
            <span className="calendar-title">{titleWeek}</span>
            <button
              type="button"
              className="ff-btn-secondary"
              onClick={() => setWeekSunday((w) => shiftWeek(w, 1))}
            >
              Next week →
            </button>
            <button
              type="button"
              className="ff-btn-secondary"
              onClick={() =>
                setWeekSunday(sundayWeekContainingYmd(toLocalYmd()))
              }
            >
              This week
            </button>
          </div>
        )}
      </div>

      {loading && <p className="ff-meta">Loading…</p>}
      {error && (
        <p className="ff-err" role="alert">
          {error}
        </p>
      )}

      {!loading && mode === "month" && (
        <div className="calendar-grid-wrap ff-card" role="grid" aria-label="Month">
          <div className="calendar-weekdays">
            {WEEKDAYS.map((d) => (
              <div key={d} className="calendar-wd">
                {d}
              </div>
            ))}
          </div>
          <div className="calendar-cells">
            {monthCellsList.map((cell) => (
              <div
                key={cell.ymd}
                className={`calendar-cell ${cell.inMonth ? "" : "calendar-cell-muted"}`}
              >
                <div className="calendar-cell-head">
                  <span className="calendar-daynum">{cell.dayNum}</span>
                  {kcalByDay.has(cell.ymd) && (
                    <span className="calendar-kcal">
                      {kcalByDay.get(cell.ymd)} kcal
                    </span>
                  )}
                </div>
                <ul className="calendar-events">
                  {(workoutsByDay.get(cell.ymd) || []).map((w) => (
                    <li key={w.id}>
                      <Link to={`/workouts/${w.id}`}>{w.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && mode === "week" && (
        <div className="calendar-week-strip panel" role="group" aria-label="Week">
          {weekCellsList.map((cell) => (
            <div key={cell.ymd} className="calendar-week-day">
              <div className="calendar-week-day-head">
                <span className="calendar-daynum">{cell.dayNum}</span>
                <span className="calendar-ymd">{cell.ymd}</span>
              </div>
              {kcalByDay.has(cell.ymd) && (
                <p className="calendar-kcal-line">{kcalByDay.get(cell.ymd)} kcal</p>
              )}
              <ul className="calendar-events">
                {(workoutsByDay.get(cell.ymd) || []).map((w) => (
                  <li key={w.id}>
                    <Link to={`/workouts/${w.id}`}>{w.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="ff-meta">
        Workouts use session dates; legacy rows fall back to created date. Food
        totals are summed per day on the server.
      </p>
    </div>
  );
}
