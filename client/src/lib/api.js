export const API_BASE =
  import.meta.env.VITE_API_URL ?? "http://localhost:5050";

export async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Use with JSON POST/PATCH bodies. */
export function jsonAuthHeaders(token) {
  return {
    ...bearerAuth(token),
    "Content-Type": "application/json",
  };
}

export function bearerAuth(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
