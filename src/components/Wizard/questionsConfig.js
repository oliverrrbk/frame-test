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
    { id: 'special', label: 'Special- & Kombiprojekter', desc: 'Sammensæt flere opgaver / Få digital hjælp', img: '/images/special_carpenter.png' }
];

export const QUESTIONS = {
    roof: [
        { id: 'amount', type: 'number', label: 'Hvor stort er grundplanet af huset (cirka mål i m2)?', tooltip: 'Giv dit eget kvalificerede bud, hvis du er i tvivl. Tømreren dobbelttjekker altid de faktiske forhold ved en besigtigelse.' },
        { id: 'floors', type: 'select', label: 'Hvor mange plan/etager er huset?', options: ['1-plan (Stueplan)', '1½-plan / 2-plan / Mere'] },
        { id: 'houseAge', type: 'number', label: 'Hvilket år er huset bygget (årstal)?', tooltip: 'Indtast byggeåret, fx 1970. Det hjælper tømreren med at forudsige bygningsstil.' },
        { 
            id: 'oldRoofType', 
            type: 'visual_select', 
            label: 'Hvilken type tag er der på nu? (Dette afmonteres og afskaffes altid)', 
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
            id: 'roofPitch', 
            type: 'visual_select', 
            label: 'Hvordan er hældningen på taget?', 
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
            condition: { field: 'roofPitch', value: 'Høj rejsning / Normal hældning' }, 
            options: [
                { label: 'Saddeltag (Almindeligt tag med 2 gavle)', img: '/images/roof_type_saddle.png' },
                { label: 'Valmtag (Tag med fald på alle 4 sider - ingen gavle)', img: '/images/roof_type_valm.png' }
            ] 
        },
        {
            id: 'eavesMaterial',
            type: 'visual_select',
            label: 'Hvilket materiale ønsker du til stern og vindskede?',
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
            condition: { field: 'roofType', value: 'Valmtag (Tag med fald på alle 4 sider - ingen gavle)' },
            options: ['Nej', 'Ja'] 
        },
        { 
            id: 'graterMeters', 
            type: 'number', 
            label: 'Hvor mange meter grat er der cirka i alt?', 
            condition: { field: 'grater', value: 'Ja' } 
        },
        { id: 'chimney', type: 'select', label: 'Er der en eller flere skorstene, der skal inddækkes?', options: ['Nej', 'Ja'] },
        { id: 'chimneyAmount', type: 'number', label: 'Hvor mange skorstene er der?', condition: { field: 'chimney', value: 'Ja' } },
        { 
            id: 'extensions', 
            type: 'select', 
            label: 'Er der kviste på taget (eller skal der monteres kviste)?', 
            condition: (d) => d.roofPitch === 'Høj rejsning / Normal hældning' && d.floors === '1½-plan / 2-plan / Mere',
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
            options: ['Nej', 'Ja'] 
        },
        { 
            id: 'skylightNewAmount', 
            type: 'number', 
            label: 'Hvor mange helt nye ovenlysvinduer ønsker du etableret? (Kræver udskæring af spær/spærudveksling)', 
            condition: { field: 'skylightNew', value: 'Ja' } 
        },
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
        { id: 'roofPhotos', type: 'file', label: 'Upload billeder af dit hus og tag (valgfrit):', tooltip: 'Tag gerne billeder på afstand, så tømreren kan se adgangsforhold og tagfladen.' },
        { id: 'notes', type: 'textarea', label: 'Er der eventuelt andre bemærkninger til taget?' }
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
            subLabel: 'Bemærk, at dette ikke er det endelige design eller valg af vindue. Spørgsmålet er udelukkende medtaget for at give et retvisende prisniveau til dig som kunde, så du har en god idé om, hvad prisen ligger på. Tømreren gennemgår naturligvis alle detaljemål og specifikke designløsninger med dig inden bestilling.',
            options: [
                { label: 'Træ/alu (kombination)', img: '/images/window_wood_alu_1776261163640.png' },
                { label: 'Massivt træ', img: '/images/window_wood_1776261054616.png' },
                { label: 'PVC / plast', img: '/images/window_pvc_1776261086057.png' },
                { label: 'Aluminium', img: '/images/window_aluminum_1776261099669.png' },
                { label: 'Stål', img: '/images/window_steel_1776261189808.png' }
            ] 
        },
        {
            id: 'qualityLevel',
            type: 'select',
            label: 'Hvilket kvalitetsniveau ønsker du på vinduerne?',
            tooltip: 'Robust standardkvalitet er yderst holdbare og populære elementer. Eksklusiv Premiumkvalitet er high-end elementer (fx Mahogni) med uforlignelig holdbarhed og glød.',
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
        },
        { 
            id: 'notes', 
            type: 'textarea', 
            label: 'Felt til kommentarer/eventuelle bemærkninger til projektet? (VIGTIGT: Særlige ønsker beskrevet her påvirker ikke den foreløbige pris, men kan gøre det endelige tilbud dyrere, hvis de kræver specialløsninger)' 
        }
    ],
    floor: [
        { id: 'amount', type: 'number', label: 'Hvor mange m2 omhandler opgaven (cirka mål)?', tooltip: 'Giv dit eget kvalificerede bud. Det præcise areal måles op senere af tømreren.' },
        { id: 'disposal', type: 'select', label: 'Skal det gamle gulv afmonteres og fjernes?', options: ['Ja, tømreren skal afmontere OG bortskaffe det', 'Ja, tømreren skal kun afmontere (vi kører det selv væk)', 'Nej, vi har selv afmonteret det / der er tomt'] },
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
        { id: 'underfloorHeating', type: 'select', label: 'Er der (eller skal der etableres) varme i gulvet?', options: ['Nej', 'Ja, der er allerede støbt gulvvarme (kun specialunderlag kræves)', 'Ja, tømreren skal opbygge nyt gulvvarme (sporplader/varmefordeling)'] },
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
        { id: 'specificFloorWishes', type: 'select', label: 'Har du specifikke ønsker til gulvets mærke eller type (fx klikgulv)?', options: ['Nej, tømreren skal komme med en faglig vurdering', 'Ja, jeg har specifikke ønsker'] },
        { id: 'specificFloorDetails', type: 'textarea', label: 'Beskriv dine specifikke ønsker (f.eks. "Klikgulv", et bestemt mærke eller indsæt et link):', condition: { field: 'specificFloorWishes', value: 'Ja, jeg har specifikke ønsker' } },
        { 
            id: 'floorPattern', 
            type: 'select', 
            label: 'Skal gulvet lægges i et specialmønster?', 
            condition: (d) => ['Træ', 'Massivt træ', 'Parket', 'Laminat'].includes(d.material),
            options: ['Nej, helt standard montering', 'Ja, i mønster (fx Sildeben / Chevron)'] 
        },
        { 
            id: 'floorObstacles', 
            type: 'select', 
            label: 'Er der faste elementer midt i rummet (f.eks. køkkenø, bærende søjler, skorsten eller mange rør)?', 
            tooltip: 'Faste elementer midt på gulvarealet kræver præcisions-udskæring, ekstra dækningslister/fuger og tager længere tid for tømreren.',
            options: [
                'Nej, rummet er regulært',
                'Ja, det er der (køkkenø, søjler, skorsten eller rør)'
            ] 
        },
        { 
            id: 'floorDoorsNear', 
            type: 'select', 
            label: 'Er der indvendige døre i rummet (som grænser helt op til gulvet)?', 
            tooltip: 'Nyt gulv (og evt. undergulv) ændrer ofte gulvhøjden. Det betyder, at indvendige døre, der støder op til det nye gulv, skal tilpasses i bunden eller udskiftes. Tømreren vil vurdere dette præcist ved besigtigelsen. Vi har medtaget en standard tilpasning af dørene i prisen, men hvis det ikke kan udføres pænt, kan det kræve udskiftning, hvilket afklares endeligt ved besigtigelsen.',
            options: ['Nej', 'Ja'] 
        },
        { 
            id: 'floorDoorsCount', 
            type: 'number', 
            label: 'Hvor mange indvendige døre er der cirka i rummet i alt?', 
            condition: { field: 'floorDoorsNear', value: 'Ja' },
            default: 1
        },
        { id: 'notes', type: 'textarea', label: 'Felt til kommentarer/eventuelle bemærkninger til projektet, som vi ikke har taget højde for? (VIGTIGT: Særlige ønsker beskrevet her påvirker ikke den foreløbige pris, men kan gøre det endelige tilbud dyrere, hvis de kræver specialløsninger)' }
    ],
    doors: [
        { 
            id: 'disposal', 
            type: 'select', 
            label: 'Skal de nuværende døre afmonteres og afskaffes?', 
            options: [
                'Ja, tømreren skal afmontere OG bortskaffe dem', 
                'Ja, tømreren skal kun afmontere (vi kører dem selv væk)', 
                'Nej, vi har selv afmonteret'
            ] 
        },
        { 
            id: 'amount', 
            type: 'number', 
            label: 'Hvor mange døre drejer opgaven sig cirka om i alt?', 
            tooltip: 'Giv dit eget kvalificerede bud. Det endelige antal og mål bekræftes af tømreren ved opmåling.', 
            default: 1
        },
        {
            id: 'doorStyle',
            type: 'visual_select',
            label: 'Hvilken dørtype skal monteres?',
            tooltip: 'Vælg om der er tale om indvendige døre eller udvendige døre (terrasse/hoveddør). Bemærk at dette udelukkende er vejledende for at give et estimat - det endelige design og de præcise mål aftales ved besigtigelsen.',
            options: [
                { label: 'Indvendig dør', img: '/images/door_interior_standard.png' },
                { label: 'Terrassedør', img: '/images/door_terrace_wood.png' },
                { label: 'Hoveddør (Udvendig)', img: '/images/door_solid_wood.png' }
            ]
        },
        {
            id: 'doorModel',
            type: 'visual_select',
            label: 'Hvilken dør-model / kvalitetsniveau ønsker du?',
            condition: (d) => d.doorStyle === 'Indvendig dør',
            tooltip: 'Vælg mellem en standard glat celledør eller en specialdør (fx med fyldninger/paneler eller New Yorker-stil).',
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
            subLabel: 'Bemærk, at dette ikke er det endelige design eller valg af dør. Spørgsmålet er udelukkende medtaget for at give et retvisende prisniveau til dig som kunde, så du har en god idé om, hvad prisrammen ligger på. Tømreren gennemgår naturligvis alle detaljer, mål og specifikke designønsker med dig inden bestilling.',
            tooltip: 'Bemærk, at dette ikke er det endelige design eller valg af dør. Spørgsmålet er udelukkende medtaget for at give et vejledende prisniveau til dig som kunde, så du har en god idé om, hvad prisrammen ligger på. Tømreren gennemgår naturligvis alle detaljer, mål og specifikke designønsker med dig inden bestilling.',
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
                { label: 'Massivt træ', img: '/images/door_solid_wood_1776258727433.png' },
                { label: 'Massivt træ og glas', img: '/images/door_solid_wood_glass.png' },
                { label: 'Finér', img: '/images/door_veneer_1776258742752.png' },
                { label: 'PVC', img: '/images/door_pvc_solid.png' },
                { label: 'PVC og glas', img: '/images/door_pvc_glass.png' },
                { label: 'Aluminium', img: '/images/door_aluminum_1776258935245.png' },
                { label: 'Træ / Alu (Kombination)', img: '/images/door_wood_alu.png' },
                { label: 'Træ / Alu med glas', img: '/images/door_wood_alu_glass.png' }
            ] 
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal terrassedøren være i?', 
            condition: (d) => d.doorStyle === 'Terrassedør',
            tooltip: 'Terrassedøre er næsten altid glasdøre. Vælg mellem forskellige holdbare karmmaterialer.',
            options: [
                { label: 'Træ (med glas)', img: '/images/door_terrace_wood.png' },
                { label: 'PVC / Plast (med glas)', img: '/images/door_terrace_pvc.png' },
                { label: 'Træ / Alu (Kombination, med glas)', img: '/images/door_terrace_wood_alu.png' },
                { label: 'Aluminium (med glas)', img: '/images/door_terrace_alu.png' },
                { label: 'Fuldglas (skydedør)', img: '/images/door_terrace_fullglass.png' }
            ] 
        },
        {
            id: 'electricLock',
            type: 'select',
            label: 'Ønskes der monteret elektrisk lås (f.eks. Yale Doorman)?',
            tooltip: 'En elektrisk lås giver øget sikkerhed og nøglefri adgang. Tømreren leverer og monterer låseenheden komplet inkl. fræsning i karm.',
            options: ['Nej, vi ønsker standard lås/greb', 'Ja, tømreren skal levere og montere elektrisk lås']
        },
        { 
            id: 'doorHinge', 
            type: 'visual_select', 
            label: 'Hvordan skal døren hængsles og åbne?', 
            tooltip: 'Hængslingen bestemmes ved at se døren fra den side, hvor hængslerne er synlige. Højrehængt betyder at hængslerne sidder i højre side, og døren svinger til højre.',
            options: [
                { label: 'Højrehængt indadgående', img: '/images/hinge_right_in.png' },
                { label: 'Højrehængt udadgående', img: '/images/hinge_right_out.png' },
                { label: 'Venstrehængt indadgående', img: '/images/hinge_left_in.png' },
                { label: 'Venstrehængt udadgående', img: '/images/hinge_left_out.png' },
                { label: 'Ved ikke (Tømreren vurderer)', img: '/images/door_hinge_unknown.png' }
            ] 
        },
        { 
            id: 'doorPhotos', 
            type: 'file', 
            label: 'Upload evt. billeder af døråbningerne:',
            tooltip: 'VIGTIGT: Tag gerne billeder på afstand, så man kan se eventuelle overliggende lamper, stikkontakter, rør eller andet, som tømreren skal tage højde for.'
        },
        { 
            id: 'notes', 
            type: 'textarea', 
            label: 'Særlige ønsker eller kommentarer til dørene?',
            tooltip: 'Beskriv eventuelle specielle ønsker, fx farve, glastype, dørpumper, kattelem eller lignende.'
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
        { id: 'disposal', type: 'select', label: 'Skal der afmonteres og afskaffes en eksisterende terrasse først?', options: ['Ja, tømreren skal afmontere OG bortskaffe den', 'Ja, tømreren skal kun afmontere (vi kører det selv væk)', 'Nej'] },
        { id: 'roofTerraceFeet', type: 'select', label: 'Tagterrasse underlag: Skal terrassen opklodses på justerbare terrassefødder (skåner tagpappet)?', condition: { field: 'elevation', value: 'Tagterrasse' }, options: ['Ja, den skal klodses op på plastfødder', 'Nej'] },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilket materiale skal den nye terrasse bygges i?',
            options: [
                { label: 'Trykimprægneret', img: '/images/terrace_pine_1776267659903.png' },
                { label: 'Thermowood', img: '/images/facade_thermowood_1776270455644.png' },
                { label: 'Cedertræ / Hardwood', img: '/images/terrace_hardwood_1776267675662.png' },
                { label: 'Komposit', img: '/images/terrace_composite_1776267690895.png' }
            ] 
        },
        { 
            id: 'railing', 
            type: 'select', 
            label: 'Rækværk/Gelænder: Skal der bygges et rækværk (fx på hævet terrasse eller tagterrasse)?', 
            options: ['Ja, tømreren skal bygge rækværk', 'Nej, ikke relevant / klarer det selv'] 
        },
        { 
            id: 'railingMaterial',
            type: 'visual_select',
            label: 'Hvilket materiale skal rækværket være i?',
            condition: (d) => d.railing === 'Ja, tømreren skal bygge rækværk',
            options: [
                { label: 'Glas rækværk', img: '/images/railing_glass.png' },
                { label: 'Træ rækværk', img: '/images/railing_wood.png' },
                { label: 'Rustfrit stål rækværk', img: '/images/railing_steel.png' },
                { label: 'Blanding af træ og rustfrit stål', img: '/images/railing_wood_steel.png' }
            ]
        },
        { 
            id: 'railingMeters', 
            type: 'number', 
            label: 'Hvor mange løbende meter rækværk/gelænder skal der cirka laves?', 
            condition: { field: 'railing', value: 'Ja, tømreren skal bygge rækværk' } 
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
            options: ['Ja, tømreren skal montere markise', 'Nej'] 
        },
        { 
            id: 'awningType', 
            type: 'visual_select', 
            label: 'Hvilken type markise ønsker du?', 
            condition: { field: 'awning', value: 'Ja, tømreren skal montere markise' }, 
            options: [
                { label: 'Manuel markise', img: '/images/awning_manual.png' },
                { label: 'Elektrisk markise (med motor og fjernbetjening)', img: '/images/awning_electrical.png' }
            ] 
        },
        { 
            id: 'terracePhotos', 
            type: 'file', 
            label: 'Upload billeder af det nuværende areal (valgfrit):',
            tooltip: 'Tag gerne billeder på afstand af huset og haven, hvor terrassen skal ligge. Det hjælper tømreren med at vurdere forholdene.' 
        },
        { 
            id: 'notes', 
            type: 'textarea', 
            label: 'Andre bemærkninger til byggeriet (fx hvis der skal laves fald på tagterrassen)? (VIGTIGT: Særlige ønsker beskrevet her påvirker ikke den foreløbige pris, men kan gøre det endelige tilbud dyrere, hvis de kræver specialløsninger)' 
        }
    ],
    kitchen: [
        { id: 'disposal', type: 'select', label: 'Skal det gamle køkken afmonteres og afskaffes?', options: ['Ja, tømreren skal afmontere OG bortskaffe det', 'Ja, tømreren skal kun afmontere (vi kører det selv væk)', 'Nej, vi gør det selv / der er allerede tomt'] },
        { id: 'oldKitchenPhotos', type: 'file', label: 'Upload evt. et billede af det gamle køkken/rummet:', condition: { field: 'disposal', value: 'Ja, tømreren skal afmontere OG bortskaffe det' } },
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
        { id: 'amount', type: 'number', label: 'Anslået/cirka antal skabe og skuffer (elementer) i alt:', placeholder: 'Fx 15' },
        { id: 'worktop', type: 'select', label: 'Bordplade: Skal tømreren tilpasse og montere en bordplade i træ/laminat (inkl. udskæring til vask/kogeplade)?', tooltip: 'Nogle specialbordplader (fx sten, marmor eller Corian) bliver ofte opmålt og monteret direkte af leverandøren (stenhuggeren). Tømreren skærer typisk kun standard træ- og laminatbordplader til på stedet.', options: ['Ja, træ/laminat som skal tilpasses på stedet', 'Nej, vi får leveret sten/corian (typisk montør) / Gør det selv'] },
        { id: 'integratedAppliances', type: 'select', label: 'Hvidevarer: Er der fuldt integrerede hvidevarer (hvor tømreren skal finjustere træfronter på køleskab/opvaskemaskine)?', options: ['Ja, der er integrerede træfronter', 'Nej, fritstående hvidevarer / standard'] },
        { id: 'notes', type: 'textarea', label: 'Andre bemærkninger til projektet (fx særlige paneler, emhætte)? (VIGTIGT: Særlige ønsker beskrevet her påvirker ikke den foreløbige pris, men kan gøre det endelige tilbud dyrere, hvis de kræver specialløsninger)' }
    ],
    ceilings: [
        { id: 'amount', type: 'number', label: 'Hvor mange m2 loft skal der laves (cirka mål)?' },
        { 
            id: 'oldCeilingType', 
            type: 'visual_select', 
            label: 'Hvilken type loft er der på nu? (Dette afmonteres og afskaffes altid)',
            options: [
                { label: 'Træloft (listeloft/paneler/rustikloft)', img: '/images/ceiling_wood_1776270268417.png' },
                { label: 'Gipsloft (standard 2-lag)', img: '/images/ceiling_drywall_1776270282269.png' },
                { label: 'Lydgipsloft (lyddæmpende gips)', img: '/images/ceiling_drywall_1776270282269.png' },
                { label: 'Fibergipsloft (Fermacel)', img: '/images/ceiling_fermacell_1776270315915.png' },
                { label: 'Troldtekt (akustikloft)', img: '/images/ceiling_troldtekt_1776270333057.png' },
                { label: 'Nedhængt loft (systemloft)', img: '/images/ceiling_system_1776270352710.png' },
                { label: 'Akustikpaneler (lameller)', img: '/images/ceiling_acoustic_1776270369087.png' },
                { label: 'Ved ikke', img: '/images/subfloor_unknown.png' }
            ]
        },
        { 
            id: 'vaporAndInsulation', 
            type: 'select', 
            label: 'Hvad ligger der umiddelbart ovenover det nye loft?', 
            tooltip: 'Hvis der er et koldt loftrum (f.eks. spidsloft), skal der lovmæssigt monteres en dampspærre (en plastdug) under loftet for at forhindre fugtskader i tagkonstruktionen.', 
            options: [
                'Opvarmet etage (Ingen dampspærre nødvendig)', 
                'Koldt tagrum (Lovkrav om plast-dampspærre)', 
                'Koldt tagrum inkl. ny isolering (Dampspærre + Isolering)',
                'Ved ikke / Uvist (Beregner dampspærre som sikkerhed)'
            ] 
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvad skal det nye loft laves af?',
            options: [
                { label: 'Træloft (listeloft/paneler/rustikloft)', img: '/images/ceiling_wood_1776270268417.png' },
                { label: 'Gipsloft (standard 2-lag)', img: '/images/ceiling_drywall_1776270282269.png' },
                { label: 'Lydgipsloft (lyddæmpende gips)', img: '/images/ceiling_drywall_1776270282269.png' },
                { label: 'Fibergipsloft (Fermacel)', img: '/images/ceiling_fermacell_1776270315915.png' },
                { label: 'Troldtekt (akustikloft)', img: '/images/ceiling_troldtekt_1776270333057.png' },
                { label: 'Nedhængt loft (systemloft)', img: '/images/ceiling_system_1776270352710.png' },
                { label: 'Akustikpaneler (lameller)', img: '/images/ceiling_acoustic_1776270369087.png' }
            ] 
        },
        {
            id: 'spots',
            type: 'select',
            label: 'Skal der etableres spots eller nye lampesteder?',
            options: ['Nej', 'Ja']
        },
        {
            id: 'spotsAmount',
            type: 'number',
            label: 'Hvor mange spots/lampesteder skal der etableres i alt?',
            condition: (d) => d.spots === 'Ja',
            placeholder: 'Fx 6'
        },
        { id: 'ceilingHeight', type: 'select', label: 'Lofthøjde: Er der tale om loft-til-kip eller lofthøjde over 2,5 meter?', options: ['Nej, standard lofthøjde', 'Ja, loft-til-kip eller højere end 2,5m'] },
        { id: 'notes', type: 'textarea', label: 'Er der eventuelle bemærkninger i forhold til montering af loftet? (VIGTIGT: Særlige ønsker beskrevet her påvirker ikke den foreløbige pris, men kan gøre det endelige tilbud dyrere, hvis de kræver specialløsninger)' }
    ],
    facades: [
        { id: 'amount', type: 'number', label: 'Hvor mange m2 træfacade drejer projektet sig om (cirka mål)?' },
        { 
            id: 'oldFacadeMaterial', 
            type: 'select', 
            label: 'Hvad består den nuværende facade/yderbeklædning af?', 
            options: [
                'Mursten / Pudset væg (Beholdes som underlag, ny facade monteres udenpå)',
                'Gammel træbeklædning (Skal rives ned og fjernes)',
                'Stålplader / Plademateriale (Skal rives ned og fjernes)',
                'Ingen (Nybyg / Råt træskelet)'
            ] 
        },
        { 
            id: 'material', 
            type: 'visual_select', 
            label: 'Hvilken type facadebeklædning ønsker du?',
            options: [
                { label: 'Trykimprægneret', img: '/images/facade_pine_1776270383566.png' },
                { label: 'Superwood', img: '/images/facade_superwood_1776270423784.png' },
                { label: 'Thermowood', img: '/images/facade_thermowood_1776270455644.png' },
                { label: 'Cedertræ / Hardwood', img: '/images/facade_cedar_1776270440422.png' },
                { label: 'Komposit', img: '/images/terrace_composite_1776267690895.png' }
            ] 
        },
        { id: 'mountingStyle', type: 'select', label: 'Hvordan skal beklædningen monteres?', options: ['Vandret (fx Klinkbeklædning)', 'Lodret (fx Listebeklædning - tager lidt længere tid)'] },
        { id: 'openings', type: 'number', label: 'Hvor mange vinduer/døre er der cirka i facaden, som skal have skåret nye trælister/inddækning?', placeholder: 'Fx 2' },
        { id: 'floors', type: 'select', label: 'Hvor mange plan/etager er huset/facaden, der skal beklædes?', options: ['1-plan (Stueplan)', '1½-plan / 2-plan / Mere'] },
        { id: 'notes', type: 'textarea', label: 'Andre bemærkninger til facaden (fx malerarbejde)? (VIGTIGT: Særlige ønsker beskrevet her påvirker ikke den foreløbige pris, men kan gøre det endelige tilbud dyrere, hvis de kræver specialløsninger)' }
    ],
    extensions: [
        { id: 'notes', type: 'textarea', label: 'Beskriv jeres drømme og tanker om tilbygningen:', placeholder: 'Hvad skal tilbygningen bruges til, og hvor stor tænker I, den skal være? (Har I f.eks. allerede tegninger eller idéer til badeværelse/stue?)' }
    ],
    annex: [
        { id: 'annexType', type: 'select', label: 'Hvad er det primære formål med byggeriet?', options: ['Uisoleret skur til opbevaring', 'Isoleret skur/værksted', 'Fuldt beboeligt anneks'] },
        { id: 'amount', type: 'number', label: 'Hvor stort skal det være i m2 (cirka mål)?' },
        { id: 'disposal', type: 'select', label: 'Skal der rives et eksisterende skur/anneks ned?', options: ['Nej, der er frit', 'Ja, tømreren skal rive ned OG bortskaffe det', 'Ja, tømreren skal kun rive ned (vi kører det selv væk)'] },
        { 
            id: 'oldMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale er det eksisterende bygget af?', 
            condition: (d) => d.disposal && d.disposal.startsWith('Ja'),
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
            options: [
                { label: 'Trykimprægneret', img: '/images/facade_pine_1776270383566.png' },
                { label: 'Superwood', img: '/images/facade_superwood_1776270423784.png' },
                { label: 'Thermowood', img: '/images/facade_thermowood_1776270455644.png' },
                { label: 'Cedertræ / Hardwood', img: '/images/facade_cedar_1776270440422.png' },
                { label: 'Komposit', img: '/images/terrace_composite_1776267690895.png' }
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
        { id: 'notes', type: 'textarea', label: 'Er der specielle ønsker (f.eks. ekstra store døre, indlagt strøm, osv.)? (VIGTIGT: Særlige ønsker beskrevet her påvirker ikke den foreløbige pris, men kan gøre det endelige tilbud dyrere, hvis de kræver specialløsninger)' }
    ],
    carport: [
        { id: 'amount', type: 'select', label: 'Hvor mange carporte ønsker du tilbud på?', options: ['1', '2', '3', 'Flere (Beskrives i noter)'] },
        { id: 'disposal', type: 'select', label: 'Skal der rives en eksisterende carport ned?', options: ['Nej, der er frit', 'Ja, tømreren skal rive ned OG bortskaffe den', 'Ja, tømreren skal kun rive ned (vi kører det selv væk)'] },
        { 
            id: 'oldMaterial', 
            type: 'visual_select', 
            label: 'Hvilket materiale er den eksisterende bygget af?', 
            condition: (d) => d.disposal && d.disposal.startsWith('Ja'),
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
                { label: 'Trykimprægneret', img: '/images/facade_pine_1776270383566.png' },
                { label: 'Superwood', img: '/images/facade_superwood_1776270423784.png' },
                { label: 'Thermowood', img: '/images/facade_thermowood_1776270455644.png' },
                { label: 'Cedertræ / Hardwood', img: '/images/facade_cedar_1776270440422.png' },
                { label: 'Komposit', img: '/images/terrace_composite_1776267690895.png' },
                { label: 'Stål/Alu', img: '/images/door_aluminum_1776258935245.png' }
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
        { id: 'notes', type: 'textarea', label: 'Skriv gerne hvis du har andre detaljer (f.eks. oplader til elbil, cykelskur, osv.): (VIGTIGT: Særlige ønsker beskrevet her påvirker ikke den foreløbige pris, men kan gøre det endelige tilbud dyrere, hvis de kræver specialløsninger)' }
    ],
    fence: [
        { id: 'amount', type: 'number', label: 'Hvor mange løbende meter hegn skal der sættes op (cirka mål)?' },
        { id: 'disposal', type: 'select', label: 'Skal et eksisterende hegn fjernes?', options: ['Nej, der er frit', 'Ja, tømreren skal fjerne det OG bortskaffe det', 'Ja, tømreren skal kun fjerne det (vi kører det selv væk)'] },
        { 
            id: 'oldMaterial', 
            type: 'visual_select', 
            label: 'Hvilken type hegn er det eksisterende?', 
            condition: (d) => d.disposal && d.disposal.startsWith('Ja'),
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
                { label: 'Klinkehegn (Træ)', img: '/images/fence_klinke_1778675155755.png' },
                { label: 'Listehegn (Træ)', img: '/images/fence_liste_1778675176127.png' },
                { label: 'Lamelhegn (Træ)', img: '/images/fence_lamel_1778675189539.png' },
                { label: 'Raftehegn (Træ)', img: '/images/fence_rafte_1778675204391.png' },
                { label: 'Komposithegn', img: '/images/fence_komposit_1778675219569.png' }
            ] 
        },
        { id: 'notes', type: 'textarea', label: 'Er der specielle udfordringer (f.eks. meget skrå grund, træer i vejen)? (VIGTIGT: Særlige ønsker beskrevet her påvirker ikke den foreløbige pris, men kan gøre det endelige tilbud dyrere, hvis de kræver specialløsninger)' }
    ]
};
