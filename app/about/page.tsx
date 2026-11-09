import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">About DisasterNear</h1>
      <p className="mt-4 text-lg">DisasterNear is an unofficial public page for reading hazard information that U.S. government sources have already published for a location you choose.</p>
      <p className="mt-4">It does not create warnings, severity levels, evacuation instructions, or locations. If a source omits a field, the page says the field was not included. If a source cannot be reached, that source is marked as not checked and nothing is substituted.</p>
      <p className="mt-4">An empty alert list is not a promise that an area is safe. Wireless Emergency Alerts, NOAA Weather Radio, and local emergency management can carry instructions that are not in these feeds. If you are in immediate danger, call 911.</p>
      <p className="mt-4">You can save up to five locations on this device. For a saved location, this browser can notify you when a new NWS alert with severity Severe or Extreme appears. The notification uses the official event name and headline. It is not a Wireless Emergency Alert. The last successful check can be opened offline and is labeled with the time it was retrieved.</p>
      <h2 className="mt-8 font-serif text-2xl font-semibold">What is separated</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Active alerts are National Weather Service messages with status Actual. Alerts whose polygon contains the coordinate are listed at this location. Alerts for the same forecast zone or county whose polygon does not contain the coordinate are listed separately.</li>
        <li>USGS rows are recorded earthquakes. They are not earthquake early warnings and they are not weather alerts.</li>
        <li>FEMA rows are disaster declarations for recovery programs. They are not active weather warnings.</li>
        <li>Ready.gov links are general preparedness pages, not instructions copied from an alert.</li>
      </ul>
      <p className="mt-6">
        <Link className="font-bold text-sea underline underline-offset-2" href="/sources">Read how each source is queried</Link>
      </p>
    </article>
  );
}
