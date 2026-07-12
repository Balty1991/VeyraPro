import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatOdds, formatPct, MARKET_LABELS } from "@/lib/format";

export interface TicketData {
  id: string;
  combinedOdds: number;
  averageConfidence: number;
  score: number;
  legs: { matchId: string; homeTeam: string; awayTeam: string; league: string; market: string; selection: string; odds: number; confidence: number }[];
}

export function TicketCard({ ticket, rank }: { ticket: TicketData; rank: number }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <Badge tone={rank === 0 ? "good" : "neutral"}>{rank === 0 ? "Cea mai bună combinație" : `Opțiunea #${rank + 1}`}</Badge>
        <div className="text-right">
          <div className="text-xl font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
            @{formatOdds(ticket.combinedOdds)}
          </div>
          <div className="text-xs text-ink-muted">încredere medie {formatPct(ticket.averageConfidence * 100, 0)}</div>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-grid">
        {ticket.legs.map((leg) => (
          <div key={leg.matchId} className="flex items-center justify-between py-2 text-sm">
            <div>
              <div className="font-medium text-ink-primary">
                {leg.homeTeam} – {leg.awayTeam}
              </div>
              <div className="text-xs text-ink-muted">{leg.league}</div>
            </div>
            <div className="text-right">
              <div>{MARKET_LABELS[leg.market] ?? leg.market}: {leg.selection}</div>
              <div className="text-xs text-ink-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                @{formatOdds(leg.odds)} · conf {formatPct(leg.confidence * 100, 0)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
