# Runbook: adoptér formelle Supabase CLI-migrationer (baseline)

Den nuværende produktions-DB har alle scripts fra `DATABASE_SETUP.md` kørt manuelt.
Følg denne rækkefølge ÉN gang for at gå over på CLI-migrationer **uden** at gen-anvende
noget på produktion. (Alle trin køres af dig med dine credentials — ikke i denne agent.)

Projekt-ref: `zjbjupovlgwlrvojusnr` (fra Supabase-URL'en).

## 1) Installér + log ind (engang)
```bash
brew install supabase/tap/supabase     # eller: npm i -g supabase
supabase login
supabase link --project-ref zjbjupovlgwlrvojusnr
```

## 2) Lav en BASELINE af den nuværende live-database
```bash
# Dumper det nuværende skema (kun struktur) som første migration:
supabase db dump --linked --schema public > supabase/migrations/00000000000000_baseline.sql
```
> Dette er et øjebliksbillede af præcis det produktion har NU (alle 35 scripts samlet).

## 3) Markér baseline som ALLEREDE anvendt (så den ikke køres på prod igen)
```bash
supabase migration repair --status applied 00000000000000
```

## 4) Bekræft at intet udestår
```bash
supabase migration list          # baseline skal stå som applied lokalt + remote
```

## 5) Fra nu af — sådan laver du en DB-ændring
```bash
supabase migration new min_aendring       # opretter tom migrations-fil
# ...skriv din SQL i den nye fil...
supabase db push                           # anvender KUN nye migrationer, i rækkefølge
```

## Regler fremover
- **Ingen flere løse `setup_*.sql` i roden** — al ny DB-ændring bliver en migration via trin 5.
- De gamle `setup_*.sql` + `DATABASE_SETUP.md` beholdes som historik/reference, men køres ikke længere manuelt.
- Test nye migrationer lokalt først hvis muligt: `supabase db reset` (lokal) anvender alle migrationer fra bunden — god røgtest for at fange rækkefølge-fejl.

## Hvis noget går galt
- `supabase migration repair` kan rette applied/reverted-status.
- En migration kan ikke "rulles tilbage" automatisk — skriv en ny migration der ophæver ændringen (forward-only).
