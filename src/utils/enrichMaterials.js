// Berigelse af AI-genererede skræddersyede materialelister — PR. ETAPE.
//
// AI'en er god til at forstå opgaven og dele den i etaper med hovedmaterialerne,
// men glemmer typisk følge-materialerne (underlag, fastgørelse, lim, fodpaneler,
// forbrugsstoffer). Her bruger vi den eksisterende, grundige beregner-viden
// (generateMaterialList — KUN læst, ikke ændret) til at tilføje netop de glemte ting.
//
// Vi genkender faget for HVER etape (ud fra etapens navn + dens materialer) og
// fletter de rette følge-materialer ind i netop den etape. Så en totalrenovering
// får gulv-tilbehør i gulvetapen, tag-tilbehør i tagetapen osv.
//
// Defensivt: en etape vi ikke trygt kan genkende (eller uden areal) lades helt i
// fred. Alt er pakket i try/catch — det bryder ALDRIG det eksisterende flow.
import { generateMaterialList } from './materialGenerator';

// Danske nøgleord → kategori-nøgle som generateMaterialList forstår.
const CATEGORY_KEYWORDS = [
    [['gulv', 'parket', 'sildeben', 'planke'], 'floor'],
    [['vindue', 'vinduer'], 'windows'],
    [['dør', 'døre'], 'doors'],
    [['terrasse'], 'terrace'],
    [['tag', 'spær', 'tegl', 'rygning', 'undertag'], 'roof'],
    [['køkken'], 'kitchen'],
    [['badeværelse', 'bad '], 'bath'],
    [['loft', 'lofter', 'forskalling'], 'ceilings'],
    [['facade', 'beklædning'], 'facades'],
    [['tilbygning'], 'extensions'],
    [['anneks', 'skur'], 'annex'],
    [['carport'], 'carport'],
    [['hegn'], 'fence'],
];

function detectCategory(text) {
    const t = (text || '').toLowerCase();
    for (const [kws, cat] of CATEGORY_KEYWORDS) {
        if (kws.some(k => t.includes(k))) return cat;
    }
    return null;
}

// Største m²-mængde blandt nogle materialer.
function areaFromMaterials(materials) {
    let area = 0;
    (materials || []).forEach(m => {
        const u = (m.unit || '').toLowerCase().replace('²', '2');
        if (u === 'm2') {
            const q = parseFloat(m.quantity) || 0;
            if (q > area) area = q;
        }
    });
    return area;
}

// Areal nævnt i fritekst, fx "50 m2".
function areaFromText(text) {
    const match = (text || '').toLowerCase().replace('²', '2').match(/(\d+(?:[.,]\d+)?)\s*m2/);
    return match ? (parseFloat(match[1].replace(',', '.')) || 0) : 0;
}

// Kun de "glemte" følge-sektioner — IKKE hovedmaterialer (dem har AI'en allerede).
const COMPANION_SECTIONS = ['Underlag & Tilbehør', 'Underkonstruktion', 'Fastgørelse & Beslag', 'Forbrugsstoffer & Værktøj', 'Afslutning'];
const DEDUP_KEYS = ['underlag', 'fodpanel', 'lim', 'søm', 'clips', 'skinne', 'fuge', 'spartel', 'strøer', 'sporplade', 'dækliste', 'fejeliste', 'varmefordeling', 'reglar', 'stolpe', 'beslag', 'dampspærre', 'forskalling', 'skrue'];

function buildCompanions(category, area, existingNames, markup) {
    const standard = generateMaterialList(category, {}, area) || [];
    const companions = standard.filter(s => COMPANION_SECTIONS.includes(s.section));
    const existing = (existingNames || []).map(n => (n || '').toLowerCase());
    const alreadyHave = (itemName) => {
        const t = (itemName || '').toLowerCase();
        const key = DEDUP_KEYS.find(k => t.includes(k));
        return key ? existing.some(e => e.includes(key)) : false;
    };
    return companions
        .filter(c => !alreadyHave(c.item))
        .map(c => ({
            name: c.item,
            quantity: c.qty,
            unit: (c.unit || 'stk').replace('²', '2'),
            price: 0,
            markup,
            autoSuggested: true   // markør så UI'en kan vise "foreslået"
        }));
}

// Beriger HVER etape med dens egne følge-materialer.
export function enrichPhasesWithStandardMaterials(phases, { title = '', notes = '', markup = 30 } = {}) {
    try {
        if (!Array.isArray(phases) || phases.length === 0) return phases;

        const globalText = `${title} ${notes}`;
        // Fælles fallback-areal hvis en etape ikke selv har m².
        let globalArea = 0;
        phases.forEach(p => { const a = areaFromMaterials(p.materials); if (a > globalArea) globalArea = a; });
        if (!globalArea) globalArea = areaFromText(globalText);

        const single = phases.length === 1;

        return phases.map(phase => {
            try {
                const phaseText = `${phase.name || ''} ${(phase.materials || []).map(m => m.name || '').join(' ')}`;
                let category = detectCategory(phaseText);
                // Kun ved én enkelt etape må vi bruge opgavens titel/noter som fallback,
                // så vi ikke "sprøjter" samme fag ud over alle etaper i et kombi-projekt.
                if (!category && single) category = detectCategory(globalText);
                if (!category) return phase;                 // etape uden genkendt fag → urørt

                const area = areaFromMaterials(phase.materials) || globalArea;
                if (!area) return phase;                     // intet areal → urørt

                const existingNames = (phase.materials || []).map(m => m.name);
                const additions = buildCompanions(category, area, existingNames, markup);
                if (additions.length === 0) return phase;

                return { ...phase, materials: [...(phase.materials || []), ...additions] };
            } catch (e) {
                return phase; // enkelt etape fejler aldrig hele listen
            }
        });
    } catch (e) {
        console.warn('Materiale-berigelse sprang over:', e);
        return phases; // bryd ALDRIG det eksisterende flow
    }
}
