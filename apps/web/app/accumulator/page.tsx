import { Topbar } from "@/components/layout/Topbar";
import { AccumulatorBuilder } from "@/components/accumulator/AccumulatorBuilder";

export default function AccumulatorPage() {
  return (
    <>
      <Topbar
        title="Generator de Acumulator"
        subtitle="Combină automat cele mai sigure predicții (cote 1.20–1.40) în bilete optimizate"
      />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <AccumulatorBuilder />
      </main>
    </>
  );
}
