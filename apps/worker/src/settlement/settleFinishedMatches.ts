import { gradeMarketSelection, type OddsMarket } from "@veyrapro/domain";
import { prisma } from "@veyrapro/database";
import { SportsApiClient } from "@veyrapro/sports-api-client";
import { logger } from "../lib/logger.js";

/**
 * Confronts each pending AI prediction with the validated final result from
 * the sports feed. This is what powers the Performance / Statistics page —
 * without it, "success rate" would just be a number nobody can trust.
 */
export async function settleFinishedMatches(): Promise<{ settledMatches: number; gradedPicks: number }> {
  const client = new SportsApiClient();

  const dueMatches = await prisma.match.findMany({
    where: {
      status: { in: ["NOTSTARTED", "INPROGRESS"] },
      kickoffAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // kicked off 2h+ ago
    },
  });

  let settledMatches = 0;
  let gradedPicks = 0;

  for (const match of dueMatches) {
    const finalScore = await client.getFinishedResult(match.externalEventId).catch(() => null);
    if (!finalScore) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: { status: "FINISHED", finalScoreHome: finalScore.home, finalScoreAway: finalScore.away },
    });
    settledMatches++;

    const pendingRecords = await prisma.performanceRecord.findMany({
      where: { matchId: match.id, actualOutcome: "PENDING" },
    });

    for (const record of pendingRecords) {
      const outcome = gradeMarketSelection(record.market as OddsMarket, record.selection, finalScore.home, finalScore.away);
      await prisma.performanceRecord.update({
        where: { id: record.id },
        data: { actualOutcome: outcome.toUpperCase() as "WON" | "LOST" | "VOID", settledAt: new Date() },
      });
      gradedPicks++;
    }

    // Grade any accumulator legs riding on this match, then flag tickets with a losing leg.
    const legs = await prisma.accumulatorTicketLeg.findMany({ where: { matchId: match.id }, include: { ticket: true } });
    for (const leg of legs) {
      const outcome = gradeMarketSelection(leg.market as OddsMarket, leg.selection, finalScore.home, finalScore.away);
      if (outcome === "lost" && leg.ticket.status === "PENDING") {
        await prisma.accumulatorTicket.update({ where: { id: leg.ticketId }, data: { status: "LOST" } });
      }
    }
  }

  // A ticket whose every leg is settled and none lost is a winner.
  const pendingTickets = await prisma.accumulatorTicket.findMany({
    where: { status: "PENDING" },
    include: { legs: { include: { match: true } } },
  });
  for (const ticket of pendingTickets) {
    const allFinished = ticket.legs.every((leg) => leg.match.status === "FINISHED");
    if (allFinished) {
      await prisma.accumulatorTicket.update({ where: { id: ticket.id }, data: { status: "WON" } });
    }
  }

  logger.info("Settlement pass complete", { settledMatches, gradedPicks });
  return { settledMatches, gradedPicks };
}
