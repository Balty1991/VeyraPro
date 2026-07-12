"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MARKET_LABELS } from "@/lib/format";

const MARKETS = Object.keys(MARKET_LABELS);

export function MatchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/matches?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-secondary">
        De la
        <input
          type="date"
          defaultValue={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => setParam("dateFrom", e.target.value)}
          className="rounded-md border border-border bg-transparent px-2 py-1 text-sm text-ink-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-secondary">
        Până la
        <input
          type="date"
          defaultValue={searchParams.get("dateTo") ?? ""}
          onChange={(e) => setParam("dateTo", e.target.value)}
          className="rounded-md border border-border bg-transparent px-2 py-1 text-sm text-ink-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-secondary">
        Tip predicție
        <select
          defaultValue={searchParams.get("market") ?? ""}
          onChange={(e) => setParam("market", e.target.value)}
          className="rounded-md border border-border bg-transparent px-2 py-1 text-sm text-ink-primary"
        >
          <option value="">Toate</option>
          {MARKETS.map((m) => (
            <option key={m} value={m}>
              {MARKET_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-secondary">
        Încredere minimă
        <select
          defaultValue={searchParams.get("minConfidence") ?? ""}
          onChange={(e) => setParam("minConfidence", e.target.value)}
          className="rounded-md border border-border bg-transparent px-2 py-1 text-sm text-ink-primary"
        >
          <option value="">Orice</option>
          <option value="0.6">60%+</option>
          <option value="0.7">70%+</option>
          <option value="0.8">80%+</option>
          <option value="0.9">90%+</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-secondary">
        Edge (value) minim
        <select
          defaultValue={searchParams.get("minEdge") ?? ""}
          onChange={(e) => setParam("minEdge", e.target.value)}
          className="rounded-md border border-border bg-transparent px-2 py-1 text-sm text-ink-primary"
        >
          <option value="">Orice</option>
          <option value="0">Doar edge pozitiv</option>
          <option value="0.05">+5% sau mai mult</option>
          <option value="0.1">+10% sau mai mult</option>
        </select>
      </label>
    </div>
  );
}
