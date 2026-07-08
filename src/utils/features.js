import { computeSeats } from './pricing';

// Branche-baserede funktioner (business_type på firmaet).
//
// KUN tømrere har prisberegner + materialer + Wizard-tilbud. Alle andre fag
// (inkl. entreprenør, bevidst) får hele appen UNDTAGEN det, og kan kun lave
// "Hurtigt tilbud" (manuelt). Default = tømrer, så eksisterende konti + alt
// hvor business_type mangler/loader fortsætter præcis som nu.
//
// Data-drevet: vil du senere give fx murere deres egen beregner, så flyt
// 'murer' ind i CALCULATOR_TRADES — så følger al gating automatisk med.

export const BUSINESS_TYPES = [
    { value: 'tomrer', label: 'Tømrer' },
    { value: 'murer', label: 'Murer' },
    { value: 'maler', label: 'Maler' },
    { value: 'vvs', label: "VVS'er" },
    { value: 'anlaegsgartner', label: 'Anlægsgartner' },
    { value: 'elektriker', label: 'Elektriker' },
    { value: 'kloakmester', label: 'Kloakmester' },
    { value: 'entreprenor', label: 'Entreprenør' },
];

// Fag der har den fulde beregner/materiale-pakke. Pt. kun tømrer.
const CALCULATOR_TRADES = ['tomrer'];

// ═══════════════════════════════════════════════════════════════════════════
// SÅDAN ÅBNER DU FOR EN NY FAGGRUPPE  (ét fag ad gangen)
// ───────────────────────────────────────────────────────────────────────────
// Frame markedsføres som et TØMRER-system. Når et nyt fag er klar til at komme
// med, åbner du det her — og kun her:
//
//   TRIN 1 — Tilføj fagets `value` (fra BUSINESS_TYPES ovenfor) til
//            ENABLED_SIGNUP_TRADES nedenfor.
//            → Faget kan nu selv-oprette. Fag-vælgeren på opret-siden dukker
//              AUTOMATISK op, så snart der er mere end ét fag på listen
//              (er der kun ét, vises i stedet "kontakt os"-boksen).
//
//   TRIN 2 — (valgfrit) Skal faget have sin EGEN prisberegner + materialer +
//            offentlig /:slug-portal, så tilføj det også til CALCULATOR_TRADES
//            ovenfor. Ellers får de hele appen UNDTAGEN beregneren (de laver
//            "Hurtigt tilbud" manuelt). Al gating følger automatisk med.
//
//   Eksempel — åbn for VVS MED deres egen beregner:
//      const CALCULATOR_TRADES   = ['tomrer', 'vvs'];
//      export const ENABLED_SIGNUP_TRADES = ['tomrer', 'vvs'];
//
//   Luk ned til kun tømrer igen: sæt listen til ['tomrer'].
//   Eksisterende konti påvirkes ALDRIG — de beholder deres business_type.
// ═══════════════════════════════════════════════════════════════════════════
export const ENABLED_SIGNUP_TRADES = ['tomrer'];

// De fag der er åbne for offentlig selv-oprettelse (som BUSINESS_TYPES-objekter).
// Bruges af opret-siden: 1 fag → ingen vælger (+ "kontakt os"); flere → vælger.
export const signupTradeOptions = () =>
    BUSINESS_TYPES.filter(b => ENABLED_SIGNUP_TRADES.includes(b.value));

export function getBusinessLabel(type) {
    return BUSINESS_TYPES.find(b => b.value === type)?.label || 'Håndværker';
}

// Returnerer funktions-flag for en given business_type.
// Manglende/ukendt type → behandles som tømrer (sikker default = uændret).
export function getFeatures(businessType) {
    const hasCalculator = !businessType || CALCULATOR_TRADES.includes(businessType);
    return {
        calculator: hasCalculator,   // prisberegner-fane, Wizard, "Tilbud fra bunden", AI-træning, timepris-onboarding
        materials: hasCalculator,    // materialer-fane (firma + på sagen)
        publicPortal: hasCalculator, // offentlig /:slug-beregnerportal
        // Hurtigt tilbud, sager, hold, chat, tegninger, kalender, bilag,
        // aftalesedler, fakturering = altid tilgængeligt (ikke flag-styret).
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAN-BASEREDE FUNKTIONER (ny prismodel, juli 2026)
// ───────────────────────────────────────────────────────────────────────────
// Solo (1 bruger, 390) har IKKE timeregistrering. Hold (3 inkl., 890) + de
// grandfatherede/exempt konti har det. Planen udledes af firmaets hold
// (raw_data.team) — præcis samme kilde som pris-beregningen og seat-sync bruger.
//   • Tilføjer man sin første medarbejder → heads ≥ 2 → Hold → timer låses op.
//   • Ukendt/manglende hold → 'hold' (fail-open: lås ALDRIG en eksisterende
//     konto ude ved tvivl).
// ═══════════════════════════════════════════════════════════════════════════
export function getPlan(company) {
    if (!company) return 'hold';                                    // tvivl → fuld adgang
    if (company.subscription_status === 'exempt') return 'hold';    // gratis/fuld adgang
    if (company.raw_data?.legacy_pricing?.locked) return 'legacy';  // Tobias m.fl.
    if (company.raw_data?.plan === 'hold') return 'hold';           // eksplicit opgraderet til Hold
    const team = company.raw_data?.team;
    if (!team) return 'hold';                                       // ukendt hold → fail-open
    return computeSeats(team).heads >= 2 ? 'hold' : 'solo';
}

// Er firmaets gratis prøveperiode stadig aktiv? (Prøve = fuld adgang til alt.)
export function isTrialActive(company) {
    if (!company || company.subscription_status !== 'trialing') return false;
    const ends = company.trial_ends_at ? new Date(company.trial_ends_at).getTime() : 0;
    return ends > Date.now();
}

// Funktions-flag der afhænger af abonnements-planen (ikke branchen).
// Under prøven har man fuld adgang — også timeregistrering på Solo — så man kan
// mærke hele systemet. Data gemmes bagved og er der stadig ved en opgradering.
export function getPlanFeatures(company) {
    const plan = getPlan(company);
    return {
        plan,                                                  // 'solo' | 'hold' | 'legacy'
        timeTracking: plan !== 'solo' || isTrialActive(company), // Solo uden timer — medmindre man er på prøve
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULER — "Skræddersyet onboarding" (per-firma synlighed)
// ───────────────────────────────────────────────────────────────────────────
// Filosofi: Alle firmaer får som standard HELE systemet. Efter prøvemåneden
// holder vi et onboarding-møde og slukker KUN for de moduler kunden ikke vil
// bruge — via Bizon Admin (skriver til carpenters.raw_data.modules.disabled).
//
// VIGTIGT — dette er et RENT VISNINGS-LAG:
//   • At slukke et modul skjuler kun fanen/widgets. Data gemmes, registreres og
//     ligger urørt bagved som før. Tænder man modulet igen, er ALT der straks
//     (alle fakturaer, alle kalender-events, alle sager).
//   • Rører ALDRIG hvordan data skrives/gemmes — kun hvad der vises.
//   • Ligger OVEN PÅ plan (solo/hold) + rolle. Et modul kan skjules, men
//     erstatter ikke plan/rolle-gating (fx solo har stadig ikke timeregistrering).
//
// BLOCKLIST, ikke allowlist: vi gemmer de SLUKKEDE moduler. Derfor er alt tændt
// som default (tom liste = alt vist), og NYE moduler vi tilføjer senere er
// AUTOMATISK tændt hos alle eksisterende firmaer — de skal aktivt slukkes,
// aldrig aktivt tændes. Ingen mister en feature lydløst.
// ═══════════════════════════════════════════════════════════════════════════
export const MODULES = [
    { key: 'customers',    label: 'Kunder',                description: 'Kunde-bibliotek med genbrugelige kundekort.' },
    { key: 'quotes',       label: 'Tilbud & Forespørgsler', description: 'Indbakke, tilbud, forespørgsler og tilbudskladder.' },
    { key: 'cases',        label: 'Sager & Ordrestyring',   description: 'Igangværende sager, byggepladser og opgaver.' },
    { key: 'calendar',     label: 'Kalender',               description: 'Planlægning af sager og aftaler.' },
    { key: 'chat',         label: 'Intern Chat',            description: 'Beskeder mellem medarbejdere.' },
    { key: 'timesheet',    label: 'Tid & Løn',              description: 'Timeregistrering og løn-overblik (kræver Hold).' },
    { key: 'finance',      label: 'Økonomi & Faktura',      description: 'Fakturering, økonomi-overblik og betalinger.' },
    { key: 'map',          label: 'Kortvisning',            description: 'Sager og byggepladser på kort.' },
    { key: 'drawings',     label: 'Skitser & Tegninger',    description: 'Tegne- og skitseværktøj.' },
    { key: 'materials',    label: 'Materialer',             description: 'Materialebibliotek (kun fag med beregner).' },
    { key: 'pricing',      label: 'Prisberegning',          description: 'Beregner-opsætning og priser (kun fag med beregner).' },
    { key: 'integrations', label: 'Integrationer',          description: 'e-conomic, Dinero m.fl.' },
    { key: 'team',         label: 'Team & Medarbejdere',    description: 'Håndtér medarbejdere og roller.' },
];

// Faner i dashboardet → deres modul. Faner der IKKE står her (overview,
// superadmin) er altid tilgængelige og kan ikke slukkes.
export const TAB_MODULE_MAP = {
    customers:        'customers',
    leads:            'quotes',
    worker_drafts:    'quotes',
    cases:            'cases',
    calendar:         'calendar',
    chat:             'chat',
    worker_timesheet: 'timesheet',
    admin_timesheet:  'timesheet',
    finance:          'finance',
    map:              'map',
    drawings:         'drawings',
    materials:        'materials',
    settings:         'pricing',
    integrations:     'integrations',
    team:             'team',
};

// Returnerer { moduleKey: boolean } for et firma. Fail-open: intet gemt →
// alt tændt; ukendt/nyt modul → tændt (kun eksplicit slukkede er false).
export function getModules(company) {
    const disabled = Array.isArray(company?.raw_data?.modules?.disabled)
        ? company.raw_data.modules.disabled
        : [];
    const out = {};
    for (const m of MODULES) out[m.key] = !disabled.includes(m.key);
    return out;
}

// Er en dashboard-fane tilgængelig givet et moduler-objekt fra getModules()?
// Faner uden modul (overview/superadmin) er altid true.
export function isTabEnabled(tab, modules) {
    const mod = TAB_MODULE_MAP[tab];
    if (!mod) return true;
    return modules ? modules[mod] !== false : true;
}
