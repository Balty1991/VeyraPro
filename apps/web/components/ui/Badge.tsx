import clsx from "clsx";

const TONES = {
  good: "bg-status-good/10 text-status-good",
  warning: "bg-status-warning/15 text-[#8a5a00]",
  serious: "bg-status-serious/15 text-status-serious",
  critical: "bg-status-critical/10 text-status-critical",
  neutral: "bg-ink-muted/10 text-ink-secondary",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}
