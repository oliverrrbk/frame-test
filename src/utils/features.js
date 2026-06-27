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

// ---------------------------------------------------------------------------
// FAG-VÆLGER VED SELV-OPRETTELSE.
// false = Frame markedsføres som rent TØMRER-system: fag-dropdownen skjules,
//         nye selv-oprettelser sættes automatisk til 'tomrer', og ikke-tømrere
//         henvises til "kontakt os". Multi-fag-motoren nedenfor er uændret —
//         det er KUN den offentlige selv-oprettelse der er låst.
// true  = "dial tilbage": fag-dropdownen vises igen, og alle fag kan selv-oprette.
// ---------------------------------------------------------------------------
export const TRADE_PICKER_ENABLED = false;

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
