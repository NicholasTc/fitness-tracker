import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { AvatarIcon } from "../icons/AvatarIcon.jsx";
import {
  IoLogOutOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoPulseOutline,
  IoSettingsOutline,
  NAV_ICON,
  readAvatarIconIndex,
} from "../icons/fitflowIonIcons.js";
import "../styles/fitflow-app.css";

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [avatarIdx] = useState(() => readAvatarIconIndex());

  const email = user?.email ?? "";
  const displayName = (user?.firstName || "").trim()
    || (email.includes("@") ? email.split("@")[0] : email || "You");

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const {
    dashboard: IconDashboard,
    workouts: IconWorkouts,
    calendar: IconCalendar,
    nutrition: IconNutrition,
    tdee: IconTdee,
    aiCoach: IconAiCoach,
    progress: IconProgress,
  } = NAV_ICON;

  return (
    <div className="ff-app-root">
      <div className="ff-app">
        <aside className="ff-sidebar" aria-label="Main navigation">
          <div className="ff-sidebar-brand">
            <span className="ff-brand-ico" aria-hidden>
              <IoPulseOutline size={18} />
            </span>{" "}
            FitFlow
          </div>

          <nav className="ff-sidebar-nav">
            <NavLink
              end
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/"
            >
              <span className="ff-icon" aria-hidden>
                <IconDashboard />
              </span>{" "}
              Dashboard
            </NavLink>

            <div className="ff-nav-section-label">Training</div>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/workouts"
            >
              <span className="ff-icon" aria-hidden>
                <IconWorkouts />
              </span>{" "}
              Workout Planner
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/calendar"
            >
              <span className="ff-icon" aria-hidden>
                <IconCalendar />
              </span>{" "}
              Calendar
            </NavLink>

            <div className="ff-nav-section-label">Nutrition</div>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/nutrition"
            >
              <span className="ff-icon" aria-hidden>
                <IconNutrition />
              </span>{" "}
              Calorie Tracker
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/profile"
            >
              <span className="ff-icon" aria-hidden>
                <IconTdee />
              </span>{" "}
              TDEE Calculator
            </NavLink>

            <div className="ff-nav-section-label">Insights</div>
            <button
              type="button"
              className="ff-nav-item"
              title="AI Coach is planned after MVP"
              disabled
            >
              <span className="ff-icon" aria-hidden>
                <IconAiCoach />
              </span>{" "}
              AI Coach
            </button>
            <NavLink
              className={({ isActive }) =>
                `ff-nav-item${isActive ? " active" : ""}`
              }
              to="/progress"
            >
              <span className="ff-icon" aria-hidden>
                <IconProgress />
              </span>{" "}
              Progress
            </NavLink>
          </nav>

          <div className="ff-sidebar-footer">
            <Link className="ff-user-pill" to="/profile">
              <div className="ff-user-avatar" aria-hidden>
                <AvatarIcon index={avatarIdx} size={17} />
              </div>
              <div>
                <div className="ff-user-name">{displayName}</div>
                <div className="ff-user-email">{email || "—"}</div>
              </div>
            </Link>
            <button type="button" className="ff-logout-btn" onClick={handleLogout}>
              <span className="ff-icon" aria-hidden>
                <IoLogOutOutline size={16} />
              </span>
              Sign Out
            </button>
          </div>
        </aside>

        <main className="ff-main">
          <header className="ff-mobile-topbar">
            <div className="ff-mobile-topbar-left">
              <div className="ff-mobile-avatar" aria-hidden>
                <AvatarIcon index={avatarIdx} size={18} />
              </div>
              <div>
                <div className="ff-mobile-greeting">Hey, {displayName}</div>
                <div className="ff-mobile-date">{today}</div>
              </div>
            </div>
            <div className="ff-mobile-topbar-right">
              <span
                className="ff-mobile-btn ff-mobile-btn--notify"
                aria-hidden
                title="Notifications"
              >
                <IoNotificationsOutline size={18} />
                <span className="ff-notify-dot" />
              </span>
              <Link className="ff-mobile-btn" to="/profile" title="Settings">
                <IoSettingsOutline size={18} />
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
          <span className="ff-nav-tab-icon" aria-hidden>
            <IconDashboard size={22} />
          </span>
          <span className="ff-nav-tab-label">Home</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `ff-nav-tab${isActive ? " ff-active" : ""}`}
          to="/workouts"
        >
          <span className="ff-nav-tab-icon" aria-hidden>
            <IconWorkouts size={22} />
          </span>
          <span className="ff-nav-tab-label">Plan</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `ff-nav-tab${isActive ? " ff-active" : ""}`}
          to="/calendar"
        >
          <span className="ff-nav-tab-icon" aria-hidden>
            <IconCalendar size={22} />
          </span>
          <span className="ff-nav-tab-label">Calendar</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `ff-nav-tab${isActive ? " ff-active" : ""}`}
          to="/nutrition"
        >
          <span className="ff-nav-tab-icon" aria-hidden>
            <IconNutrition size={22} />
          </span>
          <span className="ff-nav-tab-label">Nutrition</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `ff-nav-tab${isActive ? " ff-active" : ""}`}
          to="/profile"
        >
          <span className="ff-nav-tab-icon" aria-hidden>
            <IoPersonOutline size={22} />
          </span>
          <span className="ff-nav-tab-label">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
