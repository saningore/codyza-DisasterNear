import { UpstreamError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";
import { nwsZoneId, officeIdFromUrl } from "@/lib/links";
import { roundCoordinate } from "@/lib/geo";
import { stateAbbreviation } from "@/lib/states";
import { asRecord, textOrNull } from "@/lib/text";

const BASE = "https://api.weather.gov";

export type PointsValue = {
  timeZone: string | null;
  placeLabel: string | null;
  state: string | null;
  officeId: string | null;
  zoneIds: string[];
};

export type SourceOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export async function nwsPoints(latitude: number, longitude: number): Promise<SourceOutcome<PointsValue>> {
  try {
    const response = await fetchJson(`${BASE}/points/${roundCoordinate(latitude)},${roundCoordinate(longitude)}`);
    if (response.status === 404) {
      return { ok: false, message: "The National Weather Service did not return a forecast grid for this point." };
    }
    if (response.status !== 200) {
      return { ok: false, message: "The National Weather Service forecast grid could not be read." };
    }
    const properties = asRecord(asRecord(response.body)?.properties);
    const relative = asRecord(asRecord(properties?.relativeLocation)?.properties);
    const city = textOrNull(relative?.city);
    const state = textOrNull(relative?.state);
    const abbreviation = state ? stateAbbreviation(state) : null;
    return {
      ok: true,
      value: {
        timeZone: textOrNull(properties?.timeZone),
        placeLabel: city ? (abbreviation ? `${city}, ${abbreviation}` : city) : null,
        state: abbreviation,
        officeId: officeIdFromUrl(properties?.forecastOffice),
        zoneIds: uniqueZoneIds(properties),
      },
    };
  } catch (error) {
    const message = error instanceof UpstreamError
      ? "The National Weather Service forecast grid could not be reached."
      : "The National Weather Service forecast grid could not be read.";
    return { ok: false, message };
  }
}

export async function nwsActiveFeatures(
  latitude: number,
  longitude: number,
): Promise<SourceOutcome<unknown[]>> {
  try {
    const response = await fetchJson(
      `${BASE}/alerts/active?point=${roundCoordinate(latitude)},${roundCoordinate(longitude)}&status=actual`,
    );
    if (response.status !== 200) {
      return { ok: false, message: "The National Weather Service could not be checked." };
    }
    const features = asRecord(response.body)?.features;
    if (!Array.isArray(features)) {
      return { ok: false, message: "The National Weather Service response could not be read." };
    }
    return { ok: true, value: features };
  } catch (error) {
    if (error instanceof UpstreamError) {
      return { ok: false, message: "The National Weather Service could not be checked." };
    }
    return { ok: false, message: "The National Weather Service could not be checked." };
  }
}

export async function nwsZoneFeatures(zoneIds: string[]): Promise<SourceOutcome<unknown[]>> {
  const ids = [...new Set(zoneIds)].filter((id) => /^[A-Z]{3}\d{3}$/.test(id)).slice(0, 3);
  if (!ids.length) return { ok: true, value: [] };
  try {
    const response = await fetchJson(`${BASE}/alerts/active?zone=${ids.join(",")}&status=actual`);
    if (response.status !== 200) {
      return { ok: false, message: "The NWS zone query could not be checked." };
    }
    const features = asRecord(response.body)?.features;
    if (!Array.isArray(features)) {
      return { ok: false, message: "The NWS zone query could not be read." };
    }
    return { ok: true, value: features };
  } catch {
    return { ok: false, message: "The NWS zone query could not be checked." };
  }
}

function uniqueZoneIds(properties: Record<string, unknown> | null): string[] {
  const ids = [properties?.forecastZone, properties?.county, properties?.fireWeatherZone]
    .map((value) => nwsZoneId(value))
    .filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
}

export async function nwsAlertFeature(id: string): Promise<SourceOutcome<unknown>> {
  try {
    const response = await fetchJson(`${BASE}/alerts/${id}`);
    if (response.status === 404) return { ok: false, message: "missing" };
    if (response.status !== 200) return { ok: false, message: "error" };
    const body = asRecord(response.body);
    if (!body) return { ok: false, message: "error" };
    if (body.type === "Feature") return { ok: true, value: body };
    const features = body.features;
    if (Array.isArray(features) && features.length === 1) return { ok: true, value: features[0] };
    return { ok: false, message: "error" };
  } catch {
    return { ok: false, message: "error" };
  }
}
