import { mergeAlertFeeds } from "@/lib/alerts";
import {
  FEMA_EMPTY,
  FEMA_NO_STATE,
  FEMA_UNCHECKED,
  NWS_EMPTY_DETAIL,
  NWS_UNCHECKED,
  USGS_EMPTY,
  USGS_UNCHECKED,
  ZONE_NOTE_FAILED,
  ZONE_NOTE_UNAVAILABLE,
} from "@/lib/copy";
import { stateForPoint } from "@/lib/geocode";
import { nwsForecastPage } from "@/lib/links";
import { femaDeclarations } from "@/lib/fema";
import { nwsActiveFeatures, nwsPoints, nwsZoneFeatures } from "@/lib/nws";
import { usgsEarthquakes } from "@/lib/usgs";
import { EARTHQUAKE_WINDOW, type HazardReport, type Precision, type SourceReport } from "@/lib/types";

export async function loadHazards(input: {
  label: string;
  latitude: number;
  longitude: number;
  precision: Precision;
}): Promise<HazardReport> {
  const retrievedAt = new Date().toISOString();
  const [points, alerts, quakes] = await Promise.all([
    nwsPoints(input.latitude, input.longitude),
    nwsActiveFeatures(input.latitude, input.longitude),
    usgsEarthquakes(input.latitude, input.longitude),
  ]);
  const zone = points.ok && points.value.zoneIds.length
    ? await nwsZoneFeatures(points.value.zoneIds)
    : { ok: true as const, value: [] as unknown[] };
  const zoneNote = alerts.ok
    ? zoneNoteFor(points.ok, points.ok ? points.value.zoneIds.length : 0, zone.ok)
    : null;

  let state = points.ok ? points.value.state : null;
  if (!state) state = await stateForPoint(input.latitude, input.longitude);
  const declarations = state
    ? await femaDeclarations(state)
    : { ok: false as const, message: FEMA_NO_STATE };

  const partitioned = alerts.ok
    ? mergeAlertFeeds(alerts.value, zone.ok ? zone.value : [], { latitude: input.latitude, longitude: input.longitude })
    : { active: [], cancellations: [], quarantined: [] };

  const sources: SourceReport[] = [
    nwsSource(alerts.ok, partitioned, retrievedAt, alerts.ok ? "" : alerts.message),
    quakeSource(quakes, retrievedAt),
    declarationSource(declarations, retrievedAt),
  ];

  return {
    origin: {
      label: input.label,
      latitude: input.latitude,
      longitude: input.longitude,
      precision: input.precision,
    },
    state,
    timeZone: points.ok ? points.value.timeZone : null,
    placeLabel: points.ok ? points.value.placeLabel : null,
    officeId: points.ok ? points.value.officeId : null,
    forecastPage: nwsForecastPage(input.latitude, input.longitude),
    gridNote: points.ok ? null : points.message,
    zoneNote,
    retrievedAt,
    alerts: partitioned.active,
    cancellations: partitioned.cancellations,
    quarantined: partitioned.quarantined,
    earthquakes: quakes.ok ? quakes.earthquakes : [],
    earthquakesOmitted: quakes.ok ? quakes.omitted : 0,
    declarations: declarations.ok ? declarations.declarations : [],
    declarationsTruncated: declarations.ok ? declarations.truncated : false,
    sources,
    earthquakeWindow: { ...EARTHQUAKE_WINDOW },
  };
}

function zoneNoteFor(pointsOk: boolean, zoneCount: number, zoneOk: boolean): string | null {
  if (!pointsOk || zoneCount === 0) return ZONE_NOTE_UNAVAILABLE;
  if (!zoneOk) return ZONE_NOTE_FAILED;
  return null;
}

function nwsSource(
  ok: boolean,
  partitioned: { active: unknown[]; cancellations: unknown[]; quarantined: unknown[] },
  retrievedAt: string,
  failure: string,
): SourceReport {
  if (!ok) {
    return {
      id: "nws",
      name: "National Weather Service",
      status: "error",
      retrievedAt,
      detail: failure || NWS_UNCHECKED,
    };
  }
  if (partitioned.active.length) {
    return {
      id: "nws",
      name: "National Weather Service",
      status: "ok",
      retrievedAt,
      detail: "Active alerts were returned by the National Weather Service.",
    };
  }
  let detail = NWS_EMPTY_DETAIL;
  if (partitioned.cancellations.length) {
    detail = "The National Weather Service returned no active alerts for this point. Cancellation notices are listed separately.";
  } else if (partitioned.quarantined.length) {
    detail = "The National Weather Service did not return an actual active alert for this point. Messages with another status are listed separately.";
  }
  return {
    id: "nws",
    name: "National Weather Service",
    status: "empty",
    retrievedAt,
    detail,
  };
}

function quakeSource(
  quakes: { ok: true; earthquakes: unknown[] } | { ok: false; message: string },
  retrievedAt: string,
): SourceReport {
  if (!quakes.ok) {
    return {
      id: "usgs",
      name: "U.S. Geological Survey",
      status: "error",
      retrievedAt,
      detail: quakes.message || USGS_UNCHECKED,
    };
  }
  if (!quakes.earthquakes.length) {
    return {
      id: "usgs",
      name: "U.S. Geological Survey",
      status: "empty",
      retrievedAt,
      detail: USGS_EMPTY,
    };
  }
  return {
    id: "usgs",
    name: "U.S. Geological Survey",
    status: "ok",
    retrievedAt,
    detail: "USGS returned recorded earthquakes for this radius and time window.",
  };
}

function declarationSource(
  declarations: { ok: true; declarations: unknown[] } | { ok: false; message: string },
  retrievedAt: string,
): SourceReport {
  if (!declarations.ok) {
    return {
      id: "fema",
      name: "FEMA",
      status: "error",
      retrievedAt,
      detail: declarations.message || FEMA_UNCHECKED,
    };
  }
  if (!declarations.declarations.length) {
    return {
      id: "fema",
      name: "FEMA",
      status: "empty",
      retrievedAt,
      detail: FEMA_EMPTY,
    };
  }
  return {
    id: "fema",
    name: "FEMA",
    status: "ok",
    retrievedAt,
    detail: "FEMA returned disaster declarations for this state. A declaration is not an active weather warning.",
  };
}
