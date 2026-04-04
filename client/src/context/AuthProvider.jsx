import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./auth-context.js";
import { API_BASE, parseJsonSafe } from "../lib/api.js";

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

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth());

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
    }
    sessionStorage.setItem(STORAGE_TOKEN, data.token);
    sessionStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
    setAuth({ token: data.token, user: data.user });
  }, []);

  const register = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(data?.error || res.statusText || `HTTP ${res.status}`);
    }
    sessionStorage.setItem(STORAGE_TOKEN, data.token);
    sessionStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
    setAuth({ token: data.token, user: data.user });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    setAuth({ token: null, user: null });
  }, []);

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      login,
      register,
      logout,
    }),
    [auth.token, auth.user, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
