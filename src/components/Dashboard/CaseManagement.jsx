import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { HardHat, CheckSquare, Camera, Clock, UserPlus, ChevronRight, AlertTriangle, TrendingUp, Plus, Trash2, Calendar, ShieldAlert, MapPin, User, ArrowLeft, Package, DollarSign, PackageCheck, ClipboardList, CheckCircle, Upload, Save, Edit2, ChevronDown } from 'lucide-react';
import MaterialList from './MaterialList';
import toast from 'react-hot-toast';

const CustomSelect = ({ value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options.flatMap(o => o.options || []).find(o => o.value === value);
    const label = selectedOption ? selectedOption.label : placeholder;

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    border: isOpen ? '2px solid #3b82f6' : '1px solid #cbd5e1', 
                    backgroundColor: '#fff', 
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.95rem',
                    fontWeight: '400',
                    color: value ? '#1e293b' : '#94a3b8',
                    transition: 'all 0.2s',
                    boxShadow: isOpen ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none'
                }}
            >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                <ChevronDown size={18} style={{ color: '#64748b', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && (
                <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    marginTop: '8px', 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', 
                    border: '1px solid #e2e8f0',
                    zIndex: 100000,
                    maxHeight: '250px',
                    overflowY: 'auto',
                    padding: '8px 0'
                }}>
                    {options.map((opt, i) => {
                        if (opt.isGroup) {
                            return (
                                <div key={i}>
                                    <div style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: i > 0 ? '8px' : '0' }}>
                                        {opt.label}
                                    </div>
                                    {opt.options.map(subOpt => (
                                        <div 
                                            key={subOpt.value}
                                            onClick={() => { onChange(subOpt.value); setIsOpen(false); }}
                                            style={{ padding: '10px 16px', fontSize: '0.95rem', cursor: 'pointer', backgroundColor: value === subOpt.value ? '#f1f5f9' : 'transparent', color: value === subOpt.value ? '#3b82f6' : '#1e293b', fontWeight: value === subOpt.value ? '600' : '400' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = value === subOpt.value ? '#f1f5f9' : '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === subOpt.value ? '#f1f5f9' : 'transparent'}
                                        >
                                            {subOpt.label}
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                        
                        return (
                            <div 
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                style={{ padding: '10px 16px', fontSize: '0.95rem', cursor: 'pointer', backgroundColor: value === opt.value ? '#f1f5f9' : 'transparent', color: value === opt.value ? '#3b82f6' : '#1e293b', fontWeight: value === opt.value ? '600' : '400' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = value === opt.value ? '#f1f5f9' : '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === opt.value ? '#f1f5f9' : 'transparent'}
                            >
                                {opt.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default function CaseManagement({ targetCaseId, clearTargetCase, leads = [], profile, simulatedRole, syncToAccounting, onUpdateLead, isModalView = false, selectedLeadId = null }) {
    const [activeCases, setActiveCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState(['worker', 'apprentice', 'sales'].includes(profile?.role) ? 'timesheet' : 'todo'); // 'todo', 'materials', 'logs', 'timesheet', 'finance'
    const [team, setTeam] = useState([]);

    // States til delegering
    const [pmIds, setPmIds] = useState([]);
    const [assignedWorkers, setAssignedWorkers] = useState([]);
    const [pmDropdownOpen, setPmDropdownOpen] = useState(false);
    const [workerDropdownOpen, setWorkerDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isSavingTeam, setIsSavingTeam] = useState(false);
    const [isSavedTeam, setIsSavedTeam] = useState(false);

    // States til to-do
    const [todoList, setTodoList] = useState([]);
    const [newTodoText, setNewTodoText] = useState('');

    // States til logs
    const [logsList, setLogsList] = useState([]);
    const [newLogText, setNewLogText] = useState('');
    const [logStatus, setLogStatus] = useState('green'); // 'green', 'yellow', 'red'
    const [logPhotos, setLogPhotos] = useState([]); // Previews (blob URLs)
    const [logFiles, setLogFiles] = useState([]); // Actual File objects
    const [isUploadingLog, setIsUploadingLog] = useState(false);
    const [isChangeOrder, setIsChangeOrder] = useState(false);
    const [extraHours, setExtraHours] = useState('');
    const [extraPrice, setExtraPrice] = useState('');

    // States til Fakturering (Finance)
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceLines, setInvoiceLines] = useState([]);
    const [isReverseCharge, setIsReverseCharge] = useState(false);
    const [invoiceActionType, setInvoiceActionType] = useState('draft'); // 'draft' eller 'book_and_send'

    // States til timeregistrering
    const [timeEntries, setTimeEntries] = useState([]);
    const [newTime, setNewTime] = useState({ startTime: '07:00', endTime: '15:00', date: new Date().toISOString().substring(0, 10), desc: '', employeeId: '' });
    const [deductPause, setDeductPause] = useState(true);
    const [editingTimeId, setEditingTimeId] = useState(null);

    // States til Mesterens ugentlige medarbejder-tidsstyring
    const [selectedEmployeeForTidslog, setSelectedEmployeeForTidslog] = useState('');

    // Mobil & Worker Check-in states
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobileWorker = ['worker', 'apprentice', 'sales'].includes(profile?.role) && isMobile;
    const activeCheckIn = timeEntries.find(t => t.employeeId === profile?.id && t.endTime === null);

    // Indlæs data
    useEffect(() => {
        const confirmed = leads.filter(l => ['Bekræftet opgave', 'Historik'].includes(l.status));
        
        if (['worker', 'apprentice', 'sales'].includes(profile?.role)) {
            if (simulatedRole) {
                setActiveCases(confirmed);
            } else {
                const filtered = confirmed.filter(c => {
                    const workers = c.raw_data?.assigned_workers || [];
                    const pm = c.raw_data?.assigned_pm;
                    return workers.includes(profile.id) || pm === profile.id;
                });
                setActiveCases(filtered);
            }
        } else {
            setActiveCases(confirmed);
        }

        // Hent teamet (carpenters)
        fetchTeam();

        // Hvis det er modal-visning (vi har åbnet en sag direkte i lead detail modalen)
        if (isModalView && selectedLeadId) {
            const current = confirmed.find(c => c.id === selectedLeadId);
            if (current) {
                setSelectedCase(current);
            }
        }

        if (profile) {
            setNewTime(prev => ({ ...prev, employeeId: ['worker', 'apprentice', 'sales'].includes(profile.role) ? profile.id : '' }));
        }
    }, [leads, isModalView, selectedLeadId, profile, simulatedRole]);

    // Indlæs sags-data når en sag vælges
    useEffect(() => {
        if (selectedCase) {
            loadCaseData();
        }
    }, [selectedCase]);

    // Lyt efter remote targeting fra Dashboard CTA'en
    useEffect(() => {
        if (targetCaseId) {
            const confirmed = leads.filter(l => ['Bekræftet opgave', 'Historik'].includes(l.status));
            const target = confirmed.find(c => c.id === targetCaseId);
            if (target) {
                setSelectedCase(target);
                clearTargetCase(); // Nulstil straks så vi kan navigere tilbage
            }
        }
    }, [targetCaseId, leads, clearTargetCase]);

    const fetchTeam = async () => {
        try {
            const companyId = profile.company_id || profile.id;
            const { data, error } = await supabase
                .from('carpenters')
                .select('*')
                .eq('company_id', companyId);

            if (!error && data) {
                const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isDev) {
                    const mockUsers = [
                        { id: 'mock-pm-1', owner_name: 'Christian (Projektleder)', role: 'sales' },
                        { id: 'mock-worker-1', owner_name: 'Niklas (Tømrersvend)', role: 'worker' },
                        { id: 'mock-worker-2', owner_name: 'Kasper (Tømrerlærling)', role: 'apprentice' },
                        { id: 'mock-acc-1', owner_name: 'Hanne (Bogholder)', role: 'accountant' }
                    ];
                    const enrichedData = [...data];
                    for (const mockUser of mockUsers) {
                        if (!enrichedData.find(u => u.id === mockUser.id)) {
                            enrichedData.push(mockUser);
                        }
                    }
                    setTeam(enrichedData);
                } else {
                    setTeam(data);
                }
            } else {
                throw new Error("Kunne ikke hente team");
            }
        } catch (err) {
            // Fallback for team på localhost ved API fejl
            setTeam([
                { id: profile.id, owner_name: profile.owner_name + ' (Dig)', role: 'admin' },
                { id: 'mock-pm-1', owner_name: 'Christian (Projektleder)', role: 'sales' },
                { id: 'mock-worker-1', owner_name: 'Niklas (Tømrersvend)', role: 'worker' },
                { id: 'mock-worker-2', owner_name: 'Kasper (Tømrerlærling)', role: 'apprentice' },
                { id: 'mock-acc-1', owner_name: 'Hanne (Bogholder)', role: 'accountant' }
            ]);
        }
    };

    const loadCaseData = async () => {
        const caseId = selectedCase.id;

        // 1. Indlæs Delegering (PM og Workers)
        const savedPm = selectedCase.raw_data?.assigned_pm || [];
        setPmIds(Array.isArray(savedPm) ? savedPm : (savedPm ? [savedPm] : []));
        const savedWorkers = selectedCase.raw_data?.assigned_workers || [];
        setAssignedWorkers(savedWorkers);

        // 2. Indlæs To-Do Liste
        const savedTodo = selectedCase.raw_data?.checklist || [];
        if (savedTodo.length > 0) {
            setTodoList(savedTodo);
        } else {
            // Indlæs standard to-do opskrifter baseret på sagsdetaljerne
            const defaultTodo = getDefaultChecklist(selectedCase);
            setTodoList(defaultTodo);
        }

        // 3. Indlæs Logbog
        const savedLogs = selectedCase.raw_data?.logs || [];
        if (savedLogs.length > 0) {
            setLogsList(savedLogs);
        } else {
            // Indlæs mock start-logs
            setLogsList([
                { id: 'log-start', status: 'green', text: 'Sag oprettet og overdraget til byggepladsen.', author: 'Systemet', date: selectedCase.created_at || new Date().toISOString() }
            ]);
        }

        // 4. Indlæs Timeregistreringer
        const savedTimes = selectedCase.raw_data?.time_entries || [];
        setTimeEntries(savedTimes);
    };

    // Standard To-Do opskrifter for faglige anvisninger, bygget dynamisk ud fra opgaven
    const getDefaultChecklist = (caseObj) => {
        const categoryMap = {
            'Nyt Gulv': 'floor', 'Gulv': 'floor', 'Nye Vinduer': 'windows', 'Vinduer': 'windows',
            'Nye Døre': 'doors', 'Døre': 'doors', 'Træterrasse': 'terrace', 'Terrasse': 'terrace',
            'Tagprojekt': 'roof', 'Tag': 'roof', 'Nyt Køkken': 'kitchen', 'Køkken': 'kitchen',
            'Nye Lofter': 'ceilings', 'Lofter': 'ceilings', 'Ny Facadebeklædning': 'facades',
            'Facader': 'facades', 'Tilbygning': 'extensions', 'Anneks': 'annex', 'Annekser & Skure': 'annex',
            'Carport': 'carport', 'Hegn': 'fence'
        };
        const rawCat = caseObj.project_category || '';
        const category = categoryMap[rawCat] || rawCat;
        const d = caseObj.raw_data?.details || {};
        
        let list = [];
        let step = 1;
        const add = (text) => list.push({ id: `dyn-${step++}`, text, done: false });

        // Fælles starttrin for alle
        add('Afsætning og kontrol: Opmåling af arealer, samt kontrol af leverede materialer for fejl/mangler.');

        // Specifikke demonterings-/bortskaffelsestrin
        if (d.disposal && d.disposal.toLowerCase().includes('ja')) {
            add(`Demontering & Bortskaffelse: Fjern det gamle materiale (${d.oldMaterial || d.oldFloorType || d.oldRoofType || 'eksisterende'}). Bestil evt. container.`);
        }

        switch (category) {
            case 'terrace':
                if (d.foundationType === 'skrue') {
                    add('Fundament: Opmål og markér placering af jordskruer (anbefalet c-c max 2,5m). Skru dem i frostfri dybde og tjek højderne løbende med rotorlaser.');
                } else {
                    add('Fundament: Udgrav til stolpehuller (min. 90 cm ned for frostfri dybde). Støb stolperne fast i tørbeton og brug loddestok for at sikre præcision.');
                }
                add(`Underkonstruktion: Monter bærende remme (fastgøres med franske skruer) og strøer med vinkelbeslag. Strøafstand afhænger af brædderne (c-c 40 cm for komposit, max 50 cm for hårdttræ).`);
                add('Vindspærre/Ukrudtsdug: Udrul ukrudtsdug omhyggeligt under bjælkelaget og læg lidt stabilgrus over, så den ikke blafrer i vinden.');
                add(`Dækbrædder: Udlægning af ${d.terraceWood || d.material || 'terrassebrædder'}. Husk præcise fugeafstande: Brug knudsen-kiler eller tommestok som afstandsklods (min. 5 mm luft til udvidelse).`);
                add('Fastgørelse: Brug altid rustfrie A4 skruer (eller C4 til trykimp). Sæt en snor ud for hver strø, så skruerne sidder i 100% lige linjer. Sænk skruehovedet præcis i niveau med brættet.');
                if (d.railing && d.railing.toLowerCase().includes('ja')) {
                    add('Rækværk: Monter stolper til rækværk. Sørg for at afstive rækværket ned i underkonstruktionen for optimal stabilitet.');
                }
                break;
            case 'floor':
                add('Undergulv - Kontrol: Støvsug grundigt. Tjek planhed med en lang retskede – max tolerance er 2mm lunker over et stræk på 2 meter. Opret med selvnivellerende spartel hvis nødvendigt.');
                add('Underlag & Fugtspærre: Udlæg dampspærre (husk 20 cm overlæg, som skal tapes tæt med dampspærretape). Rul derefter det støjdæmpende underlag ud kant til kant (uden overlæg).');
                add(`Lægning af brædder/planker: Start lægning af ${d.floorType || d.material || 'det nye gulv'}. VIGTIGT: Husk afstandsklodser – der skal være 10-12 mm luft til ALLE faste vægge og rør, så gulvet kan arbejde.`);
                add('Tilpasning & Finish: Ved rørgennemføringer bores hul der er 20mm større end røret. Skær et "kile-snit" bagud, læg lim på, og pres det sammen om røret. Husk at underfremme dørkarme (brug fukssvans/multicutter), så gulvet kan glide pænt ind under karmen.');
                if (d.panels && d.panels.toLowerCase().includes('ja')) {
                    add('Fodlister: Geringsskær og monter nye fodlister. Skyd dem fast med dykkerpistol (lim evt. hjørnerne). HUSK: Skru/skyd dem KUN fast i væggen, aldrig ned i gulvet!');
                }
                break;
            case 'ceilings': {
                add('Forskalling & Tjek: Kontroller eksisterende lofts-konstruktion/spær for råd. Opsæt ny forskalling med snorlige afstande: c-c 30 cm ved gipslofter og c-c 60 cm ved akustiklofter.');
                const calcSpots = d.spots === 'Ja' ? Math.max(1, Math.round((parseFloat(d.amount) || 0) / 1.75)) : 0;
                if (calcSpots > 0) {
                    add(`El-forberedelse: VIGTIGT: Træk tomrør/flexrør og gør klar til elektrikeren (${calcSpots} spots). Skru safebokse fast i forskallingen, og noter deres præcise placeringer på en skitse inden loftet lukkes!`);
                }
                add(`Loftmontage: Opsætning af ${d.material || 'loftplader'}. Hvis gips: Husk at forskyde endesamlingerne med mindst 40 cm (ingen krydssamlinger!). Brug de rigtige gipsskruer og skru dem 1 mm under pap-overfladen uden at bryde pappen.`);
                add('Fugning & Skyggelister: Afslut overgangen til væggene. Ved gips: Ilæg akrylfuge. Ved træ/akustik: Monter skyggelister. Brug dykkerpistol og husk elastisk fuge i geringerne.');
                break;
            }
            case 'facades':
                add('Nedrivning & Råddenskab: Fjern den eksisterende beklædning forsigtigt. Undersøg bagvedliggende træværk/vindspærre for råd, svamp eller fugtskader, før du bygger videre.');
                add('Vindspærre & Lægter: Monter ny vindspærrefolie vindtæt med specialtape. Opsæt derefter lodrette klemlister (min. 21x45 mm trykimp) over vindspærren for at sikre et ordentligt ventileret hulrum bag facaden.');
                add(`Beklædning: Montering af ${d.facadeWood || d.material || 'facadebrædder'}. Mål ud og slå kridtstreger, så du bevarer vandrette linjer. Husk drypnæse i bunden (skær evt. brædderne i 15 graders smig).`);
                add('Inddækning & Tætning: Ved vinduer og døre etableres korrekte lysninger. Monter alu/zink-inddækninger øverst, så regnvand ledes ud over facaden og ikke ind bagved.');
                break;
            case 'windows':
            case 'doors':
                add(`Klargøring af hul: Demonter de gamle elementer forsigtigt (skær fugerne fri først). Klargør murhullet – fjern mørtelrester, støvsug og tjek om der skal lægges en ny fugtspærre (murpap) i bunden.`);
                add(`Indsættelse og justering: Sæt det nye element (${d.windowAmount || d.doorAmount || d.amount || 'nye'}) i hullet. Brug Knudsen-kiler eller luftpuder. Justér det i 100% lod og vinkel. Diagonalmålene skal være identiske før du skruer fast!`);
                add('Fastgørelse: Bor for og fastgør med karmskruer/karmplugs. Afstanden mellem skruerne må max være 70 cm, og hjørneskruerne skal sidde ca. 15 cm fra hjørnet for at undgå at karmen buer.');
                add('Isolering & Fugning: Stop hulrummet til med fugebånd/mineraluld (ikke for hårdt, det skal kunne ånde). Udfør derefter udvendig elastisk fugning eller montering af Illmod-bånd. Indvendig fuge skal laves lufttæt!');
                add('Afslutning Indvendigt: Opbyg evt. nye lysninger i MDF eller gips. Skær nye gerigter i smig og skyd dem fast. Tjek at vinduet/døren åbner og lukker friktionsfrit.');
                break;
            case 'roof':
                add('Sikkerhed & Stillads: Sørg for korrekt opsat og godkendt stillads med faldsikring, inden I går på taget. Sikkerheden kommer først.');
                add('Undertag & Lægter: Monter diffusionsåbent undertag stramt og uden folder. Tape alle overlæg. Slå afstandslister på langs ad spærene, og monter derefter taglægter. Tjek lægteafstanden (L-mål) for den specifikke tagsten.');
                add(`Oplægning: Udlægning af ${d.roofType || d.material || 'tagmaterialet'}. Husk at binde de yderste rækker og sten omkring gennembrydninger (skorsten/ovenlys) forsvarligt fast med bindekroge.`);
                add('Skotrender, Grater & Rygning: Monter zink-skotrender og klip tagstenene præcist til (brug vinkelsliber på jorden, støv ikke på taget!). Fastgør rygstensbånd og rygsten stramt, så fygesne holdes ude.');
                add('Tagrender: Monter konsoljern med korrekt fald (ca. 2-3 mm pr. meter) ned mod nedløbet. Saml tagrenderne med lim eller samlestykker, og afslut med nedløbsrør og nedløbsbrønd.');
                break;
            case 'kitchen':
                add('Klargøring & Opmåling: Kontroller rummets krydsmål og vinkler. Find det højeste punkt på gulvet – start altid monteringen af understel/sokkel ud fra dette punkt for at sikre, at køkkenet står i vater.');
                add('Sokkel & Skabe: Saml skabene (brug lidt trælim i dyvlerne for ekstra stabilitet). Monter under- og overskabe. Spænd dem sammen med samleskruer (skrues bag hængslerne, så de er skjult). Sørg for 100% vater på alle leder.');
                add('Bordplade: Skær bordpladen til (husk afdækningstape for at undgå flosser). Ved samlinger bruges hundeben og dyvler, samt vandfast D3 trælim eller silikone i samlingen, så den bliver helt usynlig og vandtæt.');
                add('Udskæring til Vask/Kogeplade: Bor et hul i hjørnerne og skær ud med stiksav. FORSEGL de rå savsnit i bordpladen massivt med silikone for at forhindre fugtskader over tid!');
                add('Fronter, Hvidevarer & Finish: Monter skuffer, låger og integrerede hvidevarer. Justér alle hængsler, så fugebilledet mellem lågerne er snorlige (typisk 2-3 mm luft). Træk en tynd akrylfuge mod vægge og en silikonefuge bag vasken.');
                break;
            default:
                add('Klargøring: Klargøring af arbejdssted. Tildæk gulve og møbler med pap/plast for at undgå støv og skader.');
                add('Konstruktion: Udførelse af det primære arbejde. Husk at dobbelttjekke alle mål to gange, før du skærer én gang (Measure twice, cut once).');
                add('KS & Overflader: Gennemgå alle samlinger. Sørg for at skruer er undersænket, samlinger er tætte, og at resultatet står knivskarpt.');
        }

        // Fælles afslutning
        add('Oprydning: Grov- og finoprydning af pladsen hver dag! Saml affald og feje. Kunden skal kunne bo i huset imens.');
        add('Afleveringsforretning: Gennemgang af det færdige arbejde med kunden, og udlevering af evt. vedligeholdelsesvejledning.');

        return list;
    };

    // Gemmer sagsoplysninger i Supabase/localStorage
    const handleStatusChange = async (newStatus) => {
        if (!selectedCase) return;
        const confirmMsg = newStatus === 'Udgået opgave' 
            ? 'Er du sikker på, at du vil annullere sagen?' 
            : `Er du sikker på, at du vil ændre status til "${newStatus}"?`;
            
        if (!window.confirm(confirmMsg)) return;

        const { error } = await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', selectedCase.id);

        if (error) {
            console.error('Fejl ved opdatering af status:', error);
            toast.error('Kunne ikke opdatere status');
        } else {
            toast.success(`Status ændret til ${newStatus}`);
            // Opdater lokalt så UI reagerer
            onUpdateLead(selectedCase.id, { status: newStatus });
            // Da denne komponent kun viser Bekræftede opgaver, vil sagen forsvinde herfra
            // hvis den er sat i bero (selvom vi lige har åbnet for at den også kan vise "Sæt i bero").
            // For at sikre en smooth overgang:
            if (newStatus === 'Udgået opgave') {
                clearTargetCase(); // Gå tilbage
            }
        }
    };

    const saveCaseDataToDb = async (updatedFields) => {
        try {
            const updatedRawData = {
                ...(selectedCase.raw_data || {}),
                ...updatedFields
            };

            const { error } = await supabase
                .from('leads')
                .update({ raw_data: updatedRawData })
                .eq('id', selectedCase.id);

            if (error) throw error;

            const updatedCase = { ...selectedCase, raw_data: updatedRawData };
            setSelectedCase(updatedCase);
            if (onUpdateLead) onUpdateLead(updatedCase);
        } catch (err) {
            console.error('Kunne ikke gemme sagsdata:', err);
            // Local Storage fallback
            const localKey = `lead_case_data_${selectedCase.id}`;
            localStorage.setItem(localKey, JSON.stringify(updatedFields));
            
            const updatedCase = {
                ...selectedCase,
                raw_data: { ...(selectedCase.raw_data || {}), ...updatedFields }
            };
            setSelectedCase(updatedCase);
            if (onUpdateLead) onUpdateLead(updatedCase);
            toast.success('Gemt lokalt (Local Storage Fallback)');
        }
    };

    // Delegerings-håndtering
    const handleSaveAssignments = async () => {
        setIsSavingTeam(true);
        await saveCaseDataToDb({
            assigned_pm: pmIds,
            assigned_workers: assignedWorkers
        });
        setIsSavingTeam(false);
        setIsSavedTeam(true);
        toast.success('Bemandingen er opdateret på sagen!');
        setTimeout(() => setIsSavedTeam(false), 2000);
    };

    const handleWorkerToggle = (workerId) => {
        if (assignedWorkers.includes(workerId)) {
            setAssignedWorkers(assignedWorkers.filter(id => id !== workerId));
        } else {
            setAssignedWorkers([...assignedWorkers, workerId]);
        }
    };

    // To-Do / Checklist-håndtering
    const handleTodoToggle = (todoId) => {
        const updated = todoList.map(item => {
            if (item.id === todoId) {
                return { ...item, done: !item.done };
            }
            return item;
        });
        setTodoList(updated);
        saveCaseDataToDb({ checklist: updated });
    };

    const handleAddTodo = (e) => {
        e.preventDefault();
        if (!newTodoText.trim()) return;

        const newTodo = {
            id: `custom-${Date.now()}`,
            text: newTodoText.trim(),
            done: false
        };

        const updated = [...todoList, newTodo];
        setTodoList(updated);
        setNewTodoText('');
        saveCaseDataToDb({ checklist: updated });
        toast.success('Opgave tilføjet til tjeklisten!');
    };

    const handleDeleteTodo = (todoId) => {
        const updated = todoList.filter(item => item.id !== todoId);
        setTodoList(updated);
        saveCaseDataToDb({ checklist: updated });
        toast.success('Opgave slettet');
    };

    // Logbog-håndtering
    const handleAddLog = async (e) => {
        e.preventDefault();
        if (!newLogText.trim()) return;

        setIsUploadingLog(true);
        const currentAuthor = team.find(t => t.id === profile.id)?.owner_name || team.find(t => t.id === profile.id)?.company_name || profile.owner_name || profile.company_name || 'Mester';
        
        let uploadedPhotoUrls = [];
        try {
            if (logFiles.length > 0) {
                toast.loading('Uploader fotos...', { id: 'upload-toast' });
                
                for (let i = 0; i < logFiles.length; i++) {
                    const file = logFiles[i];
                    const fileExt = file.name.split('.').pop() || 'jpg';
                    const fileName = `log_${selectedCase.id}_${Date.now()}_${i}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('uploads')
                        .upload(fileName, file, { cacheControl: '3600', upsert: false });
                        
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                        .from('uploads')
                        .getPublicUrl(fileName);
                        
                    uploadedPhotoUrls.push(publicUrl);
                }
                toast.dismiss('upload-toast');
            }
        } catch (error) {
            console.error("Fejl ved upload af fotos til logbog:", error);
            toast.error('Der skete en fejl under upload af fotos. Prøv igen.');
            setIsUploadingLog(false);
            return;
        }

        const newLog = {
            id: `log-${Date.now()}`,
            status: logStatus,
            text: newLogText.trim(),
            author: currentAuthor,
            date: new Date().toISOString(),
            photos: uploadedPhotoUrls,
            isChangeOrder: isChangeOrder,
            extraHours: isChangeOrder ? (parseFloat(extraHours) || 0) : 0,
            extraPrice: isChangeOrder ? (parseFloat(extraPrice) || 0) : 0
        };

        const updated = [newLog, ...logsList];
        setLogsList(updated);
        setNewLogText('');
        setLogPhotos([]);
        setLogFiles([]);
        setIsChangeOrder(false);
        setExtraHours('');
        setExtraPrice('');
        saveCaseDataToDb({ logs: updated });
        setIsUploadingLog(false);
        toast.success(isChangeOrder ? 'Aftaleseddel/Ekstraarbejde oprettet!' : 'Logbog opdateret!');
    };

    const handleRealPhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        // Convert to local object URLs for preview
        const newPhotos = files.map(file => URL.createObjectURL(file));
        setLogPhotos([...logPhotos, ...newPhotos]);
        setLogFiles([...logFiles, ...files]);
        
        toast.success(`${files.length} foto(s) vedhæftet og klar til upload!`);
        
        // Reset input so the same files can be selected again if needed
        e.target.value = null;
    };
    
    const removePhoto = (indexToRemove) => {
        setLogPhotos(logPhotos.filter((_, idx) => idx !== indexToRemove));
        setLogFiles(logFiles.filter((_, idx) => idx !== indexToRemove));
    };

    // Timeregistrering-håndtering
    const handleAddTimeEntry = (e) => {
        e.preventDefault();
        
        const effectiveEmployeeId = newTime.employeeId || profile?.id;
        
        if (!newTime.startTime || !newTime.endTime || !effectiveEmployeeId) {
            toast.error('Udfyld venligst medarbejder, samt start- og sluttidspunkt');
            return;
        }

        const emp = team.find(t => t.id === effectiveEmployeeId);
        let employeeName = emp?.owner_name || emp?.company_name || emp?.email;
        if (!employeeName && editingTimeId) {
            const oldEntry = timeEntries.find(t => t.id === editingTimeId);
            if (oldEntry && oldEntry.employeeId === effectiveEmployeeId) {
                employeeName = oldEntry.employeeName;
            }
        }
        if (!employeeName) {
            employeeName = profile?.owner_name || profile?.company_name || 'Ukendt medarbejder';
        }

        // Beregn timer
        const start = new Date(`${newTime.date}T${newTime.startTime}`);
        const end = new Date(`${newTime.date}T${newTime.endTime}`);
        let diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours < 0) {
            toast.error('Sluttid kan ikke være før starttid');
            return;
        }
        
        if (deductPause) {
            diffHours -= 0.5;
            if (diffHours < 0) diffHours = 0;
        }
        
        // Afrund til nærmeste kvarter
        diffHours = Math.round(diffHours * 4) / 4;

        let updated;
        if (editingTimeId) {
            updated = timeEntries.map(t => {
                if (t.id === editingTimeId) {
                    return {
                        ...t,
                        startTime: newTime.startTime,
                        endTime: newTime.endTime,
                        hours: diffHours,
                        date: newTime.date,
                        desc: (newTime.desc || '').trim() || 'Almindeligt tømrerarbejde',
                        employeeId: effectiveEmployeeId,
                        employeeName: employeeName
                    };
                }
                return t;
            });
            toast.success('Timeregistrering opdateret!');
            setEditingTimeId(null);
        } else {
            const entry = {
                id: `time-${Date.now()}`,
                startTime: newTime.startTime,
                endTime: newTime.endTime,
                hours: diffHours,
                date: newTime.date,
                desc: (newTime.desc || '').trim() || 'Almindeligt tømrerarbejde',
                employeeId: effectiveEmployeeId,
                employeeName: employeeName
            };
            updated = [entry, ...timeEntries];
            toast.success('Timer registreret på sagen!');
        }

        setTimeEntries(updated);
        setNewTime({ startTime: '07:00', endTime: '15:00', date: new Date().toISOString().substring(0, 10), desc: '', employeeId: ['worker', 'apprentice', 'sales'].includes(simulatedRole || profile?.role) ? profile.id : '' });
        saveCaseDataToDb({ time_entries: updated });
    };

    const handleEditTime = (entry) => {
        setEditingTimeId(entry.id);
        setNewTime({
            startTime: entry.startTime,
            endTime: entry.endTime || '',
            date: entry.date,
            desc: entry.desc,
            employeeId: entry.employeeId
        });
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const handleDeleteTime = (entryId) => {
        if (window.confirm('Er du sikker på, at du vil slette denne timeregistrering?')) {
            const updated = timeEntries.filter(t => t.id !== entryId);
            setTimeEntries(updated);
            saveCaseDataToDb({ time_entries: updated });
            toast.success('Timeregistrering slettet.');
        }
    };

    const handleExportLonsystem = () => {
        // Filtrer underleverandører fra
        const payrollEntries = timeEntries.filter(entry => {
            const employee = team?.find(t => t.id === entry.employeeId);
            return employee?.role !== 'subcontractor';
        });

        if (payrollEntries.length === 0) {
            toast.error("Ingen løngivende timer at eksportere (Underleverandører ignoreres).");
            return;
        }

        // Simpel CSV format
        let csvContent = "data:text/csv;charset=utf-8,Dato,Medarbejder,Start,Slut,Timer,Beskrivelse\n";
        payrollEntries.forEach(row => {
            const rowStr = `${row.date},"${row.employeeName}",${row.startTime},${row.endTime},${row.hours},"${row.desc}"`;
            csvContent += rowStr + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Loen_Eksport_${selectedCase?.id}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Eksportér fil downloadet. Husk at disse ikke slettes automatisk her.");
    };
    const handleOpenInvoiceModal = (action) => {
        setInvoiceActionType(action);
        
        // Generer standard linjer
        const lines = [];
        
        // Linje 1: Oprindeligt tilbud
        lines.push({
            id: 'base',
            description: `Sag ${selectedCase?.case_number || String(selectedCase?.id).substring(0,8)}: ${selectedCase?.project_category || 'Tømreropgave'} - Oprindeligt tilbud`,
            priceExVat: Math.round(baseTotalPrice / 1.25)
        });

        // Linje 2..N: Aftalesedler
        const changeOrders = logsList.filter(l => l.isChangeOrder && Number(l.extraPrice) > 0);
        changeOrders.forEach((co, idx) => {
            lines.push({
                id: `co_${idx}`,
                description: `Ekstraarbejde: ${co.text.substring(0, 50)}${co.text.length > 50 ? '...' : ''}`,
                priceExVat: Math.round(Number(co.extraPrice) / 1.25)
            });
        });

        // Fratræk allerede faktureret som en negativ linje hvis vi vil (eller vi lader bare Mester rette)
        const invoicedAmount = selectedCase?.raw_data?.invoiced_amount || 0;
        if (invoicedAmount > 0) {
            lines.push({
                id: 'already_invoiced',
                description: 'Allerede faktureret (Aconto) fratrækkes',
                priceExVat: -Math.round(invoicedAmount / 1.25)
            });
        }

        setInvoiceLines(lines);
        setShowInvoiceModal(true);
    };
    const handleCheckIn = () => {
        const entry = {
            id: `time-${Date.now()}`,
            startTime: new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }),
            endTime: null,
            hours: 0,
            date: new Date().toISOString().substring(0, 10),
            desc: 'Aktiv tjek-ind (auto)',
            employeeId: profile?.id,
            employeeName: profile?.owner_name || profile?.company_name || 'Ukendt medarbejder'
        };
        const updated = [entry, ...timeEntries];
        setTimeEntries(updated);
        saveCaseDataToDb({ time_entries: updated });
        toast.success('Du er nu tjekket ind!');
    };

    const handleCheckOut = () => {
        const nowTime = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
        const entryIndex = timeEntries.findIndex(t => t.employeeId === profile?.id && t.endTime === null);
        if (entryIndex === -1) return;
        
        const entry = { ...timeEntries[entryIndex] };
        entry.endTime = nowTime;
        
        const start = new Date(`${entry.date}T${entry.startTime}`);
        const end = new Date(`${entry.date}T${entry.endTime}`);
        let diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours < 0) diffHours = 0;
        if (deductPause) { diffHours -= 0.5; if (diffHours < 0) diffHours = 0; }
        
        // Afrund til nærmeste kvarter
        entry.hours = Math.round(diffHours * 4) / 4;
        entry.desc = (newTime.desc || '').trim() || 'Arbejde udført (Tjek-ud)';
        
        const updated = [...timeEntries];
        updated[entryIndex] = entry;
        
        setTimeEntries(updated);
        setNewTime({ ...newTime, desc: '' });
        saveCaseDataToDb({ time_entries: updated });
        toast.success('Tjekket ud! Timerne er nu låst.');
    };

    // Beregn sagsfremskridt i procent
    const completedTodos = todoList.filter(t => t.done).length;
    const progressPercent = todoList.length > 0 ? Math.round((completedTodos / todoList.length) * 100) : 0;

    // Beregn tidsbudget overholdelse (inklusive godkendte aftalesedler)
    const totalActualHours = timeEntries
        .filter(item => ['worker', 'apprentice', 'sales'].includes(profile?.role) ? item.employeeId === profile.id : true)
        .reduce((sum, item) => sum + item.hours, 0);
    const baseBudgetedHours = parseFloat(selectedCase?.raw_data?.calc_data?.laborHours) || 40; 
    const getBasePrice = (lead) => {
        if (!lead) return 0;
        if (lead.raw_data?.calc_data?.totalPrice) {
            return parseFloat(lead.raw_data.calc_data.totalPrice) || 0;
        }
        if (lead.raw_data?.actual_quote_price) {
            return typeof lead.raw_data.actual_quote_price === 'number' 
                ? lead.raw_data.actual_quote_price 
                : parseInt(String(lead.raw_data.actual_quote_price).replace(/[^0-9]/g, '')) || 0;
        } else if (typeof lead.price_estimate === 'number') {
            return lead.price_estimate;
        } else {
            const priceStr = lead.price_estimate || '0';
            const firstPricePart = priceStr.split('-')[0] || priceStr;
            return parseInt(firstPricePart.replace(/[^0-9]/g, '')) || 0;
        }
    };
    const baseTotalPrice = getBasePrice(selectedCase);
    const totalExtraHours = logsList.filter(l => l.isChangeOrder).reduce((sum, item) => sum + (item.extraHours || 0), 0);
    const totalExtraPrice = logsList.filter(l => l.isChangeOrder).reduce((sum, item) => sum + (item.extraPrice || 0), 0);
    
    const budgetedHours = baseBudgetedHours + totalExtraHours;
    const hourBudgetRatio = budgetedHours > 0 ? (totalActualHours / budgetedHours) : 0;
    
    // Anomali: Hvis timer overstiger 80% af budget, men fremskridt er under 50%
    const hasTimeAnomalies = hourBudgetRatio > 0.8 && progressPercent < 50;

    // Filtrerede timer til mesterens ugentlige medarbejder-tidsstyring
    const getEmployeeTotalHoursThisWeek = (employeeId) => {
        return activeCases.reduce((sum, c) => {
            const entries = c.raw_data?.time_entries || [];
            const empEntries = entries.filter(e => e.employeeId === employeeId);
            return sum + empEntries.reduce((s, item) => s + item.hours, 0);
        }, 0);
    };

    // Materiale-status beregning
    const originalBudget = parseFloat(selectedCase?.raw_data?.calc_data?.materialCost) || 0;
    const materialListsMeta = selectedCase?.raw_data?.material_lists_meta || [];
    const totalSpent = materialListsMeta.reduce((sum, list) => sum + (parseFloat(list.price) || 0), 0);
    const budgetRemaining = originalBudget - totalSpent;
    const isOverBudget = budgetRemaining < 0;

    const materialListForOverview = selectedCase?.raw_data?.material_list || [];
    const totalMaterials = materialListForOverview.length;
    const orderedMaterials = materialListForOverview.filter(m => m.status === 'Bestilt' || m.status === 'Leveret').length;
    const deliveredMaterials = materialListForOverview.filter(m => m.status === 'Leveret').length;
    const notOrderedMaterials = totalMaterials - orderedMaterials;
    const materialProgress = totalMaterials > 0 ? Math.round((orderedMaterials / totalMaterials) * 100) : 0;

    // Økonomi Totaler
    const totalToBill = baseTotalPrice > 0 ? (baseTotalPrice + totalExtraPrice) : (totalExtraPrice > 0 ? totalExtraPrice : 0);
    
    // Timer Totaler
    const remainingHours = budgetedHours - totalActualHours;
    const isOvertime = remainingHours < 0;

    const handleLineChange = (id, field, value) => {
        setInvoiceLines(prev => prev.map(line => line.id === id ? { ...line, [field]: value } : line));
    };

    const handleAddLine = () => {
        setInvoiceLines(prev => [...prev, { id: `manual_${Date.now()}`, description: '', priceExVat: 0 }]);
    };

    const handleRemoveLine = (id) => {
        setInvoiceLines(prev => prev.filter(line => line.id !== id));
    };
    const handleConvertToAconto = () => {
        const total = invoiceLines.reduce((sum, line) => sum + Number(line.priceExVat || 0), 0);
        const percent = window.prompt("Indtast Aconto procent (fx 30 for 30%):", "30");
        if (percent && !isNaN(percent)) {
            const acontoAmount = Math.round(total * (Number(percent) / 100));
            setInvoiceLines([{
                id: `aconto_${Date.now()}`,
                description: `Acontobetaling (${percent}%) vedr. Sag ${selectedCase?.case_number || String(selectedCase?.id).substring(0,8)} (${selectedCase?.project_category || 'opgave'})`,
                priceExVat: acontoAmount
            }]);
        }
    };

    const totalInvoiceExVat = invoiceLines.reduce((sum, line) => sum + Number(line.priceExVat || 0), 0);
    const totalInvoiceVat = Math.round(totalInvoiceExVat * 0.25);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            
            {/* OVERBYGNING ELLER MODAL LUK-KNAP */}
            {!selectedCase ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <HardHat size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#1a1a1a' }}>Sager & Ordrestyring</h3>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Fuld native styring af alle dine bekræftede tømreropgaver, lærlinge-KS, materialebestillinger og timeregistreringer.</p>
                        </div>
                    </div>

                    {/* Sagsliste overblik */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                        {activeCases.length === 0 ? (
                            <div style={{ gridColumn: 'span 3', padding: '64px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', color: '#6b7280' }}>
                                <HardHat size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Ingen aktive sager endnu</p>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    {['worker', 'apprentice', 'sales'].includes(profile?.role) 
                                        ? "Du mangler at få tildelt en opgave. Kontakt din mester, når du er klar til næste byggeplads." 
                                        : "Når en kunde accepterer et tilbud, skifter status automatisk, og sagen vil fremgå her."}
                                </p>
                            </div>
                        ) : (
                            activeCases.map(c => {
                                const todos = c.raw_data?.checklist || [];
                                const comp = todos.filter(t => t.done).length;
                                const pct = todos.length > 0 ? Math.round((comp / todos.length) * 100) : 0;
                                const hrs = (c.raw_data?.time_entries || []).reduce((sum, item) => sum + item.hours, 0);
                                const estHrs = parseFloat(c.raw_data?.calc_data?.laborHours) || 40;
                                
                                return (
                                    <div 
                                        key={c.id} 
                                        onClick={() => setSelectedCase(c)}
                                        style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
                                        className="hover:scale-[1.01] hover:shadow-lg"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <span style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '30px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                                                Aktiv Sag
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                {new Date(c.created_at).toLocaleDateString('da-DK')}
                                            </span>
                                        </div>
                                        
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 'bold', color: '#1a1a1a' }}>
                                            Sag {c.case_number || String(c.id).substring(0,8)} - {c.raw_data?.project_title || c.project_category}
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {c.raw_data?.customerDetails?.customerType === 'erhverv' ? (
                                                    <>
                                                        <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>Erhverv</span>
                                                        {c.customer_name || 'Virksomhed'}
                                                    </>
                                                ) : (
                                                    <>Kunde: {c.customer_name || 'Privatkunde'}</>
                                                )}
                                            </span>
                                            <span style={{ fontSize: '0.825rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={14} style={{ color: '#94a3b8' }} /> <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.customer_address || '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'none'} onClick={(e) => e.stopPropagation()}>{c.customer_address || 'Adresse ikke angivet'}</a>
                                            </span>
                                        </div>
                                        
                                        {/* Færdiggørelses-bar */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px', fontWeight: '500' }}>
                                                <span>Fremdrift (To-Do)</span>
                                                <strong>{pct}%</strong>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }} />
                                            </div>
                                        </div>

                                        {/* Time status */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#6b7280', borderTop: '1px solid #f1f1ef', paddingTop: '12px', marginBottom: '12px' }}>
                                            <span>Timer registreret:</span>
                                            <strong style={{ color: hrs > estHrs ? '#ef4444' : '#1e293b' }}>
                                                {hrs} t / {estHrs} t
                                            </strong>
                                        </div>

                                        {/* Mandskab overblik */}
                                        {(c.raw_data?.assigned_pm?.length > 0 || c.raw_data?.assigned_workers?.length > 0) && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid #f1f1ef', paddingTop: '12px' }}>
                                                {/* PMs */}
                                                {(Array.isArray(c.raw_data.assigned_pm) ? c.raw_data.assigned_pm : [c.raw_data.assigned_pm]).map(pmId => {
                                                    const m = team.find(t => t.id === pmId);
                                                    if (!m) return null;
                                                    return (
                                                        <span key={pmId} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '500' }}>
                                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#1e3a8a' }}>
                                                                {(m.owner_name || m.company_name || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            {m.owner_name || m.company_name || 'Ukendt'} (PM)
                                                        </span>
                                                    );
                                                })}
                                                {/* Workers */}
                                                {(c.raw_data.assigned_workers || []).map(wId => {
                                                    const m = team.find(t => t.id === wId);
                                                    if (!m) return null;
                                                    return (
                                                        <span key={wId} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#f8fafc', color: '#475569', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#334155' }}>
                                                                {(m.owner_name || m.company_name || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            {m.owner_name || m.company_name || 'Ukendt'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>


                </div>
            ) : (
                /* SAGS DETALJE ARBEJDSOMRÅDE */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* SAGS DETALJER HEADER */}
                    <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                        <div>
                            <button 
                                onClick={() => !isModalView && setSelectedCase(null)} 
                                style={{ 
                                    display: isModalView ? 'none' : 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    background: '#f8fafc', 
                                    border: '1px solid #e2e8f0', 
                                    color: '#475569', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem', 
                                    padding: '6px 14px', 
                                    borderRadius: '9999px',
                                    fontWeight: '500',
                                    marginBottom: '12px',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                            >
                                <ArrowLeft size={16} /> Tilbage til sagsliste
                            </button>
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: 'bold', color: '#1a1a1a' }}>
                                Sag {selectedCase.case_number || String(selectedCase.id).substring(0,8)} - {selectedCase.raw_data?.project_title || selectedCase.project_category}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.9rem' }}>
                                <MapPin size={14} style={{ color: '#94a3b8' }} /> <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCase.customer_address || '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'none'} onClick={(e) => e.stopPropagation()}>{selectedCase.customer_address || 'Adresse ikke angivet'}</a> 
                                <span style={{ color: '#cbd5e1' }}>|</span> 
                                <strong>
                                    {selectedCase.raw_data?.customerDetails?.customerType === 'erhverv' ? (
                                        <><span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', marginRight: '6px' }}>Erhverv</span>
                                        {selectedCase.customer_name} (CVR: {selectedCase.raw_data?.customerDetails?.cvr}) - Kontakt: {selectedCase.raw_data?.customerDetails?.fullName}</>
                                    ) : (
                                        <>Kunde: {selectedCase.customer_name || 'Privatkunde'}</>
                                    )}
                                </strong>
                            </div>
                        </div>
                        
                        {/* Status bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {['admin', 'sales'].includes(profile?.role) && (
                                <div style={{ position: 'relative' }}>
                                    <button 
                                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        Skift Status <ChevronRight size={14} style={{ transform: isStatusDropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                    </button>
                                    {isStatusDropdownOpen && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '8px', zIndex: 50, minWidth: '180px' }}>
                                            <button 
                                                onClick={() => { handleStatusChange('Sæt i bero'); setIsStatusDropdownOpen(false); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#f97316', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#fff7ed'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                Sæt i bero
                                            </button>
                                            <button 
                                                onClick={() => { handleStatusChange('Udgået opgave'); setIsStatusDropdownOpen(false); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                Annullér (Udgået)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Færdiggørelse:</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '120px', height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ width: `${progressPercent}%`, height: '100%', background: '#10b981' }} />
                                    </div>
                                    <strong style={{ fontSize: '0.9rem', color: '#1a1a1a' }}>{progressPercent}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* OVERBLIK / DASHBOARD (NYT DESIGN) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        
                        {/* 1. Tidsregistrering */}
                        <div 
                            onClick={() => setActiveSubTab('timesheet')}
                            style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#10b981'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e8e6e1'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1a1a1a', fontWeight: 'bold' }}>Tidsregistrering</h4>
                                    {!['worker', 'apprentice'].includes(profile?.role) && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Status på timebudgettet</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a1a1a' }}>
                                        {totalActualHours} {['worker', 'apprentice'].includes(profile?.role) ? 'timer' : <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 'normal' }}>/ {budgetedHours} timer</span>}
                                    </div>
                                </div>
                                {!['worker', 'apprentice'].includes(profile?.role) && <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isOvertime ? '#ef4444' : '#10b981' }}>{Math.round(hourBudgetRatio * 100)}%</span>}
                            </div>
                            {!['worker', 'apprentice'].includes(profile?.role) && (
                                <>
                                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                                        <div style={{ width: `${Math.min(100, hourBudgetRatio * 100)}%`, height: '100%', background: isOvertime ? '#ef4444' : '#10b981', transition: 'width 0.5s ease' }} />
                                    </div>
                                    <div style={{ marginTop: 'auto', fontSize: '0.85rem', fontWeight: '500', color: isOvertime ? '#ef4444' : '#059669', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: isOvertime ? '#fef2f2' : '#ecfdf5', padding: '8px 12px', borderRadius: '8px' }}>
                                        {isOvertime ? (
                                            <>Advarsel: Budgettet er overskredet med {Math.abs(remainingHours)} timer!</>
                                        ) : (
                                            <>Du har {remainingHours} timer tilbage at gøre godt med.</>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>


                        {/* 3. Materialer */}
                        {!['worker', 'apprentice'].includes(profile?.role) && (
                            <div 
                                onClick={() => setActiveSubTab('materials')}
                            style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e8e6e1'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Package size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1a1a1a', fontWeight: 'bold' }}>Materialer</h4>
                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Indkøbs- & leveringsstatus</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a1a1a' }}>{orderedMaterials} <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 'normal' }}>/ {totalMaterials} ordrer</span></div>
                                </div>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: materialProgress === 100 ? '#10b981' : '#3b82f6' }}>{materialProgress}%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                                <div style={{ width: `${materialProgress}%`, height: '100%', background: materialProgress === 100 ? '#10b981' : '#3b82f6', transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: notOrderedMaterials > 0 ? '#b45309' : '#6b7280' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: notOrderedMaterials > 0 ? '#f59e0b' : '#cbd5e1' }} />
                                    Mangler bestilling: {notOrderedMaterials}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '500' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                                    Leveret: {deliveredMaterials}
                                </div>
                            </div>

                            {/* Budget Oversigt */}
                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Forbrugt / Budget</div>
                                        <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 'bold' }}>{totalSpent.toLocaleString('da-DK')} <span style={{ color: '#94a3b8', fontWeight: 'normal', fontSize: '0.8rem' }}>/ {originalBudget.toLocaleString('da-DK')} kr.</span></div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Restbudget</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: isOverBudget ? '#ef4444' : '#10b981' }}>{budgetRemaining > 0 ? '+' : ''}{budgetRemaining.toLocaleString('da-DK')} kr.</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}
                    </div>

                    {/* ANOMALI ADVARSEL HVIS TIMER SKRIDER */}
                    {hasTimeAnomalies && (
                        <div style={{ padding: '16px 20px', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ShieldAlert size={24} />
                            <div>
                                <strong style={{ display: 'block', fontSize: '0.9rem' }}>Advarsel: Timebudgettet skrider!</strong>
                                <span style={{ fontSize: '0.8rem' }}>Sagen har brugt {totalActualHours} t ud af det estimerede budget på {budgetedHours} t ({Math.round(hourBudgetRatio * 100)}%), men bygge-to-do listen er kun {progressPercent}% færdig. Kontroller eventuelt tidsregistreringerne eller pladsen.</span>
                            </div>
                        </div>
                    )}

                    {/* MANDSKABS DELEGERING BAR (NYT DESIGN) */}
                    <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>Holdet på sagen</h3>
                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                <button 
                                    onClick={handleSaveAssignments}
                                    style={{ 
                                        padding: '8px 16px', 
                                        backgroundColor: isSavedTeam ? '#10b981' : '#0f172a', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        fontSize: '0.85rem', 
                                        fontWeight: 'bold', 
                                        cursor: isSavingTeam ? 'wait' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {isSavedTeam ? '✓ Gemt' : isSavingTeam ? 'Gemmer...' : 'Gem holdet'}
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            {/* Rendér Projektledere først, derefter Byggehold */}
                            {[...pmIds, ...assignedWorkers].map(memberId => {
                                const w = team.find(t => t.id === memberId);
                                if (!w) return null;
                                
                                const isPM = pmIds.includes(memberId);
                                const roleColors = {
                                    'admin': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', label: 'Admin' },
                                    'sales': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', label: 'Projektleder' },
                                    'worker': { bg: '#dcfce7', text: '#166534', border: '#86efac', label: 'Tømrersvend' },
                                    'apprentice': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc', label: 'Lærling' }
                                };
                                const roleInfo = isPM ? roleColors['sales'] : (roleColors[w.role] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db', label: 'Medarbejder' });
                                
                                const displayName = w.owner_name || w.company_name || 'Ukendt';
                                const initials = displayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

                                return (
                                    <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', position: 'relative' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: roleInfo.bg, color: roleInfo.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', border: `1px solid ${roleInfo.border}` }}>
                                            {initials}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a' }}>{displayName}</div>
                                            <div style={{ fontSize: '0.75rem', color: roleInfo.text, fontWeight: '600', textTransform: 'uppercase' }}>{roleInfo.label}</div>
                                        </div>
                                        {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (isPM) setPmIds(pmIds.filter(id => id !== memberId));
                                                    else handleWorkerToggle(memberId);
                                                }}
                                                style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#94a3b8', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                title="Fjern fra holdet"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Tilføj Medarbejder Knap */}
                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                <div style={{ position: 'relative' }}>
                                    <button 
                                        onClick={() => setWorkerDropdownOpen(!workerDropdownOpen)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', height: '100%' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    >
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
                                        Tilføj til holdet
                                    </button>

                                    {workerDropdownOpen && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '280px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '300px', overflowY: 'auto', padding: '8px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projektledere</div>
                                            {team.filter(t => t.role === 'sales' || t.role === 'admin').map(pm => {
                                                const isSelected = pmIds.includes(pm.id);
                                                return (
                                                    <div 
                                                        key={pm.id} 
                                                        onClick={() => {
                                                            if (isSelected) setPmIds(pmIds.filter(id => id !== pm.id));
                                                            else setPmIds([...pmIds, pm.id]);
                                                        }}
                                                        style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', backgroundColor: isSelected ? '#eff6ff' : 'transparent', transition: 'all 0.1s' }}
                                                        onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                                        onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: isSelected ? 'none' : '1px solid #cbd5e1', backgroundColor: isSelected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isSelected && <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '0.9rem', color: isSelected ? '#1d4ed8' : '#334155', fontWeight: isSelected ? '600' : 'normal' }}>{pm.owner_name || pm.company_name || pm.email || 'Ukendt'}</span>
                                                    </div>
                                                );
                                            })}
                                            
                                            <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '8px 0' }}></div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Byggehold (Svende & Lærlinge)</div>
                                            {team.filter(t => t.role === 'worker' || t.role === 'apprentice').map(worker => {
                                                const isAssigned = assignedWorkers.includes(worker.id);
                                                return (
                                                    <div 
                                                        key={worker.id} 
                                                        onClick={() => handleWorkerToggle(worker.id)}
                                                        style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', backgroundColor: isAssigned ? '#eff6ff' : 'transparent', transition: 'all 0.1s' }}
                                                        onMouseEnter={(e) => !isAssigned && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                                        onMouseLeave={(e) => !isAssigned && (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: isAssigned ? 'none' : '1px solid #cbd5e1', backgroundColor: isAssigned ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isAssigned && <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '0.9rem', color: isAssigned ? '#1d4ed8' : '#334155', fontWeight: isAssigned ? '600' : 'normal' }}>{worker.owner_name || worker.company_name || worker.email || 'Ukendt'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tomt hold besked */}
                            {(pmIds.length === 0 && assignedWorkers.length === 0) && (
                                <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', padding: '12px 0' }}>
                                    Der er endnu ikke tilføjet nogen til sagen...
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* CASE WORKSPACE TABS */}
                                        {/* MODERN HORIZONTAL TABS (2026 DESIGN) */}
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingTop: '4px', paddingBottom: '8px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', marginBottom: '16px', marginTop: '24px' }}>
                        <style>{`
                            .modern-tab-scroll::-webkit-scrollbar { display: none; }
                        `}</style>
                        {[
                            { id: 'todo', label: 'Bygge To-Do (KS)', icon: <CheckSquare size={18} />, color: '#64748b', activeColor: '#10b981', activeBg: '#ecfdf5' },
                            { id: 'materials', label: 'Materialer & Indkøb', icon: <PackageCheck size={18} />, color: '#3b82f6', activeColor: '#3b82f6', activeBg: '#eff6ff' },
                            { id: 'logs', label: 'Byggeproces', icon: <ClipboardList size={18} />, color: '#16a34a', activeColor: '#16a34a', activeBg: '#f0fdf4' },
                            { id: 'timesheet', label: 'Timeregistrering', icon: <Clock size={18} />, color: '#d946ef', activeColor: '#d946ef', activeBg: '#fdf4ff' }
                        ].map(tab => {
                            const isActive = activeSubTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSubTab(tab.id)}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        padding: '12px 20px', 
                                        border: isActive ? `1px solid ${tab.activeColor}` : '1px solid #e2e8f0', 
                                        background: isActive ? tab.activeBg : '#ffffff', 
                                        borderRadius: '30px',
                                        fontSize: '0.9rem', 
                                        fontWeight: '600', 
                                        cursor: 'pointer', 
                                        color: isActive ? tab.activeColor : '#64748b',
                                        boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)'; e.currentTarget.style.backdropFilter = 'blur(12px)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.backdropFilter = 'none';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* CASE WORKSPACE TABS INDHOLD */}
                    <div style={{ padding: '8px 0' }}>
                        
                        {/* TAB 1: TO-DO / CHECKLIST */}
                        {activeSubTab === 'todo' && (
                            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, color: '#1a1a1a' }}>Udførelsesmetode & Bygge-anvisninger</h4>
                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                        Checklister sikrer overensstemmelse med Byg Garanti og mindsker fejl.
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {todoList.map((todo, idx) => (
                                        <div 
                                            key={todo.id}
                                            style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', backgroundColor: todo.done ? '#f9fafb' : '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', opacity: todo.done ? 0.7 : 1, transition: 'all 0.15s' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer' }} onClick={() => handleTodoToggle(todo.id)}>
                                                <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: todo.done ? 'none' : '2px solid #cbd5e1', backgroundColor: todo.done ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}>
                                                    {todo.done && <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>✓</span>}
                                                </div>
                                                <span style={{ fontSize: '0.925rem', color: '#1a1a1a', textDecoration: todo.done ? 'line-through' : 'none', fontWeight: '500' }}>
                                                    <span style={{ color: '#6b7280', marginRight: '6px' }}>Trin {idx + 1}:</span>
                                                    {todo.text}
                                                </span>
                                            </div>
                                            
                                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                                <button 
                                                    onClick={() => handleDeleteTodo(todo.id)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* TILFØJ CUSTOM OPGAVE */}
                                {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                    <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f1f1ef', paddingTop: '20px' }}>
                                        <input 
                                            type="text"
                                            value={newTodoText}
                                            onChange={(e) => setNewTodoText(e.target.value)}
                                            placeholder="Tilføj et specifikt ekstra bygge-trin på denne sag..."
                                            style={{ flex: 1, border: '1px solid #e8e6e1', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}
                                        />
                                        <button 
                                            type="submit"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            <Plus size={16} /> Tilføj trin
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* TAB 2: REDIGERBAR MATERIALELISTE */}
                        {activeSubTab === 'materials' && (
                            <MaterialList 
                                lead={selectedCase} 
                                profile={profile} 
                                onUpdate={onUpdateLead} 
                            />
                        )}

                        {/* TAB 3: LIVE BYGGEPROCES */}
                        {activeSubTab === 'logs' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                                
                                {/* TIMELINE LOG */}
                                <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <h4 style={{ margin: 0, color: '#1a1a1a' }}>Projektets byggeproces</h4>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '2px solid #e2e8f0', paddingLeft: '16px', marginLeft: '8px' }}>
                                        {logsList.length === 0 ? (
                                            <p style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }}>Ingen log-opdateringer endnu.</p>
                                        ) : (
                                            logsList.map(log => (
                                                <div key={log.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {/* Status farve boble */}
                                                    <div style={{ position: 'absolute', left: '-23px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: log.status === 'red' ? '#ef4444' : (log.status === 'yellow' ? '#f59e0b' : '#10b981'), border: '2px solid white', boxShadow: '0 0 4px rgba(0,0,0,0.1)' }} />
                                                    
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <strong style={{ fontSize: '0.85rem', color: '#1a1a1a' }}>
                                                            {log.author} <span style={{ fontWeight: 'normal', color: '#6b7280' }}>tilføjede {log.isChangeOrder ? 'en Aftaleseddel' : 'status'}</span>
                                                        </strong>
                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                            {new Date(log.date).toLocaleDateString('da-DK')} {new Date(log.date).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151', lineHeight: '1.5', backgroundColor: log.isChangeOrder ? '#fef2f2' : '#fcfcfc', padding: '12px', borderRadius: '8px', border: log.isChangeOrder ? '1px solid #fca5a5' : '1px solid #f1f1ef' }}>
                                                        {log.text}
                                                    </p>

                                                    {log.isChangeOrder && (
                                                        <div style={{ display: 'flex', gap: '16px', padding: '10px 14px', backgroundColor: '#fff1f2', borderRadius: '8px', border: '1px solid #ffe4e6', color: '#be123c', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                            <span>Ekstra timer: +{log.extraHours} t</span>
                                                            <span>Ekstra materialer/omk: +{log.extraPrice} kr.</span>
                                                        </div>
                                                    )}

                                                    {log.photos && log.photos.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                            {log.photos.map((photo, pIdx) => (
                                                                <a key={pIdx} href={photo} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                                                    <img src={photo} alt="Fremdrift" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* NYT LOGBOGS INDLÆG */}
                                {profile?.role !== 'apprentice' && (
                                <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
                                    <h4 style={{ margin: 0, color: '#1a1a1a' }}>Skriv status fra pladsen</h4>
                                    
                                    <form onSubmit={handleAddLog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {/* Status farvevælger */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Drift-status</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                {[
                                                    { id: 'green', label: 'OK', color: '#10b981' },
                                                    { id: 'yellow', label: 'Info/Obs', color: '#f59e0b' },
                                                    { id: 'red', label: 'Stop/Problem', color: '#ef4444' }
                                                ].map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => setLogStatus(s.id)}
                                                        style={{ padding: '8px', border: logStatus === s.id ? `2px solid ${s.color}` : '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', background: logStatus === s.id ? 'white' : '#fafafa', fontWeight: 'bold', color: '#1e293b' }}
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Beskrivelse</label>
                                            <textarea 
                                                rows={4}
                                                value={newLogText}
                                                onChange={(e) => setNewLogText(e.target.value)}
                                                placeholder="Beskriv fremskridt eller eventuelle problemstillinger..."
                                                style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', resize: 'none' }}
                                            />
                                        </div>

                                        {/* Aftaleseddel Checkbox (Kun for Ledelse/PM) */}
                                        {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: isChangeOrder ? '#fff1f2' : '#f8fafc', borderRadius: '8px', border: isChangeOrder ? '1px solid #fecdd3' : '1px solid #e2e8f0' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', color: isChangeOrder ? '#be123c' : '#1e293b' }}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChangeOrder}
                                                        onChange={(e) => setIsChangeOrder(e.target.checked)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                    Opret som Aftaleseddel (Ekstraarbejde)
                                                </label>
                                                
                                                {isChangeOrder && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <label style={{ fontSize: '0.75rem', color: '#9f1239' }}>Estimeret ekstra tid (Timer)</label>
                                                            <input 
                                                                type="number"
                                                                value={extraHours}
                                                                onChange={(e) => setExtraHours(e.target.value)}
                                                                placeholder="F.eks. 4"
                                                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #fecdd3', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <label style={{ fontSize: '0.75rem', color: '#9f1239' }}>Ekstra materialekost (Kr.)</label>
                                                            <input 
                                                                type="number"
                                                                value={extraPrice}
                                                                onChange={(e) => setExtraPrice(e.target.value)}
                                                                placeholder="F.eks. 2500"
                                                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #fecdd3', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Rigtigt Foto-upload */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Vedhæft byggeplads-foto (valgfrit)</label>
                                            
                                            <label style={{ padding: '10px 14px', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: '#ffffff', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500' }}>
                                                <Camera size={16} /> Upload foto fra kamera/telefon
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    accept="image/*" 
                                                    style={{ display: 'none' }} 
                                                    onChange={handleRealPhotoUpload}
                                                />
                                            </label>
                                            
                                            {logPhotos.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✓ {logPhotos.length} foto(s) klar til indsendelse</p>
                                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                        {logPhotos.map((photo, idx) => (
                                                            <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                                                                <img src={photo} alt="Upload preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removePhoto(idx)}
                                                                    style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            type="submit"
                                            disabled={isUploadingLog}
                                            style={{ padding: '12px', backgroundColor: isUploadingLog ? '#94a3b8' : '#1e293b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', cursor: isUploadingLog ? 'not-allowed' : 'pointer' }}
                                        >
                                            {isUploadingLog ? 'Gemmer i logbog...' : 'Gem i logbog'}
                                        </button>
                                    </form>
                                </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: TIMEREGISTRERING */}
                        {activeSubTab === 'timesheet' && (
                            <div style={{ display: 'grid', gridTemplateColumns: (!['worker', 'apprentice'].includes(profile?.role)) ? '1fr 340px' : '1fr', gap: '24px', alignItems: 'start', maxWidth: (!['worker', 'apprentice'].includes(profile?.role)) ? 'none' : '500px', margin: (!['worker', 'apprentice'].includes(profile?.role)) ? '0' : '0 auto' }}>
                                
                                {/* TIMEOUT OVERSIGT */}
                                {(!['worker', 'apprentice'].includes(profile?.role)) && (
                                <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, color: '#1a1a1a' }}>Registrerede arbejdstimer på sagen</h4>
                                        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                            Samlet timeforbrug: <strong style={{ color: totalActualHours > budgetedHours ? '#ef4444' : '#10b981' }}>{totalActualHours} timer</strong> (Systembudget: {budgetedHours} t)
                                        </div>
                                    </div>

                                    {/* BOGHOLDER / ØKONOMI OVERBLIK */}
                                    <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>Samlet Tidsforbrug</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{totalActualHours} t</div>
                                        </div>
                                        <div style={{ width: '1px', backgroundColor: '#cbd5e1' }}></div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Ekstraregning</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>+ {totalExtraPrice} kr.</div>
                                        </div>
                                        <div style={{ width: '1px', backgroundColor: '#cbd5e1' }}></div>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                                            <button onClick={handleExportLonsystem} style={{ padding: '8px 16px', border: '1px solid #10b981', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                                Eksportér til Lønsystem (CSV)
                                            </button>
                                            <button onClick={() => window.print()} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', backgroundColor: 'white', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', color: '#334155' }}>
                                                Udskriv Timeseddel
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {timeEntries.length === 0 ? (
                                            <p style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic', padding: '16px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>Ingen arbejdstimer er registreret på denne sag endnu.</p>
                                        ) : (
                                            timeEntries.map(entry => (
                                                <div 
                                                    key={entry.id} 
                                                    style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', backgroundColor: '#fafaf9', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                                                >
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                                            <strong style={{ fontSize: '0.9rem', color: '#1a1a1a' }}>{entry.employeeName}</strong>
                                                            <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Clock size={12} /> {entry.startTime} - {entry.endTime || 'Nu'}
                                                            </span>
                                                            <span style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '30px', background: entry.endTime ? '#3b82f6' : '#10b981', color: 'white', fontWeight: 'bold' }}>
                                                                {entry.endTime ? `${entry.hours} timer` : 'I gang'}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{entry.desc}</span>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                            {new Date(entry.date).toLocaleDateString('da-DK')}
                                                        </span>
                                                        {(!['worker', 'apprentice'].includes(simulatedRole || profile?.role) || entry.employeeId === profile?.id) && (
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button onClick={() => handleEditTime(entry)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>Ret</button>
                                                                <button onClick={() => handleDeleteTime(entry.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>Slet</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                )}

                                {/* INDTAST NY TIMESEDDEL (MANUELT) */}
                                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', padding: isMobile ? '24px' : '32px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '24px' }}>
                                    
                                    {(profile?.role !== 'worker' && profile?.role !== 'apprentice' || true) && (
                                        <>
                                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {editingTimeId ? <Edit2 size={20} color="#3b82f6" /> : <Plus size={20} color="#3b82f6" />}
                                                {editingTimeId ? 'Ret timeregistrering' : 'Registrer timer (Manuelt)'}
                                            </h3>
                                            
                                            <form onSubmit={handleAddTimeEntry} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                
                                                {(!['worker', 'apprentice'].includes(simulatedRole || profile?.role)) && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Medarbejder (Hvem)</label>
                                                        <CustomSelect
                                                            value={newTime.employeeId}
                                                            onChange={(val) => setNewTime({ ...newTime, employeeId: val })}
                                                            options={team.map(worker => ({ value: worker.id, label: worker.owner_name || worker.company_name || worker.email || 'Ukendt' }))}
                                                            placeholder="-- Vælg medarbejder --"
                                                        />
                                                    </div>
                                                )}

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Starttid</label>
                                                        <input 
                                                            type="time"
                                                            value={newTime.startTime}
                                                            onChange={(e) => setNewTime({ ...newTime, startTime: e.target.value })}
                                                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b', width: '100%', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Sluttid</label>
                                                        <input 
                                                            type="time"
                                                            value={newTime.endTime}
                                                            onChange={(e) => setNewTime({ ...newTime, endTime: e.target.value })}
                                                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b', width: '100%', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                </div>

                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#475569', cursor: 'pointer', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={deductPause}
                                                        onChange={(e) => setDeductPause(e.target.checked)}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
                                                    />
                                                    <span style={{ fontWeight: '500' }}>Fratræk 30 min. selvbetalt frokostpause</span>
                                                </label>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Dato</label>
                                                    <input 
                                                        type="date"
                                                        value={newTime.date}
                                                        onChange={(e) => setNewTime({ ...newTime, date: e.target.value })}
                                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b', width: '100%', boxSizing: 'border-box' }}
                                                    />
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Beskrivelse / Arbejdsopgave</label>
                                                    <textarea 
                                                        rows="3"
                                                        value={newTime.desc}
                                                        onChange={(e) => setNewTime({ ...newTime, desc: e.target.value })}
                                                        placeholder="F.eks. 'Opsat gipslofter og spartlet'"
                                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', color: '#1e293b', width: '100%', boxSizing: 'border-box' }}
                                                    />
                                                </div>

                                                <div style={{ marginTop: '4px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                                    {editingTimeId && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingTimeId(null);
                                                                setNewTime({ startTime: '07:00', endTime: '15:00', date: new Date().toISOString().substring(0, 10), desc: '', employeeId: profile?.role === 'worker' || profile?.role === 'apprentice' ? profile.id : '' });
                                                                setDeductPause(true);
                                                            }}
                                                            style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                                                        >
                                                            Annuller
                                                        </button>
                                                    )}
                                                    <button 
                                                        type="submit"
                                                        style={{ flex: editingTimeId ? 0 : 1, padding: '12px 24px', borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                                                        onMouseOver={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                    >
                                                        <Save size={18} />
                                                        {editingTimeId ? 'Gem ændringer' : 'Registrer timer'}
                                                    </button>
                                                </div>
                                            </form>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            )}
        {/* MODAL: Bekræft Fakturering */}
        {/* MODAL: Visuel Fakturakladde Editor (A4 Paper Style) */}
        {showInvoiceModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', overflowY: 'auto' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '0', maxWidth: '850px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0,0,0,0.1)', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Fixed Toolbar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: invoiceActionType === 'book_and_send' ? '#dc2626' : '#0f172a' }}>
                            {invoiceActionType === 'book_and_send' ? <ShieldAlert size={24} /> : <PackageCheck size={24} />}
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {invoiceActionType === 'book_and_send' ? 'Advarsel: Du er ved at låse og udsende faktura' : 'Gennemgå og opret fakturakladde'}
                            </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={handleConvertToAconto}
                                style={{ padding: '8px 16px', backgroundColor: 'white', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                Skift til Rate/Aconto %
                            </button>
                            <button 
                                onClick={() => setShowInvoiceModal(false)}
                                style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#475569', border: 'none', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Luk
                            </button>
                        </div>
                    </div>

                    {/* Paper Area */}
                    <div style={{ padding: '60px 80px', backgroundColor: 'white', minHeight: '600px' }}>
                        
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '60px' }}>
                            <div>
                                <h1 style={{ fontSize: '2.5rem', margin: '0 0 8px 0', color: '#0f172a', letterSpacing: '-1px' }}>FAKTURA</h1>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Dato: {new Date().toLocaleDateString('da-DK')}</p>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Fakturanr: {invoiceActionType === 'draft' ? '(Kladde)' : 'Genereres automatisk'}</p>
                            </div>
                            <div style={{ textAlign: 'right', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>Faktureres til:</strong><br/>
                                {selectedCase?.customer_name || 'Ukendt Kunde'}<br/>
                                {selectedCase?.raw_data?.customerDetails?.customerType === 'erhverv' && (
                                    <>CVR: {selectedCase.raw_data.customerDetails.cvr}<br/></>
                                )}
                                {selectedCase?.customer_address || 'Adresse ikke oplyst'}<br/>
                                {selectedCase?.customer_email || 'Email ikke oplyst'}<br/>
                                {selectedCase?.customer_phone || ''}
                            </div>
                        </div>

                        {/* Editor Table */}
                        <div style={{ marginBottom: '60px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #0f172a' }}>
                                        <th style={{ padding: '12px 0', textAlign: 'left', color: '#0f172a', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Beskrivelse</th>
                                        <th style={{ padding: '12px 0', textAlign: 'right', color: '#0f172a', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', width: '200px' }}>Netto Pris</th>
                                        <th style={{ padding: '12px 0', width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceLines.map((line) => (
                                        <tr key={line.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '16px 0' }}>
                                                <input 
                                                    type="text" 
                                                    value={line.description}
                                                    onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                                                    placeholder="Skriv beskrivelse af arbejdet her..."
                                                    style={{ width: '100%', padding: '8px', border: '1px dashed transparent', borderRadius: '4px', fontSize: '1.05rem', color: '#334155', backgroundColor: 'transparent', outline: 'none', transition: 'all 0.2s' }}
                                                    onFocus={(e) => { e.target.style.border = '1px dashed #cbd5e1'; e.target.style.backgroundColor = '#f8fafc'; }}
                                                    onBlur={(e) => { e.target.style.border = '1px dashed transparent'; e.target.style.backgroundColor = 'transparent'; }}
                                                />
                                            </td>
                                            <td style={{ padding: '16px 0', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', padding: '6px 8px', borderRadius: '4px', border: '1px dashed transparent', transition: 'all 0.2s' }}>
                                                    <input 
                                                        type="number" 
                                                        value={line.priceExVat}
                                                        onChange={(e) => handleLineChange(line.id, 'priceExVat', e.target.value)}
                                                        style={{ width: '100px', border: 'none', backgroundColor: 'transparent', textAlign: 'right', fontSize: '1.05rem', color: '#0f172a', fontWeight: '500', outline: 'none' }}
                                                    />
                                                    <span style={{ color: '#64748b', fontSize: '1rem' }}>kr.</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 0', textAlign: 'right' }}>
                                                <button 
                                                    onClick={() => handleRemoveLine(line.id)}
                                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                                    title="Slet linje"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '16px' }}>
                                <button 
                                    onClick={handleAddLine}
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', padding: '8px', borderRadius: '4px' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Plus size={16} /> Tilføj ekstra linje
                                </button>
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            {/* Moms indstillinger */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: isReverseCharge ? '#fef2f2' : '#f8fafc', borderRadius: '8px', border: `1px solid ${isReverseCharge ? '#fca5a5' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                                <input 
                                    type="checkbox" 
                                    id="reverseCharge" 
                                    checked={isReverseCharge}
                                    onChange={(e) => setIsReverseCharge(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <label htmlFor="reverseCharge" style={{ cursor: 'pointer', fontSize: '0.95rem', color: isReverseCharge ? '#991b1b' : '#475569', fontWeight: isReverseCharge ? 'bold' : 'normal' }}>
                                    Erhvervskunde (Omvendt Betalingspligt - 0% Moms)
                                </label>
                            </div>

                            <div style={{ width: '350px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#475569', fontSize: '1rem' }}>
                                    <span>Samlet Netto (Ekskl. moms)</span>
                                    <span>{totalInvoiceExVat.toLocaleString('da-DK')} kr.</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#475569', fontSize: '1rem', borderBottom: '2px solid #e2e8f0' }}>
                                    <span>Moms ({isReverseCharge ? '0%' : '25%'})</span>
                                    <span>{totalInvoiceVat.toLocaleString('da-DK')} kr.</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', color: '#0f172a', fontSize: '1.4rem', fontWeight: 'bold' }}>
                                    <span>Total (Inkl. moms)</span>
                                    <span>{(totalInvoiceExVat + totalInvoiceVat).toLocaleString('da-DK')} kr.</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div style={{ marginTop: '80px', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => {
                                    setShowInvoiceModal(false);
                                    if (syncToAccounting) {
                                        syncToAccounting(selectedCase, invoiceActionType, invoiceLines, isReverseCharge);
                                    } else {
                                        toast.error("Faktureringsmodulet er ikke tilgængeligt her.");
                                    }
                                }}
                                style={{ padding: '16px 32px', borderRadius: '8px', backgroundColor: invoiceActionType === 'book_and_send' ? '#10b981' : '#0f172a', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                                }}
                            >
                                {invoiceActionType === 'book_and_send' ? 'Ja, Bogfør & Udsend Nu' : 'Gem som Kladde i Regnskab'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        )}
        </div>
    );
};
