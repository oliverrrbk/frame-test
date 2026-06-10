const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/components/Wizard/questionsConfig.js');
let content = fs.readFileSync(configPath, 'utf8');

const roofArray = `    roof: [
        {
            id: 'roofTaskType',
            type: 'visual_select',
            label: 'Hvad omfatter tagprojektet?',
            tooltip: 'Vælg om du skal have et helt nyt tag, eller om vi kun skal hjælpe med loftet (fx efterisolering eller gangbro).',
            options: [
                { label: 'Komplet tagudskiftning (Nyt tag)', img: '/images/roof_felt_1776270223442.png' },
                { label: 'Loft-opgaver (Efterisolering & Gangbro)', img: '/images/attic_both.png' }
            ]
        },
        {
            id: 'atticSubTask',
            type: 'visual_select',
            label: 'Hvad skal der laves på loftet?',
            condition: (d) => d.roofTaskType === 'Loft-opgaver (Efterisolering & Gangbro)',
            options: [
                { label: 'Både efterisolering og ny gangbro', img: '/images/attic_both.png' },
                { label: 'Kun efterisolering', img: '/images/attic_insulation.png' },
                { label: 'Kun etablering af gangbro', img: '/images/attic_walkway.png' }
            ]
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken slags nyt tag skal lægges?',
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            options: [
                { label: 'Paptag', img: '/images/roof_felt_1776270223442.png' },
                { label: 'Tagplader (eternit asbest fri)', img: '/images/roof_eternit_1777277162521.png' },
                { label: 'Decra', img: '/images/roof_decra_1777277191170.png' },
                { label: 'Stålplader', img: '/images/roof_steel_1776270253782.png' },
                { label: 'Tegl', img: '/images/roof_tile_1776270239163.png' },
                { label: 'Betontagsten', img: '/images/roof_concrete_tile_1777277204797.png' },
                { label: 'Skiffer (hårdt materiale)', img: '/images/roof_slate_1777277221463.png' },
                { label: 'Skiffer (blødt materiale)', img: '/images/roof_slate_1777277221463.png' },
                { label: 'Stråtag (tækket tag)', img: '/images/roof_thatch_1777277238724.png' },
                { label: 'Metal-tag (zink, stål, kobber)', img: '/images/roof_zinc_1777277255328.png' }
            ] 
        },
        { 
            id: 'roofPitch', 
            type: 'visual_select', 
            label: 'Hvordan er hældningen på taget?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            tooltip: 'Høj rejsning betyder at taget har en stejl vinkel, ofte over 15 grader. Fladt tag har kun en svag hældning.', 
            options: [
                { label: 'Fladt tag / Meget lav hældning', img: '/images/roof_pitch_flat.png' },
                { label: 'Høj rejsning / Normal hældning', img: '/images/roof_pitch_pitched.png' }
            ] 
        },
        { 
            id: 'roofType', 
            type: 'visual_select', 
            label: 'Hvilken tagtype er der tale om?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)' && d.roofPitch === 'Høj rejsning / Normal hældning', 
            options: [
                { label: 'Saddeltag (Almindeligt tag med 2 gavle)', img: '/images/roof_type_saddle.png' },
                { label: 'Valmtag (Tag med fald på alle 4 sider - ingen gavle)', img: '/images/roof_type_valm.png' }
            ] 
        },
        { 
            id: 'amount', 
            type: 'number', 
            label: 'Hvor stort er grundplanet af huset (cirka mål i m2)?', 
            tooltip: 'VIGTIGT: Indtast husets bebyggede areal (ydervægge), IKKE tagets areal! Beregneren udregner automatisk det samlede tagareal ud fra tagets hældning og type.' 
        },
        { 
            id: 'floors', 
            type: 'select', 
            label: 'Hvor mange plan/etager er huset?', 
            options: ['1-plan (Stueplan)', '1½-plan / 2-plan / Mere'] 
        },
        { 
            id: 'houseAge', 
            type: 'number', 
            label: 'Hvilket år er huset bygget (årstal)?', 
            placeholder: 'fx 1970',
            tooltip: 'Indtast selve byggeåret (f.eks. 1970), ikke hvor mange år huset er. Det hjælper os med at forudsige bygningsstil.' 
        },
        { 
            id: 'oldRoofType', 
            type: 'visual_select', 
            label: 'Hvilken type tag er der på nu? (Dette afmonteres og afskaffes altid)', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            options: [
                { label: 'Paptag', img: '/images/roof_felt_1776270223442.png' },
                { label: 'Tagplader (eternit asbest fri)', img: '/images/roof_eternit_1777277162521.png' },
                { label: 'Tagplader (asbest)', img: '/images/roof_eternit_asbestos_1777277175837.png' },
                { label: 'Tagplader vides ikke', img: '/images/roof_eternit_1777277162521.png' },
                { label: 'Decra', img: '/images/roof_decra_1777277191170.png' },
                { label: 'Stålplader', img: '/images/roof_steel_1776270253782.png' },
                { label: 'Tegl', img: '/images/roof_tile_1776270239163.png' },
                { label: 'Betontagsten', img: '/images/roof_concrete_tile_1777277204797.png' },
                { label: 'Skiffer (hårdt materiale)', img: '/images/roof_slate_1777277221463.png' },
                { label: 'Skiffer (blødt materiale)', img: '/images/roof_slate_1777277221463.png' },
                { label: 'Stråtag (tækket tag)', img: '/images/roof_thatch_1777277238724.png' },
                { label: 'Metal-tag (zink, stål, kobber)', img: '/images/roof_zinc_1777277255328.png' }
            ] 
        },
        {
            id: 'eavesMaterial',
            type: 'visual_select',
            label: 'Hvilket materiale ønsker du til stern og vindskede?',
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            tooltip: 'Zink, eternit og kobber beskytter kanterne ekstra mod vind og vejr og kræver minimalt vedligehold.',
            options: [
                { label: 'Træ', img: '/images/eaves_wood.png' },
                { label: 'Zink', img: '/images/eaves_zinc.png' },
                { label: 'Eternit', img: '/images/eaves_eternit.png' },
                { label: 'Kobber', img: '/images/eaves_copper.png' }
            ]
        },
        { 
            id: 'skotrender', 
            type: 'visual_select', 
            label: 'Er der skotrender (skrå vanger, hvor to tagflader mødes)?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            options: [
                { label: 'Nej', img: '/images/skotrender_no.png' },
                { label: 'Ja', img: '/images/skotrender_yes.png' }
            ] 
        },
        { 
            id: 'skotrenderMeters', 
            type: 'number', 
            label: 'Hvor mange meter skotrende er der cirka i alt?', 
            condition: { field: 'skotrender', value: 'Ja' } 
        },
        { 
            id: 'grater', 
            type: 'select', 
            label: 'Er der grater (de skrå kanter, hvor tagfladerne mødes på et valmtag)?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)' && d.roofType === 'Valmtag (Tag med fald på alle 4 sider - ingen gavle)',
            options: ['Nej', 'Ja'] 
        },
        { 
            id: 'graterMeters', 
            type: 'number', 
            label: 'Hvor mange meter grat er der cirka i alt?', 
            condition: { field: 'grater', value: 'Ja' } 
        },
        { id: 'chimney', type: 'select', label: 'Er der en eller flere skorstene, der skal inddækkes?', condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)', options: ['Nej', 'Ja'] },
        { id: 'chimneyAmount', type: 'number', label: 'Hvor mange skorstene er der?', condition: { field: 'chimney', value: 'Ja' } },
        { 
            id: 'extensions', 
            type: 'select', 
            label: 'Er der kviste på taget (eller skal der monteres kviste)?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)' && d.roofPitch === 'Høj rejsning / Normal hældning' && d.floors === '1½-plan / 2-plan / Mere',
            options: ['Nej', 'Ja'] 
        },
        { 
            id: 'extensionsAmount', 
            type: 'number', 
            label: 'Hvor mange kviste skal der monteres / er der på taget?', 
            condition: { field: 'extensions', value: 'Ja' } 
        },
        { 
            id: 'skylightReplace', 
            type: 'select', 
            label: 'Er der eksisterende ovenlysvinduer, der skal udskiftes?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            options: ['Nej', 'Ja'] 
        },
        { 
            id: 'skylightReplaceAmount', 
            type: 'number', 
            label: 'Hvor mange eksisterende ovenlysvinduer skal udskiftes?', 
            condition: { field: 'skylightReplace', value: 'Ja' } 
        },
        { 
            id: 'skylightNew', 
            type: 'select', 
            label: 'Skal der etableres helt nye/ekstra ovenlysvinduer (hvor der ikke er vindue i dag)?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            options: ['Nej', 'Ja'] 
        },
        { 
            id: 'skylightNewAmount', 
            type: 'number', 
            label: 'Hvor mange helt nye ovenlysvinduer ønsker du etableret? (Kræver udskæring af spær/spærudveksling)', 
            condition: { field: 'skylightNew', value: 'Ja' } 
        },
        {
            id: 'insulationAmount',
            type: 'select',
            label: 'Hvor tykt et lag ekstra isolering skal der rulles ud?',
            condition: (d) => d.roofTaskType === 'Loft-opgaver (Efterisolering & Gangbro)' && (d.atticSubTask === 'Både efterisolering og ny gangbro' || d.atticSubTask === 'Kun efterisolering'),
            options: ['100 mm', '200 mm', '300 mm', 'Ved ikke (Tømreren vurderer)']
        },
        {
            id: 'ventilationPlates',
            type: 'select',
            label: 'Skal der monteres vindplader ude ved tagfoden? (Sikrer ventilation så loftet kan "ånde")',
            condition: (d) => d.roofTaskType === 'Loft-opgaver (Efterisolering & Gangbro)' && (d.atticSubTask === 'Både efterisolering og ny gangbro' || d.atticSubTask === 'Kun efterisolering'),
            options: ['Ja, det skal der', 'Nej, der er styr på ventilationen', 'Ved ikke (Tømreren vurderer)']
        },
        {
            id: 'removeOldWalkway',
            type: 'select',
            label: 'Er der en gammel gangbro/gulv, der skal brydes op og bortskaffes først?',
            condition: (d) => d.roofTaskType === 'Loft-opgaver (Efterisolering & Gangbro)' && (d.atticSubTask === 'Både efterisolering og ny gangbro' || d.atticSubTask === 'Kun etablering af gangbro'),
            options: ['Nej', 'Ja, fjern og bortskaf gammelt gulv']
        },
        {
            id: 'walkwayM2',
            type: 'number',
            label: 'Hvor mange kvadratmeter (m2) skal den nye gangbro cirka være?',
            condition: (d) => d.roofTaskType === 'Loft-opgaver (Efterisolering & Gangbro)' && (d.atticSubTask === 'Både efterisolering og ny gangbro' || d.atticSubTask === 'Kun etablering af gangbro')
        },
        {
            id: 'newAtticHatch',
            type: 'select',
            label: 'Skal der monteres en ny, isoleret loftlem inkl. foldestige?',
            condition: (d) => d.roofTaskType === 'Loft-opgaver (Efterisolering & Gangbro)',
            tooltip: 'Anbefales kraftigt ved efterisolering, da gamle loftlemme ofte trækker koldt ind, når loftet bliver koldere over den nye isolering.',
            options: ['Nej', 'Ja']
        }
    ],`;

const startIndex = content.indexOf('    roof: [');
const endIndex = content.indexOf('    windows: [');

if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + roofArray + '\n' + content.substring(endIndex);
    fs.writeFileSync(configPath, content, 'utf8');
    console.log('Successfully replaced roof array!');
} else {
    console.log('Could not find boundaries.');
}
