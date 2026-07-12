"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MARKET_LABELS } from "@/lib/format";

interface MarketBucket {
  total: number;
  won: number;
  hitRatePct: number;
}

export function HitRateChart({ byMarket }: { byMarket: Record<string, MarketBucket> }) {
  const data = Object.entries(byMarket)
    .filter(([, b]) => b.total > 0)
    .map(([market, b]) => ({ ...b, market, label: MARKET_LABELS[market] ?? market }))
    .sort((a, b) => b.hitRatePct - a.hitRatePct);

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">Nu există încă date suficiente per piață.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--baseline)" tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} />
        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="var(--baseline)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: "var(--surface-1)", border: "1px solid var(--border-hairline)", borderRadius: 8, fontSize: 12 }}
          formatter={(value: number, _name: string, item) => [`${value.toFixed(1)}%`, `${item.payload.won}/${item.payload.total} câștigate`]}
        />
        <Bar dataKey="hitRatePct" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
