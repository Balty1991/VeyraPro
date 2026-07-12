import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatOdds, formatPct } from "@/lib/format";
import type { getTopRecommendations } from "@/lib/queries";

export function TopRecommendations({ tickets }: { tickets: Awaited<ReturnType<typeof getTopRecommendations>> }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Top Recomandări (Acumulator)</h2>
        <span className="text-xs text-ink-muted">scor combinat</span>
      </div>

      <div className="flex flex-col gap-3">
        {tickets.length === 0 && <p className="py-6 text-sm text-ink-muted">Niciun bilet generat încă — vezi Generatorul de Acumulator.</p>}
        {tickets.map((t) => (
          <div key={t.id} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Badge tone="good">{t.legCount} selecții</Badge>
              <div className="text-right">
                <div className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                  @{formatOdds(t.combinedOdds)}
                </div>
                <div className="text-xs text-ink-muted">încredere medie {formatPct(t.averageConfidence * 100, 0)}</div>
              </div>
            </div>
            <ul className="space-y-1 text-xs text-ink-secondary">
              {t.legs.map((leg, i) => (
                <li key={i} className="truncate">
                  {leg.match} — {leg.selection} @{formatOdds(leg.odds)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
