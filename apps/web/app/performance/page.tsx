import { Topbar } from "@/components/layout/Topbar";
import { StatTile } from "@/components/dashboard/StatTile";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { HitRateChart } from "@/components/performance/HitRateChart";
import { PerformanceTable } from "@/components/performance/PerformanceTable";
import { Card } from "@/components/ui/Card";
import { formatPct } from "@/lib/format";
import { getPerformanceSummaryAndTrend } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const { summary, trend } = await getPerformanceSummaryAndTrend(90);

  return (
    <>
      <Topbar title="Performanță" subtitle="Predicțiile AI confruntate cu rezultatele reale, validate prin API" />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Predicții totale" value={String(summary.totalPredictions)} hint="ultimele 90 de zile" />
          <StatTile label="Decontate" value={String(summary.settled)} hint={`${summary.won} câștigate / ${summary.lost} pierdute`} />
          <StatTile label="Rată de succes" value={formatPct(summary.hitRatePct)} tone={summary.hitRatePct >= 55 ? "good" : "critical"} />
          <StatTile label="ROI" value={`${summary.roiPct >= 0 ? "+" : ""}${formatPct(summary.roiPct)}`} tone={summary.roiPct >= 0 ? "good" : "critical"} hint={`cotă medie ${summary.avgOdds.toFixed(2)}`} />
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Evoluție rată de succes</h2>
            <span className="text-xs text-ink-muted">ultimele 90 de zile</span>
          </div>
          <PerformanceChart data={trend} />
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Rată de succes pe tip de piață</h2>
          </div>
          <HitRateChart byMarket={summary.byMarket} />
        </Card>

        <PerformanceTable summary={summary} />
      </main>
    </>
  );
}
