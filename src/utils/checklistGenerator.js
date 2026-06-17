// Bygge-to-do ("Bygge To-Do / KS") generator.
//
// Byggetrins-viden er FLYTTET hertil fra CaseManagement.getDefaultChecklist
// (uændret indhold) så den kan genbruges. To indgange:
//   - getChecklistForCategory(category, details): ét fag (som før — identisk output).
//   - buildPhasesChecklist(phases, details): pr. etape, til skræddersyede sager,
//     så en totalrenovering får hvert fags byggetrin under sin egen etape.
import { detectCategory } from './enrichMaterials';

// Ren viden: returnerer rå hovedtrin [{ title, subTasks: [streng,...] }] for ét fag.
// Bruger samme felter fra details (d) som den oprindelige getDefaultChecklist.
function buildCategorySteps(category, d = {}) {
    const steps = [];
    const add = (title, subTasks) => steps.push({ title, subTasks });

    if (category === 'terrace') {
        add('Opmåling og Klargøring', [
            'Gennemgå tegningerne med kunden og kontrollér placering og ønsket højde.',
            'Sæt af med snore (galger). Tjek at krydsmål/diagonalmål er 100% identiske, så terrassen er helt i vinkel.',
            'Tjek materialelevering: Mangler der strøer, brædder eller specifikke rustfri skruer før I kan gå i gang?',
            'Mål ud til stolper/skruer (anbefalet max c-c 2,5 m mellem bærende stolper/remme afhængig af dimension).'
        ]);

        let fundSubTasks = [];
        if (d.foundationType === 'skrue') {
            fundSubTasks.push('Etablering af fundament: Markér til jordskruer og skru dem i frostfri dybde.');
        } else {
            fundSubTasks.push('Etablering af fundament: Udgrav stolpehuller til 90 cm (frostfri dybde).');
            fundSubTasks.push('Sæt stolper i tørbeton og brug rotorlaser / slangevaterpas, så alle toppe har præcis samme niveau.');
        }
        fundSubTasks.push('Montér bærende remme og fastgør dem med franske skruer / bræddebolte.');
        fundSubTasks.push('Montér strøer med bjælkesko/vinkelbeslag. Husk strøafstand: Max c-c 50 cm for træ, max c-c 40 cm for komposit!');
        fundSubTasks.push('Rul ukrudtsdug ud under bjælkelaget og smid evt. lidt stabilgrus eller sten på, så den ikke blafrer i vinden.');
        fundSubTasks.push('Husk at overholde et lille fald (ca. 1 cm pr. meter) væk fra husmuren, hvis underkonstruktionen er tæt.');

        add('Fundament og Underkonstruktion', fundSubTasks);

        add('Montering af Terrassebrædder', [
            'Sortering: Kig brædderne igennem, og læg dem med flosser/bomkanter til side til senere tilskæring.',
            `Start monteringen af ${d.terraceWood || d.material || 'terrassebrædder'} fra den mest synlige forkant og arbejd jer ind mod huset.`,
            'Husk fugeafstand: Brug afstandsklodser/kiler (min. 5-7 mm luft), så træet kan arbejde (udvide/trække sig sammen).',
            'Snorlige skruelinjer: Sæt en snor ud for hver strø, så skruerne sidder i en 100% snorlig linje.',
            'Sænk skruehovederne præcist i niveau med brættet – skru dem ikke for dybt, da der så samles vand og smuds.'
        ]);

        let finishSubTasks = [
            'Tilskæring af kanter: Kør den afsluttende kant helt lige med en dyksav på skinne.',
            'Montér evt. et dækbræt (skørt) rundt i kanten for at skjule underkonstruktionen.',
            'Tjek hele fladen igennem for skarpe splinter eller skruer, der stikker op. Slib evt. endetræet.',
            'Oprydning: Fej hele terrassen, saml stumper, skruer og plastik sammen.',
            'Afleveringsforretning med kunden.'
        ];
        if (d.railing && d.railing.toLowerCase().includes('ja')) {
            finishSubTasks.splice(2, 0, 'Montér stolper og rækværk. Sørg for at afstive rækværket ned i underkonstruktionen for optimal stabilitet.');
        }
        add('Finish og Slutkontrol', finishSubTasks);
    }
    else if (category === 'floor') {
        add('Forberedelse & Undergulv', [
            'Opmåling: Kontrollér fugt i beton/undergulv med fugtmåler, hvis påkrævet.',
            'Rengøring: Støvsug undergulvet HELT rent for småsten, mørtelrester og snavs.',
            'Planhedskontrol: Tjek med 2-meter retskede. Max tolerance er typisk 2 mm lunker pr. 2 meter. Opret med selvnivellerende spartel, hvis gulvet svinger mere end dette!',
            'Tjek dørkarme: Skær bunden af indvendige dørkarme af med en multicutter/fukssvans, så det nye gulv kan glide pænt ind under.'
        ]);
        add('Underlag & Fugtspærre', [
            'Dampspærre (hvis krævet over beton/krybekælder): Udlæg plastfolie med 20 cm overlæg. Tape alle samlinger 100% tæt med dampspærretape. Træk folien et par cm op ad væggen.',
            'Trinformsdæmpning/Underlag: Rul underlaget ud (kant mod kant – IKKE overlæg, medmindre producenten foreskriver det).',
            'Tape underlaget sammen, så det ikke rykker sig under lægningen.'
        ]);
        add('Lægning af Gulvet', [
            'Retningsvalg: Gulvet lægges typisk i lysets indfaldsretning.',
            `Start lægning af ${d.floorType || d.material || 'det nye gulv'} ind mod væggen (Husk 10-15 mm ekspansionsfuge til ALLE faste bygningsdele!).`,
            'Forskydning: Sørg for at endesamlingerne er forskudt med minimum 40 cm fra række til række.',
            'Rørgennemføringer: Bor hul 20 mm større end røret. Skær et "kile-snit" ud bag røret, lim kilen på plads bag efter og sæt en pæn roset på.'
        ]);
        let finishSubTasks = [
            'Fjern alle afstandsklodser fra kanterne.',
            'Montér overgangslister (T-lister/Niveaulister) ved dørtrin og mellem rum.',
            'Rengøring, støvsugning og afleveringsforretning med kunden.'
        ];
        if (d.panels && d.panels.toLowerCase().includes('ja')) {
            finishSubTasks.splice(1, 0, 'Montering af fodlister: Geringsskær hjørner og skyd listerne fast med dykkerpistol. VIGTIGT: Skru KUN i væggen, aldrig i gulvet!');
        }
        add('Afslutning (Lister & Overgange)', finishSubTasks);
    }
    else if (category === 'ceilings') {
        add('Klargøring & Forskalling', [
            'Kontrollér den eksisterende konstruktion/spær for råd, fugt og skævheder.',
            'Sæt ny forskalling op. Afstand afhænger af materialet: Gips er typisk c-c 30 cm, akustik/træpaneler c-c 40 eller 60 cm.',
            'Tjek med retskede eller rotorlaser at forskallingen danner en 100% plan flade. Brug evt. justerbrikker (Knudsen kiler).'
        ]);
        let elSubTasks = [
            'Dampspærre (hvis mod kold tagkonstruktion): Udlæg dampspærre, tape alle samlinger tæt, og klem den mod væggen med fuge.'
        ];
        const calcSpots = d.spots === 'Ja' ? Math.max(1, Math.round((parseFloat(d.amount) || 0) / 1.75)) : 0;
        if (calcSpots > 0) {
            elSubTasks.push(`Træk tomrør/flexrør og gør klar til elektrikeren (${calcSpots} spots).`);
            elSubTasks.push('Skru safebokse fast i forskallingen, og noter deres præcise placeringer på en skitse inden loftet lukkes!');
        }
        add('Dampspærre og Forberedelse af El', elSubTasks);

        add('Montering af Loftplader', [
            'Start monteringen. Hvis gips: forskyd endesamlingerne med mindst 40 cm (ingen krydssamlinger!).',
            `Fastgør ${d.material || 'loftplader'}. Hvis gips: Skruerne skrues ca. 1 mm ned uden at bryde pappet!`,
            'Ved Akustik/Træ: Brug dykkerpistol eller clips skjult i fer/not. Sørg for luft ind mod vægge til udvidelse.'
        ]);
        add('Fugning & Finish', [
            'Akrylfugning (ved gipslofter): Læg en akrylfuge i kanten mod væggen (slipfuge).',
            'Montering af skyggelister (ved træ/akustik): Geringsskær hjørner, påfør lidt lim i smiget, og skyd dem fast.',
            'Grovoprydning, fejning og afleveringsforretning med kunden.'
        ]);
    }
    else if (category === 'windows' || category === 'doors') {
        add('Demontering & Klargøring af Hul', [
            'Afdækning indvendigt for at fange støv.',
            'Skær den gamle fuge fri med en multicutter/bajonetsav, og vip forsigtigt elementet ud.',
            'Klargør murhullet: Bank løse mørtelrester væk, fjern gamle kiler og støvsug bunden.',
            'Læg evt. et stykke murpap (fugtspærre) i bunden af hullet, hvis det er nødvendigt mod fugtoptrængen.'
        ]);
        add('Isætning & Justering', [
            `Sæt det nye element (${d.windowAmount || d.doorAmount || d.amount || 'nye element'}) ind i hullet.`,
            'Placér blivende opklodsninger (plastkiler) tæt ved hjørner og under lodposter, så de bærer rudens vægt.',
            'Brug montageluftpuder (Winbags) til at centrere elementet, så der er lige stor fuge hele vejen rundt.',
            'Kontrollér at vinduet/døren er 100% i lod og vater, og at diagonalmålene er identiske.'
        ]);
        add('Fastgørelse', [
            'Forbor gennem karmen og brug karmskruer (uden dybler i træ, med plugs i beton/mursten).',
            'Fastgørelsespunkter: Max 10-15 cm fra indvendige hjørner, og herefter med max 70 cm mellemrum.',
            'Tjek at rammen kan åbne, lukke og vippe friktionsfrit før I fuger.'
        ]);
        add('Isolering & Fugning', [
            'Stop fugebånd/mineraluld ind i hulrummet (ikke for hårdt, det skal bevare sin isoleringsevne).',
            'Udvendigt: Læg bagstop ind og træk en pæn, elastisk fuge – eller montér Illmod-bånd.',
            'Indvendigt: Udfør lufttæt fuge (skal altid være tættere indvendigt end udvendigt for at undgå kondens).',
            'Afslutning: Indvendig opsætning af lysninger/gerigter, og udvendig afrensning.'
        ]);
    }
    else if (category === 'facades') {
        add('Demontering & Kontrol', [
            'Etabler sikker arbejdsplatform/stillads.',
            'Riv eksisterende facade ned og kør på genbrugspladsen.',
            'Vigtig kvalitetskontrol: Gennemgå det bagvedliggende skelet og remme for råd eller svamp. Udskift skadet træ.'
        ]);
        add('Vindspærre & Afstandslister', [
            'Montering af diffusionsåben vindspærre. Alle samlinger tape tæt med specialtape.',
            'Klem vindspærren fast med lodrette klemlister for at sikre et ventileret hulrum bag facaden!',
            'Montering af vandrette lægter (eller lodrette alt afhængigt af, om brædderne skal vende lodret eller vandret).',
            'Montering af muse-net i bunden af ventilationen.'
        ]);
        add('Montering af Beklædning', [
            'Slå kridtstreger/brug laser for at sikre at den første række sidder i 100% vater.',
            'Skær drypnæse (15 graders smig) på bunden af brædderne for vandafledning.',
            `Fastgørelse af ${d.facadeWood || d.material || 'facadebrædder'}: Brug de rigtige skruer/søm (C4 eller A4).`,
            'Overhold altid foreskrevet afstand / "luft" mellem brædderne ved klink- eller listedækning.'
        ]);
        add('Inddækninger & Finish', [
            'Færdiggørelse af lysninger omkring vinduer og døre.',
            'Montering af evt. alu-vandnæser over vinduer.',
            'Slib evt. oprifter, fjern stillads, ryd op og gennemgå facaden med kunden.'
        ]);
    }
    else if (category === 'roof') {
        add('Sikkerhed, Stillads & Demontering', [
            'Opsætning og godkendelse af stillads med tagfod/rækværk før arbejde påbegyndes.',
            'Nedtagning af det gamle tag (inkl. fjernelse af gamle lægter).',
            'Undersøgelse af eksisterende spær for råd. Oprensning af spærtoppe for evt. søm.'
        ]);
        add('Undertag, Klemlister og Lægter', [
            'Opretning: Tjek spærene, og påfor evt. spærtræ, så tagfladen bliver plan uden lunker.',
            'Rul diffusionsåbent undertag stramt ud (vandret nedefra og op). Tape overlæg.',
            'Søm lodrette klemlister fast på spærene (sikrer ventilation mellem undertag og tagsten).',
            'Montering af taglægter. Mål ud og følg nøje den lægteafstand (L-mål), der passer til den valgte tagsten!'
        ]);
        add('Klargøring til Blikkenslager & Oplægning', [
            'Opbyg og nedsænk evt. skotrendebrædder, og klargør til blikkenslagerens zink-arbejde.',
            'Monter rendejern (eller gør sternen klar til blikkenslagerens montering af tagrender).',
            'Afdæk midlertidigt for regn ved åbne konstruktioner indtil blikket er monteret.',
            `Hejs tagstenene (${d.roofType || d.material || 'tagmaterialet'}) op og fordel dem over tagfladen for jævn vægtbelastning.`,
            'Bind/klips stenene fast efter gældende regler (ofte hver 2. sten eller de to yderste rækker).'
        ]);
        add('Rygning & Finish', [
            'Tilskær tagsten mod skotrender (brug vinkelsliber på jorden eller støvfrit).',
            'Montér rygningsbånd (tætner for flyvesne og slagregn).',
            'Læg rygsten og fastgør dem stramt med rygningsbeslag.',
            'Grovoprydning omkring huset, nedtagning af stillads og aflevering.'
        ]);
    }
    else {
        add('Opmåling & Klargøring', [
            'Gennemgang af tegninger, byggetilladelser og kontrolmål på pladsen.',
            'Klargøring af arbejdssted: Afdækning af gulve, møbler eller bede for at undgå skader.',
            'Kontrol af leverede materialer: Mangler der noget fra pluklisten før I kan gå i gang?'
        ]);
        add('Konstruktion & Udførelse', [
            'Etablering af sikker byggeplads (evt. stillads eller afspærring).',
            'Udførelse af det primære konstruktionsarbejde jf. mesters anvisning.',
            'Tømrer-reglen: "Measure twice, cut once" – dobbelttjek alle specielle mål, før der skæres.'
        ]);
        add('Kvalitetssikring & Finish', [
            'Gennemgang af alle samlinger og bærende dele.',
            'Visuel kontrol: Er alle synlige skruer undersænket pænt, og står overfladerne knivskarpt?'
        ]);
        add('Oprydning & Aflevering', [
            'Grov- og finoprydning af pladsen hver dag. Kunden skal kunne bo og færdes trygt i huset!',
            'Gennemgang af det færdige arbejde sammen med kunden (Afleveringsforretning).'
        ]);
    }

    return steps;
}

// Tildel stabile, fortløbende ID'er (samme skema som den oprindelige funktion).
function assignIds(rawSteps, counters) {
    return rawSteps.map(s => ({
        id: `step-${counters.step++}`,
        text: s.title,
        isExpanded: false,
        subTasks: s.subTasks.map(text => ({
            id: `sub-${counters.sub++}`,
            text,
            done: false
        }))
    }));
}

// ÉT fag — identisk output med den oprindelige getDefaultChecklist.
export function getChecklistForCategory(category, details = {}) {
    return assignIds(buildCategorySteps(category, details), { step: 1, sub: 1 });
}

// PR. ETAPE — til skræddersyede sager: genkend faget for hver etape og saml
// hvert fags byggetrin (forsynet med etapenavn). Falder tilbage på enkelt-fag,
// hvis ingen etape kan genkendes, så resultatet aldrig bliver dårligere end før.
export function buildPhasesChecklist(phases, details = {}, fallbackCategory = '') {
    const counters = { step: 1, sub: 1 };
    const list = [];

    (phases || []).forEach(phase => {
        const phaseText = `${phase.name || ''} ${(phase.materials || []).map(m => m.name || '').join(' ')}`;
        const cat = detectCategory(phaseText);
        if (!cat) return; // etape uden genkendt fag springes over (dækkes af fallback nedenfor)
        const label = (phase.name || '').trim();
        const raw = buildCategorySteps(cat, details).map(s => ({
            ...s,
            title: label ? `${label} · ${s.title}` : s.title
        }));
        list.push(...assignIds(raw, counters));
    });

    if (list.length === 0) {
        // Ingen etaper kunne genkendes → behold den oprindelige enkelt-fag-adfærd.
        return getChecklistForCategory(fallbackCategory, details);
    }
    return list;
}
