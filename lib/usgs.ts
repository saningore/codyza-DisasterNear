import { UpstreamError } from "@/lib/errors";
import { milesBetween, roundCoordinate } from "@/lib/geo";
import { fetchJson } from "@/lib/http";
import { officialHttpUrl } from "@/lib/links";
import { asRecord, textOrNull } from "@/lib/text";
import { epochToIso } from "@/lib/time";
import { EARTHQUAKE_WINDOW, type Earthquake } from "@/lib/types";

const PAGER = new Set(["green", "yellow", "orange", "red"]);

export async function usgsEarthquakes(
  latitude: number,
  longitude: number,
): Promise<{ ok: true; earthquakes: Earthquake[]; omitted: number } | { ok: false; message: string }> {
  const start = new Date(Date.now() - EARTHQUAKE_WINDOW.days * 24 * 60 * 60 * 1000);
  const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
  url.searchParams.set("format", "geojson");
  url.searchParams.set("latitude", String(roundCoordinate(latitude)));
  url.searchParams.set("longitude", String(roundCoordinate(longitude)));
  url.searchParams.set("maxradiuskm", String(EARTHQUAKE_WINDOW.radiusKm));
  url.searchParams.set("minmagnitude", String(EARTHQUAKE_WINDOW.minMagnitude));
  url.searchParams.set("starttime", start.toISOString().slice(0, 19));
  url.searchParams.set("orderby", "time");
  url.searchParams.set("limit", "50");
  try {
    const response = await fetchJson(url.toString());
    if (response.status === 204) return { ok: true, earthquakes: [], omitted: 0 };
    if (response.status !== 200) {
      return { ok: false, message: "The USGS earthquake catalog could not be checked. No earthquake was added in its place." };
    }
    const features = asRecord(response.body)?.features;
    if (!Array.isArray(features)) {
      return { ok: false, message: "The USGS response could not be read. No earthquake was added in its place." };
    }
    let omitted = 0;
    const earthquakes: Earthquake[] = [];
    for (const feature of features) {
      const record = asRecord(feature);
      const properties = asRecord(record?.properties);
      const geometry = asRecord(record?.geometry);
      const coordinates = geometry?.coordinates;
      const eventType = textOrNull(properties?.type);
      if (eventType && eventType !== "earthquake") {
        omitted += 1;
        continue;
      }
      if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
      const longitudeValue = coordinates[0];
      const latitudeValue = coordinates[1];
      const depth = coordinates[2];
      if (typeof latitudeValue !== "number" || typeof longitudeValue !== "number") continue;
      const pager = textOrNull(properties?.alert);
      const id = textOrNull(record?.id) ?? textOrNull(properties?.code) ?? `${longitudeValue},${latitudeValue}`;
      earthquakes.push({
        id,
        magnitude: typeof properties?.mag === "number" ? properties.mag : null,
        magType: textOrNull(properties?.magType),
        place: textOrNull(properties?.place),
        time: epochToIso(properties?.time),
        depthKm: typeof depth === "number" ? depth : null,
        latitude: latitudeValue,
        longitude: longitudeValue,
        url: officialHttpUrl(properties?.url),
        pager: pager && PAGER.has(pager.toLowerCase()) ? pager : null,
        tsunami: typeof properties?.tsunami === "number" ? properties.tsunami : null,
        distanceMiles: Math.round(milesBetween(latitude, longitude, latitudeValue, longitudeValue) * 10) / 10,
      });
    }
    earthquakes.sort((left, right) => Date.parse(right.time ?? "") - Date.parse(left.time ?? ""));
    return { ok: true, earthquakes, omitted };
  } catch (error) {
    if (error instanceof UpstreamError) {
      return { ok: false, message: "The USGS earthquake catalog could not be checked. No earthquake was added in its place." };
    }
    return { ok: false, message: "The USGS earthquake catalog could not be checked. No earthquake was added in its place." };
  }
}
