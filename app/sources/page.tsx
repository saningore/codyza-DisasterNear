import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sources" };

const SOURCES = [
  {
    name: "National Weather Service",
    href: "https://www.weather.gov/documentation/services-web-alerts",
    use: "Active alerts for the latitude and longitude, requested with status=actual. The point query is how NWS returns alerts for the county and forecast zone that contain that coordinate. A separate /points request supplies the time zone, the forecast office, and the place name.",
    limit: "A ZIP search uses the Census ZIP Code Tabulation Area center, so a warning polygon can cover part of the ZIP and miss the center. Some alerts include a polygon and some do not. This page draws a shape only when NWS included geometry. Messages marked Test, Exercise, System, or Draft are listed apart from actual alerts. Cancel messages are listed as cancellation notices.",
  },
  {
    name: "U.S. Geological Survey",
    href: "https://earthquake.usgs.gov/fdsnws/event/1/",
    use: "The FDSN event feed for earthquakes within 300 km during the past 7 days, magnitude 2.5 or greater, limited to 50 events.",
    limit: "This is a catalog of recorded events, not ShakeAlert and not a warning. Events USGS did not mark as earthquakes are omitted and counted. A national feed is not used as a fallback.",
  },
  {
    name: "FEMA OpenFEMA",
    href: "https://www.fema.gov/about/openfema/api",
    use: "DisasterDeclarationsSummaries version 2 for the state returned with the point. The list keeps declarations from the past 18 months, and declarations from the past 3 years that have no incident end date.",
    limit: "A declaration is a federal recovery designation. It is not an active National Weather Service warning. Live IPAWS alerts are not included: the public OpenFEMA IPAWS archive is delayed by at least 24 hours, and the live feed requires accredited access.",
  },
  {
    name: "U.S. Census Bureau",
    href: "https://www.census.gov/geographies/reference-files/2025/geo/gazetter-file.html",
    use: "2025 Gazetteer ZIP Code Tabulation Area centroids, 2025 Gazetteer places, and the Census one-line geocoder for street addresses.",
    limit: "Gazetteer centers are not rooftop positions. Street matches come from the Census geocoder when a street number is entered.",
  },
];

export default function SourcesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">Where the information comes from</h1>
      <p className="mt-4 text-lg">The browser talks only to this site. The server calls each source with the User-Agent DisasterNear/1.0 (https://codyza.com). Alert requests may be reused on the server for up to 30 seconds. The page does not store alert text on your device.</p>
      <p className="mt-4">Wildfire perimeters, river gauges, and shelter inventories are not added here. A fire-weather or flood warning still appears when the National Weather Service issues one.</p>
      <div className="mt-8 space-y-6">
        {SOURCES.map((source) => (
          <section key={source.name} className="rounded-3xl border border-line bg-card p-5">
            <h2 className="font-serif text-2xl font-semibold">
              <a className="underline decoration-sea/40 underline-offset-4" href={source.href} target="_blank" rel="noopener noreferrer">{source.name}</a>
            </h2>
            <p className="mt-3">{source.use}</p>
            <p className="mt-3 text-ink/80">{source.limit}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
