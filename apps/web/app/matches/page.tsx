import { Topbar } from "@/components/layout/Topbar";
import { MatchFilters } from "@/components/matches/MatchFilters";
import { MatchList } from "@/components/matches/MatchList";
import { getAnalyzedMatches } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; market?: string; minConfidence?: string; minEdge?: string }>;
}

export default async function MatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const matches = await getAnalyzedMatches({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    market: params.market,
    minConfidence: params.minConfidence ? Number(params.minConfidence) : undefined,
    minEdge: params.minEdge ? Number(params.minEdge) : undefined,
  });

  return (
    <>
      <Topbar title="Meciuri" subtitle="Toate meciurile analizate de AI, cu filtre avansate" />
      <main className="flex flex-1 flex-col gap-4 p-6">
        <MatchFilters />
        <MatchList matches={matches} />
      </main>
    </>
  );
}
