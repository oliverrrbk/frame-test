export const initialCategories = [
    { id: 'windows', label: 'Vinduer', desc: 'Udskiftning eller nye', img: '/images/windows_ai.png' },
    { id: 'doors', label: 'Døre', desc: 'Yderdøre, terrassedøre', img: 'https://images.unsplash.com/photo-1503898362-59e068e7f9d8?w=400&q=80' },
    { id: 'floor', label: 'Nyt Gulv', desc: 'Træ, laminat, parket', img: '/images/floor.png' },
    { id: 'terrace', label: 'Træterrasse', desc: 'Lille, stor, overdækket', img: '/images/terrace.png' },
    { id: 'roof', label: 'Tagprojekt', desc: 'Nyt tag eller renovering', img: 'https://images.unsplash.com/photo-1518736346281-76873166a64a?w=400&q=80' },
    { id: 'kitchen', label: 'Køkkenmontage', desc: 'Nyt køkken, flotte detaljer', img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&q=80' },
    { id: 'ceilings', label: 'Indvendige lofter', desc: 'Akustik, gips, træ', img: '/images/ceilings.png' },
    { id: 'facades', label: 'Træfacader', desc: 'Eksklusiv ydre beklædning', img: '/images/facade.png' },
    { id: 'extensions', label: 'Tilbygning', desc: 'Ny etage, udvidelse', img: '/images/extensions_ai.png' },
    { id: 'annex', label: 'Annekser & Skure', desc: 'Værksted, beboelse', img: '/images/annex_ai.png' },
    { id: 'carport', label: 'Carport', desc: 'Enkelt, dobbelt, med skur', img: '/images/carport_ai.png' },
    { id: 'fence', label: 'Hegn', desc: 'Træ, lamel, komposit', img: '/images/fence_ai.png' },
    { id: 'special', label: 'Specialopgave', desc: 'Chat med AI Tømrer', img: '/images/special_carpenter.png' }
];

export const QUESTIONS = {
    roof: [
        { id: 'amount', type: 'number', label: 'Hvor stort er grundplanet af huset cirka i m2?' },
        { id: 'floors', type: 'select', label: 'Hvor mange plan/etager er huset?', options: ['1-plan (Stueplan)', '1½-plan / 2-plan / Mere'] },
        { id: 'roofPitch', type: 'select', label: 'Hvordan er hældningen på taget?', options: ['Fladt tag / Meget lav hældning', 'Høj rejsning / Normal hældning'] },
        { id: 'houseAge', type: 'number', label: 'Hvor gammelt er huset ca. (årstal)?' },
        
        { id: 'disposal', type: 'select', label: 'Skal det gamle tag afmonteres og afskaffes?', options: ['Ja', 'Nej, lægges ovenpå / ikke relevant'] },
        { 
            id: 'oldRoofType', 
            type: 'visual_select', 
            label: 'Hvilket slags tag har du nu?', 
            condition: { field: 'disposal', value: 'Ja' },
            options: [
                { label: 'Tagpap', img: '/images/roof_felt_1776270223442.png' },
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
        
        { id: 'leveling', type: 'select', label: 'Spæropretning: Skal det gamle spærlag rettes op i vater, før det nye tag lægges?', condition: { field: 'roofPitch', value: 'Høj rejsning / Normal hældning' }, options: ['Ja, det buer / er skævt (Påforing kræves)', 'Nej, det er snorlige / nybyg'] },
        { id: 'underroof', type: 'select', label: 'Undertag: Skal der monteres nyt undertag (dug/plader)?', condition: { field: 'roofPitch', value: 'Høj rejsning / Normal hældning' }, options: ['Ja', 'Nej, lægges uden / Ikke relevant for valgt tag'] },
        { id: 'insulation', type: 'select', label: 'Skal der efterisoleres udefra, mens taget er af?', options: ['Ja (fx 50-100mm ekstra)', 'Nej'] },
        
        { id: 'eaves', type: 'select', label: 'Træværk: Skal stern og udhæng (underbeklædning) skiftes ud med nyt?', options: ['Ja, alt træværk langs kanten skiftes', 'Nej, vi beholder det gamle'] },
        { id: 'gutters', type: 'select', label: 'Tagrender: Skal der monteres nye tagrender og nedløb?', options: ['Ja (fx Zink/Plast)', 'Nej'] },
        { id: 'chimney', type: 'select', label: 'Inddækning: Er der skorsten eller udluftningshætter, der kræver ny inddækning (bly/zink)?', options: ['Ja', 'Nej'] },

        { id: 'extensions', type: 'select', label: 'Er der nogen kviste (fremspring på taget) eller specielle tilbygninger?', options: ['Ja', 'Nej'] },
        { id: 'extensionsDetails', type: 'text', label: 'Uddyb gerne hvor mange kviste/tilbygninger:', condition: { field: 'extensions', value: 'Ja' } },
        
        { id: 'trailerAccess', type: 'select', label: 'Afskaffelse af affald: Er der mulighed for at stille stor affaldscontainer helt op til huset?', options: ['Ja', 'Nej, den skal stå langt væk'] },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken slags nyt tag skal lægges?',
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
        { id: 'notes', type: 'textarea', label: 'Er der eventuelt andre bemærkninger til taget (fx nye tagvinduer)?' }
    ],
    windows: [
        { id: 'housingType', type: 'select', label: 'Hvilken slags bolig skal du have skiftet vinduer i?', options: ['Sommerhus', 'Helårsbolig'] },
        { id: 'disposal', type: 'select', label: 'Skal de nuværende vinduer afmonteres og afskaffes?', options: ['Ja', 'Nej'] },
        
        { id: 'windowType', type: 'select', label: 'Hvilken slags vinduer drejer opgaven sig om?', options: ['Tagvinduer', 'Facadevinduer', 'Blanding'] },

        // --- Blanding (Quick-Split) ---
        { id: 'roofAmount', type: 'number', label: 'Hvor mange af dem er TAGVINDUER?', condition: { field: 'windowType', value: 'Blanding' } },
        { 
            id: 'roofMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal TAGVINDUERNE være i?', 
            condition: (d) => d.windowType === 'Blanding',
            options: [
                { label: 'Træ', img: '/images/window_wood_1776261054616.png' },
                { label: 'PVC / plast', img: '/images/window_pvc_1776261086057.png' },
                { label: 'Aluminium', img: '/images/window_aluminum_1776261099669.png' },
                { label: 'Træ/alu (kombination)', img: '/images/window_wood_alu_1776261163640.png' },
                { label: 'Stål', img: '/images/window_steel_1776261189808.png' },
                { label: 'Glas', img: '/images/window_glass_1776261205223.png' }
            ] 
        },
        { id: 'facadeAmount', type: 'number', label: 'Hvor mange af dem er FACADEVINDUER?', condition: { field: 'windowType', value: 'Blanding' } },
        { 
            id: 'facadeMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal FACADEVINDUERNE være i?', 
            condition: (d) => d.windowType === 'Blanding',
            options: [
                { label: 'Træ', img: '/images/window_wood_1776261054616.png' },
                { label: 'PVC / plast', img: '/images/window_pvc_1776261086057.png' },
                { label: 'Aluminium', img: '/images/window_aluminum_1776261099669.png' },
                { label: 'Træ/alu (kombination)', img: '/images/window_wood_alu_1776261163640.png' },
                { label: 'Stål', img: '/images/window_steel_1776261189808.png' },
                { label: 'Glas', img: '/images/window_glass_1776261205223.png' }
            ] 
        },

        // --- Standard (Ikke-blanding) ---
        { id: 'amount', type: 'number', label: 'Hvor mange vinduer drejer opgaven sig om i alt?', condition: (d) => d.windowType && d.windowType !== 'Blanding' },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal de nye vinduer være i?', 
            condition: (d) => d.windowType && d.windowType !== 'Blanding',
            options: [
                { label: 'Træ', img: '/images/window_wood_1776261054616.png' },
                { label: 'PVC / plast', img: '/images/window_pvc_1776261086057.png' },
                { label: 'Aluminium', img: '/images/window_aluminum_1776261099669.png' },
                { label: 'Træ/alu (kombination)', img: '/images/window_wood_alu_1776261163640.png' },
                { label: 'Stål', img: '/images/window_steel_1776261189808.png' },
                { label: 'Glas', img: '/images/window_glass_1776261205223.png' }
            ] 
        },

        { id: 'openableCount', type: 'number', label: 'Hvor mange af det samlede antal vinduer skal kunne åbnes?' },
        { id: 'windowMeasurementType', type: 'select', label: 'Er der tale om store panoramavinduer/gulv-til-loft (specialmål)?', options: ['Nej, standard mål', 'Ja, store specialmål / panorama'] },
        { id: 'photos', type: 'file', label: 'Upload meget gerne et billede af vinduerne (indefra/udefra), så vi kan vurdere opgaven:' },
        { id: 'finish', type: 'select', label: 'Skal indvendig finish (fuge og lister) inkluderes propotionalt?', options: ['Ja', 'Nej'] },
        { id: 'notes', type: 'textarea', label: 'Felt til kommentarer/eventuelle bemærkninger til projektet, eller hvis der er noget særligt ved fx panorama/skylines?' }
    ],
    floor: [
        { id: 'amount', type: 'number', label: 'Hvor mange m2 omhandler opgaven cirka?' },
        { id: 'disposal', type: 'select', label: 'Skal det gamle gulv afmonteres og fjernes?', options: ['Ja', 'Nej'] },
        { 
            id: 'oldFloorType', 
            type: 'visual_select', 
            label: 'Hvilket slags gulv skal fjernes?', 
            condition: { field: 'disposal', value: 'Ja' },
            options: [
                { label: 'Trægulv / Parket / Laminat', img: '/images/floor_wood_1776266012828.png' },
                { label: 'Klinker / Fliser', img: '/images/floor_tiles_1776266089581.png' },
                { label: 'Gulvtæppe / Linoleum / Vinyl', img: '/images/floor_linoleum_1776266075430.png' },
                { label: 'Beton', img: '/images/floor_concrete_1776266134608.png' }
            ]
        },
        { id: 'subfloor', type: 'select', label: 'Undergulv: Ligger det nuværende undergulv helt lige og i vater?', options: ['Ja, det er lige og klar til at lægge nyt på', 'Nej, tømreren skal rette det op først (strøer/flydespartel)'] },
        { id: 'underfloorHeating', type: 'select', label: 'Er der (eller skal der etableres) varme i gulvet?', options: ['Ja', 'Nej'] },
        { id: 'underlay', type: 'select', label: 'Underlag: Skal tømreren lægge trinlydsdæmpende underlag (foam/pap) under det nye gulv?', options: ['Ja', 'Nej, ikke relevant'] },
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
                { label: 'Linoleum', img: '/images/floor_linoleum_1776266075430.png' },
                { label: 'Fliser (keramik/porcelæn)', img: '/images/floor_tiles_1776266089581.png' },
                { label: 'Natursten', img: '/images/floor_natural_stone_1776266104705.png' },
                { label: 'Beton', img: '/images/floor_concrete_1776266134608.png' },
                { label: 'Tæppe', img: '/images/floor_carpet_1776266148002.png' },
                { label: 'Kork', img: '/images/floor_cork_1776266162083.png' }
            ] 
        },
        { 
            id: 'floorPattern', 
            type: 'select', 
            label: 'Skal gulvet lægges i et specialmønster?', 
            condition: (d) => ['Træ', 'Massivt træ', 'Parket', 'Laminat'].includes(d.material) || d.ownMaterials === 'Ja, jeg har dem allerede (kun pris på montering)',
            options: ['Nej, helt standard montering', 'Ja, i mønster (fx Sildeben / Chevron)'] 
        },
        { id: 'skirting', type: 'select', label: 'Fodlister: Skal vi levere og montere nye fodlister langs væggene?', options: ['Ja', 'Nej, vi sætter selv lister op / genbruger de gamle'] },
        { id: 'notes', type: 'textarea', label: 'Felt til kommentarer/eventuelle bemærkninger til projektet, som vi ikke har taget højde for?' }
    ],
    doors: [
        { id: 'disposal', type: 'select', label: 'Skal den/de nuværende døre afmonteres og afskaffes?', options: ['Ja', 'Nej'] },
        { id: 'doorType', type: 'select', label: 'Er det indvendige døre eller en ude/fordør?', options: ['Indvendige døre', 'Ude/fordøre', 'Blanding'] },
        { id: 'frameOrLeaf', type: 'select', label: 'Omfang: Skal hele dørkarmen skiftes, eller er det kun selve dørpladen?', options: ['Hele karmen inkl. dør skal skiftes', 'Kun dørpladen (genbrug af eksisterende karm)'] },
        { id: 'thresholds', type: 'select', label: 'Dørtrin: Skal der monteres nye dørtrin (bundstykker) mellem rummene?', condition: (d) => d.doorType === 'Indvendige døre' || d.doorType === 'Blanding', options: ['Ja', 'Nej'] },
        { id: 'hardware', type: 'select', label: 'Beslag: Hvad med dørgreb og evt. låsecylindere?', options: ['Tømreren skal levere standard greb/låse', 'Vi køber selv greb/låse (tømreren skal montere)', 'Vi genbruger de gamle / ikke relevant'] },
        
        // --- Blanding (Quick-Split) ---
        { id: 'exteriorAmount', type: 'number', label: 'Hvor mange af dem er YDERDØRE?', condition: { field: 'doorType', value: 'Blanding' } },
        { 
            id: 'exteriorMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal YDERDØREN(E) være i?', 
            condition: (d) => d.doorType === 'Blanding',
            options: [
                { label: 'Træ', img: '/images/door_wood_1776258921142.png' },
                { label: 'Massivt træ', img: '/images/door_solid_wood_1776258727433.png' },
                { label: 'Finér', img: '/images/door_veneer_1776258742752.png' },
                { label: 'PVC / plast', img: '/images/door_pvc_1776258757167.png' },
                { label: 'Aluminium', img: '/images/door_aluminum_1776258935245.png' },
                { label: 'Stål', img: '/images/door_steel_1776258770815.png' },
                { label: 'Glas', img: '/images/door_glass_1776258949698.png' },
                { label: 'Kompositmaterialer', img: '/images/door_composite_1776258785767.png' }
            ] 
        },
        { id: 'interiorAmount', type: 'number', label: 'Hvor mange af dem er INDVENDIGE døre?', condition: { field: 'doorType', value: 'Blanding' } },
        { 
            id: 'interiorMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal de INDVENDIGE døre være i?', 
            condition: (d) => d.doorType === 'Blanding',
            options: [
                { label: 'Træ', img: '/images/door_wood_1776258921142.png' },
                { label: 'Massivt træ', img: '/images/door_solid_wood_1776258727433.png' },
                { label: 'Finér', img: '/images/door_veneer_1776258742752.png' },
                { label: 'PVC / plast', img: '/images/door_pvc_1776258757167.png' },
                { label: 'Aluminium', img: '/images/door_aluminum_1776258935245.png' },
                { label: 'Stål', img: '/images/door_steel_1776258770815.png' },
                { label: 'Glas', img: '/images/door_glass_1776258949698.png' },
                { label: 'Kompositmaterialer', img: '/images/door_composite_1776258785767.png' }
            ] 
        },

        // --- Standard (Ikke-blanding) ---
        { id: 'amount', type: 'number', label: 'Hvor mange døre drejer opgaven sig om i alt?', condition: (d) => d.doorType === 'Indvendige døre' || d.doorType === 'Ude/fordøre' },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken type dør I gerne vil have sat i?', 
            condition: (d) => (d.doorType === 'Indvendige døre' || d.doorType === 'Ude/fordøre'),
            options: [
                { label: 'Træ', img: '/images/door_wood_1776258921142.png' },
                { label: 'Massivt træ', img: '/images/door_solid_wood_1776258727433.png' },
                { label: 'Finér', img: '/images/door_veneer_1776258742752.png' },
                { label: 'PVC / plast', img: '/images/door_pvc_1776258757167.png' },
                { label: 'Aluminium', img: '/images/door_aluminum_1776258935245.png' },
                { label: 'Stål', img: '/images/door_steel_1776258770815.png' },
                { label: 'Glas', img: '/images/door_glass_1776258949698.png' },
                { label: 'Kompositmaterialer', img: '/images/door_composite_1776258785767.png' }
            ] 
        },

        { id: 'doorMeasurementType', type: 'select', label: 'Er der tale om store dobbeltdøre/fløjdøre eller specialmål?', options: ['Nej, det er standard døre', 'Ja, der er dobbeltdøre/specialmål iblandt'] },
        { id: 'doorPhotos', type: 'file', label: 'Upload evt. gerne et billede af døråbningerne, så kan jeg vurdere dem på forhånd:' },
        
        { id: 'finish', type: 'select', label: 'Gerigter/Finish: Skal vi levere og montere nye indvendige gerigter (lister) og fuge?', condition: (d) => d.frameOrLeaf === 'Hele karmen inkl. dør skal skiftes', options: ['Ja', 'Nej, kun dør og karm / Vi sætter selv lister op'] },
        { id: 'notes', type: 'textarea', label: 'Felt til kommentarer/eventuelle bemærkninger til projektet?' }
    ],
    terrace: [
        { id: 'amount', type: 'number', label: 'Hvor mange m2 terrasse skal der bygges?' },
        { id: 'elevation', type: 'select', label: 'Hvilken type terrasse er der tale om?', options: ['Jordniveau (Almindelig træterrasse på jorden)', 'Hævet terrasse (Hævet mere end 0,5m fra jorden, fx på stolper)', 'Tagterrasse (Skal bygges ovenpå et eksisterende fladt tag)'] },
        { id: 'disposal', type: 'select', label: 'Skal der afmonteres og afskaffes en eksisterende terrasse først?', options: ['Ja', 'Nej'] },
        { id: 'terrain', type: 'select', label: 'Underlag: Hvad skal den nye terrasse bygges på?', condition: (d) => d.elevation !== 'Tagterrasse (Skal bygges ovenpå et eksisterende fladt tag)', options: ['Græs/Jord (Kræver at tømreren graver ud, lægger dug og sætter punktfundament)', 'Eksisterende fliser/beton (Lige til at bygge ovenpå)'] },
        { id: 'roofTerraceFeet', type: 'select', label: 'Tagterrasse underlag: Skal terrassen opklodses på justerbare terrassefødder (skåner tagpappet)?', condition: { field: 'elevation', value: 'Tagterrasse (Skal bygges ovenpå et eksisterende fladt tag)' }, options: ['Ja, den skal klodses op på plastfødder', 'Nej'] },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal den nye terrasse bygges i?',
            options: [
                { label: 'Trykimprægneret fyr', img: '/images/terrace_pine_1776267659903.png' },
                { label: 'Hardwood / Hårdttræ', img: '/images/terrace_hardwood_1776267675662.png' },
                { label: 'Komposit (vedligeholdelsesfrit biomateriale)', img: '/images/terrace_composite_1776267690895.png' }
            ] 
        },
        { id: 'fastening', type: 'select', label: 'Montering: Ønsker du standard eller skjult montering af brædderne?', options: ['Synlige skruer (Standard montering skruet fra toppen)', 'Skjult montering (Skrues fra siden/clips så der ikke er skruehuller i toppen)'] },
        { id: 'railing', type: 'select', label: 'Rækværk/Gelænder: Skal der bygges et rækværk (fx på hævet terrasse eller tagterrasse)?', options: ['Ja, tømreren skal bygge rækværk', 'Nej, ikke relevant / klarer det selv'] },
        { id: 'railingMeters', type: 'number', label: 'Hvor mange løbende meter rækværk/gelænder skal der laves?', condition: { field: 'railing', value: 'Ja, tømreren skal bygge rækværk' } },
        { 
            id: 'terraceComplexity', 
            type: 'select', 
            label: 'Skal terrassen bygges med specielle vinkler, trapper eller integration af plantekasser?', 
            options: ['Nej, primært standard firkantet (eller ikke relevant)', 'Ja, der er specialvinkler, bygning af trappe eller andre integrationer'] 
        },
        { id: 'roofing', type: 'select', label: 'Ønsker du overdækning (tag) over hele eller dele af terrassen?', options: ['Ja', 'Nej'] },
        { id: 'roofingAmount', type: 'number', label: 'Hvor mange m2 skal overdækkes?', condition: { field: 'roofing', value: 'Ja' } },
        { id: 'roofingType', type: 'select', label: 'Hvilken type tag på overdækningen?', options: ['Termoplader / Plastik', 'Fast tag (med tagpap)'], condition: { field: 'roofing', value: 'Ja' } },
        { id: 'notes', type: 'textarea', label: 'Andre bemærkninger til byggeriet (fx hvis der skal laves fald på tagterrassen)?' }
    ],
    kitchen: [
        { id: 'disposal', type: 'select', label: 'Skal det gamle køkken afmonteres og afskaffes?', options: ['Ja, tømreren skal afmontere og afskaffe det', 'Nej, vi gør det selv / der er allerede tomt'] },
        { id: 'oldKitchenPhotos', type: 'file', label: 'Upload evt. et billede af det gamle køkken/rummet:', condition: { field: 'disposal', value: 'Ja, tømreren skal afmontere og afskaffe det' } },
        { id: 'kitchenBrand', type: 'text', label: 'Hvilket mærke/leverandør er det nye køkken fra (fx IKEA, HTH, Kvik)?' },
        { id: 'ownMaterials', type: 'select', label: 'Står du selv for indkøb af selve køkkenet?', options: ['Ja, jeg har allerede købt det (kun pris på montering)', 'Nej, tømreren skal stå for indkøb'] },
        { id: 'materialLink', type: 'text', label: 'Indsæt evt. et link til det køkken du har købt:', condition: { field: 'ownMaterials', value: 'Ja, jeg har allerede købt det (kun pris på montering)' } },
        { id: 'assembly', type: 'select', label: 'Samling af skabe: Leveres elementerne samlet fra fabrik, eller er det i flade kasser (flat-pack)?', options: ['Flat-pack: Tømreren skal samle alle skabe og skuffer (fx IKEA/Kvik)', 'Samlet: Elementerne kommer samlet fra fabrikken (fx HTH/Svane)'] },
        { 
            id: 'kitchenShape', 
            type: 'visual_select', 
            label: 'Hvilken af disse opstillinger minder mest om dit nye køkken?', 
            options: [
                { label: 'Vinkelkøkken (L-formet)', img: '/images/kitchen_l_1776270471428.png' },
                { label: 'U-køkken', img: '/images/kitchen_u_1776270486856.png' },
                { label: 'Enkeltsidet (Lige) køkken', img: '/images/kitchen_straight_1776270501809.png' },
                { label: 'Parallelkøkken (To rækker overfor hinanden)', img: '/images/kitchen_parallel_1777277831456.png' },
                { label: 'Køkken med kogeø', img: '/images/kitchen_island_1776270517874.png' }
            ] 
        },
        { id: 'amount', type: 'number', label: 'Anslået antal skabe og skuffer (elementer) i alt:', placeholder: 'Fx 15' },
        { id: 'worktop', type: 'select', label: 'Bordplade: Skal tømreren tilpasse og montere en bordplade i træ/laminat (inkl. udskæring til vask/kogeplade)?', options: ['Ja, træ/laminat som skal tilpasses på stedet', 'Nej, vi får leveret sten/corian (typisk montør) / Gør det selv'] },
        { id: 'integratedAppliances', type: 'select', label: 'Hvidevarer: Er der fuldt integrerede hvidevarer (hvor tømreren skal finjustere træfronter på køleskab/opvaskemaskine)?', options: ['Ja, der er integrerede træfronter', 'Nej, fritstående hvidevarer / standard'] },
        { id: 'notes', type: 'textarea', label: 'Andre bemærkninger til projektet (fx særlige paneler, emhætte)?' }
    ],
    ceilings: [
        { id: 'amount', type: 'number', label: 'Hvor mange m2 loft skal der laves cirka?' },
        { id: 'disposal', type: 'select', label: 'Skal nuværende loft afmonteres og afskaffes?', options: ['Ja', 'Nej'] },
        { id: 'battensAndLeveling', type: 'select', label: 'Underlag: Skal der laves ny forskalling (træskelet), og evt. rettes op i vater?', options: ['Nej, monteres direkte på eksisterende lige underlag', 'Ja, standard forskalling', 'Ja, forskalling inkl. stor opretning (skævt loft)'] },
        { id: 'vaporAndInsulation', type: 'select', label: 'Dampspærre/Isolering: Ligger loftet op mod et koldt tagrum?', options: ['Nej', 'Ja, monter kun dampspærre', 'Ja, monter dampspærre og isolering (50-100mm)'] },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvad skal det nye loft laves af?',
            options: [
                { label: 'Træloft (listeloft/paneler/rustikloft)', img: '/images/ceiling_wood_1776270268417.png' },
                { label: 'Gipsloft', img: '/images/ceiling_drywall_1776270282269.png' },
                { label: 'Fibergipsloft (Fermacel)', img: '/images/ceiling_fermacell_1776270315915.png' },
                { label: 'Troldtekt (akustikloft)', img: '/images/ceiling_troldtekt_1776270333057.png' },
                { label: 'Nedhængt loft (systemloft)', img: '/images/ceiling_system_1776270352710.png' },
                { label: 'Akustikpaneler (lameller)', img: '/images/ceiling_acoustic_1776270369087.png' }
            ] 
        },
        { 
            id: 'plastering', 
            type: 'select', 
            label: 'Spartling (for gips/fibergips): Skal loftet spartles og slibes (klar til maler)?', 
            condition: (d) => !d.material || ['Gipsloft', 'Fibergipsloft (Fermacel)'].includes(d.material),
            options: ['Nej, vi står selv for spartling/malerarbejde', 'Ja, tømreren skal fuldspartle og slibe (klar til maling)'] 
        },
        { 
            id: 'mouldings', 
            type: 'visual_select', 
            label: 'Afslutning: Hvordan skal kanten mellem loft og væg afsluttes?', 
            options: [
                { label: 'Skyggelister (træ)', img: '/images/ceiling_moulding_1777278068690.png' },
                { label: 'Akrylfuge (malbar)', img: '/images/ceiling_caulk_1777278082407.png' },
                { label: 'Ingen afslutning / Gør det selv' }
            ] 
        },
        { id: 'ceilingHeight', type: 'select', label: 'Lofthøjde: Er der tale om loft-til-kip eller lofthøjde over 2,5 meter?', options: ['Nej, standard lofthøjde', 'Ja, loft-til-kip eller højere end 2,5m'] },
        { id: 'spots', type: 'select', label: 'Spots: Skal tømreren bore ud til indbygningsspots i det nye loft?', options: ['Nej, ingen spots overhovedet', 'Ja, der skal bores ud til spots (fx 1 stk. pr 2. m2)'] },
        { id: 'notes', type: 'textarea', label: 'Er der eventuelle bemærkninger i forhold til montering af loftet?' }
    ],
    facades: [
        { id: 'amount', type: 'number', label: 'Hvor mange m2 træfacade drejer projektet sig om cirka?' },
        { id: 'disposal', type: 'select', label: 'Skal en eksisterende facadebeklædning afmonteres og afskaffes?', options: ['Ja', 'Nej, der monteres direkte ovenpå/ikke relevant'] },
        { 
            id: 'oldFacadeMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale er den nuværende facadebeklædning lavet af?', 
            condition: { field: 'disposal', value: 'Ja' },
            options: [
                { label: 'Gammel træbeklædning', img: '/images/old_facade_wood_1777278987653.png' },
                { label: 'Eternit / Plademateriale (mulig asbest)', img: '/images/old_facade_eternit_1777279001289.png' },
                { label: 'Pudset facade / Mursten', img: '/images/old_facade_brick_1777279017419.png' },
                { label: 'Ved ikke / Andet' }
            ] 
        },
        { id: 'windBarrier', type: 'select', label: 'Underkonstruktion: Skal vi opsætte ny vindspærre og klemlister (anbefales for ventilation)?', options: ['Ja', 'Nej, det eksisterende er i orden / ikke nødvendigt'] },
        { id: 'insulation', type: 'select', label: 'Efterisolering: Skal facaden isoleres yderligere udefra, nu hvor vi er i gang?', options: ['Nej', 'Ja (ca. 50-100mm)'] },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken type facadebeklædning ønsker du?',
            options: [
                { label: 'Trykimprægneret', img: '/images/facade_pine_1776270383566.png' },
                { label: 'Superwood', img: '/images/facade_superwood_1776270423784.png' },
                { label: 'Cedertræ / Hardwood', img: '/images/facade_cedar_1776270440422.png' },
                { label: 'Thermowood', img: '/images/facade_thermowood_1776270455644.png' }
            ] 
        },
        { id: 'mountingStyle', type: 'select', label: 'Hvordan skal beklædningen monteres?', options: ['Vandret (fx Klinkbeklædning)', 'Lodret (fx Listebeklædning - tager lidt længere tid)'] },
        { id: 'openings', type: 'number', label: 'Hvor mange vinduer/døre er der i facaden, som skal have skåret nye trælister/inddækning?', placeholder: 'Fx 2' },
        { id: 'floors', type: 'select', label: 'Hvor mange plan/etager er huset/facaden, der skal beklædes?', options: ['1-plan (Stueplan)', '1½-plan / 2-plan / Mere'] },
        { id: 'notes', type: 'textarea', label: 'Andre bemærkninger til facaden (fx malerarbejde)?' }
    ],
    extensions: [
        { id: 'amount', type: 'number', label: 'Hvor mange kvadratmeter (grundplan) skal tilbygningen være?' },
        { id: 'breakthrough', type: 'select', label: 'Skal der laves en gennembrydning/hul ind til det eksisterende hus?', options: ['Nej, det er en fritstående bygning', 'Ja, en almindelig døråbning', 'Ja, en stor åbning (kræver ståldrager/ingeniør)'] },
        { id: 'wetRoom', type: 'select', label: 'Skal tilbygningen indeholde vådrum (badeværelse, bryggers eller køkken)?', options: ['Nej, kun almindelige rum (stue, værelse mv.)', 'Ja, der skal trækkes VVS og kloak (vådrum)'] },
        { id: 'windowsDoors', type: 'number', label: 'Hvor mange vinduer og udvendige døre skal der ca. sættes i?' },
        { 
            id: 'foundationType', 
            type: 'visual_select', 
            label: 'Hvilken type fundament ønskes der?', 
            options: [
                { label: 'Støbt terrændæk (Beton)', img: '/images/foundation_slab_1777280046564.png' },
                { label: 'Krybekælder (Hævet trægulv)', img: '/images/foundation_crawlspace_1777280061901.png' }
            ] 
        },
        { id: 'access', type: 'select', label: 'Er der fri adgang for maskiner (gravemaskine/lastbil) helt op til fundamentet?', options: ['Ja, nem adgang', 'Nej, al jord skal graves/køres ud med trillebør'] },
        { id: 'floors', type: 'select', label: 'Hvor mange etager skal tilbygningen have?', options: ['1-plan', '1½-plan', '2-plan'] },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken udvendig facadebeklædning ønsker du?', 
            options: [
                { label: 'Træbeklædning', img: '/images/facade_pine_1776270383566.png' },
                { label: 'Hardwood / Cedertræ', img: '/images/facade_cedar_1776270440422.png' },
                { label: 'Skalmur / Mursten', img: '/images/facade_brick_1777276085592.png' } 
            ] 
        },
        { id: 'roofType', type: 'select', label: 'Hvilken tagtype skal tilbygningen have?', options: ['Fladt tag med tagpap', 'Tag med hældning (Tegl/Stål/Pap)'] },
        { 
            id: 'interiorFinish', 
            type: 'visual_select', 
            label: 'Hvor meget af det indvendige arbejde skal vi stå for?', 
            options: [
                { label: 'Nøglefærdig (Vi laver gulve, lofter, gips og lister)', img: '/images/interior_finished_1777280081398.png' },
                { label: 'Råhus (Du står selv for at lukke det indvendigt)', img: '/images/interior_raw_1777280098290.png' }
            ] 
        },
        { id: 'notes', type: 'textarea', label: 'Kort beskrivelse af drømmen om tilbygningen (f.eks. badeværelse, soveværelse, osv.):' }
    ],
    annex: [
        { id: 'annexType', type: 'select', label: 'Hvad er det primære formål med byggeriet?', options: ['Uisoleret skur til opbevaring', 'Isoleret skur/værksted', 'Fuldt beboeligt anneks'] },
        { id: 'amount', type: 'number', label: 'Hvor stort skal det være i m2?' },
        { id: 'disposal', type: 'select', label: 'Skal der rives et eksisterende skur/anneks ned?', options: ['Nej', 'Ja'] },
        { 
            id: 'oldMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale er det eksisterende bygget af?', 
            condition: { field: 'disposal', value: 'Ja' },
            options: [
                { label: 'Træ', img: '/images/old_facade_wood_1777278987653.png' },
                { label: 'Mursten/Beton', img: '/images/old_facade_brick_1777279017419.png' },
                { label: 'Eternit (mulig asbest)', img: '/images/old_facade_eternit_1777279001289.png' },
                { label: 'Andet' }
            ] 
        },
        { id: 'access', type: 'select', label: 'Er der fri adgang for maskiner (gravemaskine/lastbil) helt op til byggepladsen?', options: ['Ja, nem maskinadgang', 'Nej, jord/grus skal køres med trillebør'] },
        { 
            id: 'foundationType', 
            type: 'visual_select', 
            label: 'Hvilken type fundament ønskes der?', 
            options: [
                { label: 'Støbt terrændæk (Beton)', img: '/images/foundation_slab_1777280046564.png' },
                { label: 'Punktfundament / Trægulv', img: '/images/foundation_crawlspace_1777280061901.png' }
            ] 
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal de udvendige facader være i?', 
            options: [
                { label: 'Trykimprægneret fyr', img: '/images/facade_pine_1776270383566.png' },
                { label: 'Eksklusivt træ (Cedertræ/Hardwood)', img: '/images/facade_cedar_1776270440422.png' },
                { label: 'Vedligeholdelsesfrit (Komposit)', img: '/images/terrace_composite_1776267690895.png' }
            ] 
        },
        { 
            id: 'roofType', 
            type: 'visual_select', 
            label: 'Hvilken tagtype ønsker du?', 
            options: [
                { label: 'Fladt tag / ensidig hældning (Tagpap)', img: '/images/annex_roof_flat_1777280796177.png' },
                { label: 'Sadel tag (Høj rejsning)', img: '/images/annex_roof_pitched_1777280812965.png' }
            ] 
        },
        { id: 'notes', type: 'textarea', label: 'Er der specielle ønsker (f.eks. ekstra store døre, indlagt strøm, osv.)?' }
    ],
    carport: [
        { id: 'amount', type: 'number', label: 'Hvor mange carporte ønsker du tilbud på?', placeholder: 'Oftest 1' },
        { id: 'disposal', type: 'select', label: 'Skal der rives en eksisterende carport ned?', options: ['Nej', 'Ja'] },
        { 
            id: 'oldMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale er den eksisterende bygget af?', 
            condition: { field: 'disposal', value: 'Ja' },
            options: [
                { label: 'Træ', img: '/images/old_facade_wood_1777278987653.png' },
                { label: 'Stål/Alu', img: '/images/old_material_steel_1777285347500.png' },
                { label: 'Mursten/Beton', img: '/images/old_facade_brick_1777279017419.png' },
                { label: 'Eternit (mulig asbest tag)', img: '/images/old_facade_eternit_1777279001289.png' },
                { label: 'Andet' }
            ] 
        },
        { 
            id: 'carportType', 
            type: 'visual_select', 
            label: 'Skal det være en enkelt eller dobbelt carport?', 
            options: [
                { label: 'Enkelt carport (Oftest 1 bil)', img: '/images/carport_single_1777284973728.png' },
                { label: 'Dobbelt carport (Plads til 2 biler)', img: '/images/carport_double_1777284988645.png' }
            ] 
        },
        { id: 'shedType', type: 'select', label: 'Ønsker du et integreret redskabsskur?', options: ['Nej', 'Ja - uisoleret', 'Ja - isoleret'] },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket hovedmateriale skal carporten bygges i?', 
            options: [
                { label: 'Trækonstruktion', img: '/images/facade_pine_1776270383566.png' },
                { label: 'Vedligeholdelsesfrit (Stål/Alu)', img: '/images/door_aluminum_1776258935245.png' }
            ] 
        },
        { 
            id: 'roofType', 
            type: 'visual_select', 
            label: 'Hvilken tagtype ønsker du på carporten?', 
            options: [
                { label: 'Fladt tag / ensidig hældning (Tagpap)', img: '/images/annex_roof_flat_1777280796177.png' },
                { label: 'Sadel tag (Høj rejsning m. tegl/stål)', img: '/images/annex_roof_pitched_1777280812965.png' }
            ] 
        },
        { id: 'access', type: 'select', label: 'Er der fri maskinadgang til hvor fundamenterne (stolperne) skal graves?', options: ['Ja, nem maskinadgang', 'Nej, manuel udgravning kræves'] },
        { id: 'notes', type: 'textarea', label: 'Skriv gerne hvis du har andre detaljer (f.eks. oplader til elbil, cykelskur, osv.):' }
    ],
    fence: [
        { id: 'amount', type: 'number', label: 'Hvor mange løbende meter hegn skal der cirka sættes op?' },
        { id: 'disposal', type: 'select', label: 'Skal et eksisterende hegn fjernes?', options: ['Nej', 'Ja'] },
        { 
            id: 'oldMaterial', 
            type: 'visual_select', 
            label: 'Hvilken type hegn er det eksisterende?', 
            condition: { field: 'disposal', value: 'Ja' },
            options: [
                { label: 'Træhegn (alm. brædder/lameller)', img: '/images/old_facade_wood_1777278987653.png' },
                { label: 'Kraftigt raftehegn / Stammer', img: '/images/facade_thermowood_1776270455644.png' },
                { label: 'Hæk / Levende hegn (Rødder skal fjernes)', img: '/images/old_material_hedge_1777285672558.png' },
                { label: 'Metal / Ståltråd / Andet', img: '/images/old_material_steel_1777285347500.png' }
            ] 
        },
        { id: 'fenceHeight', type: 'select', label: 'Hvor højt skal hegnet være?', options: ['Under 1,8 meter', 'Op til 2,0 meter'] },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken type hegn ønsker du?', 
            options: [
                { label: 'Klinkehegn (Træ)', img: '/images/facade_pine_1776270383566.png' },
                { label: 'Lamelhegn (Træ)', img: '/images/facade_superwood_1776270423784.png' },
                { label: 'Raftehegn', img: '/images/facade_thermowood_1776270455644.png' },
                { label: 'Komposit (Vedligeholdelsesfrit)', img: '/images/terrace_composite_1776267690895.png' }
            ] 
        },
        { id: 'notes', type: 'textarea', label: 'Er der specielle udfordringer (f.eks. meget skrå grund, træer i vejen)?' }
    ]
};
