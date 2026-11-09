"use client";

import AlertFacts from "@/components/AlertFacts";
import { severityLabel } from "@/lib/alerts";
import type { OfficialAlert } from "@/lib/types";

const BADGE: Record<string, string> = {
  Extreme: "bg-[#7f1d1d] text-white",
  Severe: "bg-[#9a3412] text-white",
  Moderate: "bg-[#854d0e] text-white",
  Minor: "bg-[#1e3a8a] text-white",
  Unknown: "bg-[#334155] text-white",
};

export default function AlertCard({
  alert,
  timeZone,
  retrievedAt,
  latitude,
  longitude,
  active,
  onSelect,
  kind,
}: {
  alert: OfficialAlert;
  timeZone: string | null;
  retrievedAt: string;
  latitude: number;
  longitude: number;
  active: boolean;
  onSelect: (id: string) => void;
  kind: "active" | "cancellation" | "quarantine";
}) {
  const severity = alert.severity ?? "Unknown";
  const badge = BADGE[severity] ?? BADGE.Unknown;
  const hasPolygon = alert.geometry?.type === "Polygon" || alert.geometry?.type === "MultiPolygon";
  return (
    <article
      id={alert.id ? `alert-${encodeURIComponent(alert.id)}` : undefined}
      data-alert={kind}
      className={`rounded-3xl border bg-card p-5 ${active ? "border-pine ring-2 ring-pine" : "border-line"}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-sea">Official alert · National Weather Service</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-serif text-2xl font-semibold">{alert.event ?? "Not included by NWS"}</h3>
        <p className={`rounded-full px-3 py-1 text-sm font-bold ${badge}`}>Severity: {severityLabel(alert.severity)}</p>
      </div>
      {kind === "quarantine" ? (
        <p className="mt-3 rounded-2xl bg-amber px-3 py-2 text-sm font-bold">This message is marked {alert.status ?? "without an Actual status"} by NWS. It is not an actual emergency.</p>
      ) : null}
      {kind === "cancellation" ? (
        <p className="mt-3 text-sm font-bold">This is an official cancellation, not an active hazard.</p>
      ) : null}
      <AlertFacts
        alert={alert}
        timeZone={timeZone}
        retrievedAt={retrievedAt}
        latitude={latitude}
        longitude={longitude}
      />
      {hasPolygon && alert.id ? (
        <button
          type="button"
          className="mt-4 min-h-11 rounded-full border border-pine px-4 py-2 text-sm font-bold"
          aria-pressed={active}
          onClick={() => onSelect(alert.id as string)}
        >
          Show this area on the map
        </button>
      ) : null}
    </article>
  );
}
