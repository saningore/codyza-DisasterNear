import { describe, expect, it } from "vitest";
import { selectDeclarations } from "@/lib/fema";
import { alertCollection } from "@/lib/map-data";
import type { Declaration, OfficialAlert } from "@/lib/types";

describe("FEMA declarations", () => {
  const now = new Date("2026-11-08T00:00:00Z");

  it("keeps recent declarations and drops undated rows", () => {
    const selected = selectDeclarations([
      row({ disasterNumber: 1, declarationDate: "2026-10-01T00:00:00.000Z", title: "Recent" }),
      row({ disasterNumber: 2, declarationDate: "2020-01-01T00:00:00.000Z", incidentEndDate: null, title: "Old open" }),
      row({ disasterNumber: 3, declarationDate: "2024-01-01T00:00:00.000Z", incidentEndDate: null, title: "Still open" }),
      row({ disasterNumber: 4, declarationDate: null, title: "Undated" }),
    ], now);
    expect(selected.rows.map((item) => item.title)).toEqual(["Recent", "Still open"]);
  });
});

describe("map geometry", () => {
  it("does not draw a shape when the alert has no polygon", () => {
    const collection = alertCollection([alert(null), alert({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] })], null);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]?.geometry.type).toBe("Polygon");
  });
});

function row(overrides: Partial<Declaration> & { disasterNumber: number }): Declaration {
  return {
    disasterNumber: overrides.disasterNumber,
    title: overrides.title ?? null,
    declarationType: "DR",
    declarationTypeLabel: "Major Disaster Declaration",
    incidentType: "Hurricane",
    state: "FL",
    designatedArea: "Bay (County)",
    declarationDate: overrides.declarationDate === undefined ? "2026-10-01T00:00:00.000Z" : overrides.declarationDate,
    incidentBeginDate: null,
    incidentEndDate: overrides.incidentEndDate === undefined ? "2026-10-02T00:00:00.000Z" : overrides.incidentEndDate,
    femaDeclarationString: null,
    url: `https://www.fema.gov/disaster/${overrides.disasterNumber}`,
  };
}

function alert(geometry: OfficialAlert["geometry"]): OfficialAlert {
  return {
    id: geometry ? "polygon" : "none",
    event: "Flood Warning",
    severity: "Severe",
    urgency: "Immediate",
    certainty: null,
    areaDesc: "County",
    onset: null,
    effective: null,
    expires: null,
    ends: null,
    sent: null,
    instruction: null,
    description: null,
    headline: null,
    senderName: null,
    messageType: "Alert",
    status: "Actual",
    response: null,
    web: null,
    officialUrl: null,
    geometry,
    relation: geometry ? "inside" : "none",
    relationChecked: true,
    group: "Flood",
  };
}
