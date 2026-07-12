import { NextResponse } from "next/server";
import { getPerformanceSummaryAndTrend } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get("days") ? Number(searchParams.get("days")) : 30;

  const { summary, trend } = await getPerformanceSummaryAndTrend(days);
  return NextResponse.json({ summary, trend });
}
