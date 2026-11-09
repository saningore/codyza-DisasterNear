import type { Metadata } from "next";
import Link from "next/link";
import AlertFacts from "@/components/AlertFacts";
import { normalizeFeature } from "@/lib/alerts";
import { isAlertId, nwsAlertRecordUrl } from "@/lib/links";
import { nwsAlertFeature } from "@/lib/nws";
import { inSearchableArea } from "@/lib/geo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Alert record" };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AlertPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const query = await searchParams;
  if (!isAlertId(id)) {
    return (
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-4xl font-semibold">That alert link is not valid</h1>
        <p className="mt-3">The address does not match a National Weather Service alert id.</p>
        <Link className="mt-6 inline-flex font-bold text-sea underline" href="/">Check a location</Link>
      </article>
    );
  }
  const latitude = Number(first(query.lat));
  const longitude = Number(first(query.lon));
  const point = Number.isFinite(latitude) && Number.isFinite(longitude) && inSearchableArea(latitude, longitude)
    ? { latitude, longitude }
    : null;
  const result = await nwsAlertFeature(id);
  const retrievedAt = new Date().toISOString();
  const officialUrl = nwsAlertRecordUrl(id, null);
  if (!result.ok && result.message === "missing") {
    return (
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-4xl font-semibold">This alert is no longer in the NWS active feed</h1>
        <p className="mt-3">DisasterNear does not keep a copy. The record below is the official address for this id.</p>
        {officialUrl ? <a className="mt-4 inline-flex font-bold text-sea underline" href={officialUrl}>Open the NWS alert record</a> : null}
      </article>
    );
  }
  if (!result.ok) {
    return (
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-4xl font-semibold">The National Weather Service could not be checked</h1>
        <p className="mt-3">No alert text was filled in.</p>
      </article>
    );
  }
  const alert = normalizeFeature(result.value, point);
  if (alert && alert.relation !== "inside" && first(query.scope) === "zone") alert.scope = "zone";
  if (!alert) {
    return (
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-4xl font-semibold">The National Weather Service response could not be read</h1>
        <p className="mt-3">No alert text was filled in.</p>
      </article>
    );
  }
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-wide text-sea">Official alert · National Weather Service</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">{alert.event ?? "Not included by NWS"}</h1>
      <p className="mt-3">This page repeats the current NWS alert record. It is not a new warning.</p>
      {alert.status && alert.status.toLowerCase() !== "actual" ? (
        <p className="mt-4 rounded-2xl bg-amber px-4 py-3 font-bold">This message is marked {alert.status} by NWS. It is not an actual emergency.</p>
      ) : null}
      <AlertFacts alert={alert} timeZone={null} retrievedAt={retrievedAt} latitude={point?.latitude} longitude={point?.longitude} showPageLink={false} />
    </article>
  );
}
