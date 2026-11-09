import { GeocodeError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";
import { inSearchableArea } from "@/lib/geo";
import { searchPlaces, zipCentroid } from "@/lib/reference";
import { stateAbbreviation, zipFive } from "@/lib/states";
import { asRecord } from "@/lib/text";
import type { GeocodeHit } from "@/lib/types";

type CensusMatch = {
  matchedAddress?: string;
  coordinates?: { x?: number; y?: number };
  addressComponents?: { state?: string };
};

export async function geocodeAddress(query: string): Promise<GeocodeHit | null> {
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`;
  const response = await fetchJson(url, 7000);
  const payload = asRecord(response.body);
  const result = asRecord(payload?.result);
  const matches = Array.isArray(result?.addressMatches) ? result.addressMatches : [];
  const match = matches[0] as CensusMatch | undefined;
  const latitude = match?.coordinates?.y;
  const longitude = match?.coordinates?.x;
  const state = match?.addressComponents?.state ? stateAbbreviation(match.addressComponents.state) : null;
  if (typeof latitude !== "number" || typeof longitude !== "number" || !state) return null;
  if (!inSearchableArea(latitude, longitude)) return null;
  return {
    label: match?.matchedAddress || query,
    latitude,
    longitude,
    precision: "address",
    state,
  };
}

export async function stateForPoint(latitude: number, longitude: number): Promise<string | null> {
  if (!inSearchableArea(latitude, longitude)) return null;
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${longitude}&y=${latitude}&benchmark=4&vintage=4&format=json`;
    const response = await fetchJson(url, 6000);
    if (response.status !== 200) return null;
    const result = asRecord(asRecord(response.body)?.result);
    const geographies = asRecord(result?.geographies);
    const states = geographies
      ? Object.entries(geographies).find(([key, value]) => /state/i.test(key) && Array.isArray(value) && value.length)?.[1]
      : null;
    if (!Array.isArray(states) || !states.length) return null;
    const state = asRecord(states[0]);
    return stateAbbreviation(String(state?.STUSAB ?? ""));
  } catch {
    return null;
  }
}

function placeHit(place: ReturnType<typeof searchPlaces>[number]): GeocodeHit {
  return {
    label: place.label,
    latitude: place.lat,
    longitude: place.lon,
    precision: "place",
    state: place.s,
  };
}

export async function suggestionsFor(query: string): Promise<GeocodeHit[]> {
  const trimmed = query.trim().replace(/\s+/g, " ");
  const zip = zipFive(trimmed);
  if (zip && trimmed.replace(/\s/g, "").startsWith(zip)) {
    const center = zipCentroid(zip);
    if (!center) return [];
    return [{
      label: `ZIP code ${zip}`,
      latitude: center.latitude,
      longitude: center.longitude,
      precision: "zip-center",
      state: null,
    }];
  }
  const comma = trimmed.match(/^(.+?),\s*(.+)$/);
  const state = comma ? stateAbbreviation(comma[2]) : null;
  const placeQuery = state && comma ? `${comma[1]}, ${state}` : trimmed;
  const places = searchPlaces(placeQuery, 6).map(placeHit);
  if (places.length) return places;
  if (/\d/.test(trimmed) || trimmed.includes(",")) {
    const address = await geocodeAddress(trimmed).catch(() => null);
    return address ? [address] : [];
  }
  return [];
}

export async function resolveQuery(query: string): Promise<GeocodeHit> {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 200) {
    throw new GeocodeError("Enter a U.S. ZIP code, city, or street address.");
  }
  if (/^\d+$/.test(trimmed) && !zipFive(trimmed)) {
    throw new GeocodeError("Enter a 5-digit U.S. ZIP code.");
  }
  const zip = zipFive(trimmed);
  if (zip && (trimmed === zip || trimmed.startsWith(`${zip}-`) || /^(\d{5})(?:-\d{4})?(?:,\s*[A-Za-z .]+)?$/.test(trimmed))) {
    const center = zipCentroid(zip);
    if (!center) throw new GeocodeError("That ZIP code could not be found. Try a street address or another ZIP code.");
    return {
      label: `ZIP code ${zip}`,
      latitude: center.latitude,
      longitude: center.longitude,
      precision: "zip-center",
      state: null,
    };
  }

  const comma = trimmed.match(/^(.+?),\s*(.+)$/);
  const state = comma ? stateAbbreviation(comma[2]) : null;
  if (comma && !state && !/\d/.test(trimmed)) {
    throw new GeocodeError("Enter a city and a two-letter state, for example Chicago, IL.");
  }
  const placeQuery = state && comma ? `${comma[1]}, ${state}` : trimmed;
  const places = searchPlaces(placeQuery, 8);
  const name = (comma ? comma[1] : trimmed).trim().toUpperCase();
  const exact = places.filter((place) => place.n.toUpperCase() === name);
  const pool = exact.length ? exact : places.filter((place) => place.n.toUpperCase() === placeQuery.split(",")[0]?.trim().toUpperCase());
  if (state && pool.length) return placeHit(pool[0]);
  if (!state && pool.length === 1) return placeHit(pool[0]);
  if (!state && pool.length > 1) {
    const [first, second] = pool;
    if (second && first && first.a >= second.a * 10) return placeHit(first);
    if (first) throw new GeocodeError(`Several places match. Add a state, for example ${first.n}, ${first.s}.`);
  }

  if (/\d/.test(trimmed) || trimmed.includes(",")) {
    const address = await geocodeAddress(trimmed);
    if (address) return address;
  }
  throw new GeocodeError("That location could not be found. Try a street address or another ZIP code.");
}
