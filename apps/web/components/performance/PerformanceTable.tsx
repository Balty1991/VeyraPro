import { Card } from "@/components/ui/Card";
import { formatPct, MARKET_LABELS } from "@/lib/format";
import type { PerformanceSummary } from "@veyrapro/domain";

export function PerformanceTable({ summary }: { summary: PerformanceSummary }) {
  const rows = Object.entries(summary.byMarket).sort(([, a], [, b]) => b.total - a.total);

  return (
    <Card>
      <h2 className="mb-4 text-base font-semibold">Detaliu pe tip de piață</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-grid text-left text-xs text-ink-muted">
              <th className="pb-2 font-medium">Piață</th>
              <th className="pb-2 font-medium text-right">Total</th>
              <th className="pb-2 font-medium text-right">Câștigate</th>
              <th className="pb-2 font-medium text-right">Rată succes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grid">
            {rows.map(([market, bucket]) => (
              <tr key={market}>
                <td className="py-2">{MARKET_LABELS[market] ?? market}</td>
                <td className="py-2 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {bucket.total}
                </td>
                <td className="py-2 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {bucket.won}
                </td>
                <td className="py-2 text-right font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatPct(bucket.hitRatePct)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-ink-muted">
                  Fără date decontate încă.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
