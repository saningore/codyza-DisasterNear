import type { Precision } from "@/lib/types";

export const EMPTY_ALERTS = "No matching active alerts were returned by the sources checked.";

export const NO_GUARANTEE = "This does not mean the area is completely safe. A source can be delayed, a warning polygon can miss a ZIP-code center, and local officials may issue instructions that are not in these feeds.";

export const NOT_GOVERNMENT = "DisasterNear is not a government website. Alert text is taken from the named official source.";

export const CALL_911 = "If you are in immediate danger, call 911. DisasterNear does not dispatch help and is not a Wireless Emergency Alert.";

export const NWS_UNCHECKED = "The National Weather Service could not be checked.";

export const NWS_EMPTY_DETAIL = "The National Weather Service returned no active alerts for this point.";

export const USGS_UNCHECKED = "The USGS earthquake catalog could not be checked. No earthquake was added in its place.";

export const USGS_EMPTY = "No matching earthquakes were returned within 300 km for the past 7 days.";

export const FEMA_UNCHECKED = "FEMA declarations could not be checked. No declaration was added in their place.";

export const FEMA_NO_STATE = "The state could not be determined, so FEMA declarations were not queried.";

export const FEMA_EMPTY = "No recent FEMA disaster declarations were returned for this state.";

export const NO_INSTRUCTION = "This alert did not include an instruction.";

export const NOT_INCLUDED = "Not included by NWS";

export const PREPAREDNESS_NOTE = "These links are not instructions from an active alert.";

export function precisionNote(precision: Precision): string {
  switch (precision) {
    case "zip-center":
      return "Results use the center of this ZIP code. A warning polygon can cover part of a ZIP and miss the center. For a closer check, use device location or a street address.";
    case "place":
      return "Results use the Census place center, not a street address.";
    case "address":
      return "Results use the Census address point for this search.";
    case "device":
      return "Results use your device location at the time it was shared.";
  }
}

export const ZONE_ONLY = "No active alert contains this point. The National Weather Service did return alerts for the same forecast zone or county. Those are listed separately and do not mean this coordinate is inside the warning.";

export const ZONE_NOTE_FAILED = "The NWS zone query could not be checked. A warning polygon that misses this point can be missing.";

export const ZONE_NOTE_UNAVAILABLE = "The National Weather Service did not return a forecast zone or county for this point, so only the coordinate query was used.";

export const NOTIFY_NOTE = "Browser notifications repeat the official NWS event name for new Severe or Extreme alerts at locations you turn on. They are not Wireless Emergency Alerts, and they are not sent for FEMA declarations or USGS earthquakes.";

export const OFFLINE_COPY = "This is a saved check, not a new check. National Weather Service, USGS, and FEMA were not contacted again.";

export function relationNote(
  relation: "inside" | "outside" | "none",
  checked: boolean,
  scope: "point" | "zone" = "point",
): string {
  if (!checked) {
    return "A polygon was included. Open this alert from a location search to see whether that point is inside it.";
  }
  if (relation === "inside") return "Your location is inside the official polygon.";
  if (relation === "outside" && scope === "zone") {
    return "Your location is outside the official polygon. NWS returned this alert for the same forecast zone or county, so it can cover another part of that zone, including part of a ZIP code.";
  }
  if (relation === "outside") {
    return "Your location is outside the official polygon. NWS still returned this alert for this coordinate.";
  }
  if (scope === "zone") {
    return "This alert did not include a polygon. NWS returned it for the same forecast zone or county as this point, not because the coordinate was tested against a shape.";
  }
  return "This alert did not include a polygon. The area text is shown instead.";
}
