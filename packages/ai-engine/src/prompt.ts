import { safeAccumulatorOddsRange, type MatchContext } from "@veyrapro/domain";

function formatForm(label: string, form: MatchContext["homeForm"]): string {
  if (!form) return `${label}: date indisponibile`;
  return [
    `${label}: ${form.wins}V-${form.draws}E-${form.losses}Î din ultimele ${form.matchesConsidered} (streak: ${form.streak})`,
    `  Goluri: ${form.goalsFor} marcate / ${form.goalsAgainst} primite` +
      (form.avgXgFor != null ? `, xG mediu ${form.avgXgFor.toFixed(2)} / xGA ${form.avgXgAgainst?.toFixed(2)}` : ""),
    `  Ultimele meciuri: ${form.recent.map((r) => `${r.result} ${r.goalsFor}-${r.goalsAgainst} vs ${r.opponent} (${r.venue})`).join("; ")}`,
  ].join("\n");
}

function formatOdds(ctx: MatchContext): string {
  if (ctx.odds.length === 0) return "Cote indisponibile.";
  return ctx.odds
    .map((snapshot) => {
      const rows = snapshot.rows
        .map((r) => `${r.bookmaker} ${r.outcome}=${r.decimalOdds}${r.movement ? ` (${r.movement} de la ${r.previousDecimalOdds ?? "?"})` : ""}`)
        .join(", ");
      const best = Object.entries(snapshot.bestByOutcome)
        .map(([outcome, b]) => `${outcome}:${b.decimalOdds}@${b.bookmaker}`)
        .join(", ");
      return `- [${snapshot.market}] best odds: ${best} | toate cotele: ${rows}`;
    })
    .join("\n");
}

function formatMl(ctx: MatchContext): string {
  const ml = ctx.nativeMlPrediction;
  if (!ml) return "Predicție ML nativă indisponibilă.";
  const overUnder = Object.entries(ml.overUnder ?? {})
    .map(([line, p]) => `O${line}=${(p.overProbability * 100).toFixed(1)}% / U${line}=${(p.underProbability * 100).toFixed(1)}%`)
    .join(", ");
  const recommended = (ml.recommendedBets ?? []).map((b) => `${b.market}:${b.selection} (conf ${(b.confidence * 100).toFixed(0)}%)`).join(", ");
  return [
    `Model: ${ml.model} (confidence globală ${(ml.confidence * 100).toFixed(0)}%)`,
    `1X2: Home ${(ml.homeWinProbability * 100).toFixed(1)}% / Draw ${(ml.drawProbability * 100).toFixed(1)}% / Away ${(ml.awayWinProbability * 100).toFixed(1)}%`,
    `Goluri așteptate: ${ml.expectedGoalsHome.toFixed(2)} - ${ml.expectedGoalsAway.toFixed(2)}`,
    ml.bttsYesProbability != null ? `BTTS Yes: ${(ml.bttsYesProbability * 100).toFixed(1)}%` : "",
    overUnder ? `Over/Under: ${overUnder}` : "",
    recommended ? `Recomandări model: ${recommended}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMatchAnalysisPrompt(ctx: MatchContext, language: string): string {
  const weather = ctx.weather
    ? `${ctx.weather.condition ?? "necunoscută"}, ${ctx.weather.temperatureC ?? "?"}°C, vânt ${ctx.weather.windSpeedKph ?? "?"} km/h, precipitații ${ctx.weather.precipitationProbabilityPct ?? "?"}%`
    : "indisponibile";

  return `
Ești un analist senior de pariuri sportive și data scientist. Analizează meciul de mai jos
folosind STRICT datele furnizate (nu inventa informații) și produ o analiză structurată.

MECI: ${ctx.homeTeam.name} vs ${ctx.awayTeam.name}
Competiție: ${ctx.league.name} (${ctx.league.country})
Data/ora: ${ctx.kickoffAt}
Arbitru: ${ctx.referee?.name ?? "necunoscut"} (medie cartonașe/meci: ${ctx.referee?.avgCardsPerGame ?? "?"})
Vreme: ${weather}

ANTRENORI
Gazde — ${ctx.homeCoach?.name ?? "necunoscut"}: formație ${ctx.homeCoach?.preferredFormation ?? "?"}, presing ${ctx.homeCoach?.pressingIntensity ?? "?"}, linie defensivă ${ctx.homeCoach?.defensiveLine ?? "?"}, stiluri: ${ctx.homeCoach?.tacticalStyles?.join(", ") ?? "?"}
Oaspeți — ${ctx.awayCoach?.name ?? "necunoscut"}: formație ${ctx.awayCoach?.preferredFormation ?? "?"}, presing ${ctx.awayCoach?.pressingIntensity ?? "?"}, linie defensivă ${ctx.awayCoach?.defensiveLine ?? "?"}, stiluri: ${ctx.awayCoach?.tacticalStyles?.join(", ") ?? "?"}

FORMĂ RECENTĂ
${formatForm("Gazde", ctx.homeForm)}
${formatForm("Oaspeți", ctx.awayForm)}

HEAD-TO-HEAD (${ctx.h2h?.totalMeetings ?? 0} confruntări)
Victorii gazde: ${ctx.h2h?.homeTeamWins ?? 0}, Victorii oaspeți: ${ctx.h2h?.awayTeamWins ?? 0}, Egaluri: ${ctx.h2h?.draws ?? 0}
Medie goluri totale: ${ctx.h2h?.avgTotalGoals ?? "?"}
Ultimele confruntări: ${ctx.h2h?.recent.map((r) => `${r.result} ${r.goalsFor}-${r.goalsAgainst}`).join("; ") ?? "-"}

COTE ȘI MIȘCĂRI (toți bookmakerii disponibili)
${formatOdds(ctx)}

PREDICȚIE ML NATIVĂ A FURNIZORULUI DE DATE
${formatMl(ctx)}

SARCINĂ
1. Estimează probabilitatea reală pentru fiecare piață relevantă, comparând-o cu probabilitatea implicită de cotă (edge = probabilitate_AI - probabilitate_implicită).
2. Alege un PRONOSTIC PRINCIPAL: cea mai sigură selecție susținută de date, cu prioritate pentru cote între ${safeAccumulatorOddsRange.min.toFixed(2)} și ${safeAccumulatorOddsRange.max.toFixed(2)} (ideal pentru bilete acumulator), dar poți alege și în afara acestui interval dacă e clar cea mai solidă opțiune — marchează accumulatorSafe corespunzător.
3. Dacă există o a doua selecție solidă necorelată cu prima (piață diferită sau raționament diferit), oferă un PRONOSTIC SECUNDAR; altfel returnează null.
4. Fii conservator: dacă datele sunt insuficiente sau contradictorii, redu confidence și menționează asta în riskNotes.
5. Scrie reasoning și riskNotes în limba: ${language}.

Răspunde EXCLUSIV apelând tool-ul submit_match_analysis cu rezultatul structurat.
`.trim();
}
