// Mønster-baseret diagnose: oversætter en fejlbesked til en sandsynlig årsag
// + et konkret bud på hvordan den fixes (dansk). Gratis, øjeblikkeligt, offline.
const PATTERNS = [
    { re: /before initialization/i,
      cause: 'Variabel eller hook brugt FØR den er erklæret (Temporal Dead Zone).',
      fix: 'Flyt erklæringen op før brugen — fx en useEffect der bruger en state, som først defineres længere nede. Tjek rækkefølgen.' },
    { re: /failed to fetch|networkerror|network request failed|load failed/i,
      cause: 'Netværk eller Supabase/edge-funktion var utilgængelig.',
      fix: 'Tjek internetforbindelse + at Supabase svarer. Kan også være CORS eller en RLS-policy der blokerer.' },
    { re: /is not a function/i,
      cause: 'Forsøgte at kalde noget der ikke er en funktion (forkert import eller navn).',
      fix: 'Tjek import-stien og at funktionen faktisk eksporteres/staves korrekt.' },
    { re: /undefined \(reading|cannot read propert.*of undefined/i,
      cause: 'Læser en egenskab på en værdi der er undefined (data ikke hentet endnu).',
      fix: 'Tilføj null-tjek med optional chaining (?.) og en fallback, fx data?.felt ?? "".' },
    { re: /cannot read propert.*of null|of null \(reading/i,
      cause: 'Læser en egenskab på null.',
      fix: 'Sørg for objektet er hentet før brug; brug ?. og en standardværdi.' },
    { re: /row-level security|violates row-level/i,
      cause: 'En RLS-politik i databasen blokerede handlingen.',
      fix: 'Tjek/justér RLS-policy på den pågældende tabel for brugerens rolle.' },
    { re: /chunkloaderror|loading chunk|dynamically imported module|failed to import/i,
      cause: 'En lazy-indlæst del af appen kunne ikke hentes (ofte lige efter en ny deploy).',
      fix: 'Bed brugeren genindlæse siden (ny version er deployet). Service-workeren henter nyeste version.' },
    { re: /unexpected token|syntaxerror|json/i,
      cause: 'Syntaks- eller parse-fejl (ofte ugyldig JSON eller en tastefejl i koden).',
      fix: 'Tjek den seneste ændring i den relevante fil for en tastefejl / ugyldigt svar.' },
    { re: /quota|storage full|exceeded/i,
      cause: 'Lager-/quota-grænse ramt (fx localStorage).',
      fix: 'Ryd op i hvad der gemmes lokalt, eller reducér mængden.' },
    { re: /permission|not allowed|denied/i,
      cause: 'Manglende tilladelse (rolle/RLS/browser-tilladelse).',
      fix: 'Tjek brugerens rolle/RLS, eller om en browser-tilladelse (fx mikrofon/notifikation) mangler.' },
];

export function diagnoseError(message = '') {
    const m = String(message || '');
    for (const p of PATTERNS) {
        if (p.re.test(m)) return { cause: p.cause, fix: p.fix };
    }
    return {
        cause: 'Ukendt fejltype.',
        fix: 'Fold fejlen ud og læs stak-sporet for den nævnte fil/linje. Bemærk: produktionskoden er minificeret, så placeringen kan være forkortet.',
    };
}
