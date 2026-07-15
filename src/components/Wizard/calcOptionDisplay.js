// ─────────────────────────────────────────────────────────────────────────
// VISNINGS-LAG for beregnerens svar-tekster.
//
// Formål: det tvetydige "vi" i svarmulighederne ("vi skal afmontere…" — hvem er
// vi?) vises nu klart som ENTEN "tømreren" (fagmandens handling) ELLER "jeg"
// (kundens egen handling).
//
// VIGTIGT — dette ændrer KUN den viste tekst. Den GEMTE værdi (details[...]) er
// 100% uændret, så den låste pris-motor (calculator.js) og alle `condition:`-
// regler matcher præcis som før. questionsConfig.js/Wizard.jsx/calculator.js
// røres IKKE. Ren kosmetik i display-laget.
//
// Rækkefølgen er vigtig: kunde-"vi"-fraser og den specifikke byggetilladelses-
// sætning håndteres FØR den generelle "vi skal" → "tømreren skal".
// ─────────────────────────────────────────────────────────────────────────
const REPLACEMENTS = [
    // Kundens egne handlinger: "vi/Vi" = kunden → "jeg/Jeg"
    ['(vi kører det selv væk)', '(jeg kører det selv væk)'],
    ['(vi kører dem selv væk)', '(jeg kører dem selv væk)'],
    ['vi har selv afmonteret', 'jeg har selv afmonteret'],
    ['/ klarer det selv', '/ jeg klarer det selv'],
    // Byggetilladelse (specifik sætning FØR de generelle regler)
    ['Vi skal søge byggetilladelsen for jer (vi klarer hele ansøgningen)', 'Tømreren søger byggetilladelsen for jer (tømreren klarer hele ansøgningen)'],
    ['Vi søger selv', 'Jeg søger selv'],
    // Fagmandens handlinger: "vi" = tømreren
    ['vi kommer med en faglig vurdering', 'tømreren kommer med en faglig vurdering'],
    ['vi skal', 'tømreren skal'],
    ['Vi skal', 'Tømreren skal'],
];

export function displayCalcOption(text) {
    if (typeof text !== 'string') return text;
    let s = text;
    for (const [from, to] of REPLACEMENTS) {
        if (s.includes(from)) s = s.split(from).join(to);
    }
    return s;
}
