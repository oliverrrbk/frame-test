import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SideDrawer = ({ isOpen, onClose, title, content }) => {
    const scrollContainerRef = React.useRef(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Lock body scroll when open and scroll to top
    useEffect(() => {
        if (isOpen) {
            // Scroll to top of drawer when opened
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
            
            // Hard lock the body and html to prevent background scrolling
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            // On some mobile devices, fixed position helps completely lock the scroll
            // but setting overflow hidden on both is usually enough for modern browsers.
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }
        
        // Cleanup function
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!mounted) return null;

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end" style={{ position: 'fixed' }}>
                    {/* Overlay */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                        data-lenis-prevent="true"
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    
                    {/* Drawer */}
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="relative w-full max-w-2xl bg-slate-50 dark:bg-slate-950 h-full shadow-2xl flex flex-col z-10"
                    >
                        {/* Header */}
                        <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center z-20">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                        
                        {/* Content Area */}
                        <div 
                            ref={scrollContainerRef}
                            data-lenis-prevent="true"
                            onWheel={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                            className="flex-1 overflow-y-auto p-4 md:p-8" 
                            style={{ overscrollBehavior: 'contain' }}
                        >
                            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                {content}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

const TermsContent = ({ onOpenDpa }) => (
    <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-sm md:text-base">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-800 pb-4 mb-8">Aftalevilkår & Handelsbetingelser</h1>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">1. Generelle vilkår</h2>
        <p className="mb-4 text-justify">1.1. Bison Company ApS udvikler og leverer softwareløsningen Bison Frame (herefter ”Applikationen”) målrettet til håndværksvirksomheder med henblik på at samle og optimere tilbudsgivning, sagsstyring og kundekommunikation.</p>
        <p className="mb-4 text-justify">1.2. Nærværende forretningsvilkår (herefter ”Vilkår” eller ”Vilkårene”) regulerer brugen af Applikationen i forholdet mellem Bison Company ApS, CVR-nr. 43899713 (herefter benævnt ”Bison Company”) og kunden (herefter benævnt ”Kunden”).</p>
        <p className="mb-4 text-justify">1.3. Bison Company er til enhver tid berettiget til at ændre Vilkårene herunder abonnementstyper, prisstrukturer, priser og tilknyttede ydelser. Væsentlige ændringer af Vilkårene vil blive varslet overfor Kunden senest 30 dage før ikrafttrædelse via e-mail. Kundens brug af Applikationen efter ikrafttræden af de ændrede Vilkår udgør Kundens accept af de ændrede Vilkår.</p>
        <p className="mb-4 text-justify">1.4. De til enhver tid gældende Vilkår er tilgængelige i Applikationen. Kunden opfordres til løbende at holde sig orienteret om den til enhver tid gældende version.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">2. Brugsret og adgang</h2>
        <p className="mb-4 text-justify">2.1. Kunden opnår i overensstemmelse med aftalen en ikke-eksklusiv, ikke-overdragelig og tidsbegrænset brugsret til Applikationen udelukkende til brug for Kundens interne forretningsmæssige aktiviteter, hvorved forstås anvendelse af Applikationen til at afgive tilbud og kommunikere med Kundens egne kunder. Det er ikke tilladt at anvende Applikationen til levering af tjenester for tredjemand.</p>
        <p className="mb-4 text-justify">2.2. Brugerkonti er personlige for den enkelte virksomhed og administreres via Kundens sikre log-in.</p>
        <p className="mb-4 text-justify">2.3. Bison Company forbeholder sig retten til at etablere tekniske foranstaltninger med henblik på at beskytte Applikationen mod misbrug. Bison Company er berettiget til uden varsel at iværksætte midlertidig spærring af adgangen ved mistanke om uautoriseret brug.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">3. Kundens data og brugsdata</h2>
        <p className="mb-4 text-justify">3.1. I forbindelse med brug af Applikationen indlæser Kunden data, ligesom der genereres tilbud, dokumenter og kommunikation med slutkunden (samlet benævnt ”Kundedata”). Kunden ejer Kundedata.</p>
        <p className="mb-4 text-justify">3.2. Bison Company må ikke bruge personhenførbar Kundedata til andre formål end drift, vedligeholdelse, support, fejlretning og forbedring af Applikationen, samt til at integrere med eksterne regnskabs- og driftssystemer. Bison Company forbeholder sig dog retten til at <strong>anonymisere</strong> al Kundedata (således at det ikke længere indeholder persondata) med det formål at træne og forbedre platformens AI-modeller og estimeringsalgoritmer. Denne fuldt anonymiserede data ejes af Bison Company og slettes ikke ved abonnementsophør.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">4. Datasikkerhed og Persondatabehandling</h2>
        <p className="mb-4 text-justify">4.1. Bison Company forpligter sig til at opretholde et højt sikkerhedsniveau og træffer passende tekniske foranstaltninger i overensstemmelse med databeskyttelsesforordningen (GDPR) for at beskytte data mod uautoriseret adgang, tab eller ændring.</p>
        <p className="mb-4 text-justify">4.2. Kunden er dataansvarlig for de personoplysninger (fx om slutkunder), der behandles gennem Applikationen, mens Bison Company er databehandler. For denne behandling gælder en særskilt <span onClick={onOpenDpa} className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors">Databehandleraftale (DPA)</span>, som automatisk accepteres ved oprettelse.</p>
        <p className="mb-4 text-justify">4.3. Det påhviler Kunden at sikre, at indsamling af data fra deres slutkunder via Applikationens tilbuds-wizard sker på et lovligt grundlag, jf. GDPR artikel 13 og 14.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">5. Applikationen, Support og driftsstabilitet</h2>
        <p className="mb-4 text-justify">5.1. Applikationen leveres til Kunden som en Software-as-a-Service (SaaS) løsning via internettet i den til enhver tid gældende version. Applikationen leveres "som den er" og "som tilgængelig" (as-is og as-available).</p>
        <p className="mb-4 text-justify">5.2. Bison Company tilstræber høj driftsstabilitet, men garanterer ikke en fejlfri oplevelse eller 100% oppetid, da applikationen kan påvirkes af internetforbindelser, hostingpartnere eller afbrydelser. Bison Company kan ikke gøres ansvarlig for tab som følge af nedbrud.</p>
        <p className="mb-4 text-justify">5.3. Bison Company yder teknisk support til betjening af platformen via e-mail og telefon inden for normal åbningstid.</p>
        <p className="mb-4 text-justify">5.4. Bison Company forbeholder sig retten til, uden at det betragtes som en mangel eller et brud på oppetid, at foretage systemopdateringer og vedligeholdelse, som midlertidigt kan begrænse adgangen til Applikationen. Dette vil så vidt muligt blive placeret uden for normal arbejdstid.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">6. Priser og betalingsbetingelser</h2>
        <p className="mb-4 text-justify">6.1. Alle priser for brugen af Applikationen er angivet eksklusive moms. Fakturering sker forud for den valgte abonnementsperiode.</p>
        <p className="mb-4 text-justify">6.2. <strong>Prøveperiode:</strong> Alle nye kunder tilbydes en 30 dages gratis prøveperiode. Der opkræves ingen betalingsoplysninger ved oprettelsen. Før udløbet af prøveperioden vil Kunden blive anmodet om at tilknytte et gyldigt betalingskort for at fortsætte brugen af Applikationen.</p>
        <p className="mb-4 text-justify">6.3. <strong>Betaling:</strong> Betaling sker primært via automatisk korttræk. Betalingskortoplysninger opbevares <strong>ikke</strong> af Bison Company, men behandles sikkert af vores certificerede tredjeparts betalingsindløser (f.eks. Stripe) i fuld overensstemmelse med gældende PCI-standarder. Bison Company fraskriver sig ethvert ansvar for datalæk hos tredjeparts betalingsindløsere.</p>
        <p className="mb-4 text-justify">6.4. Kunden er ansvarlig for, at der altid er tilknyttet et gyldigt betalingskort til kontoen efter prøveperioden. Ved manglende eller forsinket betaling fremsendes rykker med tillæg af rykkergebyr i henhold til rentelovens regler. Bison Company forbeholder sig retten til at spærre Kundens adgang til Applikationen indtil det skyldige beløb er betalt.</p>
        <p className="mb-4 text-justify">6.5. Bison Company er berettiget til at foretage en årlig indeksregulering af abonnementspriserne (typisk 3-5%) uden at dette udgør en væsentlig ændring af aftalen, som kræver særskilt accept.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">7. Integrationer til tredjepart (Regnskabsprogrammer m.v.)</h2>
        <p className="mb-4 text-justify">7.1. Applikationen tilbyder integrationer til tredjepartssystemer (fx E-conomic, Dinero, Ordrestyring og Apacta). Bison Company påtager sig intet ansvar for fejl, datatab eller nedbrud, der skyldes ændringer i disse tredjepartssystemers API'er eller generelle funktionalitet.</p>
        <p className="mb-4 text-justify">7.2. Kunden er alene ansvarlig for at kontrollere, at data, der overføres mellem Applikationen og tredjepartssystemer (fx fakturaudkast, varer eller sagsoprettelser), er korrekte og fyldestgørende i overensstemmelse med gældende lovgivning.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">8. Referenceret i markedsføring</h2>
        <p className="mb-4 text-justify">8.1. Bison Company er berettiget til at anvende Kundens firmanavn og logo som reference på Bison Companys hjemmeside og i generelt markedsføringsmateriale. Såfremt Kunden udtrykkeligt ikke ønsker at indgå som reference, skal dette meddeles skriftligt til Bison Company.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">9. Immaterielle rettigheder</h2>
        <p className="mb-4 text-justify">9.1. Bison Company ejer alle rettigheder, herunder immaterielle rettigheder, til Applikationen (kildekode, design, AI-modeller, tekster, koncepter og brugergrænseflader). Kunden tildeles alene en brugsret.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">10. Ansvar og Force Majeure</h2>
        <p className="mb-4 text-justify">10.1. Applikationen stilles til rådighed som et professionelt salgs- og tilbudsværktøj. Bison Company fraskriver sig ethvert ansvar for Kundens forretningsmæssige tab, manglende indtjening eller tvister med slutkunder opstået som følge af tilbud genereret gennem systemet.</p>
        <p className="mb-4 text-justify">10.2. Selvom systemet automatisk kan indsætte juridiske standardforbehold (fx AB Forbruger) i tilbud, er Kunden selv ansvarlig for at sikre, at de afgivne tilbud og vilkår er fyldestgørende og lovlige for den specifikke opgave.</p>
        <p className="mb-4 text-justify">10.3. <strong>Ansvarsbegrænsning:</strong> Bison Company kan under ingen omstændigheder gøres ansvarlig for indirekte tab, driftstab, tabt arbejdsfortjeneste, tab af data, tab af goodwill eller andre følgeskader. Bison Companys samlede ansvar over for Kunden er i ethvert tilfælde begrænset til Kundens betalte abonnement de seneste 12 måneder forud for den skadevoldende begivenhed.</p>
        <p className="mb-4 text-justify">10.4. <strong>Force Majeure:</strong> Bison Company er ikke ansvarlig for manglende eller forsinket opfyldelse af sine forpligtelser, hvis dette skyldes omstændigheder uden for Bison Companys rimelige kontrol (force majeure). Dette inkluderer, men er ikke begrænset til, krig, terror, naturkatastrofer, strejker, hackerangreb, virus, samt strøm- eller netværksnedbrud og nedbrud hos underleverandører (herunder cloud-udbydere).</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">11. Misligholdelse og Opsigelse</h2>
        <p className="mb-4 text-justify">11.1. I tilfælde af Kundens væsentlige misligholdelse, herunder manglende betaling eller misbrug, er Bison Company berettiget til straks at suspendere adgangen til systemet og eventuelt ophæve aftalen uden ansvar.</p>
        <p className="mb-4 text-justify">11.2. Kunden kan til enhver tid opsige sit abonnement skriftligt til udløbet af en igangværende faktureringsperiode. Forudbetalt abonnement refunderes ikke.</p>
        <p className="mb-4 text-justify">11.3. <strong>Ingen fortrydelsesret:</strong> Da Applikationen udelukkende leveres som en business-to-business (B2B) tjeneste til erhvervsdrivende, gælder forbrugeraftalelovens regler om fortrydelsesret <strong>ikke</strong>.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">12. Lovvalg og tvister</h2>
        <p className="mb-4 text-justify">12.1. Disse Vilkår er underlagt dansk ret.</p>
        <p className="mb-4 text-justify">12.2. Enhver tvist skal søges løst i mindelighed og kan ellers anlægges ved de danske domstole.</p>

        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 text-center">
            Dokument opdateret: April 2026<br />
            Bison Company ApS · CVR: 43899713
        </div>
    </div>
);

const DpaContent = () => (
    <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-sm md:text-base">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-800 pb-4 mb-8">Databehandleraftale (DPA)</h1>
        
        <p className="mb-4 text-justify">Denne databehandleraftale ("Aftalen") er indgået i overensstemmelse med Europa-Parlamentets og Rådets forordning (EU) 2016/679 (Databeskyttelsesforordningen / GDPR).</p>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg mb-8">
            <strong>Mellem:</strong><br /><br />
            <strong>Den dataansvarlige:</strong><br />
            Kunden (den tømrervirksomhed der opretter sig i Bison Frame systemet).<br /><br />
            <strong>Og Databehandleren:</strong><br />
            Bison Company ApS<br />
            CVR: 45899713<br />
            Jens Baggesens Vej 71, st<br />
            8200 Aarhus N, Danmark
        </div>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">1. Baggrund og Formål</h2>
        <p className="mb-4 text-justify">1.1. Denne aftale fastsætter de rettigheder og forpligtelser, som finder anvendelse, når databehandleren (Bison Company ApS) behandler personoplysninger på vegne af den dataansvarlige (Kunden).</p>
        <p className="mb-4 text-justify">1.2. Databehandlerens behandling sker udelukkende med det formål at levere SaaS-platformen "Bison Frame", så Kunden kan håndtere leads, udarbejde tilbud og styre sager vedrørende håndværksmæssige opgaver.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">2. Den Dataansvarliges Rettigheder og Pligter</h2>
        <p className="mb-4 text-justify">2.1. Den dataansvarlige har ansvaret for, at der foreligger lovlig hjemmel til behandlingen, f.eks. ved indsamling af oplysninger fra slutkunder via tilbudsformularen.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">3. Databehandlerens Forpligtelser (Instruks og Fortrolighed)</h2>
        <p className="mb-4 text-justify">3.1. Databehandleren behandler udelukkende personoplysninger efter dokumenteret instruks fra den dataansvarlige, som fastsat gennem Kundens brug af systemet.</p>
        <p className="mb-4 text-justify">3.2. Databehandleren sikrer, at autoriserede medarbejdere, der behandler personoplysninger, er underlagt fuld fortrolighed og lovbestemt tavshedspligt.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">4. Behandlingssikkerhed og Inspektionsret</h2>
        <p className="mb-4 text-justify">4.1. Databehandleren iværksætter passende tekniske og organisatoriske sikkerhedsforanstaltninger for at sikre et beskyttelsesniveau, der passer til de risici, der er forbundet med behandlingen (jf. GDPR artikel 32).</p>
        <p className="mb-4 text-justify">4.2. Adgangskoder krypteres altid. Databehandleren sikrer vedvarende fortrolighed og tager løbende backup af Kundens data for at beskytte mod tab.</p>
        <p className="mb-4 text-justify">4.3. <strong>Inspektionsret (Audit):</strong> Den Dataansvarlige har til enhver tid ret til for egen regning at foretage eller få foretaget revisioner og inspektioner (af en uafhængig tredjepart) for at bekræfte Databehandlerens overholdelse af denne Aftale og GDPR (jf. GDPR Art. 28, stk. 3, litra h).</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">5. Brug af Underdatabehandlere</h2>
        <p className="mb-4 text-justify">5.1. Ved accept af denne aftale giver den dataansvarlige en generel godkendelse til, at databehandleren gør brug af underdatabehandlere til hosting og drift (bl.a. Supabase og Vercel). Databehandleren sikrer, at underdatabehandlere er underlagt minimum samme databeskyttelsesforpligtelser som fastsat i denne Aftale.</p>
        <p className="mb-4 text-justify">5.2. <strong>Varsling:</strong> Databehandleren skal underrette den Dataansvarlige via e-mail om eventuelle planlagte ændringer vedrørende tilføjelse eller erstatning af underdatabehandlere med mindst 30 dages varsel. Den Dataansvarlige har hermed mulighed for at gøre indsigelse mod sådanne ændringer. Hvis indsigelsen er berettiget, og en løsning ikke kan findes, har kunden ret til at opsige aftalen gebyrfrit.</p>
        <p className="mb-4 text-justify">5.3. Data transmitteres og opbevares som udgangspunkt inden for EU/EØS eller underlagt fuldt gyldige overførselsgrundlag (fx EU's Standard Contractual Clauses eller Data Privacy Framework).</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">6. Underretning om brud på persondatasikkerheden</h2>
        <p className="mb-4 text-justify">6.1. Databehandleren underretter den dataansvarlige uden unødig forsinkelse og senest 48 timer efter at være blevet opmærksom på et brud på persondatasikkerheden.</p>
        <p className="mb-4 text-justify">6.2. Databehandleren bistår den dataansvarlige med at foretage lovpligtige anmeldelser til Datatilsynet.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">7. Sletning og Anonymisering af Data</h2>
        <p className="mb-4 text-justify">7.1. <strong>Slettepligt:</strong> Ved ophør af "Bison Frame" abonnementet forpligter Databehandleren sig til, efter den Dataansvarliges anvisning, at slette eller tilbagelevere alle personoplysninger, som Databehandleren behandler på vegne af den Dataansvarlige (medmindre EU-ret eller national ret foreskriver opbevaring).</p>
        <p className="mb-4 text-justify">7.2. <strong>AI-Træning & Anonymisering:</strong> Forud for en eventuel sletning af data, eller løbende som led i drift og udvikling, er Databehandleren berettiget til at udtrække data og underkaste dem en irreversibel og fuldstændig anonymisering. Formålet hermed er udelukkende systemforbedring og træning af platformens AI-modeller (beregningslogik). Når data er lovligt og fuldt anonymiseret (hvorved de ikke længere kan henføres til en fysisk person, virksomhed eller slutkunde), udgør de ikke længere personoplysninger under GDPR. Databehandleren erhverver det fulde ejerskab til disse anonymiserede data og forbeholder sig retten til at bevare disse på ubestemt tid, også efter kundens opsigelse.</p>

        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">8. Behandlingens Omfang</h2>
        <h3 className="font-bold text-slate-700 dark:text-slate-300 mt-4 mb-2">Kategorier af Registrerede og Oplysninger</h3>
        <ul className="list-disc pl-5 mb-4 text-justify">
            <li><strong>Kunder/Leads:</strong> Navn, adresse, e-mail, telefonnummer, billeder og sagsbeskrivelser (almindelige personoplysninger).</li>
            <li><strong>Medarbejdere:</strong> Navn, e-mail, telefon, systemroller.</li>
        </ul>
        <p className="mb-4 text-justify">Behandlingen varer indtil Kundens abonnement opsiges og sletteprocedurer iværksættes.</p>

        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 text-center">
            Bison Company ApS · CVR: 45899713<br />
            Senest opdateret: April 2026<br />
            Aftalen accepteres elektronisk ved oprettelse i Bison Frame.
        </div>
    </div>
);

export default function Footer() {
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [isDpaOpen, setIsDpaOpen] = useState(false);

    // If DPA is clicked inside Terms, close Terms and open DPA.
    const handleOpenDpaFromTerms = () => {
        setIsTermsOpen(false);
        setIsDpaOpen(true);
    };

    return (
        <>
            <footer className="bg-slate-100 dark:bg-slate-900 font-inter text-sm tracking-wide text-slate-500 dark:text-slate-400 w-full py-16 px-8 mt-auto z-10 relative">
                <div className="flex flex-col gap-12 max-w-[1440px] mx-auto min-h-[160px]">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12 w-full">
                        <div className="flex flex-col max-w-[320px]">
                            <div className="text-md font-bold text-slate-700 dark:text-slate-200 mb-6">
                                Bison Frame
                            </div>
                            <p className="mt-4 leading-relaxed">Præcise overslag til den moderne håndværker. Spar mere tid i hverdagen, og vind flere opgaver hos kunden.</p>
                        </div>
                        <div className="flex flex-row flex-wrap gap-x-12 gap-y-6 justify-start md:justify-end md:items-start text-xs font-semibold sm:text-sm text-slate-500 dark:text-slate-400 pt-1">
                            <Link className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 text-inherit" to="/calculator">Udregn Profit</Link>
                            <Link className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 text-inherit" to="/features">Funktioner</Link>
                            <Link className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 text-inherit" to="/pricing">Priser</Link>
                            <button onClick={() => setIsTermsOpen(true)} className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 appearance-none bg-transparent border-none p-0 outline-none text-inherit font-inherit">Aftalevilkår</button>
                            <button onClick={() => setIsDpaOpen(true)} className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 appearance-none bg-transparent border-none p-0 outline-none text-inherit font-inherit">Databehandleraftale</button>
                            <button onClick={() => window.location.href='mailto:support@bisonframe.dk'} className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 appearance-none bg-transparent border-none p-0 outline-none text-inherit font-inherit">Kontakt Support</button>
                        </div>
                    </div>
                
                    <div className="w-full mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center md:text-left">
                        © 2026 Bison Frame. Alle rettigheder forbeholdes.
                    </div>
                </div>
            </footer>

            {/* Side Drawers */}
            <SideDrawer 
                isOpen={isTermsOpen} 
                onClose={() => setIsTermsOpen(false)} 
                title="Aftalevilkår & Handelsbetingelser" 
                content={<TermsContent onOpenDpa={handleOpenDpaFromTerms} />} 
            />
            <SideDrawer 
                isOpen={isDpaOpen} 
                onClose={() => setIsDpaOpen(false)} 
                title="Databehandleraftale (DPA)" 
                content={<DpaContent />} 
            />
        </>
    );
}
