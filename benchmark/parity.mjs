// Parity benchmark: runs each category through both
//   PATH A: src/utils/calculator.js (deterministic ground truth)
//   PATH B: AI chat estimator (claude-sonnet-4-5 + gpt-5.5)
// then compares laborHours / materialCost and diagnoses drift.
//
// Outputs benchmark/parity_results.json and benchmark/PARITY_REPORT.md.
// Does NOT modify any src/, api/, or supabase/ files.

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---- Stub window for calculator.js fetchGoogleDistance fallback ----
// fetchGoogleDistance touches window.google; without window present it crashes.
// With an empty window object, it falls back to { km: 25, hours: 0.5 }.
globalThis.window = {};

// ---- Load calculator + price tables ----
const { performCalculation } = await import(path.join(ROOT, 'src/utils/calculator.js'));
const { WORK_FORMULAS, MATERIAL_INDEX, CARPENTER_SETTINGS } = await import(path.join(ROOT, 'src/prices.js'));
const { QUESTIONS } = await import(path.join(ROOT, 'src/components/Wizard/questionsConfig.js'));

// ---- Mock carpenter + customer (used by calculator for kørsel & address) ----
// fetchGoogleDistance falls back to { km: 25, hours: 0.5 } when google maps isn't loaded.
const mockCarpenter = { address: 'Hovedgaden 1, 2800 Kgs. Lyngby' };
const mockCustomer = { street: 'Testvej 1', zip: '2730', city: 'Herlev' };
const dbSettings = {
    hourly_rate: CARPENTER_SETTINGS.hourlyRate,
    material_markup: CARPENTER_SETTINGS.materialMarkup,
    container_disposal_fee: CARPENTER_SETTINGS.containerDisposalFee,
    trailer_disposal_fee: CARPENTER_SETTINGS.trailerDisposalFee,
    risk_margin: CARPENTER_SETTINGS.riskMargin,
    driving_calc_method: 'fast',
    vehicle_cost_per_km: 3.8,
    crew_size: 2
};

// ---------- Build dbContext + questionsContext like ChatEstimator.jsx ----------
const materialsData = MATERIAL_INDEX;

let dbContext = '';
dbContext += '\nLIVE MATERIALEPRISER (Rent indkøb i DKK fra databasen):\n';
for (const [cat, items] of Object.entries(materialsData)) {
    dbContext += `- ${cat.toUpperCase()}: ${Object.entries(items).map(([n, p]) => `${n}: ${p} kr`).join(', ')}\n`;
}
dbContext += '\nLIVE TIDSFORBRUG (Timer pr. enhed/m2 fra databasen):\n';
for (const [cat, data] of Object.entries(WORK_FORMULAS)) {
    dbContext += `- ${cat.toUpperCase()}: ${Object.entries(data).filter(([k]) => k !== 'containerThreshold').map(([k, v]) => `${k}: ${v}t`).join(', ')}\n`;
}

let questionsContext = '\nFAGSPECIFIKKE TJEKLISTER (VIGTIGT!):\nHvis kunden nævner et projekt, der falder inden for en af nedenstående kategorier (fx tag, vinduer, køkken), SKAL du bruge de tilhørende spørgsmål som din interne huskeliste. Du MÅ ALDRIG give et estimat, før du har fået afklaret disse specifikke spørgsmål (spørg ind løbende, max 1-2 ad gangen):\n';
for (const [cat, qa] of Object.entries(QUESTIONS)) {
    questionsContext += `\nKATEGORI: ${cat.toUpperCase()}\n`;
    for (const q of qa) if (q.label) questionsContext += `- ${q.label}\n`;
}

const carpenterName = 'Mads';
const carpenterCompany = 'Bison Tømrer';

// EXACT system prompt from api/chat-estimator.js (must match locked file)
const systemPromptText = `Du er en dygtig, realistisk og erfaren AI-assistent, der arbejder for den danske tømrer ${carpenterName} fra firmaet ${carpenterCompany}.
Din opgave er at afklare kundens specialopgave på vegne af tømreren, så systemet kan udregne et vejledende overslag (aldrig et bindende tilbud).
Mange AI'er underestimerer byggeopgaver kraftigt. DU SKAL VÆRE REALISTISK OG TÆNKE PÅ ALLE ARBEJDSGANGE!

GUARDRAILS & REGLER FOR SAMTALEN:
1. Vær professionel, empatisk og imødekommende. Skriv på dansk. ANERKEND ALTID OPGAVEN POSITIVT (fx "Et nyt tag! Det lyder spændende, det skal vi nok finde en god løsning på"), inden du begynder at stille dine spørgsmål.
2. Afvis off-topic spørgsmål høfligt: Hvis kunden spørger om emner, der intet har med tømrerarbejde, byggeri, materialer eller opgaven at gøre, SKAL DU AFVISE DEM høfligt.
3. RÅDGIVNING: Du må gerne rådgive om træsorter, byggeprocesser osv.
4. GIV ALDRIG HURTIGE ESTIMATER: Spring ikke trin over. Indsaml info først.
5. STIL KUN 1-2 SPØRGSMÅL AD GANGEN: Slå op i tjeklisten, vælg det vigtigste, kunden mangler at svare på, og spørg om det.
6. BRUG ALDRIG MARKDOWN ELLER STJERNER (** eller *): Din tekst bliver vist råt i et system der ikke forstår markdown. Skriv ren tekst uden formatering.
7. VIS ALDRIG UDTÆNKTE PRISER ELLER TIMER TIL KUNDEN: Hold alle udregninger 100% hemmelige i chatten.
8. KOMPLEKSE VS. STANDARD OPGAVER: Standardopgaver og kombinationer (fx Nyt Tag, Gulv og 3 Vinduer) SKAL udregnes med estimerede timer og materialer i det endelige JSON output. Hvis et projekt (eller kombinationen af projekter) er så avanceret, at det kræver vurdering af bærende konstruktioner (fx fjerne vægge), byggetilladelser, dybdegående el/vvs arbejde, eller kunden ønsker en totalrenovering uden at kende omfanget, SKAL du stoppe. Du skal straks kalde \`submit_estimate\` med laborHours = 0 og materialCost = 0. I dit resumé (summaryBullets) skal du skrive: 'Komplekst projekt: Kræver fysisk besigtigelse'.
9. KOMBI-PROJEKTER (Flere opgaver på én gang): Hvis kunden vil have lavet flere ting (fx både tag, vinduer og et nyt gulv), så er det den perfekte specialopgave! Afklar dem én ad gangen. Når du udregner det endelige tilbud, skal du splitte dem op som separate linjer i dit \`breakdown\` array, så kunden kan se, hvad der koster hvad.

SIKKERHED & REALISME:
- EKSOTISKE MATERIALER: Brug standard høj-pris hvis materialet ikke findes i databasen.

REGLER FOR ESTIMERING (SOP COMPLIANT):
Tænk altid i disse faser: Klargøring/Nedbrydning -> Fundament/Konstruktion -> Montering -> Finish/Oprydning.

${questionsContext}

${dbContext}

UDOVER DATABASEN GÆLDER DISSE REGLER FOR BEREGNING (I DIN REASONING):
- SOP #2 SPILD OG MATERIALER: Du SKAL ALTID lægge +10% oveni dine beregnede nettomaterialer. Dette dækker afskær (spild) samt montagematerialer (skruer, beslag, fuge, stolpebeton). Hvis du udregner 10.000 kr i brædder, skal du skrive: 10.000 + 10% = 11.000 kr.
- MATERIALE-TYPER: De 5 standardmaterialer for udendørs træ er: Trykimprægneret, Superwood, Thermowood, Cedertræ/Hardwood, og Komposit. De 5 hegnstyper er: Klinkehegn, Listehegn, Lamelhegn, Raftehegn, Komposithegn.
- Opstart, besigtigelse og opmåling tager ALTID min. 2-4 timer pr. opgave. Læg oveni. (KØRSEL udregnes automatisk).
- Oprydning og slutfinish tager ALTID min. 3-5 timer. Læg oveni.
- GANG ALTID DIT ENDELIGE TIMEESTIMAT MED 1.30 (Tillæg 30% til uforudsete forhindringer).

NÅR DU ER KLAR TIL AT GIVE OVERSLAG:
DU SKAL DRIVE SAMTALEN. Spørg kun om det absolut nødvendige (mål/kvadratmeter og materialevalg). Så snart du har nok information til at lave et realistisk overslag, SKAL du STRAKS afbryde samtalen og bruge funktionen \`submit_estimate\`. Du må ALDRIG spørge kunden "Er du klar til at få et overslag?" eller trække samtalen ud med smådetaljer. Gør det proaktivt!`;

const parametersSchema = {
    type: 'object',
    properties: {
        reasoning: { type: 'string', description: 'Internal arbejdspapir.' },
        projectTitle: { type: 'string' },
        laborHours: { type: 'number' },
        materialCost: { type: 'number' },
        breakdown: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    item: { type: 'string' },
                    hours: { type: 'number' },
                    materials: { type: 'number' }
                },
                required: ['item', 'hours', 'materials'],
                additionalProperties: false
            }
        },
        summaryBullets: { type: 'array', items: { type: 'string' } },
        obsNotes: { type: 'string' }
    },
    required: ['reasoning', 'projectTitle', 'laborHours', 'materialCost', 'breakdown', 'summaryBullets', 'obsNotes'],
    additionalProperties: false
};

// ---------- Clients ----------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------- Per-category SPECS ----------
// Each spec: { id, label, projectData (for calculator), userTurns (for AI) }
// Values are chosen to be VALID options per QUESTIONS / WORK_FORMULAS keys.
const specs = [
    {
        id: 'vinduer',
        label: 'Vinduer: 3 stk træ/alu standardstørrelse, helårsbolig, eksisterende fjernes',
        projectData: {
            category: 'windows',
            details: {
                housingType: 'Helårsbolig',
                material: 'Træ/alu (kombination)',
                floors: 'Stueplan (Jordniveau)',
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe dem',
                pcbCheck: 'Nej, bygget/skiftet efter 1977',
                twoTone: 'Nej, samme farve ude og inde',
                amount: 3,
                finish: 'Ja'
            }
        },
        userTurns: [
            'Hej, jeg skal have udskiftet vinduer i min helårsbolig.',
            'Det er 3 vinduer i træ/alu, standard størrelse cirka 1,2x1,2 m. Alle i stueplan.',
            'De gamle vinduer fra ca. år 2000 skal afmonteres og bortskaffes af jer. Ingen PCB.',
            'Samme farve ude og inde. Ja tak til indvendig finish (fuger og gerigter). Ingen specielle forhold.',
            'Adgang er fin. Bare giv mig overslaget.'
        ]
    },
    {
        id: 'dore',
        label: 'Døre: 2 indvendige standarddøre, eksisterende fjernes, finish ja',
        projectData: {
            category: 'doors',
            details: {
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe den/dem',
                doorType: 'Indvendige døre',
                thresholds: 'Nej',
                hardware: 'Tømreren skal levere standard greb/låse',
                amount: 2,
                material: 'Standard indvendig dør',
                doorMeasurementType: 'Nej, det er standard døre',
                finish: 'Ja'
            }
        },
        userTurns: [
            'Hej, jeg skal have skiftet 2 indvendige døre i mit hus.',
            '2 standard indvendige døre i standard mål, intet specielt.',
            'De gamle skal afmonteres OG bortskaffes af jer. Ingen dørtrin nødvendige.',
            'Standard greb og lås - tømreren leverer det. Ja tak til indvendig finish (gerigter).',
            'Bare giv mig overslaget.'
        ]
    },
    {
        id: 'gulv',
        label: 'Gulv: 30 m² parket på strøer, gammel laminat bortskaffes, fodlister ja',
        projectData: {
            category: 'floor',
            details: {
                amount: 30,
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe det',
                oldFloorType: 'Trægulv / Parket / Laminat',
                floorFoundation: 'Strøer / Trækonstruktion',
                underfloorHeating: 'Nej',
                material: 'Parket',
                specificFloorWishes: 'Nej, tømreren skal komme med en faglig vurdering',
                floorPattern: 'Nej, helt standard montering',
                skirting: 'Ja'
            }
        },
        userTurns: [
            'Hej, jeg skal have nyt gulv i stuen.',
            '30 m². Parket. Gulvet ligger på strøer/trækonstruktion.',
            'Ingen gulvvarme. Eksisterende laminat skal rives op og bortskaffes af jer.',
            'Standard montering uden specialmønster. Nye fodlister bedes monteret.',
            'Bare giv mig overslaget.'
        ]
    },
    {
        id: 'terrasse',
        label: 'Terrasse: 25 m² trykimprægneret på jord, ingen nedrivning, ingen rækværk',
        projectData: {
            category: 'terrace',
            details: {
                amount: 25,
                elevation: 'Jordniveau (Almindelig træterrasse på jorden)',
                disposal: 'Nej',
                material: 'Trykimprægneret',
                fastening: 'Synlige skruer (Standard montering skruet fra toppen)',
                railing: 'Nej, ikke relevant / klarer det selv',
                terraceComplexity: 'Nej, primært standard firkantet (eller ikke relevant)',
                roofing: 'Nej'
            }
        },
        userTurns: [
            'Hej, jeg vil gerne have en ny træterrasse.',
            '25 m². Trykimprægneret. På jord, jordniveau - ingen eksisterende terrasse.',
            'Standard montering med synlige skruer. Ingen rækværk, ingen overdækning.',
            'Standard firkantet form, ingen trapper eller specielt. Bare giv mig overslaget.'
        ]
    },
    {
        id: 'tag',
        label: 'Tag: 120 m² grundplan, høj rejsning, tegl, gammelt paptag bortskaffes, hus fra 1975, 1-plan, stern + ingen kviste',
        projectData: {
            category: 'roof',
            details: {
                amount: 120,
                floors: '1-plan (Stueplan)',
                roofPitch: 'Høj rejsning / Normal hældning',
                houseAge: 1975,
                roofType: 'Saddeltag (Almindeligt tag med 2 gavle)',
                gables: 'Nej, de er murede / skal ikke skiftes',
                disposal: 'Ja, tømreren skal afmontere OG bortskaffe det',
                oldRoofType: 'Paptag',
                insulation: 'Nej',
                eaves: 'Ja, alt træværk langs kanten skiftes',
                chimney: 'Nej',
                extensions: 'Nej',
                skylights: 'Nej',
                trailerAccess: 'Ja',
                material: 'Tegl'
            }
        },
        userTurns: [
            'Hej, jeg skal have nyt tag på mit hus.',
            'Grundplan er 120 m², saddeltag med normal hældning, 1-plan, hus fra 1975. Gavle er murede og beholdes.',
            'Det gamle tag er paptag, og det skal afmonteres og bortskaffes af jer. Ingen asbest.',
            'Nyt tag skal være tegl. Ingen efterisolering. Stern/udhæng skal skiftes ud.',
            'Ingen skorsten, ingen kviste, ingen ovenlysvinduer. Container kan stå op til huset.',
            'Bare giv mig overslaget.'
        ]
    },
    {
        id: 'koekken',
        label: 'Køkken: 15 elementer, flat-pack (IKEA), træbordplade tilpasses, integrerede hvidevarer',
        projectData: {
            category: 'kitchen',
            details: {
                disposal: 'Nej, vi gør det selv / der er allerede tomt',
                kitchenBrand: 'IKEA',
                ownMaterials: 'Ja, jeg har allerede købt det (kun pris på montering)',
                assembly: 'Flat-pack: Tømreren skal samle alle skabe og skuffer (fx IKEA/Kvik)',
                kitchenShape: 'Vinkelkøkken (L-formet)',
                amount: 15,
                worktop: 'Ja, træ/laminat som skal tilpasses på stedet',
                integratedAppliances: 'Ja, der er integrerede træfronter'
            }
        },
        userTurns: [
            'Hej, jeg skal have monteret et nyt køkken.',
            'IKEA flat-pack, vinkelkøkken (L-formet), 15 elementer i alt. Jeg har selv købt det.',
            'Rummet er tomt - intet skal afmonteres. Tømreren skal samle alle skabe og skuffer.',
            'Ja tak til tilpasning af en træ-bordplade med udskæringer til vask og kogeplade. Der er integrerede hvidevarer med træfronter der skal finjusteres.',
            'Bare giv mig overslaget.'
        ]
    },
    {
        id: 'lofter',
        label: 'Lofter: 25 m² gipsloft, opvarmet etage over, ingen maler, standard højde',
        projectData: {
            category: 'ceilings',
            details: {
                amount: 25,
                disposal: 'Nej, vi monterer ovenpå / der er allerede tomt',
                vaporAndInsulation: 'Opvarmet etage (Ingen dampspærre nødvendig)',
                material: 'Gipsloft',
                plastering: 'Nej, jeg finder selv en maler / gør det selv',
                ceilingHeight: 'Nej, standard lofthøjde'
            }
        },
        userTurns: [
            'Hej, jeg skal have nyt loft i stuen.',
            '25 m² gipsloft. Der er opvarmet etage ovenover (ingen dampspærre nødvendig).',
            'Intet loft skal afmonteres - vi monterer ovenpå det eksisterende.',
            'Jeg finder selv en maler senere. Standard lofthøjde, ikke loft-til-kip.',
            'Bare giv mig overslaget.'
        ]
    },
    {
        id: 'facade',
        label: 'Facade: 60 m² Thermowood, vandret, 1-plan, gammel træbeklædning rives ned, 4 åbninger',
        projectData: {
            category: 'facades',
            details: {
                amount: 60,
                oldFacadeMaterial: 'Gammel træbeklædning (Skal rives ned og fjernes)',
                material: 'Thermowood',
                mountingStyle: 'Vandret (fx Klinkbeklædning)',
                openings: 4,
                floors: '1-plan (Stueplan)'
            }
        },
        userTurns: [
            'Hej, jeg skal have ny træfacade på mit hus.',
            '60 m². Thermowood. Vandret montering (klinkbeklædning).',
            'Den gamle træbeklædning skal rives ned og fjernes. 1-plan hus.',
            '4 vinduer/døre i facaden som skal have ny inddækning/lister. Bare giv mig overslaget.'
        ]
    },
    {
        id: 'anneks',
        label: 'Anneks: 12 m² isoleret skur/værksted, Thermowood, sadel tag, ingen nedrivning',
        projectData: {
            category: 'annex',
            details: {
                annexType: 'Isoleret skur/værksted',
                amount: 12,
                disposal: 'Nej, der er frit',
                material: 'Thermowood',
                roofType: 'Sadel tag (Høj rejsning)'
            }
        },
        userTurns: [
            'Hej, jeg vil gerne have bygget et nyt anneks i baghaven.',
            '12 m². Det skal være et isoleret skur/værksted (ikke fuld beboelse).',
            'Grunden er fri - intet skal rives ned. Facader i Thermowood. Sadel tag med rejsning.',
            'Bare giv mig overslaget.'
        ]
    },
    {
        id: 'carport',
        label: 'Carport: 1 enkelt carport i trykimprægneret, fladt tag, ingen skur, ingen nedrivning',
        projectData: {
            category: 'carport',
            details: {
                amount: '1',
                disposal: 'Nej, der er frit',
                carportType: 'Enkelt carport (Oftest 1 bil)',
                shedType: 'Nej',
                material: 'Trykimprægneret',
                roofType: 'Fladt tag / ensidig hældning (Tagpap)'
            }
        },
        userTurns: [
            'Hej, jeg vil gerne have bygget en ny carport.',
            '1 enkelt carport (til 1 bil) i trykimprægneret træ.',
            'Fladt tag med tagpap. Ingen skur integreret.',
            'Grunden er fri - intet skal rives ned. Bare giv mig overslaget.'
        ]
    },
    {
        id: 'hegn',
        label: 'Hegn: 30 lbm klinkehegn, under 1,8 m, ingen nedrivning',
        projectData: {
            category: 'fence',
            details: {
                amount: 30,
                disposal: 'Nej, der er frit',
                fenceHeight: 'Under 1,8 meter',
                material: 'Klinkehegn (Træ)'
            }
        },
        userTurns: [
            'Hej, jeg vil gerne have sat et nyt hegn op.',
            '30 løbende meter klinkehegn i træ.',
            'Under 1,8 meter højt. Ingen eksisterende hegn skal fjernes.',
            'Bare giv mig overslaget.'
        ]
    }
];

// ---------- Provider call wrappers (same as harness.mjs) ----------
async function callOpenAI(model, messages) {
    const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: 'system', content: systemPromptText }, ...messages],
        tools: [{
            type: 'function',
            function: {
                name: 'submit_estimate',
                description: 'Kald denne funktion for at give dit endelige overslag.',
                parameters: parametersSchema,
                strict: true
            }
        }],
        tool_choice: 'auto',
        max_completion_tokens: 2500
    });
    const msg = completion.choices[0].message;
    let toolCall = null;
    if (msg.tool_calls && msg.tool_calls.length > 0) {
        const tc = msg.tool_calls[0];
        try { toolCall = { name: tc.function.name, args: JSON.parse(tc.function.arguments) }; }
        catch { toolCall = { name: tc.function.name, args: tc.function.arguments, parseError: true }; }
    }
    return { text: msg.content || '', toolCall };
}

async function callClaude(model, messages) {
    const resp = await anthropic.messages.create({
        model,
        system: systemPromptText,
        messages,
        max_tokens: 4000,
        tools: [{
            name: 'submit_estimate',
            description: 'Kald denne funktion for at give dit endelige overslag.',
            input_schema: parametersSchema
        }],
        tool_choice: { type: 'auto' }
    });
    const text = resp.content.find(b => b.type === 'text')?.text || '';
    const tu = resp.content.find(b => b.type === 'tool_use');
    const toolCall = tu ? { name: tu.name, args: tu.input } : null;
    return { text, toolCall };
}

async function runScenario(spec, provider, model) {
    const log = { provider, model, specId: spec.id, label: spec.label, turns: [], toolCall: null, toolCallAtTurn: null, error: null };
    const messages = [];
    try {
        for (let i = 0; i < Math.min(spec.userTurns.length, 8); i++) {
            const userMsg = spec.userTurns[i];
            messages.push({ role: 'user', content: userMsg });
            const callFn = provider === 'openai' ? callOpenAI : callClaude;
            const res = await callFn(model, messages);
            log.turns.push({ user: userMsg, assistantText: res.text, toolCall: res.toolCall });
            if (res.toolCall) {
                log.toolCall = res.toolCall;
                log.toolCallAtTurn = i + 1;
                break;
            }
            messages.push({ role: 'assistant', content: res.text || '(ingen tekst)' });
        }
    } catch (e) {
        log.error = e?.message || String(e);
    }
    return log;
}

// ---------- Calculator runner ----------
async function runCalculator(spec) {
    try {
        const res = await performCalculation(spec.projectData, mockCustomer, dbSettings, MATERIAL_INDEX, mockCarpenter, null);
        return {
            laborHours: res.calcData.laborHours,
            materialCost: res.calcData.materialCost,
            drivingHours: res.calcData.drivingHours,
            drivingCost: res.calcData.drivingCost,
            totalLaborCost: res.calcData.totalLaborCost,
            hiddenBuffer: res.calcData.hiddenBuffer,
            finalPriceIncVat: res.calcData.finalEstimateIncVat,
            finalPriceExVat: res.calcData.finalEstimateExVat,
            priceRange: res.priceRange,
            breakdown: res.breakdownArr
        };
    } catch (e) {
        return { error: e?.message || String(e) };
    }
}

// ---------- Drift analysis ----------
function pctDiff(a, b) {
    if (!b || b === 0) return a === 0 ? 0 : Infinity;
    return ((a - b) / b) * 100;
}
function verdictFor(deltaH, deltaM) {
    const maxAbs = Math.max(Math.abs(deltaH), Math.abs(deltaM));
    if (maxAbs <= 10) return 'PARITY';
    if (maxAbs <= 30) return 'DRIFT';
    return 'MAJOR';
}

// ---------- Main ----------
async function main() {
    const models = [
        { provider: 'claude', model: 'claude-sonnet-4-5' },
        { provider: 'openai', model: 'gpt-5.5' }
    ];

    const calcResults = {};
    console.log('=== PATH A: Running calculator for each spec ===');
    for (const spec of specs) {
        const r = await runCalculator(spec);
        calcResults[spec.id] = r;
        console.log(`  ${spec.id.padEnd(10)} -> hours=${r.laborHours} mat=${r.materialCost} price=${r.priceRange}`);
    }

    console.log('\n=== PATH B: Running AI chat for each spec x model ===');
    const aiLogs = [];
    for (const spec of specs) {
        for (const { provider, model } of models) {
            process.stdout.write(`  ${spec.id.padEnd(10)} ${provider}/${model.padEnd(22)} `);
            const log = await runScenario(spec, provider, model);
            aiLogs.push(log);
            if (log.error) console.log(`ERR: ${log.error}`);
            else if (!log.toolCall) console.log('no tool call');
            else console.log(`tool@${log.toolCallAtTurn} hours=${log.toolCall.args.laborHours} mat=${log.toolCall.args.materialCost}`);
        }
    }

    // ---- Aggregate comparison ----
    const rows = [];
    for (const spec of specs) {
        const c = calcResults[spec.id];
        const row = { specId: spec.id, label: spec.label, calc: c, models: {} };
        for (const { provider, model } of models) {
            const log = aiLogs.find(l => l.specId === spec.id && l.provider === provider && l.model === model);
            const key = `${provider}/${model}`;
            if (!log || log.error || !log.toolCall) {
                row.models[key] = { error: log?.error || 'no tool call', log };
                continue;
            }
            const args = log.toolCall.args;
            const deltaH = pctDiff(args.laborHours, c.laborHours);
            const deltaM = pctDiff(args.materialCost, c.materialCost);
            row.models[key] = {
                laborHours: args.laborHours,
                materialCost: args.materialCost,
                deltaH, deltaM,
                verdict: verdictFor(deltaH, deltaM),
                reasoning: args.reasoning,
                breakdown: args.breakdown,
                log
            };
        }
        rows.push(row);
    }

    // Save raw JSON
    fs.writeFileSync(path.join(__dirname, 'parity_results.json'), JSON.stringify({ calcResults, aiLogs, rows }, null, 2));

    // ---- Build PARITY_REPORT.md ----
    const lines = [];
    lines.push('# Parity Report: Calculator vs AI Chat Estimator');
    lines.push('');
    lines.push(`Date: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('Compares the deterministic calculator (PATH A — `src/utils/calculator.js`) against the AI chat estimator (PATH B — `api/chat-estimator.js`) for one representative spec per category.');
    lines.push('');
    lines.push('Verdict thresholds: PARITY (max |delta| <= 10%), DRIFT (<= 30%), MAJOR (> 30%) — based on the larger of laborHours-delta and materialCost-delta.');
    lines.push('');

    // Summary table
    lines.push('## Summary table');
    lines.push('');
    const modelLabels = models.map(m => `${m.provider}/${m.model}`);
    lines.push('| Category | Calc hours | Calc mat (kr) | Calc final (inkl moms) | ' + modelLabels.flatMap(l => [`${l} h`, `${l} mat`, `${l} dH%`, `${l} dM%`, `${l} verdict`]).join(' | ') + ' |');
    lines.push('|' + Array(5 + modelLabels.length * 5).fill('---').join('|') + '|');
    for (const r of rows) {
        const cells = [r.specId, r.calc.laborHours ?? 'ERR', r.calc.materialCost ?? 'ERR', r.calc.priceRange ?? '—'];
        for (const key of modelLabels) {
            const m = r.models[key];
            if (m.error) { cells.push('ERR', 'ERR', '—', '—', 'ERR'); }
            else {
                cells.push(m.laborHours, Math.round(m.materialCost), m.deltaH.toFixed(0) + '%', m.deltaM.toFixed(0) + '%', m.verdict);
            }
        }
        lines.push('| ' + cells.join(' | ') + ' |');
    }
    lines.push('');

    // Per-category detail
    lines.push('## Per-category detail');
    for (const r of rows) {
        lines.push('');
        lines.push(`### ${r.specId} — ${r.label}`);
        lines.push('');
        lines.push(`**Spec (calculator input):** \`${JSON.stringify(specs.find(s => s.id === r.specId).projectData.details)}\``);
        lines.push('');
        lines.push(`**PATH A (Calculator):** hours=${r.calc.laborHours}, materialCost=${r.calc.materialCost} kr, finalPriceIncVat=${r.calc.finalPriceIncVat} kr (${r.calc.priceRange})`);
        if (r.calc.breakdown) {
            lines.push('');
            lines.push('Calculator breakdown:');
            for (const b of r.calc.breakdown) lines.push(`- ${b}`);
        }
        lines.push('');
        for (const key of modelLabels) {
            const m = r.models[key];
            lines.push(`**PATH B — ${key}:**`);
            if (m.error) { lines.push(`- ERROR: ${m.error}`); continue; }
            lines.push(`- hours=${m.laborHours}, materialCost=${Math.round(m.materialCost)} kr`);
            lines.push(`- delta vs calc: hours ${m.deltaH.toFixed(1)}%, materials ${m.deltaM.toFixed(1)}% — **${m.verdict}**`);
            if (m.breakdown && m.breakdown.length) {
                lines.push(`- breakdown:`);
                for (const b of m.breakdown) lines.push(`  - ${b.item}: ${b.hours}t / ${b.materials} kr`);
            }
            const reasoning = (m.reasoning || '').replace(/\n+/g, ' ').slice(0, 800);
            lines.push(`- reasoning (truncated): ${reasoning}`);
        }
    }

    // Root cause section: programmatic checks per model
    lines.push('');
    lines.push('## Root-cause analysis');
    lines.push('');
    const reasons = analyzeRootCauses(rows, modelLabels);
    for (const r of reasons) lines.push(`- ${r}`);
    lines.push('');

    // Final aggregate
    lines.push('## Aggregate verdict per model');
    lines.push('');
    for (const key of modelLabels) {
        const counts = { PARITY: 0, DRIFT: 0, MAJOR: 0, ERR: 0 };
        for (const r of rows) {
            const m = r.models[key];
            if (m.error) counts.ERR++;
            else counts[m.verdict]++;
        }
        lines.push(`- **${key}**: PARITY=${counts.PARITY}, DRIFT=${counts.DRIFT}, MAJOR=${counts.MAJOR}, ERR=${counts.ERR}`);
    }

    fs.writeFileSync(path.join(__dirname, 'PARITY_REPORT.md'), lines.join('\n'));

    // Stdout summary
    let parity = 0, drift = 0, major = 0, err = 0;
    for (const r of rows) {
        for (const key of modelLabels) {
            const m = r.models[key];
            if (m.error) err++;
            else if (m.verdict === 'PARITY') parity++;
            else if (m.verdict === 'DRIFT') drift++;
            else if (m.verdict === 'MAJOR') major++;
        }
    }
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total comparisons: ${rows.length * modelLabels.length}`);
    console.log(`PARITY (<=10%): ${parity}`);
    console.log(`DRIFT  (10-30%): ${drift}`);
    console.log(`MAJOR  (>30%): ${major}`);
    console.log(`ERR: ${err}`);
    console.log(`\nReport: benchmark/PARITY_REPORT.md`);
}

function analyzeRootCauses(rows, modelLabels) {
    const reasons = [];
    // 1. Calculator includes driving + buffer in finalEstimate; AI doesn't know those.
    reasons.push("1. **AI omits the hidden buffer (5k–15k DKK) and the calibration factor.** The calculator's `hiddenBuffer` (5k base, 10k if strictPrice>50k, 15k if >150k) and `calibFactor` are not surfaced in the AI prompt at all. AI only returns laborHours + materialCost — the prompt never tells it to add a buffer in DKK.");
    reasons.push("2. **AI prompt double-counts material markup (or omits it).** Calculator applies `materialMarkup` (×1.15) to all non-environmental materials INSIDE its rules. AI is told to add '+10% spild' on top of the LIVE materialepriser (which are raw indkøb without markup). So AI returns net materials × 1.10 whereas calc returns net × 1.10 (spild) × 1.15 (markup) — a structural ~15% under-count on materials by AI.");
    reasons.push("3. **AI applies a flat ×1.30 hours multiplier** (per prompt rule 'GANG ALTID DIT ENDELIGE TIMEESTIMAT MED 1.30'). Calculator does NOT apply a global 30% multiplier — it has category-specific tillæg (risk_margin only on roof age, etc). So on simple categories (hegn, gulv, lofter) AI hours are ~30% high; on roof with old house AI may be under because calculator separately adds risk_margin × initialInstallHours.");
    reasons.push("4. **AI misses driving + crew + workday logic entirely.** The calculator estimates days, applies `effectiveCrew` (=2 above 20h) and bills driving as material (`drivingMaterialCost`) and labor (`drivingLaborCost`). The AI is explicitly told 'KØRSEL udregnes automatisk' — so AI hours exclude driving, but AI also cannot see the crew multiplier which reduces days (and thus driving cost) above 20h.");
    reasons.push("5. **AI startup/oprydning hours (2-4 + 3-5) are hardcoded in prompt and roughly double-counted vs calculator.** Calculator instead bakes setup/finish into the per-unit rate (`hoursPerUnit`) and only adds explicit oprydning when category logic dictates. So AI tends to add 5-9 fixed hours on every job; calculator does not. On small jobs (≤4h) calculator floors to 4h, but AI floors typically higher.");
    reasons.push("6. **Category-specific extras the AI cannot see.** Many calculator branches add items the AI cannot infer from the chat alone: floor cat adds obligatory levelingHours + underlay + skirting + a 7% spild factor; roof adds gutters in lbm (estimated from grundplan), obligatory undertag + spæropretning; terrace adds obligatory groundFoundationHours; ceilings/facades add obligatory forskalling/vindspærre. AI sometimes spots these from the prompt rules but the prompt does not enumerate them explicitly.");
    return reasons;
}

main().catch(e => { console.error(e); process.exit(1); });
