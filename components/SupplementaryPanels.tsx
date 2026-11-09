import { PREPAREDNESS_NOTE } from "@/lib/copy";
import { formatOfficialTime } from "@/lib/time";
import type { HazardReport } from "@/lib/types";

const READY = [
  { href: "https://www.ready.gov/alerts", label: "Ready.gov emergency alerts" },
  { href: "https://www.ready.gov/kit", label: "Ready.gov emergency kit" },
  { href: "https://www.ready.gov/plan", label: "Ready.gov make a plan" },
  { href: "https://www.ready.gov/shelter", label: "Ready.gov shelter guidance" },
];

export default function SupplementaryPanels({ report }: { report: HazardReport }) {
  const usgs = report.sources.find((source) => source.id === "usgs");
  const fema = report.sources.find((source) => source.id === "fema");
  return (
    <section className="mt-10 rounded-3xl border border-dashed border-sea/40 bg-moss/40 p-5" aria-labelledby="supplement-heading">
      <h2 id="supplement-heading" className="font-serif text-3xl font-semibold">Not active weather alerts</h2>
      <p className="mt-2">The sections below are not National Weather Service warnings. They stay separate so a declaration or an earthquake catalog row cannot be read as an active alert.</p>

      <div className="mt-6">
        <h3 className="font-serif text-2xl font-semibold">Recent earthquakes from USGS</h3>
        <p className="mt-2 text-sm">Recorded earthquakes within {report.earthquakeWindow.radiusKm} km over the past {report.earthquakeWindow.days} days, magnitude {report.earthquakeWindow.minMagnitude} or greater. This is a catalog, not an earthquake early warning, and not a weather alert.</p>
        {usgs?.status === "error" ? <p className="mt-3 font-bold">{usgs.detail}</p> : null}
        {usgs?.status === "empty" ? <p className="mt-3">{usgs.detail}</p> : null}
        {report.earthquakesOmitted ? <p className="mt-3 text-sm">{report.earthquakesOmitted} USGS events were not listed because their type was not earthquake.</p> : null}
        <div className="mt-4 space-y-3">
          {report.earthquakes.map((quake) => (
            <article key={quake.id} data-quake="true" className="rounded-2xl border border-line bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-sea">USGS earthquake catalog</p>
              <h4 className="mt-1 font-serif text-xl font-semibold">{quake.place ?? "Place was not included."}</h4>
              <dl className="mt-3 space-y-1 text-sm">
                <div><dt className="inline font-bold">Magnitude: </dt><dd className="inline">{quake.magnitude === null ? "Magnitude was not included." : `${quake.magnitude}${quake.magType ? ` ${quake.magType}` : ""}`}</dd></div>
                <div><dt className="inline font-bold">Time: </dt><dd className="inline">{quake.time ? formatOfficialTime(quake.time, report.timeZone) : "Time was not included."}</dd></div>
                <div><dt className="inline font-bold">Depth: </dt><dd className="inline">{quake.depthKm === null ? "Depth was not included." : `${quake.depthKm} km`}</dd></div>
                <div><dt className="inline font-bold">Distance: </dt><dd className="inline">Calculated straight-line distance from the searched point: {quake.distanceMiles} miles. This is not a USGS distance.</dd></div>
                {quake.pager ? <div><dt className="inline font-bold">USGS PAGER alert: </dt><dd className="inline">{quake.pager}</dd></div> : null}
                {quake.tsunami === 1 ? <div><dt className="inline font-bold">USGS tsunami flag: </dt><dd className="inline">1. This is the catalog flag, not a tsunami warning.</dd></div> : null}
              </dl>
              {quake.url ? <a className="mt-3 inline-flex font-bold text-sea underline underline-offset-2" href={quake.url} target="_blank" rel="noopener noreferrer">Open the USGS event page</a> : <p className="mt-3 text-sm">An official USGS link was not included.</p>}
            </article>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-serif text-2xl font-semibold">Open or recent FEMA disaster declarations</h3>
        <p className="mt-2 text-sm">A FEMA disaster declaration is a federal recovery designation. It is not an active National Weather Service warning. Each row is one designated area from OpenFEMA.</p>
        {fema?.status === "error" ? <p className="mt-3 font-bold">{fema.detail}</p> : null}
        {fema?.status === "empty" ? <p className="mt-3">{fema.detail}</p> : null}
        {report.declarationsTruncated ? <p className="mt-3 text-sm">20 designated areas are shown. OpenFEMA can list one disaster once per county.</p> : null}
        <div className="mt-4 space-y-3">
          {report.declarations.map((item) => (
            <article key={`${item.disasterNumber}-${item.designatedArea ?? "area"}`} data-declaration="true" className="rounded-2xl border border-line bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-sea">FEMA disaster declaration</p>
              <h4 className="mt-1 font-serif text-xl font-semibold">{item.title ?? "Title was not included by FEMA."}</h4>
              <dl className="mt-3 space-y-1 text-sm">
                <div><dt className="inline font-bold">Declaration type: </dt><dd className="inline">{item.declarationType ?? "Not included"}{item.declarationTypeLabel ? ` — ${item.declarationTypeLabel}` : ""}</dd></div>
                <div><dt className="inline font-bold">Incident type: </dt><dd className="inline">{item.incidentType ?? "Not included"}</dd></div>
                <div><dt className="inline font-bold">Designated area: </dt><dd className="inline">{item.designatedArea ?? "Not included"}{item.state ? `, ${item.state}` : ""}</dd></div>
                <div><dt className="inline font-bold">Declaration date: </dt><dd className="inline">{item.declarationDate ? formatOfficialTime(item.declarationDate, "UTC") : "Not included"}</dd></div>
                <div><dt className="inline font-bold">Incident end: </dt><dd className="inline">{item.incidentEndDate ? formatOfficialTime(item.incidentEndDate, "UTC") : "No incident end date was included."}</dd></div>
                {item.femaDeclarationString ? <div><dt className="inline font-bold">FEMA declaration string: </dt><dd className="inline">{item.femaDeclarationString}</dd></div> : null}
              </dl>
              {item.url ? <a className="mt-3 inline-flex font-bold text-sea underline underline-offset-2" href={item.url} target="_blank" rel="noopener noreferrer">Open the FEMA disaster number page</a> : null}
            </article>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-serif text-2xl font-semibold">General preparedness from Ready.gov</h3>
        <p className="mt-2 text-sm">{PREPAREDNESS_NOTE}</p>
        <ul className="mt-3 space-y-2">
          {READY.map((link) => (
            <li key={link.href}>
              <a className="font-bold text-sea underline underline-offset-2" href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
