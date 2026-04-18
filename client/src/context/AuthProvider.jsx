import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context.js";
import { API_BASE, parseJsonSafe } from "../lib/api.js";
import { normalizeTheme, persistThemeMirror } from "../lib/theme.js";

const STORAGE_TOKEN = "fitflow_token";
const STORAGE_USER = "fitflow_user";

function readStoredAuth() {
  try {
    const t = sessionStorage.getItem(STORAGE_TOKEN);
    const u = sessionStorage.getItem(STORAGE_USER);
    if (t && u) {
      return { token: t, user: JSON.parse(u) };
    }
  } catch {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
  }
  return { token: null, user: null };
}

function initialAuthState() {
  const stored = readStoredAuth();
  return { ...stored, hydrating: !stored.token };
}

function persistSession(token, user) {
  sessionStorage.setItem(STORAGE_TOKEN, token);
  sessionStorage.setItem(STORAGE_USER, JSON.stringify(user));
}

function clearStoredSession() {
  sessionStorage.removeItem(STORAGE_TOKEN);
  sessionStorage.removeItem(STORAGE_USER);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(initialAuthState);

  const login = useCallback(async (email, password, options = {}) => {
    const rememberMe = Boolean(options?.rememberMe);
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, rememberMe }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
    }
    const u = {
      ...data.user,
      theme: normalizeTheme(data.user?.theme),
    };
    persistSession(data.token, u);
    setAuth({ token: data.token, user: u, hydrating: false });
  }, []);

  const register = useCallback(async (email, password, profile = {}, options = {}) => {
    const rememberMe = Boolean(options?.rememberMe);
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
        firstName: profile.firstName,
        lastName: profile.lastName,
        rememberMe,
      }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
    }
    const u = {
      ...data.user,
      theme: normalizeTheme(data.user?.theme),
    };
    persistSession(data.token, u);
    setAuth({ token: data.token, user: u, hydrating: false });
  }, []);

  useEffect(() => {
    if (auth.token || !auth.hydrating) {
      return;
    }
    let cancelled = false;
    async function restoreRememberedSession() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
        }
        const u = {
          ...data.user,
          theme: normalizeTheme(data.user?.theme),
        };
        persistSession(data.token, u);
        if (!cancelled) {
          setAuth({ token: data.token, user: u, hydrating: false });
        }
      } catch {
        clearStoredSession();
        if (!cancelled) {
          setAuth((prev) => ({ ...prev, token: null, user: null, hydrating: false }));
        }
      }
    }
    restoreRememberedSession();
    return () => {
      cancelled = true;
    };
  }, [auth.token, auth.hydrating]);

  const patchUser = useCallback((patch) => {
    setAuth((prev) => {
      if (!prev.user) return prev;
      const user = { ...prev.user, ...patch };
      try {
        sessionStorage.setItem(STORAGE_USER, JSON.stringify(user));
      } catch {
        /* ignore */
      }
      return { ...prev, user };
    });
  }, []);

  const logout = useCallback(() => {
    void fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      /* ignore */
    });
    try {
      const raw = sessionStorage.getItem(STORAGE_USER);
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.theme) persistThemeMirror(normalizeTheme(u.theme));
      }
    } catch {
      /* ignore */
    }
    clearStoredSession();
    setAuth({ token: null, user: null, hydrating: false });
  }, []);

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      hydrating: auth.hydrating,
      login,
      register,
      logout,
      patchUser,
    }),
    [auth.token, auth.user, auth.hydrating, login, register, logout, patchUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
