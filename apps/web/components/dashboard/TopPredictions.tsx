import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKickoff, formatOdds, MARKET_LABELS } from "@/lib/format";
import type { getTopPredictions } from "@/lib/queries";

export function TopPredictions({ predictions }: { predictions: Awaited<ReturnType<typeof getTopPredictions>> }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Top Predicții</h2>
        <span className="text-xs text-ink-muted">după încredere AI</span>
      </div>

      <div className="flex flex-col divide-y divide-grid">
        {predictions.length === 0 && <p className="py-6 text-sm text-ink-muted">Niciun meci analizat încă.</p>}
        {predictions.map((p) => (
          <div key={p.matchId} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink-primary">
                {p.homeTeam} – {p.awayTeam}
              </div>
              <div className="text-xs text-ink-muted">
                {p.league} · {formatKickoff(p.kickoffAt)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={p.pick.accumulatorSafe ? "good" : "neutral"}>{MARKET_LABELS[p.pick.market] ?? p.pick.market}: {p.pick.selection}</Badge>
              <span className="w-12 text-right text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatOdds(p.pick.odds)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">Cota afișată este cea mai bună disponibilă la momentul analizei.</p>
    </Card>
  );
}
