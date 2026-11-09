import type { OfficialAlert } from "@/lib/types";

export function isSevereOfficialAlert(alert: OfficialAlert): boolean {
  return (alert.severity === "Extreme" || alert.severity === "Severe") && Boolean(alert.id);
}

export function notificationCopy(alert: OfficialAlert): { title: string; body: string } {
  const title = alert.event ?? "National Weather Service alert";
  const headline = alert.headline
    ?? (alert.severity ? `Severity: ${alert.severity}.` : "Severity was not included by NWS.");
  const place = alert.scope === "zone"
    ? " This point is outside the official polygon. NWS returned it for the same zone."
    : "";
  return { title, body: `${headline}${place}`.slice(0, 240) };
}

export function unseenSevere(alerts: OfficialAlert[], seen: string[]): OfficialAlert[] {
  const known = new Set(seen);
  return alerts.filter((alert) => isSevereOfficialAlert(alert) && alert.id && !known.has(alert.id));
}

export function rememberSeen(seen: string[], alerts: OfficialAlert[]): string[] {
  const next = [...seen];
  const known = new Set(seen);
  for (const alert of alerts) {
    if (!isSevereOfficialAlert(alert) || !alert.id || known.has(alert.id)) continue;
    known.add(alert.id);
    next.push(alert.id);
  }
  return next.slice(-200);
}
