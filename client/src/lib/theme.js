/** @typedef {'default' | 'roseLight'} FitflowThemeId */

export const THEME_IDS = /** @type {const} */ (["default", "roseLight"]);

/** Logged-out login page remembers last choice (mirrors server value on logout). */
export const THEME_MIRROR_KEY = "fitflow_theme_mirror";

const DATA_DEFAULT = "default";
const DATA_ROSE = "rose-light";

/**
 * @param {unknown} t
 * @returns {FitflowThemeId}
 */
export function normalizeTheme(t) {
  return t === "roseLight" ? "roseLight" : "default";
}

/**
 * @param {FitflowThemeId} theme
 */
export function applyTheme(theme) {
  const id = normalizeTheme(theme);
  document.documentElement.dataset.theme = id === "roseLight" ? DATA_ROSE : DATA_DEFAULT;
}

/**
 * @param {FitflowThemeId} theme
 */
export function persistThemeMirror(theme) {
  try {
    localStorage.setItem(THEME_MIRROR_KEY, normalizeTheme(theme));
  } catch {
    /* ignore */
  }
}

/**
 * Initial paint: session user (if any) wins, then mirror, else default.
 * @returns {FitflowThemeId}
 */
export function readInitialTheme() {
  try {
    const raw = sessionStorage.getItem("fitflow_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u && typeof u.theme === "string") {
        return normalizeTheme(u.theme);
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const m = localStorage.getItem(THEME_MIRROR_KEY);
    if (m === "roseLight" || m === "default") return m;
  } catch {
    /* ignore */
  }
  return "default";
}

export function applyThemeFromStorage() {
  applyTheme(readInitialTheme());
}
