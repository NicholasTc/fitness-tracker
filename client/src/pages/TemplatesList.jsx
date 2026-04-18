import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, jsonAuthHeaders, parseJsonSafe } from "../lib/api.js";
import { toLocalYmd } from "../lib/date.js";

export default function TemplatesList() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionDates, setSessionDates] = useState({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/workout-templates`, {
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

  function setDateFor(id, value) {
    setSessionDates((prev) => ({ ...prev, [id]: value }));
  }

  async function startFromTemplate(templateId) {
    const dateStr = sessionDates[templateId] || toLocalYmd();
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/workouts/from-template`, {
        method: "POST",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify({ templateId, date: dateStr }),
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
      navigate(`/workouts/${data.id}`);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function handleDelete(id) {
    if (!token || !window.confirm("Delete this template?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/workout-templates/${id}`, {
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

  const today = toLocalYmd();

  return (
    <div className="ff-page">
      <h1 className="ff-page-title">Templates</h1>

      <p className="ff-meta">
        <Link to="/templates/new">New template</Link>
      </p>

      {loading && <p className="ff-meta">Loading…</p>}
      {error && (
        <p className="ff-err" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="ff-muted">No templates yet. Create a reusable plan above.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="ff-card ff-table-wrap">
          <table className="ff-data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Exercises</th>
                <th>Session date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/templates/${t.id}`}>{t.name}</Link>
                  </td>
                  <td>{t.exercises?.length ?? 0}</td>
                  <td>
                    <input
                      type="date"
                      aria-label={`Date for ${t.name}`}
                      value={sessionDates[t.id] ?? today}
                      onChange={(e) => setDateFor(t.id, e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ff-btn-primary"
                      onClick={() => startFromTemplate(t.id)}
                    >
                      Start session
                    </button>{" "}
                    <button
                      type="button"
                      className="ff-linkish"
                      onClick={() => handleDelete(t.id)}
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
