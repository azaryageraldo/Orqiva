import { formatDistanceToNowStrict } from "date-fns";

/**
 * Formats an ISO date string (or Date) as a short, human friendly relative
 * time, e.g. "5 minutes ago", "2 hours ago", "3 days ago".
 */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "";

  const elapsed = Date.now() - date.getTime();
  if (elapsed < 60_000) return "just now";

  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/**
 * Absolute timestamp used for the tooltip of relative timestamps.
 */
export function formatAbsoluteTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
