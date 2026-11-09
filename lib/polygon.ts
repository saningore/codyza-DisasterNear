import type { PolygonRelation } from "@/lib/types";

function onSegment(x1: number, y1: number, x2: number, y2: number, x: number, y: number): boolean {
  const lengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (lengthSquared < 1e-18) return false;
  const cross = (y - y1) * (x2 - x1) - (x - x1) * (y2 - y1);
  if (Math.abs(cross) > 1e-8 * Math.sqrt(lengthSquared)) return false;
  const dot = (x - x1) * (x2 - x1) + (y - y1) * (y2 - y1);
  if (dot < -1e-9) return false;
  return dot <= lengthSquared + 1e-9;
}

function ringHit(lon: number, lat: number, ring: number[][]): { inside: boolean; boundary: boolean } {
  if (ring.length < 4) return { inside: false, boundary: false };
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index];
    const prior = ring[previous];
    if (!current || !prior) continue;
    const xi = current[0];
    const yi = current[1];
    const xj = prior[0];
    const yj = prior[1];
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;
    if (onSegment(xi, yi, xj, yj, lon, lat)) return { inside: true, boundary: true };
    const crosses = (yi > lat) !== (yj > lat)
      && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return { inside, boundary: false };
}

function polygonHit(lon: number, lat: number, rings: number[][][]): boolean {
  const outer = rings[0];
  if (!outer) return false;
  const shell = ringHit(lon, lat, outer);
  if (!shell.inside) return false;
  if (shell.boundary) return true;
  for (let index = 1; index < rings.length; index += 1) {
    const hole = rings[index];
    if (!hole) continue;
    const hit = ringHit(lon, lat, hole);
    if (hit.boundary) return true;
    if (hit.inside) return false;
  }
  return true;
}

export function polygonRelation(geometry: unknown, latitude: number, longitude: number): PolygonRelation {
  const relation = relate(geometry, longitude, latitude);
  return relation;
}

function relate(geometry: unknown, lon: number, lat: number): PolygonRelation {
  if (!geometry || typeof geometry !== "object") return "none";
  const record = geometry as { type?: unknown; coordinates?: unknown; geometries?: unknown };
  if (record.type === "Polygon" && Array.isArray(record.coordinates)) {
    return polygonHit(lon, lat, record.coordinates as number[][][]) ? "inside" : "outside";
  }
  if (record.type === "MultiPolygon" && Array.isArray(record.coordinates)) {
    const polygons = record.coordinates as number[][][][];
    if (!polygons.length) return "none";
    return polygons.some((rings) => polygonHit(lon, lat, rings)) ? "inside" : "outside";
  }
  if (record.type === "GeometryCollection" && Array.isArray(record.geometries)) {
    const polygonal = record.geometries.filter((item) => {
      const type = (item as { type?: string }).type;
      return type === "Polygon" || type === "MultiPolygon";
    });
    if (!polygonal.length) return "none";
    return polygonal.some((item) => relate(item, lon, lat) === "inside") ? "inside" : "outside";
  }
  return "none";
}

export function officialPolygon(geometry: unknown): { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] } | null {
  if (!geometry || typeof geometry !== "object") return null;
  const record = geometry as { type?: unknown; coordinates?: unknown };
  if (record.type !== "Polygon" && record.type !== "MultiPolygon") return null;
  if (!Array.isArray(record.coordinates)) return null;
  return record.type === "Polygon"
    ? { type: "Polygon", coordinates: record.coordinates as number[][][] }
    : { type: "MultiPolygon", coordinates: record.coordinates as number[][][][] };
}
