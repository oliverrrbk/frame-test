// Oversæt en teknisk fejl til en kort, forståelig dansk besked til håndværkeren.
//
// Baggrund: flere steder blev en rå `error.message` (ofte engelsk Supabase-/fetch-
// tekst) vist direkte i en toast. En tømrer skal ikke møde "TypeError: Failed to
// fetch" eller en Postgres-constraint. Kald-stedet logger fortsat det rå til
// konsollen (til fejlsøgning); denne funktion returnerer KUN den pæne tekst.

// Ligner fejlen manglende forbindelse (offline / dårligt signal)? Bruges til at
// afgøre om en handling skal lægges i offline-køen i stedet for at fejle hårdt.
export function isOfflineError(err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    const msg = (err?.message || String(err || '')).toLowerCase();
    // Timeout/afbrudt (vores fail-fast-fetch loft) behandles som manglende forbindelse,
    // så UI'et falder tilbage på gemte data / offline-kø i stedet for at fejle hårdt.
    return err?.name === 'TypeError' || err?.name === 'AbortError' || err?.name === 'TimeoutError'
        || /failed to fetch|networkerror|network request failed|network|fetch|load failed|timeout|timed out|aborted/.test(msg);
}

export function friendlyError(err, fallback = 'Noget gik galt. Prøv igen.') {
    const msg = (err?.message || String(err || '')).toLowerCase();

    if (isOfflineError(err)) {
        return 'Ingen forbindelse — tjek dit internet og prøv igen.';
    }
    if (/jwt|token|unauthor|not authenticated|invalid session|session/.test(msg)) {
        return 'Din session er udløbet. Log ind igen.';
    }
    if (/row-level security|rls|permission|not permitted|denied|not allowed/.test(msg)) {
        return 'Du har ikke rettigheder til denne handling.';
    }
    if (/duplicate|unique|already exists|conflict/.test(msg)) {
        return 'Det ser ud til at være gemt allerede.';
    }
    if (/timeout|timed out|deadline/.test(msg)) {
        return 'Forbindelsen er langsom — prøv igen om lidt.';
    }
    return fallback;
}
