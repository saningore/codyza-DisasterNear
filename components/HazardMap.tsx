"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { alertCollection, boundsFor, quakeCollection } from "@/lib/map-data";
import type { HazardReport } from "@/lib/types";

const SEVERITY_COLOR: Record<string, string> = {
  Extreme: "#7f1d1d",
  Severe: "#9a3412",
  Moderate: "#854d0e",
  Minor: "#1e3a8a",
  Unknown: "#334155",
};

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function HazardMap({
  report,
  activeId,
  onSelect,
}: {
  report: HazardReport;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const reportRef = useRef(report);
  const activeRef = useRef(activeId);
  const onSelectRef = useRef(onSelect);
  const fittedKey = useRef("");
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  reportRef.current = report;
  activeRef.current = activeId;
  onSelectRef.current = onSelect;

  useEffect(() => {
    let map: MapLibreMap | undefined;
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      maplibregl.setWorkerUrl(`/api/maplibre-worker?v=${maplibregl.getVersion()}`);
      map = new maplibregl.Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [reportRef.current.origin.longitude, reportRef.current.origin.latitude],
        zoom: 8,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        if (!map) return;
        const current = reportRef.current;
        map.addSource("alerts", { type: "geojson", data: alertCollection(current.alerts, activeRef.current) as GeoJSON.FeatureCollection });
        map.addSource("quakes", { type: "geojson", data: quakeCollection(current.earthquakes) as GeoJSON.FeatureCollection });
        map.addSource("origin", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              geometry: { type: "Point", coordinates: [current.origin.longitude, current.origin.latitude] },
              properties: { label: current.origin.label },
            }],
          },
        });
        map.addLayer({
          id: "alert-fill",
          type: "fill",
          source: "alerts",
          paint: {
            "fill-color": ["match", ["get", "severity"], "Extreme", SEVERITY_COLOR.Extreme, "Severe", SEVERITY_COLOR.Severe, "Moderate", SEVERITY_COLOR.Moderate, "Minor", SEVERITY_COLOR.Minor, SEVERITY_COLOR.Unknown],
            "fill-opacity": 0.33,
          },
        });
        map.addLayer({
          id: "alert-line",
          type: "line",
          source: "alerts",
          paint: {
            "line-color": ["match", ["get", "severity"], "Extreme", SEVERITY_COLOR.Extreme, "Severe", SEVERITY_COLOR.Severe, "Moderate", SEVERITY_COLOR.Moderate, "Minor", SEVERITY_COLOR.Minor, SEVERITY_COLOR.Unknown],
            "line-width": ["case", ["==", ["get", "active"], true], 5, 2],
          },
        });
        map.addLayer({
          id: "quake-circle",
          type: "circle",
          source: "quakes",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["get", "mag"], 2.5, 5, 6, 12],
            "circle-color": "#14324f",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fffdf8",
          },
        });
        map.addLayer({
          id: "origin-circle",
          type: "circle",
          source: "origin",
          paint: {
            "circle-radius": 7,
            "circle-color": "#1f4e79",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.on("click", "alert-fill", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string" && id) onSelectRef.current(id);
        });
        map.on("mouseenter", "alert-fill", () => {
          if (map) map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "alert-fill", () => {
          if (map) map.getCanvas().style.cursor = "";
        });
        setReady(true);
        const loaded = reportRef.current;
        fittedKey.current = `${loaded.origin.latitude},${loaded.origin.longitude},${loaded.retrievedAt}`;
        fit(map, loaded);
      });
      map.on("error", () => {
        setMapError("The map could not be loaded. The alert text is still the official information.");
      });
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const alerts = map.getSource("alerts") as { setData?: (data: unknown) => void } | undefined;
    const quakes = map.getSource("quakes") as { setData?: (data: unknown) => void } | undefined;
    const origin = map.getSource("origin") as { setData?: (data: unknown) => void } | undefined;
    alerts?.setData?.(alertCollection(report.alerts, activeId));
    quakes?.setData?.(quakeCollection(report.earthquakes));
    origin?.setData?.({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [report.origin.longitude, report.origin.latitude] },
        properties: { label: report.origin.label },
      }],
    });
    const key = `${report.origin.latitude},${report.origin.longitude},${report.retrievedAt}`;
    if (fittedKey.current !== key) {
      fittedKey.current = key;
      fit(map, report);
    }
  }, [report, activeId]);

  return (
    <div data-map-ready={ready ? "true" : "false"} className="no-print">
      <div
        ref={container}
        className="h-[420px] w-full overflow-hidden rounded-3xl border border-line"
        role="region"
        aria-label="Map of official alert areas and USGS earthquakes. The same information is listed as text."
      />
      {mapError ? <p className="mt-2 text-sm" role="alert">{mapError}</p> : null}
      <ul aria-label="Map legend" className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <li className="rounded-full bg-card px-2 py-1 ring-1 ring-line">Your point</li>
        {Object.entries(SEVERITY_COLOR).map(([name, color]) => (
          <li key={name} className="rounded-full px-2 py-1 text-white" style={{ background: color }}>{name === "Unknown" ? "Unknown severity" : name}</li>
        ))}
        <li className="rounded-full bg-pine px-2 py-1 text-card">USGS earthquake</li>
      </ul>
      <p className="mt-2 text-xs text-ink/70">Polygons appear only when the alert includes them. Map data © OpenStreetMap contributors, via OpenFreeMap.</p>
    </div>
  );
}

function fit(map: MapLibreMap, report: HazardReport) {
  const duration = reducedMotion() ? 0 : 600;
  const bounds = boundsFor(report);
  const span = Math.max(bounds.east - bounds.west, bounds.north - bounds.south);
  if (bounds.pointCount <= 1 || span < 0.02) {
    const zoom = report.origin.precision === "device" || report.origin.precision === "address" ? 12 : 9;
    map.easeTo({ center: [report.origin.longitude, report.origin.latitude], zoom, duration });
    return;
  }
  map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 48, maxZoom: 11, duration });
}
