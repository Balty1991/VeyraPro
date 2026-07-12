import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatKickoff, formatOdds, formatPct, MARKET_LABELS } from "@/lib/format";
import type { getAnalyzedMatches } from "@/lib/queries";

export function MatchList({ matches }: { matches: Awaited<ReturnType<typeof getAnalyzedMatches>> }) {
  if (matches.length === 0) {
    return (
      <Card>
        <p className="py-10 text-center text-sm text-ink-muted">Niciun meci nu corespunde filtrelor selectate.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => (
        <Card key={m.matchId} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs text-ink-muted">
              {m.league} · {formatKickoff(m.kickoffAt)}
            </div>
            <div className="text-sm font-semibold text-ink-primary">
              {m.homeTeam} – {m.awayTeam}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <PickPill label="Principal" pick={m.primaryPick} />
            {m.secondaryPick && <PickPill label="Secundar" pick={m.secondaryPick} />}
            <div className="text-right text-xs text-ink-muted">
              calitate date
              <div className="text-sm font-semibold text-ink-primary">{formatPct(m.dataQualityScore * 100, 0)}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PickPill({ label, pick }: { label: string; pick: Awaited<ReturnType<typeof getAnalyzedMatches>>[number]["primaryPick"] }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2 text-right">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div className="text-sm font-medium">
        {MARKET_LABELS[pick.market] ?? pick.market}: {pick.selection}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Badge tone={pick.accumulatorSafe ? "good" : "neutral"}>conf {formatPct(pick.confidence * 100, 0)}</Badge>
        <span className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
          @{formatOdds(pick.odds)}
        </span>
      </div>
      <div className="text-[11px] text-ink-muted">edge {pick.edge >= 0 ? "+" : ""}{formatPct(pick.edge * 100, 1)}</div>
    </div>
  );
}
