import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import "../styles/fitflow-app.css";

const AVATAR_KEY = "fitflow_avatar_emoji";

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const avatar =
    typeof window !== "undefined"
      ? localStorage.getItem(AVATAR_KEY) || "🏋️"
      : "🏋️";

  const email = user?.email ?? "";
  const displayName = email.includes("@")
    ? email.split("@")[0]
    : email || "You";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="ff-app-root">
      <div className="ff-app">
        <aside className="ff-sidebar" aria-label="Main navigation">
          <div className="ff-sidebar-brand">
            <span>◉</span> FitFlow
          </div>

          <nav className="ff-sidebar-nav">
            <NavLink
              end
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/"
            >
              <span className="ff-icon">🏠</span> Dashboard
            </NavLink>

            <div className="ff-nav-section-label">Training</div>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/workouts"
            >
              <span className="ff-icon">📋</span> Workout Planner
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/calendar"
            >
              <span className="ff-icon">📅</span> Calendar
            </NavLink>

            <div className="ff-nav-section-label">Nutrition</div>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/nutrition"
            >
              <span className="ff-icon">🔥</span> Calorie Tracker
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/profile"
            >
              <span className="ff-icon">🧮</span> TDEE Calculator
            </NavLink>

            <div className="ff-nav-section-label">Insights</div>
            <button
              type="button"
              className="ff-nav-item"
              title="AI Coach is planned after MVP"
              disabled
            >
              <span className="ff-icon">🤖</span> AI Coach
            </button>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/progress"
            >
              <span className="ff-icon">📊</span> Progress
            </NavLink>
          </nav>

          <div className="ff-sidebar-footer">
            <Link className="ff-user-pill" to="/profile">
              <div className="ff-user-avatar" aria-hidden>
                {avatar}
              </div>
              <div>
                <div className="ff-user-name">{displayName}</div>
                <div className="ff-user-email">{email || "—"}</div>
              </div>
            </Link>
            <button type="button" className="ff-logout-btn" onClick={handleLogout}>
              <span>←</span> Sign Out
            </button>
          </div>
        </aside>

        <main className="ff-main">
          <header className="ff-mobile-topbar">
            <div className="ff-mobile-topbar-left">
              <div className="ff-mobile-avatar" aria-hidden>
                {avatar}
              </div>
              <div>
                <div className="ff-mobile-greeting">Hey, {displayName}</div>
                <div className="ff-mobile-date">{today}</div>
              </div>
            </div>
            <div className="ff-mobile-topbar-right">
              <span className="ff-mobile-btn" aria-hidden title="Notifications">
                🔔
              </span>
              <Link className="ff-mobile-btn" to="/profile" title="Settings">
                ⚙️
              </Link>
            </div>
          </header>

          <div className="ff-main-inner">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="ff-bottom-nav" aria-label="Mobile">
        <NavLink
          end
          className={({ isActive }) => `ff-nav-tab${isActive ? " ff-active" : ""}`}
          to="/"
        >
          <span className="ff-nav-tab-icon">🏠</span>
          <span className="ff-nav-tab-label">Home</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `ff-nav-tab${isActive ? " ff-active" : ""}`}
          to="/workouts"
        >
          <span className="ff-nav-tab-icon">📋</span>
          <span className="ff-nav-tab-label">Plan</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `ff-nav-tab${isActive ? " ff-active" : ""}`}
          to="/calendar"
        >
          <span className="ff-nav-tab-icon">📅</span>
          <span className="ff-nav-tab-label">Calendar</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `ff-nav-tab${isActive ? " ff-active" : ""}`}
          to="/nutrition"
        >
          <span className="ff-nav-tab-icon">🔥</span>
          <span className="ff-nav-tab-label">Nutrition</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `ff-nav-tab${isActive ? " ff-active" : ""}`}
          to="/profile"
        >
          <span className="ff-nav-tab-icon">👤</span>
          <span className="ff-nav-tab-label">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
