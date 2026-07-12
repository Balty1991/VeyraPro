"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  date: string;
  hitRatePct: number;
  total: number;
}

export function PerformanceChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">Nu există încă rezultate decontate pentru grafic.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" })}
          stroke="var(--baseline)"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "var(--baseline)" }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          stroke="var(--baseline)"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: "var(--surface-1)", border: "1px solid var(--border-hairline)", borderRadius: 8, fontSize: 12 }}
          labelFormatter={(d: string) => new Date(d).toLocaleDateString("ro-RO")}
          formatter={(value: number, name: string, item) => [`${value.toFixed(1)}%`, `Rată succes (${item.payload.total} decontate)`]}
        />
        <Line type="monotone" dataKey="hitRatePct" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--series-1)" }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
