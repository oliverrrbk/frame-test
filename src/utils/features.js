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
        // Hurtigt tilbud, sager, timer, hold, chat, tegninger, kalender, bilag,
        // aftalesedler, fakturering = altid tilgængeligt (ikke flag-styret).
    };
}
