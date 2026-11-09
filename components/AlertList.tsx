"use client";

import { useEffect, useState } from "react";
import AlertCard from "@/components/AlertCard";
import { EMPTY_ALERTS, NWS_UNCHECKED, ZONE_ONLY } from "@/lib/copy";
import { HAZARD_GROUPS, type HazardGroup, type HazardReport } from "@/lib/types";

export default function AlertList({
  report,
  activeId,
  onSelect,
}: {
  report: HazardReport;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [group, setGroup] = useState<(typeof HAZARD_GROUPS)[number]>("All");
  const nws = report.sources.find((source) => source.id === "nws");
  const atPoint = report.alerts.filter((alert) => alert.scope !== "zone");
  const inZone = report.alerts.filter((alert) => alert.scope === "zone");
  const visible = group === "All" ? atPoint : atPoint.filter((alert) => alert.group === group);
  const hidden = atPoint.length - visible.length;

  useEffect(() => {
    if (!activeId) return;
    document.getElementById(`alert-${encodeURIComponent(activeId)}`)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return (
    <section aria-labelledby="alerts-heading">
      <h2 id="alerts-heading" className="font-serif text-3xl font-semibold">Official alerts</h2>
      <p className="mt-2 text-sm text-ink/80">Sorted by the official NWS severity and urgency values, then by the time NWS sent the message. This is display order, not a DisasterNear score.</p>
      {nws?.status === "error" ? <p className="mt-4 rounded-2xl bg-amber px-4 py-3 font-bold" role="alert">{NWS_UNCHECKED}</p> : null}
      {nws?.status === "empty" ? <p className="mt-4 rounded-2xl border border-line bg-card px-4 py-3 font-bold">{EMPTY_ALERTS}</p> : null}
      {!atPoint.length && inZone.length ? <p className="mt-4 rounded-2xl border border-line bg-card px-4 py-3">{ZONE_ONLY}</p> : null}
      {atPoint.length ? (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter official alerts">
          {HAZARD_GROUPS.map((item) => {
            const count = item === "All"
              ? atPoint.length
              : atPoint.filter((alert) => alert.group === (item as HazardGroup)).length;
            if (item !== "All" && count === 0) return null;
            return (
              <button
                key={item}
                type="button"
                className={`min-h-11 rounded-full px-3 py-2 text-sm font-bold ${group === item ? "bg-pine text-card" : "bg-card text-ink ring-1 ring-line"}`}
                aria-pressed={group === item}
                onClick={() => setGroup(item)}
              >
                {item} ({count})
              </button>
            );
          })}
        </div>
      ) : null}
      {atPoint.length ? (
        <p className="mt-3 text-sm">Showing {visible.length} of {atPoint.length} official alerts at this point.{hidden ? ` ${hidden} hidden by this filter.` : ""} Filters apply to alerts at this point. Zone alerts and cancellation notices stay listed.</p>
      ) : null}
      <div className="mt-4 space-y-4">
        {visible.map((alert, index) => (
          <AlertCard
            key={alert.id ?? `active-${index}`}
            alert={alert}
            timeZone={report.timeZone}
            retrievedAt={report.retrievedAt}
            latitude={report.origin.latitude}
            longitude={report.origin.longitude}
            active={alert.id === activeId}
            onSelect={onSelect}
            kind="active"
          />
        ))}
      </div>
      {inZone.length ? (
        <div className="mt-8">
          <h3 className="font-serif text-2xl font-semibold">Same NWS zone, not at this point</h3>
          <p className="mt-2 text-sm">These official alerts match the forecast zone or county for this coordinate, and the included polygon does not contain the coordinate. A ZIP-code center can sit outside a warning that still covers part of the ZIP.</p>
          <div className="mt-4 space-y-4">
            {inZone.map((alert, index) => (
              <AlertCard
                key={alert.id ?? `zone-${index}`}
                alert={alert}
                timeZone={report.timeZone}
                retrievedAt={report.retrievedAt}
                latitude={report.origin.latitude}
                longitude={report.origin.longitude}
                active={alert.id === activeId}
                onSelect={onSelect}
                kind="zone"
              />
            ))}
          </div>
        </div>
      ) : null}
      {report.cancellations.length ? (
        <div className="mt-8">
          <h3 className="font-serif text-2xl font-semibold">Cancellation notices</h3>
          <p className="mt-2 text-sm">These are official cancellation messages, not active hazards.</p>
          <div className="mt-4 space-y-4">
            {report.cancellations.map((alert, index) => (
              <AlertCard
                key={alert.id ?? `cancel-${index}`}
                alert={alert}
                timeZone={report.timeZone}
                retrievedAt={report.retrievedAt}
                latitude={report.origin.latitude}
                longitude={report.origin.longitude}
                active={alert.id === activeId}
                onSelect={onSelect}
                kind="cancellation"
              />
            ))}
          </div>
        </div>
      ) : null}
      {report.quarantined.length ? (
        <div className="mt-8">
          <h3 className="font-serif text-2xl font-semibold">Messages NWS did not mark as actual emergencies</h3>
          <div className="mt-4 space-y-4">
            {report.quarantined.map((alert, index) => (
              <AlertCard
                key={alert.id ?? `other-${index}`}
                alert={alert}
                timeZone={report.timeZone}
                retrievedAt={report.retrievedAt}
                latitude={report.origin.latitude}
                longitude={report.origin.longitude}
                active={false}
                onSelect={onSelect}
                kind="quarantine"
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
