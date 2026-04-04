import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import {
  AVATAR_ICON_LIST,
  AVATAR_STORAGE_KEY,
  IoCloseOutline,
  IoPulseOutline,
  NAV_ICON,
} from "../icons/fitflowIonIcons.js";
import "../styles/fitflow-landing.css";

export default function Login() {
  const { token, login, register } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFirst, setSignupFirst] = useState("");
  const [signupLast, setSignupLast] = useState("");
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [signupError, setSignupError] = useState(null);
  const [signupSubmitting, setSignupSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("signup") === "1") {
      setModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setSignupError(null);
    setSignupSubmitting(true);
    try {
      localStorage.setItem(
        AVATAR_STORAGE_KEY,
        String(Math.min(avatarIdx, AVATAR_ICON_LIST.length - 1)),
      );
      await register(signupEmail, signupPassword);
      setModalOpen(false);
      setSearchParams({});
    } catch (err) {
      setSignupError(err.message || String(err));
    } finally {
      setSignupSubmitting(false);
    }
  }

  function openModal() {
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSearchParams({});
  }

  return (
    <div className="ff-landing-root">
      <div className="landing">
        <div className="landing-left">
          <div className="brand">
            <span className="brand-icon" aria-hidden>
              <IoPulseOutline size={22} />
            </span>{" "}
            FitFlow
          </div>

          <h1 className="welcome-heading">
            Your fitness,
            <br />
            <span>together.</span>
          </h1>
          <p className="welcome-sub">
            Plan workouts, track calories, and crush goals — built for just the
            two of you.
          </p>

          <div className="feature-list">
            {[
              [NAV_ICON.workouts, "Workout Planner", "Custom routines & expert plans"],
              [NAV_ICON.calendar, "Calendar", "Schedule & visualize your week"],
              [NAV_ICON.nutrition, "Calorie Tracker", "Log meals & hit your macros"],
              [NAV_ICON.tdee, "TDEE Calculator", "Personalized nutrition targets"],
              [NAV_ICON.aiCoach, "AI Coach", "Smart feedback & recommendations"],
              [NAV_ICON.progress, "Progress Tracker", "Body metrics, PRs & streaks"],
            ].map((row) => {
              const IconComponent = row[0];
              const name = row[1];
              const desc = row[2];
              return (
              <div key={name} className="feature-item">
                <div className="feature-icon" aria-hidden>
                  <IconComponent size={22} />
                </div>
                <div>
                  <div className="feature-name">{name}</div>
                  <div className="feature-desc">{desc}</div>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        <div className="landing-right">
          <div className="login-card">
            <h2>Welcome back</h2>
            <p className="sub">Sign in to your profile</p>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-options">
                <label className="remember">
                  <input type="checkbox" defaultChecked /> Remember me
                </label>
                <span className="forgot-link" title="Not implemented in MVP">
                  Forgot password?
                </span>
              </div>

              {error && (
                <p className="err" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="divider">or</div>

            <button type="button" className="btn btn-outline" onClick={openModal}>
              Create an Account
            </button>

            <p className="toggle-text">
              New here?{" "}
              <button type="button" className="link" onClick={openModal}>
                Sign up now
              </button>
            </p>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay${modalOpen ? " active" : ""}`}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="modal">
          <button
            type="button"
            className="modal-close"
            onClick={closeModal}
            aria-label="Close"
          >
            <IoCloseOutline size={20} />
          </button>

          <h2>Create your profile</h2>
          <p className="sub">Set up your account to get started</p>

          <form onSubmit={handleSignup}>
            <div className="name-row">
              <div className="form-group">
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Nicholas"
                  value={signupFirst}
                  onChange={(e) => setSignupFirst(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Chan"
                  value={signupLast}
                  onChange={(e) => setSignupLast(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signupEmail">Email</label>
              <input
                id="signupEmail"
                type="email"
                placeholder="you@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signupPassword">Password</label>
              <input
                id="signupPassword"
                type="password"
                placeholder="Min. 8 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="avatar-select">
              <label>Choose your avatar</label>
              <div className="avatar-options">
                {AVATAR_ICON_LIST.map((Icon, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`avatar-option${i === avatarIdx ? " selected" : ""}`}
                    onClick={() => setAvatarIdx(i)}
                    aria-label={`Avatar option ${i + 1}`}
                  >
                    <Icon size={22} />
                  </button>
                ))}
              </div>
            </div>

            {signupError && (
              <p className="err" role="alert">
                {signupError}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={signupSubmitting}
            >
              {signupSubmitting ? "Creating…" : "Create Account"}
            </button>
          </form>

          <p className="toggle-text">
            Already have an account?{" "}
            <button type="button" className="link" onClick={closeModal}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
