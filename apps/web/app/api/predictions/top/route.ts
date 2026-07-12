import { NextResponse } from "next/server";
import { getTopPredictions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 6;

  const predictions = await getTopPredictions(limit);
  return NextResponse.json({ predictions });
}
