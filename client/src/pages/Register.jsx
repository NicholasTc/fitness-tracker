import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import "../App.css";

export default function Register() {
  const { token, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell auth-shell">
      <h1>Create account</h1>
      <form className="panel auth-form" onSubmit={handleSubmit}>
        <label htmlFor="reg-email">Email</label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="reg-password">Password (min 8 characters)</label>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Register"}
        </button>
        <p className="meta">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}
