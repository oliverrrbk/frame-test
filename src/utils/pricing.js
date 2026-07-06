// ============================================================================
// pricing.js — ÉT facit for Bison Frames abonnement (ny model, juli 2026).
// Bruges af prissiden, register/onboarding, abonnements-siden OG til at synke
// sæder til Stripe. Alle beløb er DKK pr. måned, EKSKL. moms (Stripe
// automatic_tax lægger moms på).
//
// MODELLEN
//   • Solo   390  — 1 bruger (mesteren). UDEN timeregistrering (man er alene).
//   • Hold   890  — 3 brugere inkl. (mester + 2) + timeregistrering. Forklarer
//                   springet fra enmand → hold.
//   • Tillæg pr. EKSTRA bruger (fra bruger nr. 4) lægges oven på Hold, prissat
//     pr. rolle og efter en BRUGERTRAPPE der tæller SAMLET antal brugere
//     (ikke pr. rolle): trin skifter EFTER bruger 10 og EFTER bruger 50.
//
//   Rolle        bruger 4–10    bruger 11–50   bruger 51+
//   Kontor          149            119            99
//   Svend           129             99            79
//   Lærling          79             59            49
//
//   • Ingen Entreprise/"kontakt os" — prisen er gennemsigtig hele vejen op.
//   • Grandfathered konti (fx Tobias, raw_data.legacy_pricing.locked): beholder
//     249 som grundpris (aldrig Solo/Hold), men tillæg pr. bruger bruger de NYE
//     satser ovenfor. Send { legacy: true } til computePrice for den beregning.
// ============================================================================

// Grundplaner + tillægspriser. Tillæg er [trin1 (1–10), trin2 (11–50), trin3 (51+)].
export const PRICES = {
    solo: 390,          // 1 bruger, uden timeregistrering
    hold: 890,          // 3 brugere inkl. + timeregistrering
    legacyBase: 249,    // grandfathered grundpris (Tobias) — eksisterende MESTER-price
    kontor: [149, 119, 99],  // projektleder / bogholder / ekstra mester (fuld adgang)
    svend:  [129,  99, 79],  // svend (app-adgang, timer)
    laer:   [ 79,  59, 49],  // lærling (app-adgang, mindre brug)
};

// Hold dækker de første 3 brugere (mester + 2). Bruger nr. 4 og op er tillæg.
export const HOLD_INCLUDED = 3;

// Brugertrappen skifter EFTER disse samlede bruger-positioner (dvs. 11–50, 51+).
export const TIER_BREAKS = [10, 50];

// Stripe price-id'er hentes fra miljø-variabler (sættes i Supabase). Nøglerne
// her bruges af edge-funktionerne til at slå det rigtige price_… op.
export const STRIPE_PRICE_ENV = {
    SOLO:        'STRIPE_PRICE_SOLO',        // 390
    HOLD:        'STRIPE_PRICE_HOLD',        // 890
    MESTER:      'STRIPE_PRICE_MESTER',      // 249 — kun grandfathered grundpris (Tobias)
    KONTOR:      'STRIPE_PRICE_KONTOR',      // 149
    KONTOR_11:   'STRIPE_PRICE_KONTOR_11',   // 119
    KONTOR_51:   'STRIPE_PRICE_KONTOR_51',   // 99
    SVEND:       'STRIPE_PRICE_SVEND',       // 129
    SVEND_11:    'STRIPE_PRICE_SVEND_11',    // 99
    SVEND_51:    'STRIPE_PRICE_SVEND_51',    // 79
    LAERLING:    'STRIPE_PRICE_LAERLING',    // 79
    LAERLING_11: 'STRIPE_PRICE_LAERLING_11', // 59
    LAERLING_51: 'STRIPE_PRICE_LAERLING_51', // 49
};

// (rolle, trin) → Stripe-nøgle (indeks matcher PRICES-arrayet: 0=trin1, 1=trin2, 2=trin3).
const STRIPE_KEY = {
    kontor: ['KONTOR', 'KONTOR_11', 'KONTOR_51'],
    svend:  ['SVEND', 'SVEND_11', 'SVEND_51'],
    laer:   ['LAERLING', 'LAERLING_11', 'LAERLING_51'],
};

// Hvilket trin (0/1/2) en given samlet bruger-position lander i.
function tierForPosition(pos) {
    if (pos <= TIER_BREAKS[0]) return 0; // 1–10
    if (pos <= TIER_BREAKS[1]) return 1; // 11–50
    return 2;                            // 51+
}

// Normalisér et hold-input til rene tal. Understøtter BEGGE gemte former:
//   • {mester, pl, bog, svend, laer}      (fra oprettelse/beregner)
//   • {mester, kontor, svend, laer}       (skrevet af seat-sync)
//   • {mester, kontor, felt}              (ældre seat-sync — felt regnes som svend)
// Mester er altid præcis 1 for prisen; ekstra mestre tælles som kontor-sæder.
export function normalizeTeam(team = {}) {
    const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
    const mesterInput = Math.max(1, n(team.mester));
    const kontor = team.kontor != null
        ? n(team.kontor)                          // seat-sync-form (ekstra mestre allerede foldet ind)
        : (mesterInput - 1) + n(team.pl) + n(team.bog); // oprettelses-form
    const svend = team.svend != null ? n(team.svend) : n(team.felt); // ældre 'felt' → svend
    const laer = n(team.laer);
    return { mester: 1, kontor, svend, laer };
}

// Udregn sæde-fordeling + samlet hoved-tal (altid præcis 1 mester-base).
export function computeSeats(team) {
    const t = normalizeTeam(team);
    const heads = 1 + t.kontor + t.svend + t.laer;
    return { mester: 1, kontorSeats: t.kontor, svend: t.svend, laer: t.laer, heads };
}

// Pænt plan-navn til visning.
export function planLabel(plan) {
    if (plan === 'hold') return 'Hold';
    if (plan === 'legacy') return 'Grundpris';
    return 'Solo';
}

// Hovedfunktion: returnér total, plan, antal, visnings-linjer og Stripe-items.
// opts.legacy = true  → grandfathered (249 grundpris, ingen inkl. ekstra-pladser,
//                        men tillæg pr. bruger på de nye satser).
export function computePrice(team, opts = {}) {
    const s = computeSeats(team);
    const legacy = !!opts.legacy;
    const heads = s.heads;

    // --- Grundplan ---
    let base, baseKey, plan, included;
    if (legacy) {
        base = Number(opts.legacyBase) || PRICES.legacyBase; // 249
        baseKey = 'MESTER';
        plan = 'legacy';
        included = 1;                       // kun mesteren; alt andet er tillæg
    } else if (heads <= 1) {
        base = PRICES.solo;                 // 390
        baseKey = 'SOLO';
        plan = 'solo';
        included = 1;
    } else {
        base = PRICES.hold;                 // 890
        baseKey = 'HOLD';
        plan = 'hold';
        included = HOLD_INCLUDED;           // 3
    }

    // --- Ordnet bruger-liste (position 1 = mester). Rolle-rækkefølge: kontor → svend → laer. ---
    const roleOrder = [];
    for (let i = 0; i < s.kontorSeats; i++) roleOrder.push('kontor');
    for (let i = 0; i < s.svend; i++) roleOrder.push('svend');
    for (let i = 0; i < s.laer; i++) roleOrder.push('laer');

    // --- Prissæt hver ekstra bruger. Position <= included er gratis (dækket af grundplan). ---
    const bucket = {};                                  // stripe-nøgle → {key, quantity, unit}
    const roleAmount = { kontor: 0, svend: 0, laer: 0 };
    const roleCharged = { kontor: 0, svend: 0, laer: 0 };
    let additions = 0;

    roleOrder.forEach((role, idx) => {
        const position = idx + 2;                       // idx 0 → samlet position 2
        if (position <= included) return;               // gratis (Hold-inkluderet)
        const tier = tierForPosition(position);
        const unit = PRICES[role][tier];
        additions += unit;
        roleAmount[role] += unit;
        roleCharged[role] += 1;
        const key = STRIPE_KEY[role][tier];
        if (!bucket[key]) bucket[key] = { key, quantity: 0, unit };
        bucket[key].quantity += 1;
    });

    const total = base + additions;
    const usedIncluded = Math.min(included, heads);

    // --- Stripe-items (grundplan qty 1 + evt. tillæg pr. (rolle,trin)) ---
    const items = [{ key: baseKey, quantity: 1, unit: base }, ...Object.values(bucket)];

    // --- Visnings-linjer ---
    const lines = [{ label: planLabel(plan), count: usedIncluded, amount: base, isBase: true }];
    if (s.kontorSeats > 0) lines.push({ label: 'Kontor', count: s.kontorSeats, charged: roleCharged.kontor, amount: roleAmount.kontor });
    if (s.svend > 0) lines.push({ label: 'Svende', count: s.svend, charged: roleCharged.svend, amount: roleAmount.svend });
    if (s.laer > 0) lines.push({ label: 'Lærlinge', count: s.laer, charged: roleCharged.laer, amount: roleAmount.laer });

    return {
        total,
        heads,
        plan,                                   // 'solo' | 'hold' | 'legacy'
        base,
        baseKey,
        included,
        usedIncluded,
        freeExtraSeats: Math.max(0, usedIncluded - 1), // gratis ekstra-brugere (ud over mesteren)
        kontorSeats: s.kontorSeats,
        svend: s.svend,
        laer: s.laer,
        items,
        lines,
        hasTimeTracking: plan !== 'solo',       // Solo = uden timeregistrering
    };
}

// Pris for ÉN ekstra bruger af en given rolle (til upsell/invite-popup), givet nuværende hold.
// role: 'mester'|'pl'|'bog'|'kontor'|'svend'|'laer'. opts videresendes (fx legacy).
export function priceForAddingRole(team, role, opts = {}) {
    const before = computePrice(team, opts).total;
    const s = computeSeats(team);
    const next = { mester: 1, kontor: s.kontorSeats, svend: s.svend, laer: s.laer };
    if (role === 'svend') next.svend += 1;
    else if (role === 'laer') next.laer += 1;
    else next.kontor += 1;                      // mester/pl/bog/kontor = kontor-sæde
    return computePrice(next, opts).total - before;
}

export const formatKr = (n) => (Number(n) || 0).toLocaleString('da-DK');
