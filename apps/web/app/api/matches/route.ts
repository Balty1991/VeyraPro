import { NextResponse } from "next/server";
import { getAnalyzedMatches } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const matches = await getAnalyzedMatches({
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    market: searchParams.get("market") ?? undefined,
    minConfidence: searchParams.get("minConfidence") ? Number(searchParams.get("minConfidence")) : undefined,
    minEdge: searchParams.get("minEdge") ? Number(searchParams.get("minEdge")) : undefined,
  });

  return NextResponse.json({ matches });
}
