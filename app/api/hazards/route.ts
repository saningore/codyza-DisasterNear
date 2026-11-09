import { NextRequest, NextResponse } from "next/server";
import { inSearchableArea, roundCoordinate } from "@/lib/geo";
import { loadHazards } from "@/lib/hazards";
import { clientKey, rateLimit } from "@/lib/http";
import type { Precision } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRECISIONS = new Set<Precision>(["zip-center", "place", "address", "device"]);

export async function GET(request: NextRequest) {
  if (!rateLimit(`hazards:${clientKey(request.headers.get("x-forwarded-for"))}`, 20)) {
    return NextResponse.json({ error: "Too many searches. Wait a minute and try again." }, { status: 429 });
  }
  const params = request.nextUrl.searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const precision = params.get("precision") ?? "";
  const label = (params.get("label") ?? "").replace(/[\u0000-\u001F]/g, "").trim();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !inSearchableArea(latitude, longitude)) {
    return NextResponse.json(
      { error: "That point is outside the United States and its territories. DisasterNear checks U.S. official sources." },
      { status: 400 },
    );
  }
  if (!PRECISIONS.has(precision as Precision)) {
    return NextResponse.json({ error: "Choose a ZIP code, city, street address, or device location." }, { status: 400 });
  }
  if (!label || label.length > 180) {
    return NextResponse.json({ error: "Enter a U.S. ZIP code, city, or street address." }, { status: 400 });
  }
  const report = await loadHazards({
    label,
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    precision: precision as Precision,
  });
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
