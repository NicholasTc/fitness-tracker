function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Format a Date as local-calendar YYYY-MM-DD.
 */
export function toLocalYmd(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD into a local Date at midday to avoid DST edge cases.
 */
export function parseLocalYmd(ymd) {
  if (typeof ymd !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/**
 * Shift a local-calendar YYYY-MM-DD by N days.
 */
export function addDaysLocalYmd(ymd, deltaDays) {
  const d = parseLocalYmd(ymd);
  if (!d) return "";
  d.setDate(d.getDate() + deltaDays);
  return toLocalYmd(d);
}
