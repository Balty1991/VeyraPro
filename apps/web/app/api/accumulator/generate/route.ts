import { NextResponse } from "next/server";
import { generateAccumulatorTickets } from "@veyrapro/accumulator-engine";
import { prisma } from "@veyrapro/database";
import type { AccumulatorConstraints, AccumulatorLeg, AIPick } from "@veyrapro/domain";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<AccumulatorConstraints> & { persist?: boolean };

  const constraints: AccumulatorConstraints = {
    minLegs: body.minLegs ?? 2,
    maxLegs: body.maxLegs ?? 6,
    minCombinedOdds: body.minCombinedOdds,
    maxCombinedOdds: body.maxCombinedOdds,
    minLegConfidence: body.minLegConfidence ?? 0.7,
    minLegOdds: body.minLegOdds ?? 1.2,
    maxLegOdds: body.maxLegOdds ?? 1.4,
    maxLegsPerLeague: body.maxLegsPerLeague,
    maxTickets: body.maxTickets ?? 8,
  };

  const analyses = await prisma.aIAnalysis.findMany({
    where: { match: { status: "NOTSTARTED" } },
    include: { match: { include: { homeTeam: true, awayTeam: true, league: true } } },
  });

  const legs: AccumulatorLeg[] = [];
  for (const row of analyses) {
    for (const raw of [row.primaryPick, row.secondaryPick]) {
      if (!raw) continue;
      const pick = raw as unknown as AIPick;
      if (!pick.accumulatorSafe) continue;
      legs.push({
        matchId: row.matchId,
        homeTeam: row.match.homeTeam.name,
        awayTeam: row.match.awayTeam.name,
        league: row.match.league.name,
        kickoffAt: row.match.kickoffAt.toISOString(),
        market: pick.market,
        selection: pick.selection,
        odds: pick.odds,
        confidence: pick.confidence,
      });
    }
  }

  const tickets = generateAccumulatorTickets(legs, constraints);

  if (body.persist) {
    for (const ticket of tickets) {
      await prisma.accumulatorTicket.create({
        data: {
          id: ticket.id,
          combinedOdds: ticket.combinedOdds,
          averageConfidence: ticket.averageConfidence,
          score: ticket.score,
          legs: {
            create: ticket.legs.map((leg) => ({
              matchId: leg.matchId,
              market: leg.market,
              selection: leg.selection,
              odds: leg.odds,
              confidence: leg.confidence,
            })),
          },
        },
      });
    }
  }

  return NextResponse.json({ candidatePool: legs.length, tickets });
}
