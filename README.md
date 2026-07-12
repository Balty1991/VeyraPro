# VeyraPro

Platformă full-stack de predicții sportive asistate de AI: ingestie completă de
date sportive, analiză per-meci cu Claude (Anthropic), generator automat de
bilete acumulator "sigure" (cote 1.20–1.40) și un modul de performanță care
confruntă predicțiile cu rezultatele reale.

## Arhitectură

Monorepo pnpm + Turborepo, cu patru straturi clar separate:

```
apps/
  web/      Next.js 15 (App Router) — Dashboard, Meciuri, Generator Acumulator, Performanță
  worker/   Pipeline-uri programate (cron): ingestie → analiză AI → decontare rezultate

packages/
  domain/               Tipuri TS + scheme zod partajate; logica de grading a predicțiilor
  sports-api-client/    Client tipizat pentru furnizorul de date sportive
  ai-engine/            Integrare Claude — prompt, schema output structurat, analiză paralelă
  accumulator-engine/   Generator de combinații pentru bilete acumulator (backtracking + scoring)
  database/             Schemă Prisma (PostgreSQL) + client singleton
```

### Fluxul de date

```
Sports API ──▶ SportsApiClient.getMatchContext()
              (H2H, formă, antrenori, arbitru, vreme, cote + mișcări, ML nativ)
                    │
                    ▼
         hasCompleteStats() filtrează doar meciurile cu statistici complete
                    │
                    ▼
         Prisma (Match, OddsSnapshot) ── worker/ingestion
                    │
                    ▼
     ai-engine.analyzeMatchesInParallel() ── trimite fiecare meci separat
     către Claude, forțat să răspundă structurat (tool use) cu:
       • Pronostic Principal (piață, selecție, cotă, confidence, edge)
       • Pronostic Secundar (opțional, necorelat cu primul)
     Prioritate pentru selecții cu cotă 1.20–1.40 (accumulatorSafe = true)
                    │
                    ▼
         Prisma (AIAnalysis, PerformanceRecord) ── worker/analysis
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
  accumulator-engine   worker/settlement confruntă rezultatul final
  combină selecțiile   (validat prin API) cu predicția → grading.ts →
  "safe" în bilete      PerformanceRecord.actualOutcome (won/lost/void)
  optimizate                    │
          │                     ▼
          ▼             Dashboard / Performanță (hit-rate, ROI, pe piață)
    Generator de Acumulator (UI)
```

## Sursa de date sportive

Clientul (`packages/sports-api-client`) extrage tot ce oferă furnizorul pentru
fiecare meci eligibil:

- **Fixtures & context**: ligă, sezon, echipe, arbitru, venue.
- **Head-to-head**: istoricul confruntărilor directe.
- **Formă**: ultimele rezultate, goluri marcate/primite, xG, streak.
- **Antrenori**: formație preferată, intensitate presing, linie defensivă, stiluri tactice.
- **Vreme**: temperatură, condiții, vânt, precipitații (când furnizorul le expune).
- **Cote**: ~14 case de pariuri, pentru piețele `1x2`, `over_under_1.5/2.5/3.5`,
  `btts`, `double_chance`, `draw_no_bet` — inclusiv cota anterioară și direcția
  de mișcare (`SHORTENING` / `DRIFTING`).
- **Predicție ML nativă**: probabilități 1X2, goluri așteptate, BTTS,
  over/under, recomandările proprii ale modelului furnizorului.

Doar meciurile care au **toate** aceste categorii de date disponibile
(`hasCompleteStats()` în `packages/domain`) trec mai departe spre analiza AI.

> Endpoint-urile din `sports-api-client/src/client.ts` folosesc convenția REST
> standard (`SPORTS_API_BASE_URL` + `SPORTS_API_KEY`, Bearer auth). Ajustează
> căile și `raw-types.ts`/`mapper.ts` după contractul exact al providerului
> tău — restul aplicației depinde doar de tipurile stabile din
> `@veyrapro/domain`, deci schimbarea rămâne izolată într-un singur pachet.

## Motorul de analiză AI

`packages/ai-engine` trimite fiecare meci separat către Claude
(`ANTHROPIC_API_KEY`, model implicit `claude-sonnet-5`, configurabil), cu
`tool_choice` forțat pe un tool `submit_match_analysis` — răspunsul este deci
mereu JSON structurat, validat cu zod înainte de a fi persistat. Meciurile
sunt procesate în paralel cu un pool de workeri (`AI_ANALYSIS_CONCURRENCY`,
implicit 5) ca să nu se aștepte inutil pe fiecare apel.

## Generatorul de Acumulator

`packages/accumulator-engine` ia toate selecțiile marcate `accumulatorSafe`
(cotă implicit 1.20–1.40, prag de încredere configurabil) și construiește
combinații printr-un backtracking cu tăiere: cum cota combinată crește
monoton cu fiecare selecție adăugată, o ramură e abandonată imediat ce
depășește cota maximă cerută — asta ține căutarea rapidă chiar și pe zeci de
meciuri analizate. Biletele candidate sunt punctate după cotă combinată ×
încredere medie² × un bonus de diversitate pe ligă, apoi sunt returnate
top-N.

## Pornire locală

```bash
cp .env.example .env   # completează SPORTS_API_KEY, ANTHROPIC_API_KEY, DATABASE_URL

pnpm install
docker compose up -d       # Postgres + Redis
pnpm db:migrate             # aplică schema Prisma
pnpm db:generate

pnpm dev:web                 # http://localhost:3000
pnpm dev:worker               # scheduler de ingestie / analiză / decontare
```

Rulare punctuală a pipeline-urilor worker (util pentru testare/debug):

```bash
pnpm --filter @veyrapro/worker ingest
pnpm --filter @veyrapro/worker analyze
pnpm --filter @veyrapro/worker settle
```

## Scripturi principale (root)

| Script | Ce face |
|---|---|
| `pnpm dev` | Pornește toate aplicațiile în paralel (Turborepo) |
| `pnpm build` | Build de producție pentru toate pachetele/aplicațiile |
| `pnpm typecheck` / `pnpm lint` | Verificări statice pe tot monorepo-ul |
| `pnpm db:migrate` / `pnpm db:studio` | Migrații Prisma / UI de explorare a bazei |

## Stivă tehnică

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts, Framer Motion
- **Backend/worker**: Node.js, Prisma + PostgreSQL, node-cron
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`), output structurat prin tool use
- **Monorepo**: pnpm workspaces + Turborepo

## Notă

Predicțiile AI sunt estimări statistice bazate pe date istorice și cote de
piață — nu constituie sfaturi financiare și nu garantează un rezultat.
Modulul de Performanță există tocmai pentru a evalua onest rata de succes
reală și a ajusta algoritmul pe parcurs.
