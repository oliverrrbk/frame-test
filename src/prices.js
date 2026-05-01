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
        'Paptag': 450,
        'Tegl': 1100,
        'Stål': 500,
        'Stålplader': 500,
        'Tagplader (eternit asbest fri)': 300,
        'Decra': 800,
        'Betontagsten': 900,
        'Skiffer (hårdt materiale)': 1400,
        'Skiffer (blødt materiale)': 1400,
        'Stråtag (tækket tag)': 1500,
        'Metal-tag (zink, stål, kobber)': 2000,
        'Default': 500,
        // Tillæg tag
        'Undertag (dug)': 120,
        'Opretning af spær (Påforing)': 80,
        'Udhæng/Stern træværk (pr m2 overslag)': 150,
        'Tagrender og nedløb (pr m2 overslag)': 180,
        'Skorstensinddækning (Zink/Bly)': 3500,
        'Tillæg: Stillads 1½-plan / 2-plan': 15000,
        'Tillæg: Stillads (Høj rejsning)': 10000
    },
    windows: {
        'Træ': 6000,
        'PVC / plast': 4500,
        'Aluminium': 8000,
        'Træ/alu (kombination)': 7500,
        'Stål': 10000,
        'Glas': 9500,
        'Default': 6000
    },
    floor: {
        'Træ': 600,
        'Massivt træ': 1200,
        'Parket': 750,
        'Laminat': 300,
        'Vinyl': 350,
        'Linoleum': 400,
        'Fliser (keramik/porcelæn)': 500,
        'Natursten': 1000,
        'Beton': 800,
        'Tæppe': 250,
        'Kork': 550,
        'Default': 400,
        // Tillæg gulve
        'Trinlydsunderlag (Foam)': 45,
        'Opretning af undergulv': 120, // Kiler/strøer eller flydespartel proxy
        'Fodlister (pr. m2 gulvareal proxy)': 50
    },
    doors: {
        'Træ': 4500,
        'Massivt træ': 7500,
        'Finér': 2500,
        'PVC / plast': 4000,
        'Aluminium': 8500,
        'Stål': 9500,
        'Glas': 9000,
        'Kompositmaterialer': 6500,
        'Default': 5500,
        // Tillæg døre
        'Dørgreb inkl roset': 350,
        'Sikkerhedslås (Yderdør)': 1200,
        'Dørtrin / Bundstykke': 250,
        'Gerigter (sæt)': 300
    },
    terrace: {
        'Trykimprægneret fyr': 250,
        'Hardwood / Hårdttræ': 900,
        'Komposit (vedligeholdelsesfrit biomateriale)': 1100,
        'Default': 400,
        // Tillæg terrasse
        'Tagterrasse plastfødder (pr m2 overslag)': 90,
        'Punktfundament og støbemix (pr m2 overslag)': 150,
        'Rækværk/Gelænder træ (pr løbende meter)': 400,
        'Beslag til skjult montering (pr m2 overslag)': 120,
        'Fast tag (med tagpap)': 800,
        'Termotag / Plast': 400,
        'Hævet terrasse materialer (pr m2)': 250,
        'Udskiftning/Opbygning fundament (pr m2)': 150
    },
    kitchen: {
        'Default': 0 // Materialer på køkken bestilles typisk kunden selv, vi beregner typisk kun installation pr. enhed
    },
    ceilings: {
        'Træloft (listeloft/paneler/rustikloft)': 300,
        'Gipsloft': 250,
        'Fibergipsloft (Fermacel)': 350,
        'Troldtekt (akustikloft)': 380,
        'Nedhængt loft (systemloft)': 450,
        'Akustikpaneler (lameller)': 750,
        'Default': 350,
        // Nye tillægsmaterialer
        'Forskalling': 50,
        'Dampspærre inkl tape': 35,
        'Isolering (50-100mm)': 85,
        'Spartelmasse og tape': 30,
        'Skyggelister / Fuge': 45
    },
    facades: {
        'Trykimprægneret': 300,
        'Superwood': 550,
        'Cedertræ / Hardwood': 950,
        'Thermowood': 650,
        'Default': 450,
        // Tillæg facader
        'Efterisolering (50-100mm)': 120,
        'Vindspærre og Klemlister': 150, // Vindgips/dug + trykimprægnerede lægter
        'Inddækning/Lister (pr åbning)': 400,
        'Tillæg: Facadestilladsleje': 12000
    },
    extensions: {
        'Træbeklædning': 15000,
        'Hardwood / Cedertræ': 18000,
        'Skalmur / Mursten': 22000,
        'Tillæg: Stor gennembrydning': 12000, // Ståldrager, støvafskærmning, deponi
        'Tillæg: Lille gennembrydning': 2500, // Alm. døråbning
        'Tillæg: Vådrumspakke': 45000, // Groft overslag til VVS, kloak, murer og membran
        'Tillæg: Element (Vindue/Dør)': 4000, // Gennemsnitspris for et udvendigt element
        'Default': 18000
    },
    annex: {
        'Trykimprægneret fyr': 3000,
        'Eksklusivt træ (Cedertræ/Hardwood)': 5500,
        'Vedligeholdelsesfrit (Komposit)': 4500,
        'Default': 4000
    },
    carport: {
        'Trækonstruktion': 20000,
        'Vedligeholdelsesfrit (Stål/Alu)': 35000,
        'Default': 25000
    },
    fence: {
        'Klinkehegn (Træ)': 600,
        'Lamelhegn (Træ)': 450,
        'Raftehegn': 800,
        'Komposit (Vedligeholdelsesfrit)': 1100,
        'Default': 700
    }
};

/**
 * 3. TIDS-ALGORITMEN (Gennemsnitlig forventet tidsforbrug for en svend)
 */
export const WORK_FORMULAS = {
    roof: {
        hoursPerUnit: 1.4, // Timer pr. m2 oplægning af nyt tag
        disposalHours: 0.8, // Ændret fra 12 fast timer til timer pr. m2 nedrivning
        levelingHours: 0.6, // Spæropretning pr m2
        underroofHours: 0.3, // Oplægning af undertag pr m2
        eavesHours: 0.5, // Montering af udhæng/stern pr m2 (overslag)
        guttersHours: 0.4, // Montering af tagrender pr m2 (overslag)
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
        exteriorDoorHours: 5.5, // Montering af yderdør/fordør
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
        // Nye tidsfaktorer til tillæg
        battenHours: 0.3, // Forskalling pr m2
        levelingHours: 0.5, // Opretning af skævt loft pr m2
        vaporBarrierHours: 0.2, // Dampspærre pr m2
        insulationHours: 0.2, // Isolering pr m2
        plasteringHours: 0.6, // Spartling pr m2 gips
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
        containerThreshold: 1 // Én nedrevet carport kræver en container
    },
    fence: {
        hoursPerUnit: 0.8, // Timer pr løbende meter
        disposalHours: 0.3, // Fjernelse af gl hegn pr meter
        containerThreshold: 20
    }
};
