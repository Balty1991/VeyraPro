import clsx from "clsx";
import { Card } from "@/components/ui/Card";

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "critical" | "neutral";
}) {
  return (
    <Card>
      <div className="text-sm text-ink-secondary">{label}</div>
      <div
        className={clsx(
          "mt-2 text-3xl font-semibold tracking-tight",
          tone === "good" && "text-status-good",
          tone === "critical" && "text-status-critical",
          tone === "neutral" && "text-ink-primary",
        )}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </Card>
  );
}
