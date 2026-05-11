/**
 * 1. TØMRERENS INDSTILLINGER (Motorrummet for den enkelte tømrer/virksomhed)
 * Dette vil i fremtiden blive trukket fra en database, hvor den enkelte virksomhed
 * logget ind og sat deres egne takster.
 */
export const CARPENTER_SETTINGS = {
    hourlyRate: 550,           // Timeløn i DKK ekskl/inkl moms (antages at være med moms her for simpelhed pt)
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
        'Tillæg: Stillads 1½-plan / 2-plan': 15000,
        'Tillæg: Stillads (Høj rejsning)': 10000
    },
    windows: {
        'Træ': 5000,                                  // Standard træ-vindue 1,2x1,2m 4-6,5k
        'PVC / plast': 3800,                          // PVC er reelt billigt
        'Aluminium': 8000,
        'Træ/alu (kombination)': 7500,
        'Stål': 12000,                                // Stålvinduer (industri-look) 10-15k
        'Glas': 9500,
        'Default': 6000,
        // Specialvinduer — basispriser før areal-skalering i calculator
        'Panorama/Specialmål': 22000,                 // ca 4 m² panorama før skalering
        'Skydedør': 55000,                            // hæveskydedør 2,8x2,2 (træ/alu) 50-80k
        'Ovenlysvindue / Velux (pr. stk)': 8500,
        'Tillæg: Stillads/Lift leje': 8000
    },
    floor: {
        'Træ': 600,
        'Massivt træ': 1200,
        'Parket': 750,
        'Laminat': 250,                               // Klik-laminat 150-350 kr/m²
        'Vinyl': 300,                                 // Klikvinyl 200-400 kr/m²
        'Linoleum': 400,
        'Fliser (keramik/porcelæn)': 400,             // Standard fliser 250-500
        'Natursten': 1200,                            // Natursten reelt dyrt 800-1500
        'Beton': 600,                                 // Mikrocementgulv
        'Tæppe': 200,
        'Kork': 550,
        'Default': 400,
        // Tillæg gulve
        'Trinlydsunderlag (Foam)': 45,
        'Opretning af undergulv': 120, // Kiler/strøer eller flydespartel proxy
        'Fodlister (pr. m2 gulvareal proxy)': 50
    },
    doors: {
        'Træ': 3000,                                  // Standard HT-dør m. karm 2-4k (var voldsomt højt før)
        'Massivt træ': 7500,                          // Massive yderdøre/specialdøre 6-9k
        'Finér': 2200,
        'PVC / plast': 4000,
        'Aluminium': 9000,                            // Alu-yderdøre 8-12k
        'Stål': 10000,                                // Sikkerheds-/branddør
        'Glas': 9000,
        'Kompositmaterialer': 6500,
        'Default': 5500,
        // Tillæg døre
        'Dørgreb inkl roset': 350,
        'Sikkerhedslås (Yderdør)': 1500,              // Ruko/Yale 1000-2500
        'Dørtrin / Bundstykke': 250,
        'Gerigter (sæt)': 300
    },
    terrace: {
        'Trykimprægneret fyr': 220,                   // Standard trykimp. brædder 180-280
        'Hardwood / Hårdttræ': 850,                   // Cumaru/Ipé 700-1100
        'Komposit (vedligeholdelsesfrit biomateriale)': 950,
        'Default': 400,
        // Tillæg terrasse
        'Tagterrasse plastfødder (pr m2 overslag)': 90,
        'Punktfundament og støbemix (pr m2 overslag)': 180,  // cement+strøer 150-250
        'Rækværk/Gelænder træ (pr løbende meter)': 600,      // komplet rækværk inkl. stolper 500-900
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
        'Gipsloft': 200,                              // 13mm gipsplader 50-90 + lægter
        'Fibergipsloft (Fermacel)': 320,
        'Troldtekt (akustikloft)': 400,               // 350-500 typisk
        'Nedhængt loft (systemloft)': 450,
        'Akustikpaneler (lameller)': 700,             // Eg-lameller 600-900
        'Default': 350,
        // Nye tillægsmaterialer
        'Forskalling': 50,
        'Dampspærre inkl tape': 35,
        'Isolering (50-100mm)': 75,                   // Rockwool 50-90 kr/m²
        'Spartelmasse og tape': 30,
        'Skyggelister / Fuge': 45
    },
    facades: {
        'Trykimprægneret': 280,
        'Superwood': 500,                             // Superwood 400-600
        'Cedertræ / Hardwood': 900,
        'Thermowood': 600,
        'Default': 450,
        // Tillæg facader
        'Efterisolering (50-100mm)': 100,
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
        'Trykimprægneret fyr': 2500,                  // Basis-skur materialer
        'Eksklusivt træ (Cedertræ/Hardwood)': 5000,
        'Vedligeholdelsesfrit (Komposit)': 4000,
        'Default': 4000,
        // Tillægspakker — base trykimprægneret indeholder ikke isolering eller fuld beboelig finish
        'Tillæg: Isolering/værksted (pr m2)': 800,    // Isolering + indvendig beklædning (var fallback 1200)
        'Tillæg: Fuldt beboeligt/BR18 (pr m2)': 3500,
        'Tillæg: Sadel tag (pr m2)': 500,
        'Tillæg: Støbt terrændæk (pr m2)': 1500
    },
    carport: {
        'Standard træ (Trykimprægneret)': 18000,      // Trykimp. byggesæt 15-25k
        'Eksklusivt træ (Cedertræ/Hardwood)': 35000,
        'Vedligeholdelsesfrit (Stål/Alu)': 35000,
        'Default': 25000
    },
    fence: {
        'Klinkehegn (Træ)': 550,
        'Lamelhegn (Træ)': 450,
        'Raftehegn': 700,
        'Komposit (Vedligeholdelsesfrit)': 1000,
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
            'Stråtag (tækket tag)': 0.80,  // strå er tungt + halmsupport
            'Metal-tag (zink, stål, kobber)': 0.20
        },
        levelingHours: 0.6, // Spæropretning pr m2
        underroofHours: 0.3, // Oplægning af undertag pr m2
        eavesHoursPerMeter: 0.4,   // Tidligere "eavesHours: 0.5" pr m² → nu pr løbende meter
        guttersHoursPerMeter: 0.35, // Tidligere "guttersHours: 0.4" pr m² → nu pr løbende meter
        chimneyHours: 6.0, // Fast tid til skorstensinddækning
        containerThreshold: 0
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
        disposalHours: 0.3, // Nedtagning af bygget terrasse pr m2
        foundationHoursPerUnit: 0.5, // Ekstra opbygning af simpelt fundament/strøer pr m2
        groundFoundationHours: 0.8, // Gravning og støbning af punktfundamenter pr m2
        roofTerraceHours: 0.4, // Ekstra tid til opklodsning/justering af tagterrassefødder pr m2
        elevatedHours: 0.6, // Ekstra tid pr m2 til opbygning af stor underkonstruktion pga. højde
        hiddenFasteningHours: 0.3, // Ekstra tid pr m2 til skjulte beslag/propper
        railingHoursPerMeter: 1.2, // Timer pr løbende meter rækværk
        containerThreshold: 15
    },
    kitchen: {
        hoursPerUnit: 1.2, // Timer pr. skab/skuffe element (OPSÆTNING/NIVELLERING) - justeret ned da samling nu skilles ud
        assemblyHours: 0.8, // Ekstra timer pr. element hvis det er flat-pack (IKEA)
        worktopHours: 4.0, // Fast tidstillæg til tilpasning af træ/laminat bordplade, fræsning af hjørner og udskæringer til vask/kogeplade
        applianceHours: 1.5, // Fast tidstillæg til finjustering af træfronter på integrerede hvidevarer
        disposalHours: 6, // Fast anslået tid for nedrivning af standart køkken
        containerThreshold: 0
    },
    ceilings: {
        hoursPerUnit: 0.8, // Timer pr. m2 loft (kun selve loftet)
        disposalHours: 0.3, // Nedtagning pr m2
        // Lofts-tillæg justeret efter at de tidligere compoundede til 2,4 t/m² på fuld pakke
        // (forskalling+damp+iso+gips+spartling+lister på samme overflade overlapper i tid)
        battenHours: 0.2, // Forskalling pr m2 (var 0.3)
        levelingHours: 0.35, // Opretning af skævt loft pr m2 (var 0.5)
        vaporBarrierHours: 0.2, // Dampspærre pr m2
        insulationHours: 0.2, // Isolering pr m2
        plasteringHours: 0.4, // Spartling pr m2 gips (var 0.6 — håndværker spartler 12-15 m²/dag)
        mouldingHours: 0.2, // Opsætning af lister/fuge pr m2
        containerThreshold: 30
    },
    facades: {
        hoursPerUnit: 1.2, // Basis montering af klinkbeklædning pr m2
        disposalHours: 0.4,
        insulationHours: 0.3, // Opsætning af isolering pr m2
        windBarrierHours: 0.4, // Montering af vindspærre og klemlister pr m2
        openingHours: 1.5, // Ekstra tid til inddækning/lysning pr vindue eller dør
        verticalMultiplier: 1.4, // Lodret listebeklædning tager længere tid at skrue og line op
        containerThreshold: 15
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
        containerThreshold: 10 // Skure over 10m2 udløser en container
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
