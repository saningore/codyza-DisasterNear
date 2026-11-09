import SearchExperience, { type InitialQuery } from "@/components/SearchExperience";
import { inSearchableArea } from "@/lib/geo";
import type { Precision } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRECISIONS = new Set<Precision>(["zip-center", "place", "address", "device"]);

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const latitude = Number(first(params.lat));
  const longitude = Number(first(params.lon));
  const precision = first(params.precision);
  const label = first(params.label).slice(0, 180);
  const initial: InitialQuery | null = Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && inSearchableArea(latitude, longitude)
    && PRECISIONS.has(precision as Precision)
    && label
    ? { lat: latitude, lon: longitude, label, precision: precision as Precision }
    : null;
  return <SearchExperience initial={initial} />;
}
