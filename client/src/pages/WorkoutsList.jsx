import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, parseJsonSafe } from "../lib/api.js";

function formatDay(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function WorkoutsList() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
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

  return (
    <div className="ff-page">
      <h1 className="ff-page-title">Workout Planner</h1>
      <p className="ff-meta">
        <Link to="/workouts/new">New workout</Link>
      </p>

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
        <div className="ff-card ff-table-wrap">
          <table className="ff-data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Exercises</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id}>
                  <td>
                    <Link to={`/workouts/${w.id}`}>{w.name}</Link>
                  </td>
                  <td>{formatDay(w.date)}</td>
                  <td>{w.exercises?.length ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className="ff-linkish"
                      onClick={() => handleDelete(w.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" className="ff-btn-secondary" onClick={load}>
        Refresh
      </button>
    </div>
  );
}
