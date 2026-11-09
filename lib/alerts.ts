import { NO_INSTRUCTION, NOT_INCLUDED } from "@/lib/copy";
import { nwsAlertRecordUrl, officialHttpUrl } from "@/lib/links";
import { officialPolygon, polygonRelation } from "@/lib/polygon";
import { asRecord, plainText, textOrNull } from "@/lib/text";
import type { HazardGroup, OfficialAlert } from "@/lib/types";

const SEVERITY_RANK: Record<string, number> = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
  Unknown: 4,
};

const URGENCY_RANK: Record<string, number> = {
  Immediate: 0,
  Expected: 1,
  Future: 2,
  Past: 3,
  Unknown: 4,
};

export function hazardGroup(event: string | null): HazardGroup {
  const name = (event ?? "").toLowerCase();
  if (!name) return "Other";
  if (name.includes("tornado")) return "Tornado";
  if (name.includes("thunderstorm")) return "Severe thunderstorm";
  if (name.includes("flood")) return "Flood";
  if (/(winter|blizzard|ice storm|freezing|frost|wind chill|snow|sleet)/.test(name)) return "Winter";
  if (name.includes("heat")) return "Heat";
  if (/(hurricane|tropical|storm surge|tsunami)/.test(name)) return "Other";
  if (/(marine|gale|rip current|beach hazard|high surf|ashfall)/.test(name)) return "Marine";
  if (name.includes("wind")) return "Wind";
  return "Other";
}

export function severityLabel(value: string | null): string {
  return value ?? NOT_INCLUDED;
}

export function instructionText(instruction: string | null): string {
  return instruction ?? NO_INSTRUCTION;
}

export function compareAlerts(left: OfficialAlert, right: OfficialAlert): number {
  const severity = (SEVERITY_RANK[left.severity ?? "Unknown"] ?? 4) - (SEVERITY_RANK[right.severity ?? "Unknown"] ?? 4);
  if (severity) return severity;
  const urgency = (URGENCY_RANK[left.urgency ?? "Unknown"] ?? 4) - (URGENCY_RANK[right.urgency ?? "Unknown"] ?? 4);
  if (urgency) return urgency;
  return sentTime(right) - sentTime(left);
}

function sentTime(alert: OfficialAlert): number {
  const time = Date.parse(alert.sent ?? "");
  return Number.isNaN(time) ? 0 : time;
}

export function normalizeFeature(
  feature: unknown,
  point: { latitude: number; longitude: number } | null,
): OfficialAlert | null {
  const record = asRecord(feature);
  const properties = asRecord(record?.properties);
  if (!record || !properties) return null;
  const rawId = textOrNull(properties.id);
  const featureId = textOrNull(record.id);
  const id = rawId ?? (featureId ? featureId.split("/").filter(Boolean).pop() ?? null : null);
  const geometry = officialPolygon(record.geometry);
  const relationChecked = !geometry || Boolean(point);
  const relation = point && geometry ? polygonRelation(geometry, point.latitude, point.longitude) : "none";
  const event = plainText(properties.event);
  return {
    id,
    event,
    severity: plainText(properties.severity),
    urgency: plainText(properties.urgency),
    certainty: plainText(properties.certainty),
    areaDesc: plainText(properties.areaDesc),
    onset: textOrNull(properties.onset),
    effective: textOrNull(properties.effective),
    expires: textOrNull(properties.expires),
    ends: textOrNull(properties.ends),
    sent: textOrNull(properties.sent),
    instruction: plainText(properties.instruction),
    description: plainText(properties.description),
    headline: plainText(properties.headline),
    senderName: plainText(properties.senderName),
    messageType: plainText(properties.messageType),
    status: plainText(properties.status),
    response: plainText(properties.response),
    web: officialHttpUrl(properties.web),
    officialUrl: nwsAlertRecordUrl(id, featureId),
    geometry,
    relation,
    relationChecked,
    group: hazardGroup(event),
  };
}

export function normalizeAlerts(
  features: unknown[],
  point: { latitude: number; longitude: number } | null,
): { active: OfficialAlert[]; cancellations: OfficialAlert[]; quarantined: OfficialAlert[] } {
  const parsed = features.flatMap((feature) => {
    const alert = normalizeFeature(feature, point);
    return alert ? [alert] : [];
  });
  const byId = new Map<string, OfficialAlert>();
  const withoutId: OfficialAlert[] = [];
  for (const alert of parsed) {
    if (!alert.id) {
      withoutId.push(alert);
      continue;
    }
    const previous = byId.get(alert.id);
    if (!previous || sentTime(alert) >= sentTime(previous)) byId.set(alert.id, alert);
  }
  return partitionAlerts([...byId.values(), ...withoutId]);
}

export function partitionAlerts(alerts: OfficialAlert[]): {
  active: OfficialAlert[];
  cancellations: OfficialAlert[];
  quarantined: OfficialAlert[];
} {
  const active: OfficialAlert[] = [];
  const cancellations: OfficialAlert[] = [];
  const quarantined: OfficialAlert[] = [];
  for (const alert of alerts) {
    const status = (alert.status ?? "Actual").toLowerCase();
    const messageType = (alert.messageType ?? "Alert").toLowerCase();
    if (status !== "actual") quarantined.push(alert);
    else if (messageType === "cancel") cancellations.push(alert);
    else if (messageType === "alert" || messageType === "update") active.push(alert);
    else quarantined.push(alert);
  }
  active.sort(compareAlerts);
  cancellations.sort(compareAlerts);
  quarantined.sort(compareAlerts);
  return { active, cancellations, quarantined };
}
