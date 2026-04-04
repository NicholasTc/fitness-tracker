import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, jsonAuthHeaders, parseJsonSafe } from "../lib/api.js";
import "../App.css";

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [healthStatus, setHealthStatus] = useState("idle");
  const [healthPayload, setHealthPayload] = useState(null);
  const [healthError, setHealthError] = useState(null);

  const [workouts, setWorkouts] = useState([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [workoutsError, setWorkoutsError] = useState(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const checkHealth = useCallback(async () => {
    setHealthStatus("loading");
    setHealthError(null);
    setHealthPayload(null);
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        throw new Error(res.statusText || `HTTP ${res.status}`);
      }
      setHealthPayload(data);
      setHealthStatus("ok");
    } catch (e) {
      setHealthError(e.message || String(e));
      setHealthStatus("error");
    }
  }, []);

  const loadWorkouts = useCallback(async () => {
    if (!token) return;
    setWorkoutsLoading(true);
    setWorkoutsError(null);
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
        const msg =
          data?.error || res.statusText || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setWorkouts(Array.isArray(data) ? data : []);
    } catch (e) {
      setWorkoutsError(e.message || String(e));
      setWorkouts([]);
    } finally {
      setWorkoutsLoading(false);
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  async function handleAddWorkout(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !token) return;

    setSaving(true);
    setWorkoutsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/workouts`, {
        method: "POST",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify({ name }),
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
      setNewName("");
      await loadWorkouts();
    } catch (e) {
      setWorkoutsError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="shell">
      <header className="dash-header">
        <div>
          <h1>Fitness app</h1>
          <p className="meta">
            Signed in as <strong>{user?.email}</strong> ·{" "}
            <Link to="/profile">Profile</Link>
          </p>
        </div>
        <button type="button" className="logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <p className="meta">
        API base: <code>{API_BASE}</code>
      </p>

      <section className="panel" aria-labelledby="health-heading">
        <h2 id="health-heading" className="panel-title">
          API health
        </h2>
        {healthStatus === "loading" && <p>Checking…</p>}
        {healthStatus === "ok" && (
          <p className="success">
            OK: <code>{JSON.stringify(healthPayload)}</code>
          </p>
        )}
        {healthStatus === "error" && (
          <p className="err">Health check failed: {healthError}</p>
        )}
        <button type="button" onClick={checkHealth}>
          Retry health
        </button>
      </section>

      <section className="panel" aria-labelledby="workouts-heading">
        <h2 id="workouts-heading" className="panel-title">
          Your workouts
        </h2>
        <p className="meta">
          <code>GET/POST /api/workouts</code> — scoped to your account (Stage 2).
        </p>

        <form className="workout-form" onSubmit={handleAddWorkout}>
          <label htmlFor="workout-name">Name</label>
          <div className="workout-form-row">
            <input
              id="workout-name"
              type="text"
              name="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Morning push"
              maxLength={200}
              autoComplete="off"
            />
            <button type="submit" disabled={saving || !newName.trim()}>
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </form>

        {workoutsLoading && <p>Loading workouts…</p>}
        {workoutsError && (
          <p className="err" role="alert">
            {workoutsError}
          </p>
        )}
        {!workoutsLoading && !workoutsError && workouts.length === 0 && (
          <p className="muted">No workouts yet. Add one above.</p>
        )}
        {!workoutsLoading && workouts.length > 0 && (
          <ul className="workout-list">
            {workouts.map((w) => (
              <li key={w.id}>
                <span className="workout-name">{w.name}</span>
                <span className="workout-date">
                  {w.createdAt
                    ? new Date(w.createdAt).toLocaleString()
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="secondary" onClick={loadWorkouts}>
          Refresh list
        </button>
      </section>
    </main>
  );
}
