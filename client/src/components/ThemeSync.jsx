import { useEffect } from "react";
import { API_BASE, bearerAuth, parseJsonSafe } from "../lib/api.js";
import {
  applyTheme,
  normalizeTheme,
  persistThemeMirror,
} from "../lib/theme.js";
import { useAuth } from "../hooks/useAuth.js";

/** Keeps document theme in sync with auth user; enriches legacy sessions from GET /profile. */
export default function ThemeSync() {
  const { token, user, patchUser } = useAuth();

  useEffect(() => {
    if (!token || !user || user.theme == null) return;
    const t = normalizeTheme(user.theme);
    applyTheme(t);
    persistThemeMirror(t);
  }, [token, user]);

  useEffect(() => {
    if (!token || user?.theme != null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/profile`, {
          headers: bearerAuth(token),
        });
        const data = await parseJsonSafe(res);
        if (cancelled || !res.ok || !data?.theme) return;
        patchUser({ theme: normalizeTheme(data.theme) });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.theme, patchUser]);

  return null;
}
