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

export function relationNote(relation: "inside" | "outside" | "none", checked: boolean): string {
  if (!checked) {
    return "A polygon was included. Open this alert from a location search to see whether that point is inside it.";
  }
  if (relation === "inside") return "Your location is inside the official polygon.";
  if (relation === "outside") {
    return "Your location is outside the official polygon. The alert was still returned for this point’s county or forecast zone.";
  }
  return "This alert did not include a polygon. The area text is shown instead.";
}
