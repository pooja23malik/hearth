import { RecurrenceRule } from "@prisma/client";

/**
 * Advances a date based on a recurrence rule.
 * When a task is overdue, advances from TODAY (not the old due date)
 * to prevent stacking multiple overdue instances.
 *
 * @param fromDate - The date to advance from (typically today in the board's timezone)
 * @param rule - The recurrence preset
 * @returns The next due date
 */
export function advanceDate(fromDate: Date, rule: RecurrenceRule): Date {
  const next = new Date(fromDate);

  switch (rule) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "every_3_months":
      next.setMonth(next.getMonth() + 3);
      break;
    case "every_6_months":
      next.setMonth(next.getMonth() + 6);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

/**
 * Gets today's date in a specific timezone.
 * Falls back to UTC if timezone is null or invalid.
 */
export function getTodayInTimezone(timezone: string | null): Date {
  const now = new Date();

  if (!timezone) {
    return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find((p) => p.type === "year")!.value);
    const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1;
    const day = parseInt(parts.find((p) => p.type === "day")!.value);
    return new Date(year, month, day);
  } catch {
    // Invalid timezone — fall back to UTC
    return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }
}
