export function formatOfficialTime(iso: string | null, timeZone: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const zone = timeZone || "UTC";
  const formatted = formatInZone(date, zone);
  if (formatted) return formatted;
  const utc = formatInZone(date, "UTC");
  return utc ?? `${iso} UTC`;
}

function formatInZone(date: Date, timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return null;
  }
}

export function isBefore(iso: string | null, retrievedAt: string): boolean {
  if (!iso) return false;
  const left = Date.parse(iso);
  const right = Date.parse(retrievedAt);
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return left < right;
}

export function epochToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
