import type { Earthquake, HazardReport, OfficialAlert } from "@/lib/types";

type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, string | number | boolean | null>;
  }>;
};

export function alertCollection(alerts: OfficialAlert[], activeId: string | null): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: alerts.flatMap((alert) => {
      if (!alert.geometry) return [];
      if (alert.geometry.type !== "Polygon" && alert.geometry.type !== "MultiPolygon") return [];
      return [{
        type: "Feature" as const,
        geometry: alert.geometry,
        properties: {
          id: alert.id ?? "",
          event: alert.event ?? "Not included by NWS",
          severity: alert.severity ?? "Unknown",
          active: alert.id !== null && alert.id === activeId,
        },
      }];
    }),
  };
}

export function quakeCollection(earthquakes: Earthquake[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: earthquakes.map((quake) => ({
      type: "Feature" as const,
      geometry: { type: "Point", coordinates: [quake.longitude, quake.latitude] },
      properties: {
        id: quake.id,
        mag: quake.magnitude ?? 0,
        place: quake.place ?? "",
      },
    })),
  };
}

export function boundsFor(report: Pick<HazardReport, "origin" | "alerts" | "earthquakes">): {
  west: number;
  south: number;
  east: number;
  north: number;
  pointCount: number;
} {
  const points: Array<[number, number]> = [[report.origin.longitude, report.origin.latitude]];
  for (const alert of report.alerts) {
    if (!alert.geometry) continue;
    collect(alert.geometry.coordinates, points);
  }
  for (const quake of report.earthquakes) points.push([quake.longitude, quake.latitude]);
  let west = points[0]?.[0] ?? report.origin.longitude;
  let east = west;
  let south = points[0]?.[1] ?? report.origin.latitude;
  let north = south;
  for (const [lon, lat] of points) {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return { west, south, east, north, pointCount: points.length };
}

function collect(value: unknown, points: Array<[number, number]>) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    points.push([value[0], value[1]]);
    return;
  }
  for (const child of value) collect(child, points);
}

export type SavedLocation = {
  label: string;
  latitude: number;
  longitude: number;
  precision: HazardReport["origin"]["precision"];
};

export function rememberLocation(current: SavedLocation[], next: SavedLocation, limit = 5): SavedLocation[] {
  const key = `${next.latitude.toFixed(5)},${next.longitude.toFixed(5)}`;
  const rest = current.filter((item) => `${item.latitude.toFixed(5)},${item.longitude.toFixed(5)}` !== key);
  return [next, ...rest].slice(0, limit);
}
