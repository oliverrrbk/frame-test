/**
 * 1. TØMRERENS INDSTILLINGER (Motorrummet for den enkelte tømrer/virksomhed)
 * Dette vil i fremtiden blive trukket fra en database, hvor den enkelte virksomhed
 * logget ind og sat deres egne takster.
 */
export const CARPENTER_SETTINGS = {
    hourlyRate: 550,           // Standard timeløn i DKK ekskl. moms (25% moms lægges oveni til sidst i beregneren)
    materialMarkup: 1.15,      // +15% avance på indkøb af materialer
    drivingFee: 600,           // Fast opstartsgebyr/kørsel
    trailerDisposalFee: 800,   // Lille miljøtillæg (kørsel til genbrugsplads med egen trailer)
    containerDisposalFee: 2500, // Fast pris for leje af standard container inkl. bortskaffelsesgebyr
    riskMargin: 1.25           // +25% tidsbuffer hvis opgaven mangler vital info (fx ukendt spærafstand)
};

/**
 * 2. SAAS PLATFORMENS LIVE-INDEKS (Holdes opdateret af platformsejeren)
 * Vejledende indkøbspriser i DKK.
 */
export const MATERIAL_INDEX = {
    roof: {
        // Indkøbspris i kr pr m² faktisk tagflade. Tidligere var alle priser sat
        // 5-10x for høje pga. forveksling med "kundepris pr m² inkl. arbejde".
        'Paptag': 80,             // typisk rul 60-100 kr/m²
        'Tegl': 130,              // standard B&C / Wienerberger 80-180 kr/m²
        'Stål': 250,              // stålplader 200-300 kr/m²
        'Stålplader': 250,
        'Tagplader (eternit asbest fri)': 220,
        'Decra': 450,             // tegl-look stål, premium
        'Betontagsten': 110,      // billigere end tegl
        'Skiffer (hårdt materiale)': 700,
        'Skiffer (blødt materiale)': 600,
        'Stråtag (tækket tag)': 1500,  // strå inkl. tækkesnore 1200-1800 kr/m²
        'Metal-tag (zink, stål, kobber)': 800,  // varierer kraftigt, gns
        'Default': 200,
        // Tillæg tag (per m² roof unless noted)
        'Undertag (dug)': 120,
        'Opretning af spær (Påforing)': 80,
        // Følgende to opmåles nu i LØBENDE METER, ikke m² roof
        'Stern træværk (pr løbende meter)': 150,
        'Tagrender og nedløb (pr løbende meter)': 250,
        'Skorstensinddækning (Zink/Bly)': 3500,
        'Ovenlysvindue fladt tag (pr. stk)': 14000,
        'Kant-sikring / Rullestillads 1-plan (pr m2 grundplan)': 45,
        'Stilladsleje 1½-plan/2-plan (pr m2 grundplan)': 150,
        'Stilladsleje høj rejsning (pr m2 grundplan)': 100,
        'Miljødeponi asbest (pr m2)': 150,
        'Bortskaffelse af stråtag (ekstra volumen pr m2)': 200,
        'Efterisolering af tag (pr m2)': 120,
        'Gavlbeklædning i træ (pr m2 gavl)': 500,
        'Montagematerialer (Skruer, fugleklodser, rygning) pr m2': 75,
        'Kvist (Inddækning og montering pr stk)': 12000,
        'Ovenlysvindue / Velux (pr. stk)': 8000,
        'Nyt ovenlysvindue / Velux (pr. stk)': 9500,
        'Nyt ovenlysvindue fladt tag (pr. stk)': 16000,
        'Skotrende zink (pr løbende meter)': 350,
        'Grat/Kip zink (pr løbende meter)': 250,
        'Stern/Vindskede i Zink (tillæg pr meter)': 180,
        'Stern/Vindskede i Eternit (tillæg pr meter)': 120,
        'Stern/Vindskede i Kobber (tillæg pr meter)': 450,
        'Stern/Vindskede i Træ': 0
    },
    windows: {
        'Træ': 5000,                                  // Standard træ-vindue 1,2x1,2m 4-6,5k
        'PVC / plast': 3800,                          // PVC er reelt billigt
        'Aluminium': 8000,
        'Træ/alu (kombination)': 9500,                // Hævet til high-end worst-case (før 7500)
        'Stål': 12000,                                // Stålvinduer (industri-look) 10-15k
        'Glas': 9500,
        'Default': 6000,
        // Specialvinduer — basispriser før areal-skalering i calculator
        'Panorama/Specialmål': 22000,                 // ca 4 m² panorama før skalering
        'Skydedør': 65000,                            // Hævet til high-end worst-case (før 55000)
        'Ovenlysvindue / Velux (pr. stk)': 8000,
        'Tillæg: Stillads/Lift leje': 8000,
        'Leje af rullestillads (lille opgave)': 1500,
        'Leje af glasløfter/sugekop (pr. tungt vindue)': 750,
        'Montagematerialer (Udvendig fuge/skruer/kiler)': 150,
        'Sikkerhedsglas (Personsikkerhed BR18)': 1500,
        'Skydedørsbeslag/Mekanisme': 8000,
        'Indvendig finish (Gerigter/Fuge) proxy': 200
    },
    floor: {
        'Træ': 600,
        'Massivt træ': 1500,                          // Hævet til high-end worst-case (før 1200)
        'Parket': 750,
        'Laminat': 350,                               // Hævet til high-end worst-case (før 250)
        'Vinyl': 300,                                 // Klikvinyl 200-400 kr/m²
        'Linoleum': 400,
        'Default': 400,
        // Tillæg gulve
        'Trinlydsunderlag (Foam)': 45,
        'Opretning af undergulv': 120, // Kiler/strøer eller flydespartel proxy
        'Bærende undergulv (Spånplader)': 120,
        'Gulvvarme (Sporplader)': 450,
        'Gulvvarme (Specialunderlag)': 80,
        'Limning (Fuldlimning af mønstergulv)': 60,
        'Fodlister (pr. m2 gulvareal proxy)': 50,
        'Bortskaffelse af gulv (pr m2)': 50,
        'Bortskaffelse af tungt gulv (pr m2)': 120
    },
    doors: {
        'Standard indvendig dør': 1200,
        'Special indvendig dør': 7500,
        'Standard terrassedør': 6500,
        'Special/Dobbelt terrassedør': 14500,
        'Robust standard hoveddør': 9500,
        'Premium/High-End hoveddør': 18500,
        
        // Materialer (tillæg/fradrag i forhold til baseline yderdør)
        'Massivt træ': 0,
        'Massivt træ og glas': 3500,
        'Finér': -1500,
        'PVC og glas': -1000,
        'Aluminium': 4500,
        'Træ / Alu (Kombination)': 3000,
        
        // Tillæg døre
        'Dørgreb inkl roset': 350,
        'Sikkerhedslås (Yderdør)': 1500,
        'Dørtrin / Bundstykke': 250,
        'Gerigter (sæt)': 300,
        'Elektrisk lås': 3500,
        'Default': 5500
    },
    terrace: {
        'Trykimprægneret': 220,                       // Standard trykimp. brædder 180-280
        'Thermowood': 600,
        'Cedertræ / Hardwood': 850,                   // Cumaru/Ipé 700-1100
        'Komposit': 950,
        'Default': 400,
        // Tillæg terrasse
        'Tagterrasse plastfødder (pr m2 overslag)': 90,
        'Leje af materialehejs (Tagterrasse)': 1500,
        'Montagematerialer (Skruer, beslag, kiler/murpap) pr m2': 70,
        'Punktfundament og støbemix (pr m2 overslag)': 180,  // cement+strøer 150-250
        'Rækværk/Gelænder træ (pr løbende meter)': 600,      // komplet rækværk inkl. stolper 500-900
        'Rækværk/Gelænder glas (pr løbende meter)': 1200,      // glaspaneler + stål/træstolper
        'Rækværk/Gelænder stål (pr løbende meter)': 1000,      // stålwire eller stålrør
        'Rækværk/Gelænder træ og stål (pr løbende meter)': 850, // kombination
        'Manuel markise (materialer)': 5000,
        'Elektrisk markise (materialer)': 12000,
        'Beslag til skjult montering (pr m2 overslag)': 120,
        'Fast tag (med tagpap)': 700,
        'Termotag / Plast': 350,
        'Hævet terrasse materialer (pr m2)': 350,            // kraftigere underkonstruktion
        'Udskiftning/Opbygning fundament (pr m2)': 150
    },
    kitchen: {
        'Default': 0 // Materialer på køkken bestilles typisk kunden selv, vi beregner typisk kun installation pr. enhed
    },
    ceilings: {
        'Træloft (listeloft/paneler/rustikloft)': 280,
        'Gipsloft (standard 2-lag)': 180,
        'Lydgipsloft (lyddæmpende gips)': 290,
        'Fibergipsloft (Fermacel)': 290,
        'Troldtekt (akustikloft)': 340,               // 350-500 typisk
        'Nedhængt loft (systemloft)': 450,
        'Akustikpaneler (lameller)': 700,             // Eg-lameller 600-900
        'Default': 350,
        // Nye tillægsmaterialer
        'Forskalling': 50,
        'Dampspærre inkl tape': 35,
        'Isolering (50-100mm)': 75,                   // Rockwool 50-90 kr/m²
        'Skyggelister / Fuge': 45,
        'Maler: Spartel, filt og maling (pr m2)': 250,
        'Maler: Koordineringsgebyr (Fast pris)': 5000,
        'Elektriker: Etablering af spot/lampested (pr. stk)': 950
    },
    facades: {
        'Trykimprægneret': 280,
        'Almindeligt træ (Malet)': 290,
        'Superwood': 500,                             // Superwood 400-600
        'Thermowood': 600,
        'Cedertræ / Hardwood': 900,
        'HardiePlank': 650,
        'Cembrit / Cedral': 700,
        'Komposit': 800,
        'Default': 450,
        // Tillæg facader
        'Krydsforskalling (tillæg til lodret)': 40,
        'Efterisolering (50-100mm)': 100,
        'Efterisolering 50mm': 100,
        'Efterisolering 100mm': 150,
        'Efterisolering 150mm': 220,
        'Vindspærre og Klemlister': 130, // Vindgips/dug + trykimprægnerede lægter
        'Inddækning/Lister (pr åbning)': 500,         // Inddækning af én åbning 400-700
        'Tillæg: Facadestilladsleje': 15000           // Facadestillads pr uge 12-20k
    },
    extensions: {
        'Træbeklædning': 13000,                       // "Samlet m²-pakke" komplet tilbygning
        'Hardwood / Cedertræ': 16000,
        'Skalmur / Mursten': 22000,
        'Tillæg: Stor gennembrydning': 18000,         // Ståldrager + statiker + støvafskærmning 15-25k
        'Tillæg: Lille gennembrydning': 3500,
        'Tillæg: Vådrumspakke': 130000,               // Komplet vådrum 120-180k
        'Tillæg: Element (Vindue/Dør)': 5500,         // Udvendigt element nemt 5-8k
        'Default': 18000
    },
    annex: {
        'Trykimprægneret': 2500,                  // Basis-skur materialer
        'Superwood': 3500,
        'Thermowood': 4000,
        'Cedertræ / Hardwood': 5000,
        'HardiePlank': 3200,
        'Komposit': 4000,
        'Default': 4000,
        // Tillægspakker — base trykimprægneret indeholder ikke isolering eller fuld beboelig finish
        'Tillæg: Isolering/værksted (pr m2)': 800,    // Isolering + indvendig beklædning (var fallback 1200)
        'Tillæg: Fuldt beboeligt/BR18 (pr m2)': 3500,
        'Tillæg: Sadel tag (pr m2)': 500,
        'Miljøtillæg: Eternit nedrivning (pr m2)': 100,
        'Tillæg: Tung nedrivning Mursten/Beton (pr m2)': 200,
        'Tillæg: Støbt betondæk / sokkel (pr m2)': 1500
    },
    carport: {
        'Trykimprægneret': 18000,      // Trykimp. byggesæt 15-25k
        'Superwood': 22000,
        'Thermowood': 26000,
        'Cedertræ / Hardwood': 35000,
        'Komposit': 30000,
        'Stål/Alu': 35000,
        'Tillæg: Sadel tag enkelt (fast pris)': 8000,
        'Tillæg: Sadel tag dobbelt (fast pris)': 15000,
        'Miljøtillæg: Eternit nedrivning (fast pris)': 8000,
        'Tillæg: Tung nedrivning Mursten/Beton (fast pris)': 2500,
        'Default': 25000
    },
    fence: {
        'Klinkehegn (Træ)': 550,
        'Listehegn (Træ)': 800,        // Moderne listehegn kræver flere materialer og tid
        'Lamelhegn (Træ)': 450,
        'Raftehegn (Træ)': 700,
        'Komposithegn': 1000,
        'Træstolper': 100,
        'Betonstolper': 240,
        'Metal/Stålstolper': 300,
        'Støbt direkte i jord/beton (Standard)': 30,
        'Stolpesko i støbt punktfundament (Træ fri af jord)': 90,
        'Direkte i jorden uden beton (Kun visse træsorter)': 0,
        'Jordskruer / Skruefundament (Hurtig stålforankring)': 180,
        'Betonstolpe med betonbundplade (H-stolpe med plade)': 150,
        'Tillæg: Ekstra højde >1,8m (pr m)': 200,
        'Miljøtillæg: Rodfræsning/deponi af hæk (pr m)': 50,
        'Default': 700
    }
};

/**
 * 3. TIDS-ALGORITMEN (Gennemsnitlig forventet tidsforbrug for en svend)
 */
export const WORK_FORMULAS = {
    roof: {
        hoursPerUnit: 1.4, // default fallback (tegl-niveau)
        // Timer pr m² oplægning differentieret pr nyt tagmateriale.
        // Paptag/stål går meget hurtigere end tegl/skifer.
        hoursPerUnitByMaterial: {
            'Paptag': 0.7,
            'Tegl': 1.4,
            'Stål': 0.8,
            'Stålplader': 0.8,
            'Tagplader (eternit asbest fri)': 0.9,
            'Decra': 1.0,
            'Betontagsten': 1.3,
            'Skiffer (hårdt materiale)': 1.6,
            'Skiffer (blødt materiale)': 1.6,
            'Stråtag (tækket tag)': 2.8,
            'Metal-tag (zink, stål, kobber)': 1.5
        },
        disposalHours: 0.25, // default fallback (var 0.8 — voldsomt for højt)
        // Nedrivning pr m² af GAMMELT tag, differentieret pr type.
        // Tidligere flad 0.8 t/m² gav 162t for et 140 m² tegltag — virkeligheden er 15-25t.
        disposalHoursByOldType: {
            'Tegl': 0.15,
            'Betontagsten': 0.15,
            'Paptag': 0.20,
            'Stål': 0.15,
            'Stålplader': 0.15,
            'Decra': 0.20,
            'Skiffer (hårdt materiale)': 0.30,
            'Skiffer (blødt materiale)': 0.30,
            'Tagplader (eternit asbest fri)': 0.25,
            'Tagplader (asbest)': 0.50, // Kræver asbestdragter, maske og specialhåndtering
            'Tagplader vides ikke': 0.50, // Hvis asbest-status er ukendt, skal der kalkuleres med forholdsregler!
            'Stråtag (tækket tag)': 0.50,  // Strå er tungt + halmsupport
            'Metal-tag (zink, stål, kobber)': 0.20
        },
        levelingHours: 0.6, // Spæropretning pr m2
        underroofHours: 0.3, // Oplægning af undertag pr m2
        eavesHoursPerMeter: 0.4,   // Tidligere "eavesHours: 0.5" pr m² → nu pr løbende meter
        guttersHoursPerMeter: 0.35, // Tidligere "guttersHours: 0.4" pr m² → nu pr løbende meter
        chimneyHours: 6.0, // Fast tid til skorstensinddækning
        gableHours: 0.8, // Timer pr m2 gavlbeklædning
        extensionHours: 15.0, // Timer pr kvist/tilbygning
        insulationHours: 0.4, // Timer pr m2 efterisolering
        trailerAccessHours: 0.15, // Ekstra bæretid pr m2 ved utilgængelig container
        containerThreshold: 150, // M2 pr container (var 0, hvilket udløste Infinity og altid gav max 5 containere!)
        roofWindowNewHours: 14.0 // Timer pr. nyt etableret tagvindue (inkl. spærudveksling)
    },
    windows: {
        hoursPerUnit: 3.5, // Timer pr. facadevindue (inkl. standard isolering og montering)
        roofWindowHours: 8.0, // Timer pr. tagvindue (inkl. inddækning, undertagstilkobling og lysning)
        disposalHours: 0.5, // Arbejdstid pr. vindue til demontering
        finishHoursPerUnit: 1.5, // Timer til indvendig fuge/gerigt pr vindue
        containerThreshold: 5
    },
    floor: {
        hoursPerUnit: 0.4, // Timer pr. m2 lægning af standard gulv
        skirtingHoursPerUnit: 0.15, // Fodlister pr m2 gulvareal
        underlayHours: 0.1, // Udretning af foam/underlag
        levelingHours: 0.6, // Opretning af skævt undergulv pr m2
        disposalHours: 0.2, // Timer pr. m2 nedrivning af gl. gulv
        containerThreshold: 30
    },
    doors: {
        hoursPerUnit: 3.0, // Montering af indvendig dør inkl. karm
        exteriorDoorHours: 7.0, // Montering af yderdør/fordør (en hel arbejdsdag for én mand: pak ud, tilpas karm, fræs, justér, fuge)
        leafOnlyHours: 0.3, // Hurtig udskiftning af kun dørplade
        hardwareHours: 0.3, // Montering af greb/låsekasse
        thresholdHours: 0.2, // Montering af dørtrin
        disposalHours: 0.5,
        finishHoursPerUnit: 1.5, // Montering af gerigter og fuge
        containerThreshold: 5
    },
    terrace: {
        hoursPerUnit: 1.0, // Timer pr. m2 standard lægning på strøer
        disposalHours: 0.15, // Nedtagning af bygget terrasse pr m2 (var 0.3, hvilket gav for mange timer)
        foundationHoursPerUnit: 0.5, // Ekstra opbygning af simpelt fundament/strøer pr m2
        groundFoundationHours: 0.8, // Gravning og støbning af punktfundamenter pr m2
        roofTerraceHours: 0.4, // Ekstra tid til opklodsning/justering af tagterrassefødder pr m2
        elevatedHours: 0.6, // Ekstra tid pr m2 til opbygning af stor underkonstruktion pga. højde
        hiddenFasteningHours: 0.3, // Ekstra tid pr m2 til skjulte beslag/propper
        railingHoursPerMeter: 1.2, // Timer pr løbende meter rækværk
        containerThreshold: 30 // M2 pr container (var 15, hvilket gav astronomiske gebyrer på mellemstore terrasser)
    },
    kitchen: {
        hoursPerUnit: 1.2, // Timer pr. skab/skuffe element (OPSÆTNING/NIVELLERING) - justeret ned da samling nu skilles ud
        assemblyHours: 0.8, // Ekstra timer pr. element hvis det er flat-pack (IKEA)
        worktopHours: 4.0, // Fast tidstillæg til tilpasning af træ/laminat bordplade, fræsning af hjørner og udskæringer til vask/kogeplade
        applianceHours: 1.5, // Fast tidstillæg til finjustering af træfronter på integrerede hvidevarer
        disposalHours: 0.5, // Timer pr. køkkenelement til demontering og sortering
        containerThreshold: 15 // Et gennemsnitligt køkken over 15 elementer udløser en hel container
    },
    ceilings: {
        hoursPerUnit: 0.8, // Timer pr. m2 loft (kun selve loftet)
        hoursPerUnitByMaterial: {
            'Gipsloft (standard 2-lag)': 0.8,
            'Lydgipsloft (lyddæmpende gips)': 0.9,
            'Fibergipsloft (Fermacel)': 0.9,
            'Troldtekt (akustikloft)': 0.8,
            'Nedhængt loft (systemloft)': 0.8,
            'Træloft (listeloft/paneler/rustikloft)': 0.9,
            'Akustikpaneler (lameller)': 0.9
        },
        disposalHours: 0.3, // Nedtagning pr m2
        // Lofts-tillæg justeret efter at de tidligere compoundede til 2,4 t/m² på fuld pakke
        // (forskalling+damp+iso+gips+spartling+lister på samme overflade overlapper i tid)
        battenHours: 0.2, // Forskalling pr m2 (var 0.3)
        levelingHours: 0.35, // Opretning af skævt loft pr m2 (var 0.5)
        vaporBarrierHours: 0.2, // Dampspærre pr m2
        insulationHours: 0.2, // Isolering pr m2
        plasteringHours: 0.4, // Spartling pr m2 gips (var 0.6 — håndværker spartler 12-15 m²/dag)
        mouldingHours: 0.2, // Opsætning af lister/fuge pr m2
        containerThreshold: 150 // Loftsmaterialer (gips/træ) er lette, så 30m2 gav for mange containere
    },
    facades: {
        hoursPerUnit: 1.2, // Basis montering af klinkbeklædning pr m2
        hoursPerUnitByMaterial: {
            'Trykimprægneret': 1.2,
            'Almindeligt træ (Malet)': 1.2,
            'Superwood': 1.2,
            'Thermowood': 1.2,
            'Cedertræ / Hardwood': 1.3,
            'HardiePlank': 1.4,
            'Cembrit / Cedral': 1.4,
            'Komposit': 1.3
        },
        disposalHours: 0.4,
        insulationHours: 0.3, // Opsætning af isolering pr m2
        insulationHoursByThickness: {
            '50 mm': 0.2,
            '100 mm': 0.3,
            '150 mm': 0.4
        },
        windBarrierHours: 0.4, // Montering af vindspærre og klemlister pr m2
        openingHours: 1.5, // Ekstra tid til inddækning/lysning pr vindue eller dør
        verticalMultiplier: 1.4, // Lodret listebeklædning tager længere tid at skrue og line op
        containerThreshold: 50
    },
    extensions: {
        hoursPerUnit: 12.0, // Meget groft skøn: timer pr. m2 for tilbygning
        breakthroughLargeHours: 30.0, // Timer til stor gennembrydning og afstivning
        breakthroughSmallHours: 8.0, // Timer til lille dør-gennembrydning
        wetRoomHours: 45.0, // Ekstra tømrer-timer til vådrum (dobbelte plader, forstærkninger mv.)
        windowDoorHours: 4.0, // Montering pr vindue/dør i tilbygning
        manualDiggingHours: 25.0, // Tillæg for manuel gravning/trillebør
        disposalHours: 0,
        containerThreshold: 0
    },
    annex: {
        hoursPerUnit: 6.0, // Timer pr. m2
        disposalHours: 0.5, // Nedrivning af gl. skur pr. m2
        containerThreshold: 10, // Skure over 10m2 udløser en container
        foundationBetonHours: 1.5
    },
    carport: {
        hoursPerUnit: 40.0, // Timer pr carport (base)
        disposalHours: 8.0, // Timer for nedrivning pr gl. carport
        containerThreshold: 0 // Selv én nedrevet carport kræver en container (>= 1 trigger)
    },
    fence: {
        hoursPerUnit: 0.8, // Timer pr løbende meter
        disposalHours: 0.3, // Fjernelse af gl hegn pr meter
        containerThreshold: 20
    }
};
