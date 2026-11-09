import { UpstreamError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";
import { femaDisasterUrl } from "@/lib/links";
import { asRecord, textOrNull } from "@/lib/text";
import type { Declaration } from "@/lib/types";

const DECLARATION_LABELS: Record<string, string> = {
  DR: "Major Disaster Declaration",
  EM: "Emergency Declaration",
  FM: "Fire Management Assistance",
};

export function declarationTypeLabel(value: string | null): string | null {
  if (!value) return null;
  return DECLARATION_LABELS[value.toUpperCase()] ?? null;
}

export function selectDeclarations(rows: Declaration[], now = new Date()): { rows: Declaration[]; truncated: boolean } {
  const recent = new Date(now);
  recent.setUTCMonth(recent.getUTCMonth() - 18);
  const openWindow = new Date(now);
  openWindow.setUTCFullYear(openWindow.getUTCFullYear() - 3);
  const selected = rows.filter((row) => {
    const declared = row.declarationDate ? Date.parse(row.declarationDate) : Number.NaN;
    if (Number.isNaN(declared)) return false;
    if (declared >= recent.getTime()) return true;
    return !row.incidentEndDate && declared >= openWindow.getTime();
  });
  selected.sort((left, right) => {
    const delta = Date.parse(right.declarationDate ?? "") - Date.parse(left.declarationDate ?? "");
    if (delta) return delta;
    return (left.designatedArea ?? "").localeCompare(right.designatedArea ?? "");
  });
  return { rows: selected.slice(0, 20), truncated: selected.length > 20 };
}

function declarationFrom(row: unknown): Declaration | null {
  const record = asRecord(row);
  if (!record || typeof record.disasterNumber !== "number" || !Number.isInteger(record.disasterNumber)) return null;
  const declarationType = textOrNull(record.declarationType);
  return {
    disasterNumber: record.disasterNumber,
    title: textOrNull(record.declarationTitle),
    declarationType,
    declarationTypeLabel: declarationTypeLabel(declarationType),
    incidentType: textOrNull(record.incidentType),
    state: textOrNull(record.state),
    designatedArea: textOrNull(record.designatedArea),
    declarationDate: textOrNull(record.declarationDate),
    incidentBeginDate: textOrNull(record.incidentBeginDate),
    incidentEndDate: textOrNull(record.incidentEndDate),
    femaDeclarationString: textOrNull(record.femaDeclarationString),
    url: femaDisasterUrl(record.disasterNumber),
  };
}

export async function femaDeclarations(
  state: string,
  now = new Date(),
): Promise<{ ok: true; declarations: Declaration[]; truncated: boolean } | { ok: false; message: string }> {
  const since = new Date(now);
  since.setUTCFullYear(since.getUTCFullYear() - 3);
  const filter = `state eq '${state}' and declarationDate ge '${since.toISOString()}'`;
  const url = new URL("https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries");
  url.searchParams.set("$filter", filter);
  url.searchParams.set("$orderby", "declarationDate desc");
  url.searchParams.set("$top", "100");
  try {
    const response = await fetchJson(url.toString());
    if (response.status !== 200) {
      return { ok: false, message: "FEMA declarations could not be checked. No declaration was added in their place." };
    }
    const rows = asRecord(response.body)?.DisasterDeclarationsSummaries;
    if (!Array.isArray(rows)) {
      return { ok: false, message: "The FEMA response could not be read. No declaration was added in its place." };
    }
    const parsed = rows.flatMap((row) => {
      const declaration = declarationFrom(row);
      return declaration ? [declaration] : [];
    });
    const selected = selectDeclarations(parsed, now);
    return { ok: true, declarations: selected.rows, truncated: selected.truncated };
  } catch (error) {
    if (error instanceof UpstreamError) {
      return { ok: false, message: "FEMA declarations could not be checked. No declaration was added in their place." };
    }
    return { ok: false, message: "FEMA declarations could not be checked. No declaration was added in their place." };
  }
}
