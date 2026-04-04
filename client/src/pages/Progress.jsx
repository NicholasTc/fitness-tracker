import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { API_BASE, bearerAuth, jsonAuthHeaders, parseJsonSafe } from "../lib/api.js";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export default function Progress() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState(null);

  const [measurements, setMeasurements] = useState([]);
  const [mDate, setMDate] = useState(todayYmd);
  const [mWeight, setMWeight] = useState("");
  const [mWaist, setMWaist] = useState("");
  const [mFat, setMFat] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [mSaving, setMSaving] = useState(false);

  const [prs, setPrs] = useState([]);
  const [prFilter, setPrFilter] = useState("");
  const [prExercise, setPrExercise] = useState("");
  const [prWeight, setPrWeight] = useState("");
  const [prReps, setPrReps] = useState("1");
  const [prDate, setPrDate] = useState(todayYmd);
  const [prNotes, setPrNotes] = useState("");
  const [prSaving, setPrSaving] = useState(false);
  const [editingPrId, setEditingPrId] = useState(null);

  const [photos, setPhotos] = useState([]);
  const [photoDate, setPhotoDate] = useState(todayYmd);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const loadMeasurements = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/measurements?limit=200`, {
        headers: bearerAuth(token),
      });
      const data = await parseJsonSafe(res);
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }
      setMeasurements(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [token, logout, navigate]);

  const loadPrs = useCallback(async () => {
    if (!token) return;
    try {
      const qs = prFilter.trim()
        ? `?exercise=${encodeURIComponent(prFilter.trim())}`
        : "";
      const res = await fetch(`${API_BASE}/api/personal-records${qs}`, {
        headers: bearerAuth(token),
      });
      const data = await parseJsonSafe(res);
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }
      setPrs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [token, prFilter, logout, navigate]);

  const loadPhotos = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/progress-photos`, {
        headers: bearerAuth(token),
      });
      const data = await parseJsonSafe(res);
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }
      setPhotos(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    loadMeasurements();
  }, [loadMeasurements]);

  useEffect(() => {
    loadPrs();
  }, [loadPrs]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    return () => {
      if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
    };
  }, [lightboxUrl]);

  async function openPhoto(id) {
    if (!token) return;
    if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
    setLightboxUrl(null);
    try {
      const res = await fetch(`${API_BASE}/api/progress-photos/${id}/file`, {
        headers: bearerAuth(token),
      });
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setLightboxUrl(url);
      setLightbox(id);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  function closeLightbox() {
    if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
    setLightboxUrl(null);
    setLightbox(null);
  }

  async function handleMeasurementSubmit(e) {
    e.preventDefault();
    if (!token) return;
    const hasMetric =
      mWeight.trim() !== "" || mWaist.trim() !== "" || mFat.trim() !== "";
    if (!hasMetric) return;

    setMSaving(true);
    setError(null);
    try {
      const body = {
        date: mDate,
        notes: mNotes.trim() || undefined,
      };
      if (mWeight.trim() !== "") body.weightKg = Number(mWeight);
      if (mWaist.trim() !== "") body.waistCm = Number(mWaist);
      if (mFat.trim() !== "") body.bodyFatPct = Number(mFat);

      const res = await fetch(`${API_BASE}/api/measurements`, {
        method: "POST",
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
        throw new Error(data?.error || res.statusText);
      }
      setMWeight("");
      setMWaist("");
      setMFat("");
      setMNotes("");
      await loadMeasurements();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setMSaving(false);
    }
  }

  async function deleteMeasurement(id) {
    if (!token || !window.confirm("Delete this entry?")) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/measurements/${id}`, {
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
      await loadMeasurements();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  function startEditPr(row) {
    setEditingPrId(row.id);
    setPrExercise(row.exerciseName);
    setPrWeight(String(row.weightKg));
    setPrReps(String(row.reps));
    setPrDate(row.achievedAt ? row.achievedAt.slice(0, 10) : todayYmd());
    setPrNotes(row.notes || "");
  }

  function clearPrForm() {
    setEditingPrId(null);
    setPrExercise("");
    setPrWeight("");
    setPrReps("1");
    setPrDate(todayYmd());
    setPrNotes("");
  }

  async function handlePrSubmit(e) {
    e.preventDefault();
    if (!token || !prExercise.trim()) return;

    setPrSaving(true);
    setError(null);
    try {
      const payload = {
        exerciseName: prExercise.trim(),
        weightKg: Number(prWeight),
        reps: Number(prReps) || 1,
        achievedAt: prDate,
        notes: prNotes.trim() || undefined,
      };

      if (editingPrId) {
        const res = await fetch(
          `${API_BASE}/api/personal-records/${editingPrId}`,
          {
            method: "PUT",
            headers: jsonAuthHeaders(token),
            body: JSON.stringify(payload),
          },
        );
        const data = await parseJsonSafe(res);
        if (res.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        if (!res.ok) {
          throw new Error(data?.error || res.statusText);
        }
      } else {
        const res = await fetch(`${API_BASE}/api/personal-records`, {
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
          throw new Error(data?.error || res.statusText);
        }
      }
      clearPrForm();
      await loadPrs();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setPrSaving(false);
    }
  }

  async function deletePr(id) {
    if (!token || !window.confirm("Delete this PR?")) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/personal-records/${id}`, {
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
      if (editingPrId === id) clearPrForm();
      await loadPrs();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function handlePhotoSubmit(e) {
    e.preventDefault();
    if (!token || !photoFile) return;

    setPhotoSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", photoFile);
      fd.append("date", photoDate);
      if (photoCaption.trim()) fd.append("caption", photoCaption.trim());

      const res = await fetch(`${API_BASE}/api/progress-photos`, {
        method: "POST",
        headers: bearerAuth(token),
        body: fd,
      });
      const data = await parseJsonSafe(res);
      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }
      setPhotoFile(null);
      setPhotoCaption("");
      await loadPhotos();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setPhotoSaving(false);
    }
  }

  async function deletePhoto(id) {
    if (!token || !window.confirm("Delete this photo?")) return;
    if (lightbox === id) closeLightbox();
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/progress-photos/${id}`, {
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
      await loadPhotos();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  return (
    <div className="ff-page">
      <h1 className="ff-page-title">Progress</h1>

      {error && (
        <p className="ff-err" role="alert">
          {error}
        </p>
      )}

      <section className="ff-card" aria-labelledby="meas-heading">
        <h2 id="meas-heading" className="ff-section-title">
          Body measurements
        </h2>
        <p className="ff-meta ff-muted">
          Log at least one metric per entry (weight, waist, or body fat %).
        </p>
        <form onSubmit={handleMeasurementSubmit}>
          <div className="ff-form-grid">
            <label htmlFor="m-date">Date</label>
            <input
              id="m-date"
              type="date"
              value={mDate}
              onChange={(e) => setMDate(e.target.value)}
              required
            />
            <label htmlFor="m-w">Weight (kg)</label>
            <input
              id="m-w"
              type="number"
              step="0.1"
              value={mWeight}
              onChange={(e) => setMWeight(e.target.value)}
              placeholder="Optional"
            />
            <label htmlFor="m-waist">Waist (cm)</label>
            <input
              id="m-waist"
              type="number"
              step="0.1"
              value={mWaist}
              onChange={(e) => setMWaist(e.target.value)}
              placeholder="Optional"
            />
            <label htmlFor="m-fat">Body fat %</label>
            <input
              id="m-fat"
              type="number"
              step="0.1"
              value={mFat}
              onChange={(e) => setMFat(e.target.value)}
              placeholder="Optional"
            />
            <label htmlFor="m-n">Notes</label>
            <input
              id="m-n"
              value={mNotes}
              onChange={(e) => setMNotes(e.target.value)}
              maxLength={1000}
            />
          </div>
          <button type="submit" className="ff-btn-primary" disabled={mSaving}>
            {mSaving ? "Saving…" : "Add entry"}
          </button>
        </form>

        {measurements.length > 0 && (
          <div className="ff-table-wrap">
            <table className="ff-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>kg</th>
                  <th>Waist</th>
                  <th>BF%</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.weightKg ?? "—"}</td>
                    <td>{row.waistCm ?? "—"}</td>
                    <td>{row.bodyFatPct ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="ff-linkish"
                        onClick={() => deleteMeasurement(row.id)}
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
      </section>

      <section className="ff-card" aria-labelledby="pr-heading">
        <h2 id="pr-heading" className="ff-section-title">
          Personal records
        </h2>
        <p className="ff-meta">
          <label>
            Filter by exercise{" "}
            <input
              type="search"
              className="progress-filter"
              value={prFilter}
              onChange={(e) => setPrFilter(e.target.value)}
              placeholder="Contains…"
            />
          </label>
        </p>

        <form onSubmit={handlePrSubmit}>
          <div className="ff-form-grid">
            <label htmlFor="pr-ex">Exercise</label>
            <input
              id="pr-ex"
              value={prExercise}
              onChange={(e) => setPrExercise(e.target.value)}
              required
              maxLength={120}
            />
            <label htmlFor="pr-kg">Weight (kg)</label>
            <input
              id="pr-kg"
              type="number"
              min={0}
              step={0.25}
              value={prWeight}
              onChange={(e) => setPrWeight(e.target.value)}
              required
            />
            <label htmlFor="pr-reps">Reps</label>
            <input
              id="pr-reps"
              type="number"
              min={1}
              value={prReps}
              onChange={(e) => setPrReps(e.target.value)}
              required
            />
            <label htmlFor="pr-d">Date achieved</label>
            <input
              id="pr-d"
              type="date"
              value={prDate}
              onChange={(e) => setPrDate(e.target.value)}
              required
            />
            <label htmlFor="pr-n">Notes</label>
            <input
              id="pr-n"
              value={prNotes}
              onChange={(e) => setPrNotes(e.target.value)}
              maxLength={500}
            />
          </div>
          <p className="ff-meta">
            <button type="submit" className="ff-btn-primary" disabled={prSaving}>
              {prSaving
                ? "Saving…"
                : editingPrId
                  ? "Update PR"
                  : "Add PR"}
            </button>
            {editingPrId && (
              <button
                type="button"
                className="ff-btn-secondary"
                onClick={clearPrForm}
              >
                Cancel edit
              </button>
            )}
          </p>
        </form>

        {prs.length > 0 && (
          <div className="ff-table-wrap">
            <table className="ff-data-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Weight × reps</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {prs.map((row) => (
                  <tr key={row.id}>
                    <td>{row.exerciseName}</td>
                    <td>
                      {row.weightKg} kg × {row.reps}
                    </td>
                    <td>
                      {row.achievedAt
                        ? new Date(row.achievedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ff-linkish"
                        onClick={() => startEditPr(row)}
                      >
                        Edit
                      </button>{" "}
                      <button
                        type="button"
                        className="ff-linkish"
                        onClick={() => deletePr(row.id)}
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
      </section>

      <section className="ff-card" aria-labelledby="photo-heading">
        <h2 id="photo-heading" className="ff-section-title">
          Progress photos
        </h2>
        <p className="ff-meta ff-muted">
          JPEG, PNG, WebP, or GIF — max 5MB. Stored in your MongoDB (private to
          your account).
        </p>
        <form onSubmit={handlePhotoSubmit}>
          <div className="ff-form-grid">
            <label htmlFor="ph-d">Date</label>
            <input
              id="ph-d"
              type="date"
              value={photoDate}
              onChange={(e) => setPhotoDate(e.target.value)}
              required
            />
            <label htmlFor="ph-cap">Caption</label>
            <input
              id="ph-cap"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              maxLength={300}
            />
            <label htmlFor="ph-f">Image</label>
            <input
              id="ph-f"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            type="submit"
            className="ff-btn-primary"
            disabled={photoSaving || !photoFile}
          >
            {photoSaving ? "Uploading…" : "Upload"}
          </button>
        </form>

        {photos.length > 0 && (
          <ul className="photo-meta-list">
            {photos.map((p) => (
              <li key={p.id}>
                <strong>{p.dateTaken}</strong>
                {p.caption ? ` — ${p.caption}` : ""}{" "}
                <button type="button" className="ff-linkish" onClick={() => openPhoto(p.id)}>
                  View
                </button>{" "}
                <button
                  type="button"
                  className="ff-linkish"
                  onClick={() => deletePhoto(p.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lightbox && lightboxUrl && (
        <div
          className="lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
        >
          <div className="lightbox-inner">
            <button type="button" className="lightbox-close" onClick={closeLightbox}>
              Close
            </button>
            <img src={lightboxUrl} alt="Progress" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
}
