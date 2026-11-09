import { NextResponse } from "next/server";
import { placeData, zctaData } from "@/lib/reference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    const zcta = Object.keys(zctaData().centroids).length;
    const places = placeData().places.length;
    if (zcta < 1000 || places < 1000 || !zctaData().centroids["10001"]) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true, zcta, places });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
