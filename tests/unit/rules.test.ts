import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compareAlerts, hazardGroup, instructionText, mergeAlertFeeds, normalizeAlerts, severityLabel } from "@/lib/alerts";
import { EMPTY_ALERTS, NO_GUARANTEE, NO_INSTRUCTION } from "@/lib/copy";
import { inSearchableArea } from "@/lib/geo";
import { femaDisasterUrl, isAlertId, nwsZoneId, officialHttpUrl } from "@/lib/links";
import { notificationCopy, unseenSevere } from "@/lib/monitor";
import { formatOfficialTime } from "@/lib/time";
import { rememberLocation } from "@/lib/map-data";
import { polygonRelation } from "@/lib/polygon";
import { resolveQuery } from "@/lib/geocode";
import { searchPlaces, zipCentroid } from "@/lib/reference";
import { GeocodeError } from "@/lib/errors";
import type { OfficialAlert } from "@/lib/types";

const square = (west: number, south: number, east: number, north: number): number[][][] => [[
  [west, south],
  [east, south],
  [east, north],
  [west, north],
  [west, south],
]];

function feature(overrides: Record<string, unknown> = {}, geometry: unknown = null) {
  return {
    type: "Feature",
    id: "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.example001",
    geometry,
    properties: {
      id: "urn:oid:2.49.0.1.840.0.example001",
      event: "Tornado Warning",
      severity: "Extreme",
      urgency: "Immediate",
      certainty: "Observed",
      areaDesc: "Example County",
      onset: "2026-11-08T18:00:00Z",
      effective: "2026-11-08T18:00:00Z",
      expires: "2026-11-08T19:00:00Z",
      ends: "2026-11-08T19:00:00Z",
      sent: "2026-11-08T18:00:00Z",
      instruction: "Take shelter now.",
      senderName: "NWS Norman OK",
      messageType: "Alert",
      status: "Actual",
      web: "http://www.weather.gov",
      ...overrides,
    },
  };
}

describe("official alert normalization", () => {
  it("keeps official fields and does not invent a missing instruction or severity", () => {
    const parsed = normalizeAlerts([
      feature({ instruction: null, severity: null, event: "Flood Warning" }),
    ], { latitude: 35.4, longitude: -97.5 });
    expect(parsed.active[0]?.instruction).toBeNull();
    expect(instructionText(parsed.active[0]?.instruction ?? null)).toBe(NO_INSTRUCTION);
    expect(severityLabel(parsed.active[0]?.severity ?? null)).toBe("Not included by NWS");
    expect(parsed.active[0]?.event).toBe("Flood Warning");
    expect(parsed.active[0]?.officialUrl).toBe("https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.example001");
  });

  it("sorts by official severity, then urgency, then sent time", () => {
    const older = stub("Severe", "Immediate", "2026-11-08T12:00:00Z");
    const newer = stub("Severe", "Future", "2026-11-08T18:00:00Z");
    const extreme = stub("Extreme", "Future", "2026-11-08T11:00:00Z");
    const minor = stub("Minor", "Immediate", "2026-11-08T19:00:00Z");
    const ordered = [minor, newer, extreme, older].sort(compareAlerts);
    expect(ordered.map((alert) => alert.severity)).toEqual(["Extreme", "Severe", "Severe", "Minor"]);
    expect(ordered[1]?.urgency).toBe("Immediate");
  });

  it("quarantines non-actual messages and separates cancellations", () => {
    const parsed = normalizeAlerts([
      feature(),
      feature({ id: "urn:oid:2.49.0.1.840.0.example002", status: "Test", event: "Test Message" }),
      feature({ id: "urn:oid:2.49.0.1.840.0.example003", messageType: "Cancel", event: "Tornado Warning" }),
    ], null);
    expect(parsed.active).toHaveLength(1);
    expect(parsed.quarantined[0]?.status).toBe("Test");
    expect(parsed.cancellations[0]?.messageType).toBe("Cancel");
  });

  it("labels a point outside the official polygon", () => {
    const geometry = { type: "Polygon", coordinates: square(-80.3, 25.7, -80.1, 25.9) };
    const parsed = normalizeAlerts([feature({}, geometry)], { latitude: 35.47, longitude: -97.52 });
    expect(parsed.active[0]?.relation).toBe("outside");
    expect(parsed.active[0]?.relationChecked).toBe(true);
  });

  it("keeps a zone alert whose polygon misses the point and promotes one that contains it", () => {
    const elsewhere = { type: "Polygon", coordinates: square(-80.3, 25.7, -80.1, 25.9) };
    const around = { type: "Polygon", coordinates: square(-98, 35, -97, 36) };
    const parsed = mergeAlertFeeds(
      [],
      [
        feature({ id: "urn:oid:2.49.0.1.840.0.example010", event: "Tornado Warning" }, elsewhere),
        feature({ id: "urn:oid:2.49.0.1.840.0.example011", event: "Flood Warning", severity: "Severe" }, around),
      ],
      { latitude: 35.47, longitude: -97.52 },
    );
    const tornado = parsed.active.find((alert) => alert.id === "urn:oid:2.49.0.1.840.0.example010");
    const flood = parsed.active.find((alert) => alert.id === "urn:oid:2.49.0.1.840.0.example011");
    expect(tornado?.scope).toBe("zone");
    expect(tornado?.relation).toBe("outside");
    expect(flood?.scope).toBe("point");
    expect(flood?.relation).toBe("inside");
    expect(notificationCopy(tornado!).body).toContain("outside the official polygon");
    expect(notificationCopy(tornado!).title).toBe("Tornado Warning");
  });

  it("dedupes by the official id and keeps the later message", () => {
    const parsed = normalizeAlerts([
      feature({ sent: "2026-11-08T12:00:00Z", headline: "First" }),
      feature({ sent: "2026-11-08T13:00:00Z", headline: "Second" }),
    ], null);
    expect(parsed.active).toHaveLength(1);
    expect(parsed.active[0]?.headline).toBe("Second");
  });

  it("groups official event names without inventing a hurricane chip", () => {
    expect(hazardGroup("Tornado Watch")).toBe("Tornado");
    expect(hazardGroup("Flash Flood Warning")).toBe("Flood");
    expect(hazardGroup("Winter Storm Warning")).toBe("Winter");
    expect(hazardGroup("Excessive Heat Warning")).toBe("Heat");
    expect(hazardGroup("Hurricane Warning")).toBe("Other");
    expect(hazardGroup("Special Marine Warning")).toBe("Marine");
    expect(hazardGroup(null)).toBe("Other");
  });
});

describe("polygons", () => {
  const outer = square(0, 0, 10, 10);
  outer.push([[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]);

  it("treats the interior, the hole, and the boundary differently", () => {
    const geometry = { type: "Polygon", coordinates: outer };
    expect(polygonRelation(geometry, 1, 1)).toBe("inside");
    expect(polygonRelation(geometry, 5, 5)).toBe("outside");
    expect(polygonRelation(geometry, 0, 0)).toBe("inside");
    expect(polygonRelation(geometry, 20, 20)).toBe("outside");
  });

  it("returns none when the source did not include a polygon", () => {
    expect(polygonRelation(null, 1, 1)).toBe("none");
    expect(polygonRelation({ type: "LineString", coordinates: [[0, 0], [1, 1]] }, 0, 0)).toBe("none");
  });
});

describe("links and places", () => {
  it("allows official hosts and rejects everything else", () => {
    expect(officialHttpUrl("https://api.weather.gov/alerts/urn:oid:1")).toMatch(/^https:\/\/api\.weather\.gov\//);
    expect(officialHttpUrl("http://www.weather.gov")).toBe("http://www.weather.gov/");
    expect(officialHttpUrl("https://earthquake.usgs.gov/earthquakes/eventpage/ci1")).toMatch(/usgs\.gov/);
    expect(officialHttpUrl("https://evil.weather.gov/alert")).toBeNull();
    expect(officialHttpUrl("https://user:pass@weather.gov/")).toBeNull();
    expect(officialHttpUrl("javascript:alert(1)")).toBeNull();
    expect(officialHttpUrl("http://earthquake.usgs.gov/x")).toBeNull();
    expect(femaDisasterUrl(4955)).toBe("https://www.fema.gov/disaster/4955");
    expect(femaDisasterUrl(0)).toBeNull();
    expect(isAlertId("urn:oid:2.49.0.1.840.0.example001")).toBe(true);
    expect(isAlertId("../etc")).toBe(false);
    expect(nwsZoneId("https://api.weather.gov/zones/forecast/OKZ025")).toBe("OKZ025");
    expect(nwsZoneId("https://api.weather.gov/zones/county/OKC109")).toBe("OKC109");
    expect(nwsZoneId("https://evil.example/zones/forecast/OKZ025")).toBeNull();
  });

  it("resolves real ZIP centers and cities from the Census gazetteer", async () => {
    expect(zipCentroid("10001")).toEqual({ latitude: 40.75065, longitude: -73.9973 });
    expect(zipCentroid("00000")).toBeNull();
    const chicago = await resolveQuery("Chicago, IL");
    expect(chicago.precision).toBe("place");
    expect(chicago.state).toBe("IL");
    expect(inSearchableArea(chicago.latitude, chicago.longitude)).toBe(true);
    const zip = await resolveQuery("96813");
    expect(zip.precision).toBe("zip-center");
    expect(zip.label).toBe("ZIP code 96813");
    await expect(resolveQuery("1234")).rejects.toBeInstanceOf(GeocodeError);
    await expect(resolveQuery("1234")).rejects.toThrow("Enter a 5-digit U.S. ZIP code.");
    expect(searchPlaces("Springfield", 8).length).toBeGreaterThan(1);
    expect(inSearchableArea(52.9, 173.2)).toBe(true);
    expect(inSearchableArea(51.5, -0.12)).toBe(false);
  });

  it("locks the empty-alert sentence and refuses an all-clear claim", () => {
    expect(EMPTY_ALERTS).toBe("No matching active alerts were returned by the sources checked.");
    expect(NO_GUARANTEE).toContain("does not mean the area is completely safe");
    expect(NO_INSTRUCTION).toBe("This alert did not include an instruction.");
    const formatted = formatOfficialTime("2026-11-09T22:03:00.349Z", "America/Puerto_Rico");
    expect(formatted).toContain("Nov 9, 2026");
    expect(formatted).not.toContain("2026-11-09T");
    const severe = stub("Severe", "Immediate", "2026-11-08T12:00:00Z");
    expect(unseenSevere([severe], [])).toHaveLength(1);
    expect(unseenSevere([severe], [severe.id!])).toHaveLength(0);
    expect(unseenSevere([stub("Minor", "Immediate", "2026-11-08T12:00:00Z")], [])).toHaveLength(0);
  });

  it("stores at most five locations and does not keep alert text", () => {
    let saved = rememberLocation([], location("A", 1));
    for (let index = 2; index <= 7; index += 1) saved = rememberLocation(saved, location(String(index), index));
    expect(saved).toHaveLength(5);
    expect(saved[0]?.label).toBe("7");
    saved = rememberLocation(saved, location("7", 7));
    expect(saved.filter((item) => item.label === "7")).toHaveLength(1);
  });
});

describe("production source guard", () => {
  it("does not reference fixture mode or invented safety claims", () => {
    const files = ["lib", "app", "components", "scripts"].flatMap((dir) => walk(path.join(process.cwd(), dir)));
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith(`${path.sep}copy.ts`)) continue;
      const source = readFileSync(file, "utf8");
      if (/usingFixtures|tests\/fixtures|you are safe|all clear/i.test(source)) offenders.push(file);
      if (/completely safe/i.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

function stub(severity: string, urgency: string, sent: string): OfficialAlert {
  return {
    id: `${severity}-${urgency}-${sent}`,
    event: "Test",
    severity,
    urgency,
    certainty: null,
    areaDesc: null,
    onset: null,
    effective: null,
    expires: null,
    ends: null,
    sent,
    instruction: null,
    description: null,
    headline: null,
    senderName: null,
    messageType: "Alert",
    status: "Actual",
    response: null,
    web: null,
    officialUrl: null,
    geometry: null,
    relation: "none",
    relationChecked: true,
    scope: "point",
    group: "Other",
  };
}

function location(label: string, index: number) {
  return { label, latitude: index, longitude: -index, precision: "place" as const };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx|mjs)$/.test(name) ? [full] : [];
  });
}
