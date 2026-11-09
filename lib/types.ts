export const USER_AGENT = "DisasterNear/1.0 (https://codyza.com)";

export type Precision = "zip-center" | "place" | "address" | "device";

export type SourceId = "nws" | "usgs" | "fema";

export type SourceState = "ok" | "empty" | "error";

export type HazardGroup =
  | "Tornado"
  | "Severe thunderstorm"
  | "Flood"
  | "Winter"
  | "Heat"
  | "Wind"
  | "Marine"
  | "Other";

export type PolygonRelation = "inside" | "outside" | "none";

export type OfficialGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type OfficialAlert = {
  id: string | null;
  event: string | null;
  severity: string | null;
  urgency: string | null;
  certainty: string | null;
  areaDesc: string | null;
  onset: string | null;
  effective: string | null;
  expires: string | null;
  ends: string | null;
  sent: string | null;
  instruction: string | null;
  description: string | null;
  headline: string | null;
  senderName: string | null;
  messageType: string | null;
  status: string | null;
  response: string | null;
  web: string | null;
  officialUrl: string | null;
  geometry: OfficialGeometry | null;
  relation: PolygonRelation;
  relationChecked: boolean;
  scope: "point" | "zone";
  group: HazardGroup;
};

export type Earthquake = {
  id: string;
  magnitude: number | null;
  magType: string | null;
  place: string | null;
  time: string | null;
  depthKm: number | null;
  latitude: number;
  longitude: number;
  url: string | null;
  pager: string | null;
  tsunami: number | null;
  distanceMiles: number;
};

export type Declaration = {
  disasterNumber: number;
  title: string | null;
  declarationType: string | null;
  declarationTypeLabel: string | null;
  incidentType: string | null;
  state: string | null;
  designatedArea: string | null;
  declarationDate: string | null;
  incidentBeginDate: string | null;
  incidentEndDate: string | null;
  femaDeclarationString: string | null;
  url: string | null;
};

export type SourceReport = {
  id: SourceId;
  name: string;
  status: SourceState;
  retrievedAt: string;
  detail: string;
};

export type HazardReport = {
  origin: {
    label: string;
    latitude: number;
    longitude: number;
    precision: Precision;
  };
  state: string | null;
  timeZone: string | null;
  placeLabel: string | null;
  officeId: string | null;
  forecastPage: string;
  gridNote: string | null;
  zoneNote: string | null;
  retrievedAt: string;
  alerts: OfficialAlert[];
  cancellations: OfficialAlert[];
  quarantined: OfficialAlert[];
  earthquakes: Earthquake[];
  earthquakesOmitted: number;
  declarations: Declaration[];
  declarationsTruncated: boolean;
  sources: SourceReport[];
  earthquakeWindow: {
    radiusKm: number;
    days: number;
    minMagnitude: number;
  };
};

export type GeocodeHit = {
  label: string;
  latitude: number;
  longitude: number;
  precision: Precision;
  state: string | null;
};

export const HAZARD_GROUPS: Array<"All" | HazardGroup> = [
  "All",
  "Tornado",
  "Severe thunderstorm",
  "Flood",
  "Winter",
  "Heat",
  "Wind",
  "Marine",
  "Other",
];

export const EARTHQUAKE_WINDOW = {
  radiusKm: 300,
  days: 7,
  minMagnitude: 2.5,
} as const;
