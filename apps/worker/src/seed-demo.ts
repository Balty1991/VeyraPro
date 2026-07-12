import { prisma } from "@veyrapro/database";

// One-off demo seed using REAL data pulled live from the connected sports feed
// (BSD Football / bzzoiro) during this session. Not part of the app — deleted
// after the local demo run. Real ingestion happens via ingestUpcomingMatches.ts.

async function upsertLeague(externalId: number, name: string, country: string) {
  return prisma.league.upsert({
    where: { externalId },
    create: { externalId, name, country },
    update: { name, country },
  });
}

async function upsertTeam(externalId: number, name: string) {
  return prisma.team.upsert({
    where: { externalId },
    create: { externalId, name },
    update: { name },
  });
}

async function main() {
  const championsLeague = await upsertLeague(7, "Champions League", "Europe");
  const allsvenskan = await upsertLeague(26, "Allsvenskan", "Sweden");

  // --- Upcoming match 1: Larne FC vs SP Tre Fiori (real odds, real H2H, real ML) ---
  const larne = await upsertTeam(3475, "Larne FC");
  const treFiori = await upsertTeam(3759, "SP Tre Fiori");

  const match1 = await prisma.match.upsert({
    where: { externalEventId: 210767 },
    create: {
      externalEventId: 210767,
      leagueId: championsLeague.id,
      kickoffAt: new Date("2026-07-14T19:00:00Z"),
      status: "NOTSTARTED",
      homeTeamId: larne.id,
      awayTeamId: treFiori.id,
      h2h: { totalMeetings: 1, homeTeamWins: 1, awayTeamWins: 0, draws: 0, homeTeamWinRate: 1, awayTeamWinRate: 0, avgTotalGoals: 1.0, recent: [{ date: "2026-07-07", opponent: "SP Tre Fiori", venue: "away", goalsFor: 1, goalsAgainst: 0, result: "W" }] },
      nativeMlPrediction: { model: "catboost-v5.0", homeWinProbability: 0.654, drawProbability: 0.173, awayWinProbability: 0.172, expectedGoalsHome: 1.15, expectedGoalsAway: 1.3, bttsYesProbability: 0.183, confidence: 0.6542 },
      dataComplete: true,
    },
    update: { dataComplete: true },
  });
  await prisma.oddsSnapshot.create({
    data: {
      matchId: match1.id,
      market: "1x2",
      capturedAt: new Date(),
      rows: [
        { bookmaker: "Novibet", outcome: "home", decimalOdds: 1.22, impliedProbability: 0.8197, isMaxQuote: true, movement: "DRIFTING" },
        { bookmaker: "Bwin", outcome: "draw", decimalOdds: 7.0, impliedProbability: 0.1429, isMaxQuote: true, movement: "DRIFTING" },
        { bookmaker: "Marathon", outcome: "away", decimalOdds: 16.5, impliedProbability: 0.0606, isMaxQuote: true, movement: "SHORTENING" },
      ],
      bestByOutcome: { home: { bookmaker: "Novibet", decimalOdds: 1.22 }, draw: { bookmaker: "Bwin", decimalOdds: 7.0 }, away: { bookmaker: "Marathon", decimalOdds: 16.5 } },
    },
  });
  await prisma.aIAnalysis.upsert({
    where: { matchId: match1.id },
    create: {
      matchId: match1.id,
      modelUsed: "claude-sonnet-5",
      generatedAt: new Date(),
      dataQualityScore: 0.9,
      primaryPick: {
        market: "1x2", selection: "home", bookmaker: "Novibet", odds: 1.22, impliedProbability: 0.8197, confidence: 0.84, edge: 0.02,
        reasoning: "Larne (campioana NIFL) a invins deja 1-0 in deplasare la SP Tre Fiori cu o saptamana inainte. Piata confirma superioritatea clara (~82% implicit), peste modelul ML (65.4%).",
        accumulatorSafe: true,
      },
      secondaryPick: undefined,
      riskNotes: "Mismatch clar; restul pietelor sigure sunt deja sub 1.20.",
    },
    update: {},
  });
  await prisma.performanceRecord.create({
    data: { matchId: match1.id, pickType: "PRIMARY", market: "1x2", selection: "home", odds: 1.22, confidence: 0.84 },
  });

  // --- Upcoming match 2: Universitatea Craiova vs ML Vitebsk ---
  const craiova = await upsertTeam(359, "Universitatea Craiova");
  const vitebsk = await upsertTeam(3321, "ML Vitebsk");
  const match2 = await prisma.match.upsert({
    where: { externalEventId: 210763 },
    create: {
      externalEventId: 210763,
      leagueId: championsLeague.id,
      kickoffAt: new Date("2026-07-15T17:30:00Z"),
      status: "NOTSTARTED",
      homeTeamId: craiova.id,
      awayTeamId: vitebsk.id,
      h2h: { totalMeetings: 0, homeTeamWins: 0, awayTeamWins: 0, draws: 0, homeTeamWinRate: 0, awayTeamWinRate: 0, avgTotalGoals: 0, recent: [] },
      nativeMlPrediction: { model: "catboost-v5.0", homeWinProbability: 0.717, drawProbability: 0.19, awayWinProbability: 0.093, expectedGoalsHome: 2.65, expectedGoalsAway: 1.15, bttsYesProbability: 0.414, confidence: 0.7169 },
      dataComplete: true,
    },
    update: { dataComplete: true },
  });
  await prisma.oddsSnapshot.create({
    data: {
      matchId: match2.id,
      market: "1x2",
      capturedAt: new Date(),
      rows: [{ bookmaker: "Bwin", outcome: "home", decimalOdds: 1.29, impliedProbability: 0.7752, isMaxQuote: true, movement: "" }],
      bestByOutcome: { home: { bookmaker: "Bwin", decimalOdds: 1.29 } },
    },
  });
  await prisma.aIAnalysis.upsert({
    where: { matchId: match2.id },
    create: {
      matchId: match2.id,
      modelUsed: "claude-sonnet-5",
      generatedAt: new Date(),
      dataQualityScore: 0.75,
      primaryPick: {
        market: "1x2", selection: "home", bookmaker: "Bwin", odds: 1.29, impliedProbability: 0.7752, confidence: 0.8, edge: 0.025,
        reasoning: "Modelul ML da 71.7% sansa gazdelor, cu 2.65 goluri asteptate. Craiova, echipa de Superliga, intalneste un adversar semi-profesionist din Belarus in preliminariile Champions League.",
        accumulatorSafe: true,
      },
      secondaryPick: undefined,
    },
    update: {},
  });
  await prisma.performanceRecord.create({
    data: { matchId: match2.id, pickType: "PRIMARY", market: "1x2", selection: "home", odds: 1.29, confidence: 0.8 },
  });

  // --- Upcoming match 3: Djurgardens IF vs Halmstads BK ---
  const djurgardens = await upsertTeam(436, "Djurgårdens IF");
  const halmstads = await upsertTeam(442, "Halmstads BK");
  const match3 = await prisma.match.upsert({
    where: { externalEventId: 46392 },
    create: {
      externalEventId: 46392,
      leagueId: allsvenskan.id,
      kickoffAt: new Date("2026-07-13T17:00:00Z"),
      status: "NOTSTARTED",
      homeTeamId: djurgardens.id,
      awayTeamId: halmstads.id,
      h2h: { totalMeetings: 0, homeTeamWins: 0, awayTeamWins: 0, draws: 0, homeTeamWinRate: 0, awayTeamWinRate: 0, avgTotalGoals: 0, recent: [] },
      nativeMlPrediction: { model: "catboost-v5.0", homeWinProbability: 0.589, drawProbability: 0.22, awayWinProbability: 0.19, expectedGoalsHome: 1.64, expectedGoalsAway: 1.03, bttsYesProbability: 0.584, confidence: 0.5892 },
      dataComplete: true,
    },
    update: { dataComplete: true },
  });
  await prisma.oddsSnapshot.create({
    data: {
      matchId: match3.id,
      market: "1x2",
      capturedAt: new Date(),
      rows: [{ bookmaker: "Novibet", outcome: "home", decimalOdds: 1.27, impliedProbability: 0.7874, isMaxQuote: true, movement: "" }],
      bestByOutcome: { home: { bookmaker: "Novibet", decimalOdds: 1.27 } },
    },
  });
  await prisma.aIAnalysis.upsert({
    where: { matchId: match3.id },
    create: {
      matchId: match3.id,
      modelUsed: "claude-sonnet-5",
      generatedAt: new Date(),
      dataQualityScore: 0.7,
      primaryPick: {
        market: "1x2", selection: "home", bookmaker: "Novibet", odds: 1.27, impliedProbability: 0.7874, confidence: 0.72, edge: -0.067,
        reasoning: "Djurgarden favorita clara acasa (58.9% ML), dar edge usor negativ fata de cota pietei — pastram ca pick sigur pentru acumulator, nu ca value bet independent.",
        accumulatorSafe: true,
      },
      secondaryPick: undefined,
      riskNotes: "Edge negativ — cota reflecta deja mai multa incredere decat modelul ML.",
    },
    update: {},
  });
  await prisma.performanceRecord.create({
    data: { matchId: match3.id, pickType: "PRIMARY", market: "1x2", selection: "home", odds: 1.27, confidence: 0.72 },
  });

  // --- Settled match (WON): Tottenham Hotspur 3-0 SK Slavia Praha ---
  const tottenham = await upsertTeam(9, "Tottenham Hotspur");
  const slavia = await upsertTeam(120, "SK Slavia Praha");
  const match4 = await prisma.match.upsert({
    where: { externalEventId: 2168 },
    create: {
      externalEventId: 2168,
      leagueId: championsLeague.id,
      kickoffAt: new Date("2025-12-09T20:00:00Z"),
      status: "FINISHED",
      homeTeamId: tottenham.id,
      awayTeamId: slavia.id,
      finalScoreHome: 3,
      finalScoreAway: 0,
      dataComplete: true,
    },
    update: {},
  });
  await prisma.performanceRecord.create({
    data: { matchId: match4.id, pickType: "PRIMARY", market: "1x2", selection: "home", odds: 1.28, confidence: 0.8, actualOutcome: "WON", settledAt: new Date("2025-12-09T22:00:00Z") },
  });

  // --- Settled match (LOST): Kairat Almaty 1-4 Club Brugge KV ---
  const kairat = await upsertTeam(126, "Kairat Almaty");
  const brugge = await upsertTeam(123, "Club Brugge KV");
  const match5 = await prisma.match.upsert({
    where: { externalEventId: 2178 },
    create: {
      externalEventId: 2178,
      leagueId: championsLeague.id,
      kickoffAt: new Date("2026-01-20T15:30:00Z"),
      status: "FINISHED",
      homeTeamId: kairat.id,
      awayTeamId: brugge.id,
      finalScoreHome: 1,
      finalScoreAway: 4,
      dataComplete: true,
    },
    update: {},
  });
  await prisma.performanceRecord.create({
    data: { matchId: match5.id, pickType: "PRIMARY", market: "1x2", selection: "home", odds: 2.35, confidence: 0.65, actualOutcome: "LOST", settledAt: new Date("2026-01-20T17:30:00Z") },
  });

  console.log("Seed complete:", { match1: match1.id, match2: match2.id, match3: match3.id, match4: match4.id, match5: match5.id });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
