import { parseDateInput } from "./workoutPayload.js";

/** UTC midnight for the calendar day of `d`. */
export function normalizeUtcDay(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return new Date(
    Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 0, 0, 0, 0),
  );
}

/**
 * @returns {{ ok: true, startYmd: string, endYmd: string, startBound: Date, endBoundInclusive: Date, endExclusive: Date } | { ok: false, error: string }}
 */
export function parseInclusiveDateRange(startRaw, endRaw) {
  if (typeof startRaw !== "string" || typeof endRaw !== "string") {
    return {
      ok: false,
      error: "start and end query params (YYYY-MM-DD) are required",
    };
  }
  const startD = parseDateInput(startRaw);
  const endD = parseDateInput(endRaw);
  if (!startD || !endD) {
    return { ok: false, error: "Invalid start or end date" };
  }
  if (startD > endD) {
    return { ok: false, error: "start must be on or before end" };
  }
  const startBound = normalizeUtcDay(startD);
  const endBoundInclusive = normalizeUtcDay(endD);
  if (!startBound || !endBoundInclusive) {
    return { ok: false, error: "Invalid date range" };
  }
  const endExclusive = new Date(endBoundInclusive);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return {
    ok: true,
    startYmd: startRaw.slice(0, 10),
    endYmd: endRaw.slice(0, 10),
    startBound,
    endBoundInclusive,
    endExclusive,
  };
}
