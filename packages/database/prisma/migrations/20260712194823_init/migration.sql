-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('NOTSTARTED', 'INPROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "PickType" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "OutcomeStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'VOID');

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "logoUrl" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "externalEventId" INTEGER NOT NULL,
    "leagueId" TEXT NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'NOTSTARTED',
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "venue" JSONB,
    "referee" JSONB,
    "homeCoach" JSONB,
    "awayCoach" JSONB,
    "weather" JSONB,
    "homeForm" JSONB,
    "awayForm" JSONB,
    "h2h" JSONB,
    "nativeMlPrediction" JSONB,
    "dataComplete" BOOLEAN NOT NULL DEFAULT false,
    "finalScoreHome" INTEGER,
    "finalScoreAway" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OddsSnapshot" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "rows" JSONB NOT NULL,
    "bestByOutcome" JSONB NOT NULL,

    CONSTRAINT "OddsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "dataQualityScore" DOUBLE PRECISION NOT NULL,
    "primaryPick" JSONB NOT NULL,
    "secondaryPick" JSONB,
    "riskNotes" TEXT,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccumulatorTicket" (
    "id" TEXT NOT NULL,
    "combinedOdds" DOUBLE PRECISION NOT NULL,
    "averageConfidence" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" "OutcomeStatus" NOT NULL DEFAULT 'PENDING',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccumulatorTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccumulatorTicketLeg" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AccumulatorTicketLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceRecord" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "pickType" "PickType" NOT NULL,
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "actualOutcome" "OutcomeStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "PerformanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "League_externalId_key" ON "League"("externalId");

-- CreateIndex
CREATE INDEX "League_country_idx" ON "League"("country");

-- CreateIndex
CREATE UNIQUE INDEX "Team_externalId_key" ON "Team"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalEventId_key" ON "Match"("externalEventId");

-- CreateIndex
CREATE INDEX "Match_kickoffAt_idx" ON "Match"("kickoffAt");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_dataComplete_idx" ON "Match"("dataComplete");

-- CreateIndex
CREATE INDEX "OddsSnapshot_matchId_market_idx" ON "OddsSnapshot"("matchId", "market");

-- CreateIndex
CREATE UNIQUE INDEX "AIAnalysis_matchId_key" ON "AIAnalysis"("matchId");

-- CreateIndex
CREATE INDEX "AIAnalysis_generatedAt_idx" ON "AIAnalysis"("generatedAt");

-- CreateIndex
CREATE INDEX "AccumulatorTicket_generatedAt_idx" ON "AccumulatorTicket"("generatedAt");

-- CreateIndex
CREATE INDEX "AccumulatorTicket_status_idx" ON "AccumulatorTicket"("status");

-- CreateIndex
CREATE INDEX "AccumulatorTicketLeg_ticketId_idx" ON "AccumulatorTicketLeg"("ticketId");

-- CreateIndex
CREATE INDEX "AccumulatorTicketLeg_matchId_idx" ON "AccumulatorTicketLeg"("matchId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_matchId_idx" ON "PerformanceRecord"("matchId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_actualOutcome_idx" ON "PerformanceRecord"("actualOutcome");

-- CreateIndex
CREATE INDEX "PerformanceRecord_market_idx" ON "PerformanceRecord"("market");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccumulatorTicketLeg" ADD CONSTRAINT "AccumulatorTicketLeg_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "AccumulatorTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccumulatorTicketLeg" ADD CONSTRAINT "AccumulatorTicketLeg_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
