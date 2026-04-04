import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, jsonAuthHeaders, parseJsonSafe } from "../lib/api.js";
import { IoChevronBackOutline } from "../icons/fitflowIonIcons.js";

function emptyExercise() {
  return { name: "", sets: 3, reps: 10, weightKg: "" };
}

export default function TemplateEditor() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const isNew = location.pathname === "/templates/new";
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [exercises, setExercises] = useState([emptyExercise()]);

  const load = useCallback(async () => {
    if (!token || isNew || !paramId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/workout-templates/${paramId}`, {
        headers: bearerAuth(token),
      });
      const data = await parseJsonSafe(res);
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (res.status === 404) {
        navigate("/templates", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
      }
      setName(data.name || "");
      if (data.exercises?.length) {
        setExercises(
          data.exercises.map((e) => ({
            name: e.name || "",
            sets: e.sets ?? 3,
            reps: e.reps ?? 10,
            weightKg: e.weightKg != null ? String(e.weightKg) : "",
          })),
        );
      } else {
        setExercises([emptyExercise()]);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [token, isNew, paramId, logout, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  function updateExercise(i, field, value) {
    setExercises((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()]);
  }

  function removeExercise(i) {
    setExercises((prev) => prev.filter((_, j) => j !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      exercises: exercises.map((e) => ({
        name: e.name.trim(),
        sets: Number(e.sets),
        reps: Number(e.reps),
        weightKg:
          e.weightKg === "" || e.weightKg == null
            ? undefined
            : Number(e.weightKg),
      })),
    };
    try {
      if (isNew) {
        const res = await fetch(`${API_BASE}/api/workout-templates`, {
          method: "POST",
          headers: jsonAuthHeaders(token),
          body: JSON.stringify(payload),
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
        navigate(`/templates/${data.id}`, { replace: true });
        return;
      }
      const res = await fetch(`${API_BASE}/api/workout-templates/${paramId}`, {
        method: "PATCH",
        headers: jsonAuthHeaders(token),
        body: JSON.stringify(payload),
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
      navigate("/templates");
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ff-page">
      <h1 className="ff-page-title">
        {isNew ? "New template" : "Edit template"}
      </h1>
      <p className="ff-meta ff-meta-back">
        <Link to="/templates">
          <IoChevronBackOutline className="ff-back-ico" aria-hidden />
          Templates
        </Link>
      </p>

      {loading && <p className="ff-meta">Loading…</p>}
      {error && (
        <p className="ff-err" role="alert">
          {error}
        </p>
      )}

      {!loading && (
        <form className="ff-card" onSubmit={handleSubmit}>
          <div className="ff-form-grid">
            <label htmlFor="t-name">Template name</label>
            <input
              id="t-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <h2 className="ff-section-title">Exercises</h2>
          <div className="ff-exercise-stack">
          {exercises.map((ex, i) => (
            <div key={i} className="ff-exercise-block">
              <div className="ff-form-grid">
                <label>Name</label>
                <input
                  value={ex.name}
                  onChange={(e) => updateExercise(i, "name", e.target.value)}
                  required
                />
                <label>Sets</label>
                <input
                  type="number"
                  min={1}
                  value={ex.sets}
                  onChange={(e) =>
                    updateExercise(i, "sets", Number(e.target.value))
                  }
                  required
                />
                <label>Reps</label>
                <input
                  type="number"
                  min={1}
                  value={ex.reps}
                  onChange={(e) =>
                    updateExercise(i, "reps", Number(e.target.value))
                  }
                  required
                />
                <label>Weight (kg)</label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={ex.weightKg}
                  onChange={(e) =>
                    updateExercise(i, "weightKg", e.target.value)
                  }
                  placeholder="Optional"
                />
              </div>
              {exercises.length > 1 && (
                <button
                  type="button"
                  className="ff-btn-secondary"
                  onClick={() => removeExercise(i)}
                >
                  Remove exercise
                </button>
              )}
            </div>
          ))}
          </div>
          <button type="button" className="ff-btn-secondary" onClick={addExercise}>
            Add exercise
          </button>

          <p className="ff-meta">
            <button type="submit" className="ff-btn-primary" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create" : "Save"}
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
