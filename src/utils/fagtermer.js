// Dansk tømrer-/byggefaglig ordliste.
//
// Bruges ÉT sted og genbruges tre steder i stemme-/tilbudsflowet:
//   1) Whisper-prompt (biaser transskriberingen mod korrekt stavning).
//   2) Efter-rettelse af log-diktering (retter kun fejlhørte fagtermer).
//   3) Strukturering af tilbud (så AI'en forstår termerne og matcher materialer).
//
// Udvid listen løbende med de ord I oftest skal rette manuelt.

export const FAGTERMER = [
    // Tag
    'vindskede', 'sternbræt', 'stern', 'sternkasse', 'udhæng', 'raftehæng',
    'undertag', 'undertagsbrædder', 'taglægter', 'lægter', 'lægteafstand',
    'afstandslister', 'klemlister', 'spær', 'spærtræ', 'hanebånd',
    'rygning', 'rygsten', 'rygningsbånd', 'skotrende', 'inddækning',
    'fodblik', 'tagrende', 'rendejern', 'nedløb', 'tagsten', 'tagpap',
    // Facade & ydervæg
    'facadebeklædning', 'klinklægning', 'en-på-to', 'vindspærre',
    'diffusionsåben', 'sternbeklædning',
    // Loft & indvendigt
    'forskalling', 'forskallingsbrædder', 'dampspærre', 'dampspærretape',
    'loftplader', 'skyggelister', 'gipsplade', 'troldtekt',
    // Gulv
    'sildeben', 'parket', 'lamelparket', 'massivt trægulv', 'strøer',
    'bjælkelag', 'bjælkesko', 'trinlydsdæmpning', 'svømmende gulv',
    'fer og not', 'notgang', 'ekspansionsfuge',
    // Lister & finish
    'fodpaneler', 'fodlister', 'gerigt', 'lysning', 'indfatning',
    'overgangslister', 'fals', 'fuge', 'fugebånd', 'bagstop', 'akrylfuge',
    // Terrasse & udendørs
    'terrassebrædder', 'komposit', 'jordskruer', 'stolpesko', 'remme',
    'ukrudtsdug', 'trykimprægneret',
    // Trapper
    'trinbræt', 'stødtrin', 'vange',
    // Vinduer & døre
    'karm', 'karmskruer', 'opklodsning', 'kiler', 'lodpost', 'sålbænk',
    // Beslag & fastgørelse
    'vinkelbeslag', 'hulbånd', 'bjælkesko', 'kamsøm', 'franske skruer',
    'afstandsklodser',
    // Isolering & undergulv
    'mineraluld', 'spartelmasse', 'selvnivellerende', 'fibertex',
];

// Naturlig sætning som Whisper-prompt — biaser mod korrekt stavning af fagtermer.
export const WHISPER_PROMPT =
    'Dette er en talebesked fra en dansk tømrer/håndværker om en byggesag. ' +
    'Brug korrekte danske byggefagtermer, fx: ' + FAGTERMER.join(', ') + '.';

// Komma-liste til at indsætte i andre prompts.
export const FAGTERMER_TEXT = FAGTERMER.join(', ');

// System-prompt til efter-rettelse af den rå log-diktering.
export const FAGTERM_CORRECTION_PROMPT =
    'Du er korrekturlæser for transskriberet dansk tømrer-/håndværkertale. ' +
    'Ret KUN åbenlyst fejlhørte ord til de korrekte danske byggefagtermer. ' +
    'Bevar betydning, tone, tal og alt andet 100% uændret — du må ikke omskrive, ' +
    'tilføje eller fjerne indhold. Hvis intet skal rettes, returnér teksten uændret. ' +
    'Returnér KUN den rettede tekst, uden anførselstegn eller forklaring.\n\n' +
    'Korrekte fagtermer: ' + FAGTERMER_TEXT;
