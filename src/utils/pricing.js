// ============================================================================
// pricing.js — ÉT facit for Bison Frames rollebaserede abonnement.
// Bruges af prissiden, register/onboarding OG til at synke sæder til Stripe.
// Alle beløb er DKK pr. måned, EKSKL. moms (Stripe automatic_tax lægger moms på).
// ============================================================================

// Pris pr. rolle. "volume" = rabatpris fra og med den 11. bruger i den rolle.
export const PRICES = {
    mester: 249,        // bruger 1, fast grundpris (altid præcis 1)
    kontor: 149,        // projektleder / bogholder / ekstra mester (fuld adgang)
    kontorVolume: 119,  // kontor-sæde nr. 11 og op
    felt: 99,           // svend / lærling (app-adgang)
    feltVolume: 79,     // felt-sæde nr. 11 og op
};

// Mængderabatten slår ind fra denne sæde-position i hver rolle (pr. rolle).
export const VOLUME_FROM = 11;
// Antal ansatte hvor vi henviser til "kontakt os for fast entreprisepris".
export const ENTERPRISE_FROM = 41; // dvs. > 40 ansatte

// Stripe price-id'er hentes fra miljø-variabler (sættes i Supabase). Nøglerne
// her bruges af edge-funktionen til at slå det rigtige price_… op.
export const STRIPE_PRICE_ENV = {
    MESTER: 'STRIPE_PRICE_MESTER',
    KONTOR: 'STRIPE_PRICE_KONTOR',
    KONTOR_VOLUME: 'STRIPE_PRICE_KONTOR_11',
    FELT: 'STRIPE_PRICE_FELT',
    FELT_VOLUME: 'STRIPE_PRICE_FELT_11',
};

// Normalisér et hold-input til rene tal. mester er altid mindst 1.
export function normalizeTeam(team = {}) {
    const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
    return {
        mester: Math.max(1, n(team.mester)),
        pl: n(team.pl),
        bog: n(team.bog),
        svend: n(team.svend),
        laer: n(team.laer),
    };
}

// Udregn sæde-fordeling: ekstra mestre + projektledere + bogholdere = kontor-sæder;
// svende + lærlinge = felt-sæder. Bruger nr. 1 (mester) er sin egen faste pris.
export function computeSeats(team) {
    const t = normalizeTeam(team);
    const kontorSeats = (t.mester - 1) + t.pl + t.bog;
    const feltSeats = t.svend + t.laer;
    const heads = t.mester + t.pl + t.bog + t.svend + t.laer;
    return { ...t, kontorSeats, feltSeats, heads };
}

// Del et antal sæder i fuld-pris (de første 10) og rabat (nr. 11 og op).
function splitVolume(seats) {
    const std = Math.min(seats, VOLUME_FROM - 1);
    const volume = Math.max(seats - (VOLUME_FROM - 1), 0);
    return { std, volume };
}

// Hovedfunktion: returnér total, antal, linjer og Stripe-items (key + quantity).
export function computePrice(team) {
    const { mester, kontorSeats, feltSeats, heads } = computeSeats(team);
    const k = splitVolume(kontorSeats);
    const f = splitVolume(feltSeats);

    const total =
        PRICES.mester * 1 +
        k.std * PRICES.kontor + k.volume * PRICES.kontorVolume +
        f.std * PRICES.felt + f.volume * PRICES.feltVolume;

    // Stripe-items: 1 mester + (op til 10 kontor + evt. kontor-rabat) + (felt + evt. felt-rabat).
    const items = [{ key: 'MESTER', quantity: 1, unit: PRICES.mester }];
    if (k.std > 0) items.push({ key: 'KONTOR', quantity: k.std, unit: PRICES.kontor });
    if (k.volume > 0) items.push({ key: 'KONTOR_VOLUME', quantity: k.volume, unit: PRICES.kontorVolume });
    if (f.std > 0) items.push({ key: 'FELT', quantity: f.std, unit: PRICES.felt });
    if (f.volume > 0) items.push({ key: 'FELT_VOLUME', quantity: f.volume, unit: PRICES.feltVolume });

    // Pæne visnings-linjer (Mester / Kontor / Felt samlet).
    const lines = [{ label: 'Mester', count: mester, amount: PRICES.mester }];
    if (kontorSeats > 0) lines.push({ label: 'Kontor', count: kontorSeats, amount: k.std * PRICES.kontor + k.volume * PRICES.kontorVolume });
    if (feltSeats > 0) lines.push({ label: 'Felt', count: feltSeats, amount: f.std * PRICES.felt + f.volume * PRICES.feltVolume });

    return {
        total,
        heads,
        kontorSeats,
        feltSeats,
        items,
        lines,
        isEnterprise: heads >= ENTERPRISE_FROM, // >40 → kontakt os for fast pris
    };
}

// Pris for ÉN ekstra bruger af en given rolle (til upsell-popup), givet nuværende hold.
export function priceForAddingRole(team, role) {
    const before = computePrice(team).total;
    const next = { ...normalizeTeam(team) };
    if (role === 'mester') next.mester += 1;
    else if (role === 'pl') next.pl += 1;
    else if (role === 'bog') next.bog += 1;
    else if (role === 'svend') next.svend += 1;
    else if (role === 'laer') next.laer += 1;
    return computePrice(next).total - before;
}

export const formatKr = (n) => (Number(n) || 0).toLocaleString('da-DK');
