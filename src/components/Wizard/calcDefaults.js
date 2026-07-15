// ─────────────────────────────────────────────────────────────────────────
// SMART DEFAULTS for beregnerens dropdowns (type: 'select').
//
// Formål (smart-defaults-psykologi): i stedet for "-- Vælg en mulighed --" står
// det mest almindelige svar allerede valgt, så kunden kan SKIMME igennem og kun
// rette det der er anderledes — i stedet for at træffe et aktivt valg hver gang.
//
// PRINCIPPER for valgene her:
//   • Kun det ægte mest-almindelige/fair svar.
//   • ALDRIG stiltiende tilføje dyrt, valgfrit arbejde (markise, rækværk,
//     smart-lås, byggetilladelses-ansøgning, terrasse-nedrivning) → de defaulter
//     til "Nej"/"jeg klarer det selv".
//   • Gulv/døre skal næsten altid have det gamle fjernet for at kunne montere nyt
//     → default = "afmontér og bortskaf" (ægte norm).
//
// VÆRDIERNE er de ORIGINALE gemte strenge (med "vi") — IKKE display-teksten.
// Så pris-motoren matcher uændret. Rører ingen låste filer; anvendes i
// Step2Dynamic via updateDetails, kun på felter der er tomme + synlige.
//
// Nøgle: kategori → { spørgsmåls-id: default-værdi }.
// ─────────────────────────────────────────────────────────────────────────
export const CALC_DEFAULTS = {
    roof: {
        floors: '1-plan (Stueplan)',
        grater: 'Nej',
        chimney: 'Nej',
        extensions: 'Nej',
        skylightReplace: 'Nej',
        skylightNew: 'Nej',
        insulationAmount: '200 mm',
        ventilationPlates: 'Ved ikke (Tømreren vurderer)',
        removeOldWalkway: 'Nej',
        newAtticHatch: 'Nej',
    },
    windows: {
        qualityLevel: 'Robust standardkvalitet',
        scope: 'Hele huset (Alle vinduer skal skiftes)',
        floors: '1 etage (Kun stueplan)',
    },
    floor: {
        disposal: 'Ja, vi skal afmontere og bortskaffe det',
        underfloorHeating: 'Nej',
        floorPattern: 'Nej, helt standard montering',
        specificFloorWishes: 'Nej, vi kommer med en faglig vurdering',
        floorObstacles: 'Nej, rummet er regulært',
        floorDoorsNear: 'Nej',
    },
    doors: {
        disposal: 'Ja, vi skal afmontere og bortskaffe dem',
        electricLock: 'Nej, standard lås/greb er fint',
    },
    terrace: {
        disposal: 'Nej',
        railing: 'Nej, ikke relevant / klarer det selv',
        terraceComplexity: 'Nej, primært standard firkantet (eller ikke relevant)',
        awning: 'Nej',
    },
    ceilings: {
        spots: 'Nej',
    },
    facades: {
        insulation: 'Nej tak (Behold nuværende isolering)',
        floors: '1-plan (Stueplan)',
    },
    annex: {
        annexType: 'Uisoleret skur til opbevaring',
        buildingPermit: 'Vi søger selv / har allerede fået tilladelse',
        disposal: 'Nej, der er frit',
    },
    fence: {
        fenceHeight: 'Under 1,8 meter',
        disposal: 'Nej, der er frit',
    },
};
