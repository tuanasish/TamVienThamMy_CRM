/**
 * Vietnam Timezone Utilities
 *
 * Vercel serverless functions run in UTC (UTC+0).
 * Vietnam is UTC+7 (Asia/Ho_Chi_Minh).
 *
 * Without explicit timezone handling, `new Date().setHours(0,0,0,0)` on Vercel
 * produces midnight UTC — which is 07:00 AM Vietnam time.
 * This causes "today" queries to miss appointments/invoices created
 * between 00:00–06:59 Vietnam time (they fall into "yesterday" UTC)
 * and include records from 17:00–23:59 UTC of the previous day.
 *
 * These helpers ensure all date boundaries align with Vietnam's calendar day.
 */

const VN_OFFSET = "+07:00";

/**
 * Get the current date string in Vietnam timezone (YYYY-MM-DD).
 */
export function getVietnamDateString(date?: Date): string {
  const d = date || new Date();
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return formatter.format(d);
}

/**
 * Get today's start (00:00:00.000) and end (23:59:59.999) in Vietnam timezone,
 * returned as UTC Date objects suitable for Prisma queries.
 */
export function getVietnamToday(): { start: Date; end: Date } {
  const todayStr = getVietnamDateString();
  return getVietnamDayRange(todayStr);
}

/**
 * Convert a "YYYY-MM-DD" date string to a UTC Date range
 * representing 00:00:00.000 – 23:59:59.999 in Vietnam timezone.
 */
export function getVietnamDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00${VN_OFFSET}`);
  const end = new Date(`${dateStr}T23:59:59.999${VN_OFFSET}`);
  return { start, end };
}

/**
 * Parse a datetime string (e.g. "2026-06-24T09:00") as Vietnam local time.
 * If the string already contains a timezone offset, it is used as-is.
 */
export function parseVietnamDateTime(dateTimeStr: string): Date {
  // If already has offset (+07:00, +0700, Z), parse directly
  if (/[+-]\d{2}:\d{2}$/.test(dateTimeStr) || dateTimeStr.endsWith("Z")) {
    return new Date(dateTimeStr);
  }
  // Append Vietnam offset so it's interpreted as Vietnam local time
  return new Date(`${dateTimeStr}${VN_OFFSET}`);
}

/**
 * Format a Date to Vietnam locale display string.
 */
export function formatVietnamDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a Date to Vietnam locale time string (HH:mm).
 */
export function formatVietnamTime(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}
