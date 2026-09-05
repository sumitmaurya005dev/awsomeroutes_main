// Date-only arithmetic in UTC avoids DST and browser timezone shifts.
export function itineraryDayDate(start: string, day: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isInteger(day) || day < 1)
    return "";
  const date = new Date(start + "T00:00:00Z");
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== start
  )
    return "";
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}
export function formatItineraryDate(date: string): string {
  if (!itineraryDayDate(date, 1)) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
}
