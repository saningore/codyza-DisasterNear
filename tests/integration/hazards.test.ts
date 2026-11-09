import { afterEach, describe, expect, it, vi } from "vitest";
import { loadHazards } from "@/lib/hazards";
import { USER_AGENT } from "@/lib/types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hazard loading", () => {
  it("keeps a declaration out of the alert list and labels a polygon that misses the point", async () => {
    stub((url) => {
      if (url.includes("/points/")) return json(points());
      if (url.includes("/alerts/active")) return json({ features: [tornado()] });
      if (url.includes("earthquake.usgs.gov")) return new Response(null, { status: 204 });
      if (url.includes("fema.gov")) return json({ DisasterDeclarationsSummaries: [declaration()] });
      return json({}, 404);
    });
    const report = await loadHazards({
      label: "Oklahoma City, OK",
      latitude: 35.4676,
      longitude: -97.5164,
      precision: "place",
    });
    expect(report.alerts).toHaveLength(1);
    expect(report.alerts[0]?.event).toBe("Tornado Warning");
    expect(report.alerts[0]?.relation).toBe("outside");
    expect(report.alerts[0]?.senderName).toBe("NWS Norman OK");
    expect(report.declarations.map((item) => item.title)).toEqual(["HURRICANE TEST"]);
    expect(report.alerts.some((alert) => alert.event === "HURRICANE TEST")).toBe(false);
    expect(report.sources.map((source) => source.status)).toEqual(["ok", "empty", "ok"]);
  });

  it("does not invent alerts when the National Weather Service fails", async () => {
    stub((url) => {
      if (url.includes("/points/")) return json(points());
      if (url.includes("/alerts/active")) return json({ detail: "down" }, 500);
      if (url.includes("earthquake.usgs.gov")) return json(quakeCollection());
      if (url.includes("fema.gov")) return json({ DisasterDeclarationsSummaries: [declaration()] });
      return json({}, 404);
    });
    const report = await loadHazards({
      label: "Device location",
      latitude: 34.05,
      longitude: -118.24,
      precision: "device",
    });
    expect(report.alerts).toEqual([]);
    expect(report.sources.find((source) => source.id === "nws")).toMatchObject({
      status: "error",
      detail: "The National Weather Service could not be checked.",
    });
    expect(report.earthquakes).toHaveLength(1);
    expect(report.earthquakes[0]?.place).toBe("14 km N of Warner Springs, CA");
    expect(report.declarations).toHaveLength(1);
    expect(JSON.stringify(report)).not.toContain("Take shelter");
  });

  it("asks FEMA only after a state is known and skips non-earthquake events", async () => {
    const femaCalls: string[] = [];
    stub((url) => {
      if (url.includes("/points/")) return json({}, 404);
      if (url.includes("/alerts/active")) return json({ features: [] });
      if (url.includes("geocoding.geo.census.gov")) {
        return json({ result: { geographies: { States: [{ STUSAB: "CA" }] } } });
      }
      if (url.includes("earthquake.usgs.gov")) return json(quakeCollection("quarry blast"));
      if (url.includes("fema.gov")) {
        femaCalls.push(url);
        return json({ DisasterDeclarationsSummaries: [] });
      }
      return json({}, 404);
    });
    const report = await loadHazards({
      label: "Los Angeles, CA",
      latitude: 34.05,
      longitude: -118.24,
      precision: "place",
    });
    expect(femaCalls).toHaveLength(1);
    expect(decodeURIComponent(femaCalls[0].replace(/\+/g, " "))).toContain("state eq 'CA'");
    expect(report.sources.find((source) => source.id === "nws")?.status).toBe("empty");
    expect(report.earthquakes).toEqual([]);
    expect(report.earthquakesOmitted).toBe(1);
    expect(report.sources.find((source) => source.id === "fema")?.status).toBe("empty");
  });
});

function stub(route: (url: string) => Response) {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    expect(headers.get("user-agent")).toBe(USER_AGENT);
    return route(String(input));
  }));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function points() {
  return {
    properties: {
      timeZone: "America/Chicago",
      forecastOffice: "https://api.weather.gov/offices/OUN",
      relativeLocation: { properties: { city: "Oklahoma City", state: "OK" } },
    },
  };
}

function tornado() {
  return {
    type: "Feature",
    id: "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.example001",
    geometry: {
      type: "Polygon",
      coordinates: [[[-80.3, 25.7], [-80.1, 25.7], [-80.1, 25.9], [-80.3, 25.9], [-80.3, 25.7]]],
    },
    properties: {
      id: "urn:oid:2.49.0.1.840.0.example001",
      event: "Tornado Warning",
      severity: "Extreme",
      urgency: "Immediate",
      certainty: "Observed",
      areaDesc: "Miami-Dade",
      onset: "2026-11-08T18:00:00Z",
      effective: "2026-11-08T18:00:00Z",
      expires: "2026-11-08T19:00:00Z",
      ends: null,
      sent: "2026-11-08T18:00:00Z",
      instruction: "Take shelter.",
      senderName: "NWS Norman OK",
      messageType: "Alert",
      status: "Actual",
      web: "http://www.weather.gov",
    },
  };
}

function declaration() {
  return {
    disasterNumber: 4955,
    declarationTitle: "HURRICANE TEST",
    declarationType: "DR",
    incidentType: "Hurricane",
    state: "OK",
    designatedArea: "Oklahoma (County)",
    declarationDate: "2026-10-27T00:00:00.000Z",
    incidentBeginDate: "2026-10-06T00:00:00.000Z",
    incidentEndDate: "2026-10-12T00:00:00.000Z",
    femaDeclarationString: "DR-4955-OK",
  };
}

function quakeCollection(type = "earthquake") {
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "ci41359103",
      properties: {
        mag: 2.6,
        place: "14 km N of Warner Springs, CA",
        time: 1793947449160,
        url: "https://earthquake.usgs.gov/earthquakes/eventpage/ci41359103",
        alert: null,
        tsunami: 0,
        magType: "ml",
        type,
      },
      geometry: { type: "Point", coordinates: [-116.65, 33.4, 7.49] },
    }],
  };
}
