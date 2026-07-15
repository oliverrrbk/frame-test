export const initialCategories = [
    { id: 'windows', label: 'Vinduer', desc: 'Udskiftning eller nye', img: '/images/windows_ai.png' },
    { id: 'doors', label: 'Døre', desc: 'Yderdøre, terrassedøre', img: '/images/door_front_new.png' },
    { id: 'floor', label: 'Nyt Gulv', desc: 'Træ, laminat, parket', img: '/images/floor.png' },
    { id: 'terrace', label: 'Træterrasse', desc: 'Lille, stor, overdækket', img: '/images/terrace.png' },
    { id: 'roof', label: 'Tagprojekt', desc: 'Nyt tag eller renovering', img: 'https://images.unsplash.com/photo-1518736346281-76873166a64a?w=400&q=80' },
    { id: 'kitchen', label: 'Køkkenmontage', desc: 'Nyt køkken, flotte detaljer', img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&q=80' },
    { id: 'bath', label: 'Renovering af badeværelse', desc: 'Nyt badeværelse, fliser og montering', img: '/bath.png' },
    { id: 'ceilings', label: 'Indvendige lofter', desc: 'Akustik, gips, træ', img: '/images/ceilings.png' },
    { id: 'facades', label: 'Træfacader & Isolering', desc: 'Eksklusiv ydre beklædning eller hulmur', img: '/images/icon_facade_main_carpenter_1781101264924.png' },
    { id: 'extensions', label: 'Tilbygning', desc: 'Ny etage, udvidelse', img: '/images/extensions_ai.png' },
    { id: 'annex', label: 'Annekser & Skure', desc: 'Værksted, beboelse', img: '/images/annex_ai.png' },
    { id: 'carport', label: 'Carport', desc: 'Enkelt, dobbelt, med skur', img: '/images/carport_ai.png' },
    { id: 'fence', label: 'Hegn', desc: 'Træ, lamel, komposit', img: '/images/fence_ai.png' }
];


const getDynamicRoofImage = (material, feature) => {
    const matKey = material ? material.toLowerCase().replace(/[^a-zæøå]/g, '') : 'default';
    
    let matGroup = 'default';
    if (matKey.includes('paptag')) matGroup = 'paptag';
    if (matKey.includes('tegl')) matGroup = 'tegl';
    if (matKey.includes('eternit')) matGroup = 'eternit';
    if (matKey.includes('metal')) matGroup = 'metal';
    if (matKey.includes('stål') || matKey.includes('stl') || matKey.includes('stålplader')) matGroup = 'staal';
    if (matKey.includes('decra')) matGroup = 'decra';
    if (matKey.includes('beton')) matGroup = 'beton';
    if (matKey.includes('skifer')) {
        if (matKey.includes('bldt') || matKey.includes('blødt')) {
            matGroup = 'blodskiffer';
        } else {
            matGroup = 'skiffer';
        }
    }
    if (matKey.includes('strtag') || matKey.includes('tkket')) matGroup = 'straa';

    const map = {
        'staal_pitch_flat': '/images/icon_staal_pitch_flat_1781089942615.png',
        'staal_pitch_pitched': '/images/icon_staal_pitch_pitched_1781089951042.png',
        'staal_type_saddle': '/images/icon_staal_pitch_pitched_1781089951042.png',
        'staal_type_valm': '/images/icon_staal_type_valm_1781089961075.png',

        'decra_pitch_flat': '/images/icon_decra_pitch_flat_1781089421097.png',
        'decra_pitch_pitched': '/images/icon_decra_pitch_pitched_1781089431863.png',
        'decra_type_saddle': '/images/icon_decra_pitch_pitched_1781089431863.png',
        'decra_type_valm': '/images/icon_decra_type_valm_1781089442868.png',

        'paptag_pitch_flat': '/images/roof_paptag_pitch_flat_1781082286953.png',
        'paptag_pitch_pitched': '/images/roof_paptag_pitch_pitched_1781082296906.png',
        'paptag_type_saddle': '/images/roof_paptag_pitch_pitched_1781082296906.png', 
        'paptag_type_valm': '/images/roof_paptag_type_valm_danish_1781082657746.png',
        
        'tegl_pitch_flat': '/images/icon_tegl_pitch_flat_1781090448014.png',
        'tegl_pitch_pitched': '/images/icon_tegl_pitch_pitched_1781090458578.png',
        'tegl_type_saddle': '/images/icon_tegl_pitch_pitched_1781090458578.png',
        'tegl_type_valm': '/images/icon_tegl_type_valm_1781090468579.png',

        'eternit_pitch_flat': '/images/icon_eternit_pitch_flat_v2_1781088483466.png',
        'eternit_pitch_pitched': '/images/roof_eternit_pitch_pitched_1781082667709.png',
        'eternit_type_saddle': '/images/roof_eternit_pitch_pitched_1781082667709.png',
        'eternit_type_valm': '/images/roof_eternit_type_valm_1781082687859.png',

        'metal_pitch_flat': '/images/icon_metal_pitch_flat_1781098728825.png',
        'metal_pitch_pitched': '/images/icon_metal_pitch_pitched_1781098737569.png',
        'metal_type_saddle': '/images/icon_metal_type_saddle_1781098747318.png',
        'metal_type_valm': '/images/icon_metal_type_valm_1781098756183.png',

        'beton_pitch_flat': '/images/icon_beton_pitch_flat_1781094499661.png',
        'beton_pitch_pitched': '/images/roof_beton_pitch_pitched_1781082989937.png',
        'beton_type_saddle': '/images/roof_beton_pitch_pitched_1781082989937.png',
        'beton_type_valm': '/images/roof_beton_type_valm_1781082998686.png',

        'skiffer_pitch_flat': '/images/icon_skiffer_pitch_flat_1781094766208.png',
        'skiffer_pitch_pitched': '/images/icon_skiffer_pitch_pitched_1781094775990.png',
        'skiffer_type_saddle': '/images/icon_skiffer_type_saddle_1781094785406.png',
        'skiffer_type_valm': '/images/icon_skiffer_type_valm_1781094795018.png',

        'blodskiffer_pitch_flat': '/images/icon_blodskiffer_pitch_flat_1781095444846.png',
        'blodskiffer_pitch_pitched': '/images/icon_blodskiffer_pitch_pitched_1781095453671.png',
        'blodskiffer_type_saddle': '/images/icon_blodskiffer_type_saddle_1781095464333.png',
        'blodskiffer_type_valm': '/images/icon_blodskiffer_type_valm_1781095474762.png',

        'straa_pitch_flat': '/images/roof_pitch_flat.png',
        'straa_pitch_pitched': '/images/roof_straa_pitch_pitched_1781083050070.png',
        'straa_type_saddle': '/images/roof_straa_pitch_pitched_1781083050070.png',
        'straa_type_valm': '/images/roof_straa_pitch_pitched_1781083050070.png', // Stråtag har ofte valm, vi genbruger billedet

        'default_pitch_flat': '/images/roof_pitch_flat.png',
        'default_pitch_pitched': '/images/roof_pitch_pitched.png',
        'default_type_saddle': '/images/roof_type_saddle.png',
        'default_type_valm': '/images/roof_type_valm.png',
    };

    return map[`${matGroup}_${feature}`] || map[`default_${feature}`];
};


const getDynamicEavesImage = (material, eavesType) => {
    const matKey = material ? material.toLowerCase().replace(/[^a-zæøå]/g, '') : 'default';
    
    let matGroup = 'paptag'; // default to paptag as that's what we have currently
    if (matKey.includes('paptag')) matGroup = 'paptag';
    if (matKey.includes('eternit') || matKey.includes('tagplader')) matGroup = 'eternit';
    if (matKey.includes('decra')) matGroup = 'decra';
    if (matKey.includes('stål') || matKey.includes('stl') || matKey.includes('stålplader')) matGroup = 'staal';
    if (matKey.includes('tegl')) matGroup = 'tegl';
    if (matKey.includes('beton')) matGroup = 'beton';
    if (matKey.includes('skifer')) {
        if (matKey.includes('bldt') || matKey.includes('blødt')) {
            matGroup = 'blodskiffer';
        } else {
            matGroup = 'skiffer';
        }
    }
    // Add other materials later when we generate them

    const map = {
        'paptag_wood': '/images/icon_eaves_wood_1781085022695.png',
        'paptag_zinc': '/images/icon_eaves_zinc_1781085031300.png',
        'paptag_eternit': '/images/icon_eaves_eternit_1781085041058.png',
        'paptag_copper': '/images/icon_eaves_copper_1781085052563.png',
        
        
        
        
        // Paptag images
        'pap_wood': '/images/icon_eaves_pap_wood_1781089498263.png',
        'pap_zinc': '/images/icon_eaves_pap_zinc_1781089505417.png',
        'pap_eternit': '/images/icon_eaves_pap_eternit_1781089515904.png',
        'pap_copper': '/images/icon_eaves_pap_copper_1781089523270.png',

        // Betontagsten images
        'beton_wood': '/images/icon_eaves_beton_wood_1781093909469.png',
        'beton_zinc': '/images/icon_eaves_beton_zinc_1781093919665.png',
        'beton_eternit': '/images/icon_eaves_beton_eternit_1781093930626.png',
        'beton_copper': '/images/icon_eaves_beton_copper_1781093941066.png',

        // Tegl images
        'tegl_wood': '/images/icon_eaves_tegl_wood_1781093528060.png',
        'tegl_zinc': '/images/icon_eaves_tegl_zinc_1781093536412.png',
        'tegl_eternit': '/images/icon_eaves_tegl_eternit_1781093545903.png',
        'tegl_copper': '/images/icon_eaves_tegl_copper_1781093556964.png',

        // Stålplader images
        'staal_wood': '/images/icon_eaves_staal_wood_1781093580232.png',
        'staal_zinc': '/images/icon_eaves_staal_zinc_1781093588684.png',
        'staal_eternit': '/images/icon_eaves_staal_eternit_1781093599083.png',
        'staal_copper': '/images/icon_eaves_staal_copper_1781093607209.png',

        // Decra images
        'decra_wood': '/images/icon_eaves_decra_wood_1781089465423.png',
        'decra_zinc': '/images/icon_eaves_decra_zinc_v2_1781089680761.png',
        'decra_eternit': '/images/icon_eaves_decra_eternit_1781089482592.png',
        'decra_copper': '/images/icon_eaves_decra_copper_1781089490428.png',

        // Eternit images (to be generated)
        'eternit_wood': '/images/icon_eaves_eternit_wood_1781088504704.png',
        'eternit_zinc': '/images/icon_eaves_eternit_zinc_1781088513627.png',
        'eternit_eternit': '/images/icon_eaves_eternit_eternit_1781088523121.png',
        'eternit_copper': '/images/icon_eaves_eternit_copper_1781088532058.png',

        // Metal images
        'metal_wood': '/images/icon_metal_wood_1781098783404.png',
        'metal_zinc': '/images/icon_metal_zinc_1781098793989.png',
        'metal_eternit': '/images/icon_metal_eternit_1781098805021.png',
        'metal_copper': '/images/icon_metal_copper_1781098814645.png',

        // Skifer images
        'skiffer_wood': '/images/icon_eaves_skiffer_wood_1781095063611.png',
        'skiffer_zinc': '/images/icon_eaves_skiffer_zinc_1781095073548.png',
        'skiffer_eternit': '/images/icon_eaves_skiffer_eternit_1781095084607.png',
        'skiffer_copper': '/images/icon_eaves_skiffer_copper_1781095093990.png',

        // Blød Skifer images
        'blodskiffer_wood': '/images/icon_blodskiffer_wood_1781095499010.png',
        'blodskiffer_zinc': '/images/icon_blodskiffer_zinc_v2_1781095792817.png',
        'blodskiffer_eternit': '/images/icon_blodskiffer_eternit_1781095516967.png',
        'blodskiffer_copper': '/images/icon_blodskiffer_copper_v2_1781095803093.png',
    };

    const key = `${matGroup}_${eavesType}`;
    return map[key] || map[`paptag_${eavesType}`] || '/images/placeholder.jpg';
};


export const QUESTIONS = {

    roof: [
        {
            id: 'roofTaskType',
            type: 'visual_select',
            label: 'Hvad omfatter tagprojektet?',
            tooltip: 'Vælg om du skal have et helt nyt tag, eller om vi kun skal hjælpe med loftet (fx efterisolering eller gangbro).',
            options: [
                { label: 'Komplet tagudskiftning (Nyt tag)', img: '/images/icon_roof_replacement_1781084632892.png' },
                { label: 'Loft-opgaver (Efterisolering & Gangbro)', img: '/images/attic_insulation.png' }
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
                { label: 'Paptag', img: '/images/icon_paptag_v2_1781084313665.png' },
                { label: 'Tagplader (eternit, asbestfri)', img: '/images/icon_eternit_1781084005360.png' },
                { label: 'Decra', img: '/images/icon_decra_1781084015600.png' },
                { label: 'Stålplader', img: '/images/icon_staal_1781084026597.png' },
                { label: 'Tegl', img: '/images/icon_tegl_v2_1781084324346.png' },
                { label: 'Betontagsten', img: '/images/icon_beton_1781083962338.png' },
                { label: 'Skifer (hårdt materiale)', img: '/images/icon_skiffer_1781083973083.png' },
                { label: 'Skifer (blødt materiale)', img: '/images/icon_skiffer_1781083973083.png' },
                { label: 'Metal-tag (zink, stål, kobber)', img: '/images/icon_zink_1781083981812.png' }
            ] 
        },
        { 
            id: 'roofPitch', 
            type: 'visual_select', 
            label: 'Hvordan er hældningen på taget?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            tooltip: 'Høj rejsning betyder at taget har en stejl vinkel, ofte over 15 grader. Fladt tag har kun en svag hældning.', 
            options: (d) => [
                { label: 'Fladt tag / Meget lav hældning', img: getDynamicRoofImage(d.material, 'pitch_flat') },
                { label: 'Høj rejsning / Normal hældning', img: getDynamicRoofImage(d.material, 'pitch_pitched') }
            ] 
        },
        { 
            id: 'roofType', 
            type: 'visual_select', 
            label: 'Hvilken tagtype er der tale om?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)' && d.roofPitch === 'Høj rejsning / Normal hældning', 
            options: (d) => [
                { label: 'Saddeltag (Almindeligt tag med 2 gavle)', img: getDynamicRoofImage(d.material, 'type_saddle') },
                { label: 'Valmtag (Tag med fald på alle 4 sider - ingen gavle)', img: getDynamicRoofImage(d.material, 'type_valm') }
            ] 
        },
{
            id: 'eavesMaterial',
            type: 'visual_select',
            label: 'Hvilket materiale ønsker du til stern og vindskede?',
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            tooltip: 'Zink, eternit og kobber beskytter kanterne ekstra mod vind og vejr og kræver minimalt vedligehold.',
            options: (d) => [
                { label: 'Træ', img: getDynamicEavesImage(d.material, 'wood') },
                { label: 'Zink', img: getDynamicEavesImage(d.material, 'zinc') },
                { label: 'Eternit', img: getDynamicEavesImage(d.material, 'eternit') },
                { label: 'Kobber', img: getDynamicEavesImage(d.material, 'copper') }
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
            placeholder: 'Eksempel: 1970',
            tooltip: 'Indtast selve byggeåret (f.eks. 1970), ikke hvor mange år huset er. Det hjælper os med at forudsige bygningsstil.' 
        },
        { 
            id: 'oldRoofType', 
            type: 'visual_select', 
            label: 'Hvilken type tag er der på nu? (Dette afmonteres og bortskaffes altid)', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            options: [
                { label: 'Paptag', img: '/images/icon_paptag_v2_1781084313665.png' },
                { label: 'Tagplader (eternit, asbestfri)', img: '/images/icon_eternit_1781084005360.png' },
                { label: 'Tagplader (asbest)', img: '/images/icon_roof_asbestos_1781099785887.png' },
                { label: 'Tagplader (vides ikke)', img: '/images/icon_eternit_1781084005360.png' },
                { label: 'Decra', img: '/images/icon_decra_1781084015600.png' },
                { label: 'Stålplader', img: '/images/icon_staal_1781084026597.png' },
                { label: 'Tegl', img: '/images/icon_tegl_v2_1781084324346.png' },
                { label: 'Betontagsten', img: '/images/icon_beton_1781083962338.png' },
                { label: 'Skifer (hårdt materiale)', img: '/images/icon_skiffer_1781083973083.png' },
                { label: 'Skifer (blødt materiale)', img: '/images/icon_skiffer_1781083973083.png' },
                { label: 'Metal-tag (zink, stål, kobber)', img: '/images/icon_zink_1781083981812.png' }
            ] 
        },
                { 
            id: 'skotrender', 
            type: 'visual_select', 
            label: 'Er der skotrender (skrå vanger, hvor to tagflader mødes)?', 
            condition: (d) => d.roofTaskType === 'Komplet tagudskiftning (Nyt tag)',
            options: [
                { label: 'Nej', img: '/images/icon_skotrende_realistic_no_1781099805721.png' },
                { label: 'Ja', img: '/images/icon_skotrende_realistic_yes_1781099796304.png' }
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
    ],
    windows: [
        { 
            id: 'housingType', 
            type: 'visual_select', 
            label: 'Hvilken slags bygning drejer opgaven sig om?', 
            tooltip: 'Bygningsreglementet (BR18) kræver typisk 3-lags energiruder i helårsboliger for at opfylde isoleringskrav.',
            options: [
                { label: 'Helårsbolig', img: '/images/building_house.png' },
                { label: 'Sommerhus', img: '/images/building_cabin.png' },
                { label: 'Udestue / Anneks / Skur', img: '/images/building_annex.png' }
            ] 
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal de nye vinduer primært være i?', 
            options: [
                { label: 'Træ/alu (kombination)', img: '/images/window_wood_alu_new.png' },
                { label: 'Massivt træ', img: '/images/window_wood_1776261054616.png' },
                { label: 'PVC / plast', img: '/images/window_pvc_new.png' },
                { label: 'Aluminium', img: '/images/window_aluminum_new.png' },
                { label: 'Stål', img: '/images/window_steel_new.png' }
            ] 
        },
        {
            id: 'qualityLevel',
            type: 'select',
            label: 'Hvilket kvalitetsniveau ønsker du på vinduerne?',
            tooltip: 'Robust standardkvalitet dækker yderst holdbare og populære modeller. Eksklusiv Premiumkvalitet dækker high-end modeller (fx Mahogni) med uforlignelig holdbarhed og glød.',
            options: ['Robust standardkvalitet', 'Eksklusiv Premiumkvalitet']
        },
        {
            id: 'scope',
            type: 'select',
            label: 'Hvor stort er projektets omfang?',
            options: ['Hele huset (Alle vinduer skal skiftes)', 'Kun udvalgte vinduer skal skiftes']
        },
        { 
            id: 'floors', 
            type: 'select', 
            label: 'Hvor mange etager har huset?', 
            tooltip: 'Høje etager tager længere tid pga. bæring af tunge ruder samt muligt behov for stillads eller lift.', 
            options: ['1 etage (Kun stueplan)', '2 etager (Stueplan + 1. sal)', '3 etager eller mere'] 
        },
        { 
            id: 'windowsConfig', 
            type: 'window_configurator', 
            label: 'Angiv cirka mål på dine vinduer:', 
            condition: (d) => true 
        }
    ],
    floor: [
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken type gulv skal der lægges?',
            options: [
                { label: 'Træ', img: '/images/floor_wood_1776266012828.png' },
                { label: 'Massivt træ', img: '/images/floor_solid_wood_1776266027333.png' },
                { label: 'Parket', img: '/images/floor_parquet_1776265864234.png' },
                { label: 'Laminat', img: '/images/floor_laminate_1776265833274.png' },
                { label: 'Vinyl', img: '/images/floor_vinyl_1776266044663.png' },
                { label: 'Linoleum', img: '/images/floor_linoleum_1776266075430.png' }
            ] 
        },
        { id: 'amount', type: 'number', label: 'Hvor mange m2 omhandler opgaven (cirka mål)?', tooltip: 'Giv dit eget kvalificerede bud. Det præcise areal måles op senere af os.' },
        { id: 'disposal', type: 'select', label: 'Skal det gamle gulv afmonteres og fjernes?', options: ['Ja, vi skal afmontere og bortskaffe det', 'Ja, vi skal kun afmontere (vi kører det selv væk)', 'Nej, vi har selv afmonteret det / der er tomt'] },
        { 
            id: 'oldFloorType', 
            type: 'visual_select', 
            label: 'Hvilket slags gulv skal fjernes?', 
            condition: (d) => d.disposal && d.disposal.startsWith('Ja'),
            options: [
                { label: 'Trægulv / Parket / Laminat', img: '/images/floor_wood_1776266012828.png' },
                { label: 'Gulvtæppe / Linoleum / Vinyl', img: '/images/floor_linoleum_1776266075430.png' }
            ]
        },
        { 
            id: 'floorFoundation', 
            type: 'visual_select', 
            label: 'Ligger gulvet på beton eller strøer (trækonstruktion)?', 
            options: [
                { label: 'Beton / Støbt dæk', img: '/images/subfloor_concrete.png' },
                { label: 'Strøer / Trækonstruktion', img: '/images/subfloor_joists.png' },
                { label: 'Ved ikke / Andet', img: '/images/subfloor_unknown.png' }
            ] 
        },
        { id: 'underfloorHeating', type: 'select', label: 'Er der (eller skal der etableres) varme i gulvet?', options: ['Nej', 'Ja, der er allerede støbt gulvvarme (kun specialunderlag kræves)', 'Ja, vi skal opbygge nyt gulvvarme (sporplader/varmefordeling)'] },
        { 
            id: 'floorPattern', 
            type: 'select', 
            label: 'Skal gulvet lægges i et specialmønster?', 
            condition: (d) => ['Træ', 'Massivt træ', 'Parket', 'Laminat'].includes(d.material),
            options: ['Nej, helt standard montering', 'Ja, i mønster (fx Sildeben / Chevron)'] 
        },
        { id: 'specificFloorWishes', type: 'select', label: 'Har du specifikke ønsker til gulvets mærke eller type (fx klikgulv)?', options: ['Nej, vi kommer med en faglig vurdering', 'Ja, jeg har specifikke ønsker'] },
        { id: 'specificFloorDetails', type: 'textarea', label: 'Beskriv dine specifikke ønsker (f.eks. "Klikgulv", et bestemt mærke eller indsæt et link):', condition: { field: 'specificFloorWishes', value: 'Ja, jeg har specifikke ønsker' } },
        { 
            id: 'floorObstacles', 
            type: 'select', 
            label: 'Er der faste elementer midt i rummet (f.eks. køkkenø, bærende søjler, skorsten eller mange rør)?', 
            tooltip: 'Faste elementer midt på gulvarealet kræver præcisions-udskæring, ekstra dækningslister/fuger og tager længere tid for os.',
            options: [
                'Nej, rummet er regulært',
                'Ja, det er der (køkkenø, søjler, skorsten eller rør)'
            ] 
        },
        { 
            id: 'floorDoorsNear', 
            type: 'select', 
            label: 'Er der indvendige døre i rummet (som grænser helt op til gulvet)?', 
            tooltip: 'Nyt gulv (og evt. undergulv) ændrer ofte gulvhøjden. Det betyder, at indvendige døre, der støder op til det nye gulv, skal tilpasses i bunden. Bemærk: Du skal KUN tælle indvendige døre med her. Eventuelle terrassedøre og yderdøre afklares altid direkte ved besigtigelsen, da det afhænger af afstanden mellem dit nuværende gulv og dørtrinnet.',
            options: ['Nej', 'Ja'] 
        },
        { 
            id: 'floorDoorsCount', 
            type: 'number', 
            label: 'Hvor mange indvendige døre er der cirka i rummet i alt?', 
            condition: (d) => d.floorDoorsNear === 'Ja',
            default: 1
        }
    ],
    doors: [
        {
            id: 'doorStyle',
            type: 'visual_select',
            label: 'Hvilken dørtype skal monteres?',
            tooltip: 'Vælg om der er tale om indvendige døre eller udvendige døre (terrasse/hoveddør). Bemærk at dette udelukkende er vejledende for at give et estimat - det endelige design og de præcise mål aftales ved besigtigelsen.',
            options: [
                { label: 'Indvendig dør', img: '/images/door_interior_standard.png' },
                { label: 'Terrassedør', img: '/images/door_terrace_new.png' },
                { label: 'Hoveddør (Udvendig)', img: '/images/door_front_new.png' }
            ]
        },
        { 
            id: 'amount', 
            type: 'number', 
            label: 'Hvor mange døre drejer opgaven sig cirka om i alt?', 
            tooltip: 'Giv dit eget kvalificerede bud. Det endelige antal og mål bekræftes af os ved opmåling.', 
            default: 1
        },
        { 
            id: 'disposal', 
            type: 'select', 
            label: 'Skal de nuværende døre afmonteres og bortskaffes?', 
            options: [
                'Ja, vi skal afmontere og bortskaffe dem', 
                'Ja, vi skal kun afmontere (vi kører dem selv væk)', 
                'Nej, vi har selv afmonteret'
            ] 
        },
        {
            id: 'doorModel',
            type: 'visual_select',
            label: 'Hvilken dør-model / kvalitetsniveau ønsker du?',
            condition: (d) => d.doorStyle === 'Indvendig dør',
            options: [
                { label: 'Standard indvendig dør', img: '/images/door_interior_standard.png' },
                { label: 'Special indvendig dør', img: '/images/door_interior_special.png' }
            ]
        },
        {
            id: 'doorModel',
            type: 'select',
            label: 'Hvilken dør-model / kvalitetsniveau ønsker du?',
            condition: (d) => d.doorStyle && d.doorStyle !== 'Indvendig dør',
            options: (d) => {
                if (d.doorStyle === 'Terrassedør') {
                    return ['Standard terrassedør', 'Special/Dobbelt terrassedør'];
                } else {
                    return ['Robust standard hoveddør', 'Premium/High-End hoveddør'];
                }
            }
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal hoveddøren være i?', 
            condition: (d) => d.doorStyle === 'Hoveddør (Udvendig)',
            tooltip: 'Vælg det ønskede materiale til din hoveddør. Træ/Alu er meget populært pga. minimal vedligeholdelse udvendigt.',
            options: [
                { label: 'Massivt træ', img: '/images/door_front_solid_wood_danish_v3.png' },
                { label: 'Massivt træ og glas', img: '/images/door_front_solid_wood_glass_danish_v3.png' },
                { label: 'Finér', img: '/images/door_front_veneer_danish_v3.png' },
                { label: 'PVC', img: '/images/door_front_pvc_solid_danish_v3.png' },
                { label: 'PVC og glas', img: '/images/door_front_pvc_glass_danish_v3.png' },
                { label: 'Aluminium', img: '/images/door_front_aluminium_danish_v3.png' },
                { label: 'Træ / Alu (Kombination)', img: '/images/door_front_wood_alu_danish_v3.png' },
                { label: 'Træ / Alu med glas', img: '/images/door_front_wood_alu_glass_danish_v3.png' }
            ] 
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal terrassedøren være i?', 
            condition: (d) => d.doorStyle === 'Terrassedør',
            tooltip: 'Terrassedøre er næsten altid glasdøre. Vælg mellem forskellige holdbare karmmaterialer.',
            options: [
                { label: 'Træ (med glas)', img: '/images/door_terrace_wood_danish_v2.png' },
                { label: 'PVC / Plast (med glas)', img: '/images/door_terrace_pvc.png' },
                { label: 'Træ / Alu (Kombination, med glas)', img: '/images/door_terrace_wood_alu_danish_v2.png' },
                { label: 'Aluminium (med glas)', img: '/images/door_terrace_alu_danish_v2.png' },
                { label: 'Fuldglas (skydedør)', img: '/images/door_terrace_fullglass_danish_v2.png' }
            ] 
        },
        {
            id: 'electricLock',
            type: 'select',
            condition: (d) => d.doorStyle !== 'Indvendig dør',
            label: 'Ønskes der levering og montering af en elektronisk smart-lås?',
            tooltip: 'En elektronisk smart-lås giver øget sikkerhed og nem, nøglefri adgang (f.eks. via kode, brik eller app). Vi monterer låseenheden komplet inkl. eventuel tilpasning af dør og karm.',
            options: [
                'Nej, standard lås/greb er fint',
                'Ja, vi skal levere og montere elektronisk smart-lås'
            ]
        }
    ],
    terrace: [
        { id: 'amount', type: 'number', label: 'Hvor mange m2 terrasse skal der bygges (cirka mål)?', tooltip: 'Giv dit eget kvalificerede bud. Arealet dobbelttjekkes ved en fysisk besigtigelse.' },
        { 
            id: 'elevation', 
            type: 'visual_select', 
            label: 'Hvilken type terrasse er der tale om?', 
            options: [
                { label: 'Jordniveau', img: '/images/terrace_ground.png' },
                { label: 'Hævet terrasse', img: '/images/terrace_elevated.png' },
                { label: 'Tagterrasse', img: '/images/terrace_roof.png' }
            ] 
        },
        { id: 'disposal', type: 'select', label: 'Skal der afmonteres og bortskaffes en eksisterende terrasse først?', options: ['Ja, vi skal afmontere og bortskaffe den', 'Ja, vi skal kun afmontere (vi kører det selv væk)', 'Nej'] },
        { id: 'roofTerraceFeet', type: 'select', label: 'Tagterrasse underlag: Skal terrassen opklodses på justerbare terrassefødder (skåner tagpappet)?', condition: { field: 'elevation', value: 'Tagterrasse' }, options: ['Ja, den skal klodses op på plastfødder', 'Nej'] },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal den nye terrasse bygges i?',
            options: [
                { label: 'Trykimprægneret', img: '/images/terrace_pine_1776267659903.png' },
                { label: 'Thermowood', img: '/images/terrace_thermowood_1779873640278.png' },
                { label: 'Cedertræ / Hardwood', img: '/images/terrace_hardwood_1779873662697.png' },
                { label: 'Komposit', img: '/images/terrace_composite_1779873685676.png' }
            ] 
        },
        { 
            id: 'railing', 
            type: 'select', 
            label: 'Rækværk/Gelænder: Skal der bygges et rækværk (fx på hævet terrasse eller tagterrasse)?', 
            options: ['Ja, vi skal bygge rækværk', 'Nej, ikke relevant / klarer det selv'] 
        },
        { 
            id: 'railingMaterial',
            type: 'visual_select',
            label: 'Hvilket materiale skal rækværket være i?',
            condition: (d) => d.railing === 'Ja, vi skal bygge rækværk',
            options: (d) => {
                const mat = d.material || '';
                
                let glassImg = '/images/railing_glass.png';
                let woodImg = '/images/railing_wood.png';
                let steelImg = '/images/railing_steel.png';
                let mixImg = '/images/railing_wood_steel.png';

                if (mat === 'Trykimprægneret') {
                    glassImg = '/images/railing_glass_trykimprægneret.png';
                    woodImg = '/images/railing_wood_trykimprægneret.png';
                    steelImg = '/images/railing_steel_trykimprægneret.png';
                    mixImg = '/images/railing_mix_trykimprægneret.png';
                } else if (mat === 'Thermowood') {
                    glassImg = '/images/railing_glass_thermowood.png';
                    woodImg = '/images/railing_wood_thermowood.png';
                    steelImg = '/images/railing_steel_thermowood.png';
                    mixImg = '/images/railing_mix_thermowood.png';
                } else if (mat === 'Cedertræ / Hardwood') {
                    glassImg = '/images/railing_glass_cedar.png';
                    woodImg = '/images/railing_wood_cedar.png';
                    steelImg = '/images/railing_steel_cedar.png';
                    mixImg = '/images/railing_mix_cedar.png';
                } else if (mat === 'Komposit') {
                    glassImg = '/images/railing_glass_komposit.png';
                    woodImg = '/images/railing_wood_komposit.png';
                    steelImg = '/images/railing_steel_komposit.png';
                    mixImg = '/images/railing_mix_komposit.png';
                }

                return [
                    { label: 'Glas rækværk', img: glassImg },
                    { label: 'Træ rækværk', img: woodImg },
                    { label: 'Rustfrit stål rækværk', img: steelImg },
                    { label: 'Blanding af træ og rustfrit stål', img: mixImg }
                ];
            }
        },
        { 
            id: 'railingMeters', 
            type: 'number', 
            label: 'Hvor mange løbende meter rækværk/gelænder skal der cirka laves?', 
            condition: { field: 'railing', value: 'Ja, vi skal bygge rækværk' } 
        },
        { 
            id: 'terraceComplexity', 
            type: 'select', 
            label: 'Skal terrassen bygges med specielle vinkler, trapper eller integration af plantekasser?', 
            options: ['Nej, primært standard firkantet (eller ikke relevant)', 'Ja, der er specialvinkler, bygning af trappe eller andre integrationer'] 
        },
        { 
            id: 'awning', 
            type: 'select', 
            label: 'Ønsker du montering af markise til overdækning af terrassen?', 
            options: ['Ja, vi skal montere markise', 'Nej'] 
        },
        { 
            id: 'awningType', 
            type: 'visual_select', 
            label: 'Hvilken type markise ønsker du?', 
            condition: { field: 'awning', value: 'Ja, vi skal montere markise' }, 
            options: [
                { label: 'Manuel markise', img: '/images/awning_manual.png' },
                { label: 'Elektrisk markise (med motor og fjernbetjening)', img: '/images/awning_electrical.png' }
            ] 
        }
    ],
    kitchen: [],
    bath: [],
    ceilings: [
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvad skal det nye loft laves af?',
            options: [
                { label: 'Træloft (listeloft/paneler/rustikloft)', img: '/images/ceil_wood_1781083315165.png' },
                { label: 'Gipsloft (standard 2-lag)', img: '/images/ceil_gypsum_1781083325455.png' },
                { label: 'Lydgipsloft (lyddæmpende gips)', img: '/images/ceil_sound_gypsum_1781083334939.png' },
                { label: 'Fibergipsloft (Fermacel)', img: '/images/ceil_fiber_gypsum_1781083365011.png' },
                { label: 'Troldtekt (akustikloft)', img: '/images/ceil_troldtekt_1781083375390.png' },
                { label: 'Nedhængt loft (systemloft)', img: '/images/ceiling_system_1776270352710.png' },
                { label: 'Akustikpaneler (glatte plader)', img: '/images/ceil_acoustic_panel_1781083384703.png' },
                { label: 'Akustikpaneler (lameller)', img: '/images/ceiling_acoustic_1776270369087.png' }
            ] 
        },
        { id: 'amount', type: 'number', label: 'Hvor mange m2 loft skal der laves (cirka mål)?' },
        { 
            id: 'oldCeilingType', 
            type: 'visual_select', 
            label: 'Hvilken type loft er der på nu? (Dette afmonteres og bortskaffes altid)',
            options: [
                { label: 'Træloft (listeloft/paneler/rustikloft)', img: '/images/ceil_wood_1781083315165.png' },
                { label: 'Gipsloft (standard 2-lag)', img: '/images/ceil_gypsum_1781083325455.png' },
                { label: 'Lydgipsloft (lyddæmpende gips)', img: '/images/ceil_sound_gypsum_1781083334939.png' },
                { label: 'Fibergipsloft (Fermacel)', img: '/images/ceil_fiber_gypsum_1781083365011.png' },
                { label: 'Troldtekt (akustikloft)', img: '/images/ceil_troldtekt_1781083375390.png' },
                { label: 'Nedhængt loft (systemloft)', img: '/images/ceiling_system_1776270352710.png' },
                { label: 'Akustikpaneler (glatte plader)', img: '/images/ceil_acoustic_panel_1781083384703.png' },
                { label: 'Akustikpaneler (lameller)', img: '/images/ceiling_acoustic_1776270369087.png' },
                { label: 'Ved ikke', img: '/images/subfloor_unknown.png' }
            ]
        },
        { 
            id: 'vaporAndInsulation', 
            type: 'visual_select', 
            label: 'Hvad ligger der umiddelbart ovenover det nye loft?', 
            tooltip: 'Hvis der er et koldt loftrum (f.eks. spidsloft), skal der lovmæssigt monteres en dampspærre (en plastdug) under loftet for at forhindre fugtskader i tagkonstruktionen.', 
            options: [
                { label: 'Opvarmet etage (Ingen dampspærre nødvendig)', img: '/images/ceiling_above_floor_1779875247509.png' }, 
                { label: 'Koldt tagrum (Lovkrav om plast-dampspærre)', img: '/images/ceiling_above_attic_1779875271365.png' }, 
                { label: 'Koldt tagrum inkl. ny isolering (Dampspærre + Isolering)', img: '/images/ceiling_above_attic_1779875271365.png' },
                { label: 'Ved ikke / Uvist (Beregner dampspærre som sikkerhed)', img: '/images/subfloor_unknown.png' }
            ] 
        },
        { 
            id: 'ceilingHeight', 
            type: 'visual_select', 
            label: 'Lofthøjde: Er der tale om loft-til-kip eller lofthøjde over 2,5 meter?', 
            options: [
                { label: 'Nej, standard lofthøjde', img: '/images/ceiling_height_standard_1779874885347.png' },
                { label: 'Ja, loft-til-kip eller højere end 2,5m', img: '/images/ceiling_height_kip_1779874905805.png' }
            ] 
        },
        {
            id: 'spots',
            type: 'select',
            label: 'Skal der etableres spots eller nye lampesteder?',
            options: ['Nej', 'Ja']
        }
    ],
    facades: [
        {
            id: 'facadeTaskType',
            type: 'visual_select',
            label: 'Hvad drejer projektet sig om?',
            options: [
                { label: 'Montering af ny facade (Komplet yderbeklædning)', img: '/images/icon_facade_main_carpenter_1781101264924.png' },
                { label: 'Kun hulmursisolering (I eksisterende murstensvæg uden facadeændring)', img: '/images/old_facade_brick_new.png' }
            ]
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken type facadebeklædning ønsker du?',
            condition: (d) => d.facadeTaskType !== 'Kun hulmursisolering (I eksisterende murstensvæg uden facadeændring)',
            options: [
                { label: 'Trykimprægneret', img: '/images/facade_pine_no_bricks_1781101915390.png' },
                { label: 'Almindeligt træ (Malet)', img: '/images/facade_painted_wood.png' },
                { label: 'Superwood', img: '/images/facade_superwood_1776270423784.png' },
                { label: 'Thermowood', img: '/images/icon_facade_thermowood_new_1781101291566.png' },
                { label: 'Cedertræ / Hardwood', img: '/images/icon_facade_hardwood_new_1781101311436.png' },
                { label: 'HardiePlank', img: '/images/facade_hardie_no_bricks_1781101924871.png' },
                { label: 'Cembrit / Cedral', img: '/images/facade_cembrit_no_bricks_1781101934557.png' },
                { label: 'Komposit', img: '/images/facade_composite_no_bricks_1781101942967.png' }
            ] 
        },
        { 
            id: 'mountingStyle', 
            type: 'visual_select', 
            label: 'Hvordan skal beklædningen monteres?', 
            condition: (d) => d.facadeTaskType !== 'Kun hulmursisolering (I eksisterende murstensvæg uden facadeændring)',
            options: [
                { label: 'Vandret (fx Klinkbeklædning)', img: '/images/facade_horizontal.png' },
                { label: 'Lodret (fx Listebeklædning - tager lidt længere tid)', img: '/images/facade_vertical.png' }
            ]
        },
        { id: 'amount', type: 'number', label: 'Hvor mange løbende meter facade skal der beklædes/isoleres (cirka mål rundt om huset)?' },
        { 
            id: 'oldFacadeMaterial', 
            type: 'visual_select', 
            label: 'Hvad består den nuværende facade/yderbeklædning af?', 
            condition: (d) => d.facadeTaskType !== 'Kun hulmursisolering (I eksisterende murstensvæg uden facadeændring)',
            options: [
                { label: 'Mursten / Pudset væg (Beholdes som underlag, ny facade monteres udenpå)', img: '/images/old_facade_brick_new.png' },
                { label: 'Gammel træbeklædning (Skal rives ned og fjernes)', img: '/images/old_facade_wood_worn.png' },
                { label: 'Stålplader / Plademateriale (Skal rives ned og fjernes)', img: '/images/old_facade_steel.png' }
            ] 
        },
        {
            id: 'insulation',
            type: 'select',
            label: 'Ønsker du efterisolering af ydervæggen bag den nye facade?',
            condition: (d) => d.facadeTaskType !== 'Kun hulmursisolering (I eksisterende murstensvæg uden facadeændring)',
            options: [
                'Nej tak (Behold nuværende isolering)',
                'Ja, der skal også laves efterisolering'
            ]
        },
        { 
            id: 'openings', 
            type: 'number', 
            label: 'Hvor mange vinduer og yderdøre skal der laves nye trælister og inddækninger omkring?', 
            desc: 'Inddækning og lysninger omkring åbninger kræver præcisionsarbejde, montage af inddækningslister, fugning og evt. zink-/alukapsler for at sikre tætheden mod slagregn.',
            placeholder: 'Fx 2',
            condition: (d) => d.facadeTaskType !== 'Kun hulmursisolering (I eksisterende murstensvæg uden facadeændring)'
        },
        { id: 'floors', type: 'select', label: 'Hvor mange plan/etager er huset/facaden, der skal arbejdes på?', options: ['1-plan (Stueplan)', '1½-plan / 2-plan / Mere'] }
    ],
    extensions: [],
    annex: [
        { id: 'annexType', type: 'select', label: 'Hvad er det primære formål med byggeriet?', options: ['Uisoleret skur til opbevaring', 'Isoleret skur/værksted', 'Fuldt beboeligt anneks'] },
        { id: 'amount', type: 'number', label: 'Hvor stort skal det være i m2 (cirka mål)?' },
        { 
            id: 'buildingPermit', 
            type: 'select', 
            label: 'Hvem skal søge om byggetilladelse til annekset/skuret?', 
            condition: (d) => {
                const amount = parseFloat(d.amount);
                return d.annexType === 'Isoleret skur/værksted' || d.annexType === 'Fuldt beboeligt anneks' || (amount > 12);
            },
            options: [
                'Vi skal søge byggetilladelsen for jer (vi klarer hele ansøgningen)',
                'Vi søger selv / har allerede fået tilladelse',
                'Nej, det er ikke nødvendigt (opfylder regler for sekundær bebyggelse under 50 m2 samlet)'
            ]
        },
        { 
            id: 'disposal', 
            type: 'select', 
            label: 'Skal der rives et eksisterende skur/anneks ned?', 
            condition: (d) => d.annexType === 'Uisoleret skur til opbevaring' && (!d.amount || parseFloat(d.amount) <= 12),
            options: ['Nej, der er frit', 'Ja, vi skal rive ned og bortskaffe det', 'Ja, vi skal kun rive ned (vi kører det selv væk)'] 
        },
        { 
            id: 'oldMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale er det eksisterende bygget af?', 
            condition: (d) => (d.disposal && d.disposal.startsWith('Ja')) && d.annexType === 'Uisoleret skur til opbevaring' && (!d.amount || parseFloat(d.amount) <= 12),
            options: [
                { label: 'Træ', img: '/images/old_facade_wood_1777278987653.png' },
                { label: 'Mursten/Beton', img: '/images/old_facade_brick_1777279017419.png' },
                { label: 'Eternit (mulig asbest)', img: '/images/old_facade_eternit_1777279001289.png' },
                { label: 'Andet' }
            ] 
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal de udvendige facader være i?', 
            condition: (d) => d.annexType === 'Uisoleret skur til opbevaring' && (!d.amount || parseFloat(d.amount) <= 12),
            options: [
                { label: 'Trykimprægneret', img: '/images/facade_pine_1776270383566.png' },
                { label: 'Superwood', img: '/images/facade_superwood_1776270423784.png' },
                { label: 'Thermowood', img: '/images/facade_thermowood_1776270455644.png' },
                { label: 'Cedertræ / Hardwood', img: '/images/facade_cedar_1776270440422.png' },
                { label: 'HardiePlank', img: '/images/facade_hardieplank.png' },
                { label: 'Komposit', img: '/images/terrace_composite_1776267690895.png' }
            ] 
        },
        { 
            id: 'foundationType', 
            type: 'visual_select', 
            label: 'Hvilken type fundament ønsker du til skuret?', 
            condition: (d) => d.annexType === 'Uisoleret skur til opbevaring' && (!d.amount || parseFloat(d.amount) <= 12),
            options: [
                { label: 'Trækonstruktion / Punktfundament (standard robust underlag)', img: '/images/post_anchoring_shoe.png' },
                { label: 'Støbt betondæk / sokkel (kræver jord-/betonarbejde)', img: '/images/concrete_subfloor.png' }
            ] 
        },
        { 
            id: 'roofType', 
            type: 'visual_select', 
            label: 'Hvilken tagtype ønsker du?', 
            condition: (d) => d.annexType === 'Uisoleret skur til opbevaring' && (!d.amount || parseFloat(d.amount) <= 12),
            options: [
                { label: 'Fladt tag / ensidig hældning (Tagpap)', img: '/images/annex_roof_flat_1777280796177.png' },
                { label: 'Sadel tag (Høj rejsning)', img: '/images/annex_roof_pitched_1777280812965.png' }
            ] 
        }
    ],
    carport: [],
    fence: [
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken type hegn ønsker du?', 
            options: [
                { label: 'Klinkehegn (Træ)', img: '/images/fence_klinke_1778675155755.png' },
                { label: 'Listehegn (Træ)', img: '/images/listehegn_danish_1781102918418.png' },
                { label: 'Lamelhegn (Træ)', img: '/images/fence_lamel_1778675189539.png' },
                { label: 'Raftehegn (Træ)', img: '/images/rafterhegn_danish_1781102926024.png' },
                { label: 'Komposithegn', img: '/images/fence_komposit_1778675219569.png' }
            ] 
        },
        { 
            id: 'fenceHeight', 
            type: 'select', 
            label: 'Hvor højt skal hegnet være?', 
            desc: 'Ifølge Hegnsloven må fælleshegn i skellet som udgangspunkt være op til 1,8 meter højt. Hegn over 1,8 meter (op til 2,0 meter) kan kræve naboens accept eller nabooverenskomst, og kræver dybere stolpeforankring pga. øget vindbelastning.',
            options: ['Under 1,8 meter', 'Op til 2,0 meter'] 
        },
        { 
            id: 'postMaterial', 
            type: 'visual_select', 
            label: 'Hvilken type stolper ønsker du?', 
            options: [
                { label: 'Træstolper', img: '/images/post_wood_concrete.png' },
                { label: 'Betonstolper', img: '/images/post_concrete.png' },
                { label: 'Metal/Stålstolper', img: '/images/post_metal_concrete.png' }
            ] 
        },
        { 
            id: 'postAnchoringWoodMetal', 
            type: 'visual_select', 
            label: 'Hvilken jordforankrings-metode ønsker du?', 
            condition: (d) => d.postMaterial === 'Træstolper' || d.postMaterial === 'Metal/Stålstolper',
            options: [
                { label: 'Støbt direkte i jord/beton (Standard)', img: '/images/post_anchoring_concrete.png' },
                { label: 'Stolpesko i støbt punktfundament (Træ fri af jord)', img: '/images/post_anchoring_shoe.png' },
                { label: 'Direkte i jorden uden beton (Kun visse træsorter)', img: '/images/wood_post_in_ground_1781102933816.png' },
                { label: 'Jordskruer / Skruefundament (Hurtig stålforankring)', img: '/images/post_anchoring_screw.png' }
            ] 
        },
        { 
            id: 'postAnchoringConcrete', 
            type: 'visual_select', 
            label: 'Hvilken jordforankrings-metode ønsker du?', 
            condition: (d) => d.postMaterial === 'Betonstolper',
            options: [
                { label: 'Støbt direkte i jord/beton (Standard)', img: '/images/post_anchoring_concrete.png' },
                { label: 'Betonstolpe med betonbundplade (H-stolpe med plade)', img: '/images/post_anchoring_baseplate.png' }
            ] 
        },
        { id: 'amount', type: 'number', label: 'Hvor mange løbende meter hegn skal der sættes op (cirka mål)?' },
        { id: 'disposal', type: 'select', label: 'Skal et eksisterende hegn, hæk eller buske fjernes?', options: ['Nej, der er frit', 'Ja, vi skal fjerne det og bortskaffe det', 'Ja, vi skal kun fjerne det (vi kører det selv væk)'] },
        { 
            id: 'oldMaterial', 
            type: 'visual_select', 
            label: 'Hvilken type hegn/beplantning er det eksisterende?', 
            condition: (d) => d.disposal && d.disposal.startsWith('Ja'),
            options: [
                { label: 'Træhegn (alm. brædder/lameller)', img: '/images/old_fence_wood.png' },
                { label: 'Kraftigt raftehegn / Stammer', img: '/images/old_fence_rafte.png' },
                { label: 'Hæk / Buske / Levende hegn (Rødder opgraves)', img: '/images/old_fence_hedge.png' },
                { label: 'Metalhegn / Trådhegn / Stolper', img: '/images/old_fence_steel.png' }
            ] 
        }
    ]
};
