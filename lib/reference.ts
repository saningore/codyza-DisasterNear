import { readFileSync } from "node:fs";
import path from "node:path";

type ZctaFile = {
  source: string;
  url: string;
  retrievedAt: string;
  centroids: Record<string, [number, number]>;
};

type Place = { s: string; n: string; lat: number; lon: number; a: number; cdp: boolean };
type PlaceFile = { source: string; url: string; retrievedAt: string; places: Place[] };

export type PlaceMatch = Place & { label: string };

let zctaFile: ZctaFile | null = null;
let placeFile: PlaceFile | null = null;

function readJson<T>(name: string): T {
  const file = path.join(process.cwd(), "data", name);
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function zctaData(): ZctaFile {
  zctaFile ??= readJson<ZctaFile>("zcta.json");
  return zctaFile;
}

export function placeData(): PlaceFile {
  placeFile ??= readJson<PlaceFile>("places.json");
  return placeFile;
}

export function zipCentroid(zip: string): { latitude: number; longitude: number } | null {
  const point = zctaData().centroids[zip];
  if (!point) return null;
  return { latitude: point[0], longitude: point[1] };
}

export function searchPlaces(query: string, limit = 6): PlaceMatch[] {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (trimmed.length < 3) return [];
  const comma = trimmed.match(/^(.+?),\s*([A-Za-z .]+)$/);
  const nameQuery = (comma ? comma[1] : trimmed).toUpperCase();
  const stateQuery = comma ? comma[2].trim().toUpperCase() : null;
  if (nameQuery.length < 3) return [];
  const matches = placeData().places.filter((place) => {
    if (stateQuery && place.s !== stateQuery && !place.s.startsWith(stateQuery)) return false;
    return place.n.toUpperCase().startsWith(nameQuery);
  });
  matches.sort((a, b) => b.a - a.a || a.n.localeCompare(b.n));
  return matches.slice(0, limit).map((place) => ({
    ...place,
    label: `${place.n}, ${place.s}`,
  }));
}
