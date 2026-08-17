// Calendar days are "YYYY-MM-DD" strings in the user's LOCAL timezone.
//
// The server never decides what "today" is: it only ever renders the day it was
// explicitly given. That is what keeps an entry logged at 23:30 on the day the
// user logged it, instead of shifting it across a UTC boundary.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Today as a "YYYY-MM-DD" string in the caller's local timezone. */
export function todayLocal(now: Date = new Date()): string {
  return toDateString(now);
}

/** Format a Date as "YYYY-MM-DD" using its LOCAL year, month and day. */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True when the string is a well-formed and real calendar date. */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  // Rejects rollovers such as "2026-02-31", which Date would accept as March 3.
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Resolve the `?date=` search param to a calendar day.
 *
 * Missing, malformed, or impossible dates fall back to `fallback` rather than
 * failing to render.
 */
export function parseDateParam(
  value: string | string[] | undefined,
  fallback: string,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return fallback;
  if (!isValidDateString(raw)) return fallback;
  return raw;
}

/** Shift a date string by whole days. Negative values move backwards. */
export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/**
 * The `count` day strings ending at `endDate`, oldest first.
 * lastNDays("2026-08-17", 3) -> ["2026-08-15", "2026-08-16", "2026-08-17"]
 */
export function lastNDays(endDate: string, count: number): string[] {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(addDays(endDate, -offset));
  }
  return days;
}

/** True when `dateString` is after `reference` (default: today, local). */
export function isFuture(dateString: string, reference?: string): boolean {
  const today = reference ?? todayLocal();
  // "YYYY-MM-DD" is fixed-width and zero-padded, so lexical order is date order.
  return dateString > today;
}

/** Human-friendly rendering of a calendar day, e.g. "Mon, 17 Aug 2026". */
export function formatDateLabel(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Short rendering for the history strip, e.g. "Mon 17". */
export function formatDayShort(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  return `${weekday} ${day}`;
}
