// Berigelse af AI-genererede skræddersyede materialelister.
//
// AI'en er god til at forstå opgaven og dele den i etaper med hovedmaterialerne,
// men glemmer typisk følge-materialerne (underlag, fastgørelse, lim, fodpaneler,
// forbrugsstoffer). Her bruger vi den eksisterende, grundige beregner-viden
// (generateMaterialList — KUN læst, ikke ændret) til at tilføje netop de glemte ting.
//
// Defensivt: kan vi ikke trygt genkende opgavetype + areal, returnerer vi listen
// UÆNDRET, så det aldrig forstyrrer det eksisterende flow.
import { generateMaterialList } from './materialGenerator';

// Danske nøgleord → kategori-nøgle som generateMaterialList forstår.
const CATEGORY_KEYWORDS = [
    [['gulv', 'parket', 'sildeben', 'planke'], 'floor'],
    [['vindue', 'vinduer'], 'windows'],
    [['dør', 'døre'], 'doors'],
    [['terrasse'], 'terrace'],
    [['tag', 'spær', 'tegl'], 'roof'],
    [['køkken'], 'kitchen'],
    [['badeværelse', 'bad '], 'bath'],
    [['loft', 'lofter'], 'ceilings'],
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

// Find arealet: største m²-mængde i materialerne, ellers "50 m2" i teksten.
function detectArea(phases, text) {
    let area = 0;
    (phases || []).forEach(p => (p.materials || []).forEach(m => {
        const u = (m.unit || '').toLowerCase().replace('²', '2');
        if (u === 'm2') {
            const q = parseFloat(m.quantity) || 0;
            if (q > area) area = q;
        }
    }));
    if (area > 0) return area;
    const match = (text || '').toLowerCase().replace('²', '2').match(/(\d+(?:[.,]\d+)?)\s*m2/);
    return match ? (parseFloat(match[1].replace(',', '.')) || 0) : 0;
}

// Tilføj en ny "Tilbehør & forbrugsstoffer (foreslået)"-etape med de glemte følge-materialer.
export function enrichPhasesWithStandardMaterials(phases, { title = '', notes = '', mainMaterial = '', markup = 30 } = {}) {
    try {
        if (!Array.isArray(phases) || phases.length === 0) return phases;

        const text = `${title} ${notes}`;
        const category = detectCategory(text);
        if (!category) return phases;          // ukendt opgavetype → rør intet

        const area = detectArea(phases, text);
        if (!area) return phases;              // intet areal → rør intet (undgå 0-mængder)

        const standard = generateMaterialList(category, { material: mainMaterial }, area) || [];

        // Kun de "glemte" følge-sektioner — IKKE hovedmaterialer (dem har AI'en allerede).
        const companionSections = ['Underlag & Tilbehør', 'Underkonstruktion', 'Fastgørelse & Beslag', 'Forbrugsstoffer & Værktøj', 'Afslutning'];
        const companions = standard.filter(s => companionSections.includes(s.section));

        // Let dedup: undgå at gentage noget AI'en allerede har med.
        const existing = phases.flatMap(p => (p.materials || []).map(m => (m.name || '').toLowerCase()));
        const DEDUP_KEYS = ['underlag', 'fodpanel', 'lim', 'søm', 'clips', 'skinne', 'fuge', 'spartel', 'strøer', 'sporplade', 'dækliste', 'fejeliste', 'varmefordeling'];
        const alreadyHave = (itemName) => {
            const t = (itemName || '').toLowerCase();
            const key = DEDUP_KEYS.find(k => t.includes(k));
            return key ? existing.some(e => e.includes(key)) : false;
        };

        const toAdd = companions
            .filter(c => !alreadyHave(c.item))
            .map(c => ({
                name: c.item,
                quantity: c.qty,
                unit: (c.unit || 'stk').replace('²', '2'),
                price: 0,
                markup,
                autoSuggested: true   // markør så UI'en kan vise "foreslået"
            }));

        if (toAdd.length === 0) return phases;

        const enrichPhase = {
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `enrich-${Date.now()}`,
            name: 'Tilbehør & forbrugsstoffer (foreslået)',
            hours: '',
            materials: toAdd,
            autoSuggested: true
        };
        return [...phases, enrichPhase];
    } catch (e) {
        console.warn('Materiale-berigelse sprang over:', e);
        return phases; // bryd ALDRIG det eksisterende flow
    }
}
