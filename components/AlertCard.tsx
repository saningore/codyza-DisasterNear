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

const FRAME: Record<string, string> = {
  Extreme: "border-2 border-[#7f1d1d] bg-[#fff1ef]",
  Severe: "border-2 border-[#9a3412] bg-[#fff6ee]",
  Moderate: "border border-[#854d0e] bg-card",
  Minor: "border border-line bg-card",
  Unknown: "border border-line bg-card",
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
  kind: "active" | "zone" | "cancellation" | "quarantine";
}) {
  const severity = alert.severity ?? "Unknown";
  const badge = BADGE[severity] ?? BADGE.Unknown;
  const urgent = kind === "active" || kind === "zone";
  const frame = urgent ? (FRAME[severity] ?? FRAME.Unknown) : "border border-line bg-card";
  const hasPolygon = alert.geometry?.type === "Polygon" || alert.geometry?.type === "MultiPolygon";
  return (
    <article
      id={alert.id ? `alert-${encodeURIComponent(alert.id)}` : undefined}
      data-alert={kind}
      data-severity={severity}
      className={`rounded-3xl p-5 ${frame} ${active ? "ring-2 ring-pine" : ""}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-sea">Official alert · National Weather Service</p>
      {kind === "zone" ? (
        <p className="mt-3 rounded-2xl bg-moss px-3 py-2 text-sm font-bold">Same NWS zone. This point is not inside the warning.</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-serif text-2xl font-semibold">{alert.event ?? "Not included by NWS"}</h3>
        <div className="flex flex-wrap gap-2">
          <p className={`rounded-full px-3 py-1 text-sm font-bold ${badge}`}>Severity: {severityLabel(alert.severity)}</p>
          <p className="rounded-full bg-ink px-3 py-1 text-sm font-bold text-card">Urgency: {alert.urgency ?? "Not included by NWS"}</p>
        </div>
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
