const portalDateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Australia/Sydney",
});

const portalDateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Australia/Sydney",
});

/**
 * Formats an ISO timestamp as a portal date (dd/mm/yyyy, Australia/Sydney).
 */
export function formatPortalDate(isoDate: string): string {
  return portalDateFormatter.format(new Date(isoDate));
}

/**
 * Formats an ISO timestamp as a portal date-time (dd/mm/yyyy, h:mm am/pm).
 */
export function formatPortalDateTime(isoDate: string): string {
  return portalDateTimeFormatter.format(new Date(isoDate));
}
