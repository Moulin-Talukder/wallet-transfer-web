const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Dhaka",
});

/** "28 Oct 2026, 3:12 pm" in Bangladesh time, independent of the server's time zone. */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}
