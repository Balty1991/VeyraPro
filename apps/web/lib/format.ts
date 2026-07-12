export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatKickoff(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export const MARKET_LABELS: Record<string, string> = {
  "1x2": "1X2",
  over_under_15: "Total goluri 1.5",
  over_under_25: "Total goluri 2.5",
  over_under_35: "Total goluri 3.5",
  btts: "Ambele marchează",
  double_chance: "Șansă dublă",
  draw_no_bet: "Fără egal",
};
