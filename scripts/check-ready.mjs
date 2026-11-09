const USER_AGENT = "DisasterNear/1.0 (https://codyza.com)";

async function read(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json, application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (response.status === 204) return { status: 204, body: null };
  const body = await response.json().catch(() => null);
  if (response.status !== 200) {
    throw new Error(`${response.status} ${url}`);
  }
  return { status: response.status, body };
}

const alerts = await read("https://api.weather.gov/alerts/active?point=40.75065,-73.9973&status=actual");
if (!alerts.body || !Array.isArray(alerts.body.features)) {
  throw new Error("NWS active alerts did not return a feature list.");
}
const quakes = await read("https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=34.05&longitude=-118.24&maxradiuskm=300&minmagnitude=2.5&starttime=2026-11-01T00:00:00&limit=1");
if (quakes.status === 204) {
  console.log("USGS returned no events for the sample point.");
} else if (!quakes.body || quakes.body.type !== "FeatureCollection") {
  throw new Error("USGS did not return a FeatureCollection.");
}
const fema = await read("https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1");
if (!Array.isArray(fema.body?.DisasterDeclarationsSummaries)) {
  throw new Error("FEMA did not return DisasterDeclarationsSummaries.");
}
console.log("Live NWS, USGS, and FEMA reads succeeded.");
