import { Topbar } from "@/components/layout/Topbar";
import { StatTile } from "@/components/dashboard/StatTile";
import { TopPredictions } from "@/components/dashboard/TopPredictions";
import { TopRecommendations } from "@/components/dashboard/TopRecommendations";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { Card } from "@/components/ui/Card";
import { formatPct } from "@/lib/format";
import { getDashboardStats, getPerformanceSummaryAndTrend, getTopPredictions, getTopRecommendations } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, predictions, recommendations, { trend }] = await Promise.all([
    getDashboardStats(),
    getTopPredictions(6),
    getTopRecommendations(5),
    getPerformanceSummaryAndTrend(30),
  ]);

  return (
    <>
      <Topbar title="Dashboard" subtitle="Prezentare generală a predicțiilor AI și a performanței platformei" />

      <main className="flex flex-1 flex-col gap-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Meciuri analizate azi" value={String(stats.analyzedToday)} hint="de motorul AI" />
          <StatTile label="Predicții în așteptare" value={String(stats.pendingPredictions)} hint="nedecontate încă" />
          <StatTile
            label="Rată de succes (30 zile)"
            value={formatPct(stats.hitRatePct30d)}
            hint={`${stats.settled30d} predicții decontate`}
            tone={stats.hitRatePct30d >= 55 ? "good" : stats.hitRatePct30d > 0 ? "critical" : "neutral"}
          />
          <StatTile
            label="ROI (30 zile)"
            value={`${stats.roiPct30d >= 0 ? "+" : ""}${formatPct(stats.roiPct30d)}`}
            hint="miză uniformă de 1 unitate"
            tone={stats.roiPct30d > 0 ? "good" : stats.roiPct30d < 0 ? "critical" : "neutral"}
          />
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Evoluție rată de succes</h2>
            <span className="text-xs text-ink-muted">ultimele 30 de zile</span>
          </div>
          <PerformanceChart data={trend} />
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopPredictions predictions={predictions} />
          <TopRecommendations tickets={recommendations} />
        </div>
      </main>
    </>
  );
}
