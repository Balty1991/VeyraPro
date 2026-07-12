"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { TicketCard, type TicketData } from "./TicketCard";

interface FormState {
  minLegs: number;
  maxLegs: number;
  minCombinedOdds: string;
  maxCombinedOdds: string;
  minLegConfidence: number;
  minLegOdds: number;
  maxLegOdds: number;
}

const DEFAULT_FORM: FormState = {
  minLegs: 2,
  maxLegs: 6,
  minCombinedOdds: "",
  maxCombinedOdds: "",
  minLegConfidence: 0.7,
  minLegOdds: 1.2,
  maxLegOdds: 1.4,
};

export function AccumulatorBuilder() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketData[] | null>(null);
  const [candidatePool, setCandidatePool] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accumulator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minLegs: form.minLegs,
          maxLegs: form.maxLegs,
          minCombinedOdds: form.minCombinedOdds ? Number(form.minCombinedOdds) : undefined,
          maxCombinedOdds: form.maxCombinedOdds ? Number(form.maxCombinedOdds) : undefined,
          minLegConfidence: form.minLegConfidence,
          minLegOdds: form.minLegOdds,
          maxLegOdds: form.maxLegOdds,
          persist: true,
        }),
      });
      if (!res.ok) throw new Error(`Cererea a eșuat (${res.status})`);
      const data = await res.json();
      setTickets(data.tickets);
      setCandidatePool(data.candidatePool);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-4 text-base font-semibold">Constrângeri</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Min. selecții">
            <input type="number" min={2} max={12} value={form.minLegs} onChange={(e) => setForm({ ...form, minLegs: Number(e.target.value) })} className={inputClass} />
          </Field>
          <Field label="Max. selecții">
            <input type="number" min={2} max={12} value={form.maxLegs} onChange={(e) => setForm({ ...form, maxLegs: Number(e.target.value) })} className={inputClass} />
          </Field>
          <Field label="Cotă combinată min.">
            <input type="number" step="0.1" placeholder="ex. 2.0" value={form.minCombinedOdds} onChange={(e) => setForm({ ...form, minCombinedOdds: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Cotă combinată max.">
            <input type="number" step="0.1" placeholder="ex. 8.0" value={form.maxCombinedOdds} onChange={(e) => setForm({ ...form, maxCombinedOdds: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Cotă/selecție min.">
            <input type="number" step="0.01" value={form.minLegOdds} onChange={(e) => setForm({ ...form, minLegOdds: Number(e.target.value) })} className={inputClass} />
          </Field>
          <Field label="Cotă/selecție max.">
            <input type="number" step="0.01" value={form.maxLegOdds} onChange={(e) => setForm({ ...form, maxLegOdds: Number(e.target.value) })} className={inputClass} />
          </Field>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="mt-5 rounded-lg bg-series-1 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Se generează..." : "Generează combinații"}
        </button>

        {error && <p className="mt-3 text-sm text-status-critical">{error}</p>}
        {candidatePool != null && <p className="mt-3 text-xs text-ink-muted">{candidatePool} selecții sigure disponibile în bazinul de analiză.</p>}
      </Card>

      {tickets && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tickets.length === 0 && <p className="text-sm text-ink-muted">Nicio combinație nu îndeplinește constrângerile — relaxează filtrele.</p>}
          {tickets.map((t, i) => (
            <TicketCard key={t.id} ticket={t} rank={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-secondary">
      {label}
      {children}
    </label>
  );
}

const inputClass = "rounded-md border border-border bg-transparent px-2 py-1.5 text-sm text-ink-primary";
