import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, jsonAuthHeaders, parseJsonSafe } from "../lib/api.js";
import {
  applyTheme,
  normalizeTheme,
  persistThemeMirror,
} from "../lib/theme.js";

const SEX = [
  { value: "", label: "—" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const ACTIVITY = [
  { value: "", label: "—" },
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very active" },
];

const GOAL = [
  { value: "", label: "—" },
  { value: "cut", label: "Cut" },
  { value: "maintain", label: "Maintain" },
  { value: "bulk", label: "Bulk" },
];

export default function Profile() {
  const { token, logout, patchUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [sex, setSex] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [targetCalories, setTargetCalories] = useState("");

  const [computed, setComputed] = useState(null);
  const [effectiveTargetCalories, setEffectiveTargetCalories] = useState(null);

  const [theme, setTheme] = useState("default");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
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
      const p = data.profile || {};
      setHeightCm(p.heightCm ?? "");
      setWeightKg(p.weightKg ?? "");
      setAgeYears(p.ageYears ?? "");
      setSex(p.sex ?? "");
      setActivityLevel(p.activityLevel ?? "");
      setGoal(p.goal ?? "");
      setTargetCalories(
        p.targetCalories != null ? String(p.targetCalories) : "",
      );
      setComputed(data.computed ?? null);
      setEffectiveTargetCalories(data.effectiveTargetCalories ?? null);
      const th = normalizeTheme(data.theme);
      setTheme(th);
      patchUser({ theme: th });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate, patchUser]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        heightCm: heightCm === "" ? null : Number(heightCm),
        weightKg: weightKg === "" ? null : Number(weightKg),
        ageYears: ageYears === "" ? null : Number(ageYears),
        sex: sex || null,
        activityLevel: activityLevel || null,
        goal: goal || null,
        targetCalories:
          targetCalories.trim() === "" ? null : Number(targetCalories),
        theme: normalizeTheme(theme),
      };
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify(body),
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
      setComputed(data.computed ?? null);
      setEffectiveTargetCalories(data.effectiveTargetCalories ?? null);
      const nextTheme = normalizeTheme(data.theme);
      setTheme(nextTheme);
      patchUser({ theme: nextTheme });
      applyTheme(nextTheme);
      persistThemeMirror(nextTheme);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ff-page">
      <h1 className="ff-page-title">TDEE &amp; profile</h1>

      {loading && <p className="ff-meta">Loading…</p>}
      {error && (
        <p className="ff-err" role="alert">
          {error}
        </p>
      )}

      {!loading && (
        <form className="ff-card" onSubmit={handleSubmit}>
          <h2 className="ff-section-title">Appearance</h2>
          <p className="ff-meta ff-muted">
            Applies across the app and the sign-in page after you log out on this
            device.
          </p>
          <div className="ff-form-grid">
            <label htmlFor="theme">Color theme</label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="default">Default (indigo)</option>
              <option value="roseLight">Soft pink</option>
            </select>
          </div>

          <h2 className="ff-section-title">Body &amp; goals</h2>
          <p className="ff-meta">
            Values feed the Mifflin–St Jeor estimate. Leave fields empty if
            unknown.
          </p>

          <div className="ff-form-grid">
            <label htmlFor="heightCm">Height (cm)</label>
            <input
              id="heightCm"
              type="number"
              min={50}
              max={260}
              step={0.1}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />

            <label htmlFor="weightKg">Weight (kg)</label>
            <input
              id="weightKg"
              type="number"
              min={20}
              max={400}
              step={0.1}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />

            <label htmlFor="ageYears">Age (years)</label>
            <input
              id="ageYears"
              type="number"
              min={13}
              max={120}
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
            />

            <label htmlFor="sex">Sex (for BMR formula)</label>
            <select
              id="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
            >
              {SEX.map((o) => (
                <option key={o.value || "empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label htmlFor="activityLevel">Activity</label>
            <select
              id="activityLevel"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
            >
              {ACTIVITY.map((o) => (
                <option key={o.value || "empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label htmlFor="goal">Goal</label>
            <select id="goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
              {GOAL.map((o) => (
                <option key={o.value || "empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label htmlFor="targetCalories">
              Manual calorie target (optional override)
            </label>
            <input
              id="targetCalories"
              type="number"
              min={800}
              max={20000}
              placeholder="Leave empty to use formula"
              value={targetCalories}
              onChange={(e) => setTargetCalories(e.target.value)}
            />
          </div>

          <button type="submit" className="ff-btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>

          <section aria-live="polite">
            <h2 className="ff-section-title">Estimates</h2>
            {!computed && (
              <p className="ff-muted">
                Fill height, weight, age, sex, activity, and goal for BMR / TDEE /
                recommended calories.
              </p>
            )}
            {computed && (
              <ul className="ff-estimate-list">
                <li>
                  BMR: <strong>{computed.bmr}</strong> kcal/day
                </li>
                <li>
                  TDEE: <strong>{computed.tdee}</strong> kcal/day
                </li>
                <li>
                  Recommended (from goal):{" "}
                  <strong>{computed.recommendedCalories}</strong> kcal/day
                </li>
                <li>
                  Effective daily target:{" "}
                  <strong>{effectiveTargetCalories ?? "—"}</strong> kcal/day
                  {targetCalories.trim() !== "" && (
                    <span className="ff-muted"> (manual override)</span>
                  )}
                </li>
              </ul>
            )}
          </section>
        </form>
      )}
    </div>
  );
}
