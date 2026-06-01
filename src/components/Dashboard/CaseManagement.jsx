import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { HardHat, CheckSquare, Camera, Clock, UserPlus, ChevronRight, AlertTriangle, TrendingUp, Plus, Trash2, Calendar, ShieldAlert, MapPin, User, ArrowLeft, Package, DollarSign, PackageCheck, ClipboardList } from 'lucide-react';
import MaterialList from './MaterialList';
import toast from 'react-hot-toast';

const CaseManagement = ({ leads = [], profile, onUpdateLead, isModalView = false, selectedLeadId = null, targetCaseId = null, clearTargetCase = () => {}, syncToAccounting }) => {
    const [activeCases, setActiveCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('todo'); // 'todo', 'materials', 'logs', 'timesheet', 'finance'
    const [team, setTeam] = useState([]);

    // States til delegering
    const [pmIds, setPmIds] = useState([]);
    const [assignedWorkers, setAssignedWorkers] = useState([]);
    const [pmDropdownOpen, setPmDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

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

    // States til Mesterens ugentlige medarbejder-tidsstyring
    const [selectedEmployeeForTidslog, setSelectedEmployeeForTidslog] = useState('');

    // Mobil & Worker Check-in states
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobileWorker = (profile?.role === 'worker' || profile?.role === 'apprentice') && isMobile;
    const activeCheckIn = timeEntries.find(t => t.employeeId === profile?.id && t.endTime === null);

    // Indlæs data
    useEffect(() => {
        const confirmed = leads.filter(l => l.status === 'Bekræftet opgave');
        
        if (profile?.role === 'worker' || profile?.role === 'apprentice') {
            const filtered = confirmed.filter(c => {
                const workers = c.raw_data?.assigned_workers || [];
                const pm = c.raw_data?.assigned_pm;
                return workers.includes(profile.id) || pm === profile.id;
            });
            setActiveCases(filtered);
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
            setNewTime(prev => ({ ...prev, employeeId: (profile.role === 'worker' || profile.role === 'apprentice') ? profile.id : '' }));
        }
    }, [leads, isModalView, selectedLeadId, profile]);

    // Indlæs sags-data når en sag vælges
    useEffect(() => {
        if (selectedCase) {
            loadCaseData();
        }
    }, [selectedCase]);

    // Lyt efter remote targeting fra Dashboard CTA'en
    useEffect(() => {
        if (targetCaseId) {
            const confirmed = leads.filter(l => l.status === 'Bekræftet opgave');
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
                setTeam(data);
            } else {
                throw new Error("Kunne ikke hente team");
            }
        } catch (err) {
            // Fallback for team på localhost
            setTeam([
                { id: profile.id, owner_name: profile.owner_name + ' (Dig)', role: 'admin' },
                { id: 'mock-pm-1', owner_name: 'Christian (Projektleder)', role: 'sales' },
                { id: 'mock-worker-1', owner_name: 'Niklas (Tømrersvend)', role: 'worker' },
                { id: 'mock-worker-2', owner_name: 'Kasper (Tømrerlærling)', role: 'apprentice' }
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
    const handleSaveAssignments = () => {
        saveCaseDataToDb({
            assigned_pm: pmIds,
            assigned_workers: assignedWorkers
        });
        toast.success('Bemandingen er opdateret på sagen!');
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
        const currentAuthor = team.find(t => t.id === profile.id)?.owner_name || profile.owner_name || 'Mester';
        
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
        if (!newTime.startTime || !newTime.endTime || !newTime.employeeId) {
            toast.error('Udfyld venligst medarbejder, samt start- og sluttidspunkt');
            return;
        }

        const employeeName = team.find(t => t.id === newTime.employeeId)?.owner_name || 'Ukendt medarbejder';

        // Beregn timer (inkl. håndtering af evt. overnatning/negativ tid - primitiv udgave)
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

        const entry = {
            id: `time-${Date.now()}`,
            startTime: newTime.startTime,
            endTime: newTime.endTime,
            hours: diffHours,
            date: newTime.date,
            desc: newTime.desc.trim() || 'Almindeligt tømrerarbejde',
            employeeId: newTime.employeeId,
            employeeName: employeeName
        };

        const updated = [entry, ...timeEntries];
        setTimeEntries(updated);
        setNewTime({ ...newTime, desc: '' });
        saveCaseDataToDb({ time_entries: updated });
        toast.success('Timer registreret på sagen!');
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
            description: `Opgave: ${selectedCase?.project_category || 'Tømreropgave'} - Oprindeligt tilbud`,
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
            employeeName: profile?.owner_name || 'Ukendt medarbejder'
        };
        const updated = [entry, ...timeEntries];
        setTimeEntries(updated);
        saveCaseDataToDb({ time_entries: updated });
        toast.success('Du er nu tjekket ind!', { icon: '🟢' });
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
        
        entry.hours = diffHours;
        entry.desc = newTime.desc.trim() || 'Arbejde udført (Tjek-ud)';
        
        const updated = [...timeEntries];
        updated[entryIndex] = entry;
        
        setTimeEntries(updated);
        setNewTime({ ...newTime, desc: '' });
        saveCaseDataToDb({ time_entries: updated });
        toast.success('Tjekket ud! Timerne er nu låst.', { icon: '🔴' });
    };

    // Beregn sagsfremskridt i procent
    const completedTodos = todoList.filter(t => t.done).length;
    const progressPercent = todoList.length > 0 ? Math.round((completedTodos / todoList.length) * 100) : 0;

    // Beregn tidsbudget overholdelse (inklusive godkendte aftalesedler)
    const totalActualHours = timeEntries.reduce((sum, item) => sum + item.hours, 0);
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
                description: `Acontobetaling (${percent}%) vedr. ${selectedCase?.project_category || 'opgave'}`,
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
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>Når en kunde accepterer et tilbud, skifter status automatisk, og sagen vil fremgå her.</p>
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
                                            {c.raw_data?.project_title || `Opgave: ${c.project_category}`}
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#6b7280', borderTop: '1px solid #f1f1ef', paddingTop: '12px' }}>
                                            <span>Timer registreret:</span>
                                            <strong style={{ color: hrs > estHrs ? '#ef4444' : '#1e293b' }}>
                                                {hrs} t / {estHrs} t
                                            </strong>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* UGERAPPORT FOR MANDSKAB / SVEND */}
                    {activeCases.length > 0 && (
                        <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', marginTop: '16px' }}>
                            <h4 style={{ margin: '0 0 16px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={18} style={{ color: '#10b981' }} /> {(profile?.role === 'worker' || profile?.role === 'apprentice') ? 'Min Ugeseddel (Dine timer)' : 'Mandskabets Tidsstyring (Central Ugeseddel)'}
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {team
                                    .filter(member => (profile?.role !== 'worker' && profile?.role !== 'apprentice') || member.id === profile.id)
                                    .map(member => {
                                        const hrs = getEmployeeTotalHoursThisWeek(member.id);
                                        return (
                                            <div key={member.id} style={{ padding: '12px 20px', backgroundColor: '#fafaf9', borderRadius: '10px', border: '1px solid #e8e6e1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                    {member.owner_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#1a1a1a' }}>{member.owner_name}</p>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>Timer denne uge: <strong style={{ color: '#10b981' }}>{hrs} timer</strong></p>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
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
                                {selectedCase.raw_data?.project_title || `Sag: ${selectedCase.project_category}`}
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
                                                ⏸️ Sæt i bero
                                            </button>
                                            <button 
                                                onClick={() => { handleStatusChange('Udgået opgave'); setIsStatusDropdownOpen(false); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                ❌ Annullér (Udgået)
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
                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Status på timebudgettet</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a1a1a' }}>{totalActualHours} <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 'normal' }}>/ {budgetedHours} timer</span></div>
                                </div>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isOvertime ? '#ef4444' : '#10b981' }}>{Math.round(hourBudgetRatio * 100)}%</span>
                            </div>
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
                        </div>

                        {/* 2. Økonomi / Ekstraarbejde */}
                        <div 
                            onClick={() => setActiveSubTab('finance')}
                            style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#16a34a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e8e6e1'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1a1a1a', fontWeight: 'bold' }}>Økonomi</h4>
                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Budget, Ekstraudgifter & Total</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Oprindeligt Tilbud:</span>
                                    <span style={{ fontSize: '0.9rem', color: '#1a1a1a' }}>{baseTotalPrice > 0 ? `${baseTotalPrice.toLocaleString('da-DK')} kr.` : 'Timelønnet'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Ekstra Aftalesedler:</span>
                                    <span style={{ fontSize: '0.9rem', color: totalExtraPrice > 0 ? '#166534' : '#6b7280' }}>
                                        {totalExtraPrice > 0 ? `+${totalExtraPrice.toLocaleString('da-DK')} kr.` : '0 kr.'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#1a1a1a', fontWeight: 'bold' }}>Samlet til fakturering:</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1a1a1a' }}>
                                        {totalToBill > 0 ? `${totalToBill.toLocaleString('da-DK')} kr.` : 'Afventer'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Materialer */}
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
                        </div>
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

                    {/* MANDSKABS DELEGERING BAR */}
                    {(profile?.role === 'worker' || profile?.role === 'apprentice') ? (
                        <div style={{ padding: '16px 20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                                <strong style={{ color: '#1a1a1a', marginRight: '6px' }}>Projektleder:</strong> 
                                {pmIds.length === 0 ? 'Ikke tilknyttet endnu' : pmIds.map(id => team.find(t => t.id === id)?.owner_name).filter(Boolean).join(', ')}
                            </div>
                            <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1' }} />
                            <div style={{ fontSize: '0.85rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ color: '#1a1a1a' }}>Dit Byggehold:</strong>
                                {assignedWorkers.length === 0 ? 'Kun dig' : (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {assignedWorkers.map(wId => {
                                            const w = team.find(t => t.id === wId);
                                            return w ? <span key={wId} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '30px', background: '#f3f4f6', color: '#374151', fontWeight: '500' }}>{w.owner_name}</span> : null;
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold' }}>Projektleder</span>
                                    <div 
                                        onClick={() => setPmDropdownOpen(!pmDropdownOpen)}
                                        style={{ 
                                            padding: '8px 12px', 
                                            borderRadius: '6px', 
                                            border: '1px solid #e8e6e1', 
                                            fontSize: '0.85rem', 
                                            minWidth: '220px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: '#fff',
                                            transition: 'border-color 0.2s',
                                        }}
                                    >
                                        <span style={{ color: pmIds.length ? '#1a1a1a' : '#9ca3af' }}>
                                            {pmIds.length === 0 ? '-- Vælg Projektleder --' : `${pmIds.length} valgt`}
                                        </span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: pmDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    </div>
                                    
                                    {pmDropdownOpen && (
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '100%', 
                                            left: 0, 
                                            marginTop: '4px', 
                                            width: '100%', 
                                            backgroundColor: '#fff', 
                                            border: '1px solid #e8e6e1', 
                                            borderRadius: '8px', 
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                                            zIndex: 100,
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}>
                                            {team.filter(t => t.role === 'sales' || t.role === 'admin').map(pm => {
                                                const isSelected = pmIds.includes(pm.id);
                                                return (
                                                    <div 
                                                        key={pm.id} 
                                                        onClick={() => {
                                                            if (isSelected) setPmIds(pmIds.filter(id => id !== pm.id));
                                                            else setPmIds([...pmIds, pm.id]);
                                                        }}
                                                        style={{ 
                                                            padding: '10px 12px', 
                                                            cursor: 'pointer', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '8px',
                                                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                                            transition: 'background-color 0.1s'
                                                        }}
                                                        onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                                                        onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        <div style={{ 
                                                            width: '16px', height: '16px', borderRadius: '4px', border: isSelected ? 'none' : '1px solid #cbd5e1', 
                                                            backgroundColor: isSelected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            {isSelected && <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem', color: isSelected ? '#1d4ed8' : '#1a1a1a', fontWeight: isSelected ? '500' : 'normal' }}>
                                                            {pm.owner_name}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold' }}>Tildelt Byggehold (Svende & Lærlinge)</span>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {team.filter(t => t.role === 'worker' || t.role === 'apprentice').map(worker => {
                                            const isAssigned = assignedWorkers.includes(worker.id);
                                            return (
                                                <button
                                                    key={worker.id}
                                                    onClick={() => handleWorkerToggle(worker.id)}
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '30px', border: isAssigned ? '1px solid #3b82f6' : '1px solid #cbd5e1', backgroundColor: isAssigned ? '#eff6ff' : '#ffffff', color: isAssigned ? '#1d4ed8' : '#4b5563', cursor: 'pointer', transition: 'all 0.1s' }}
                                                >
                                                    {isAssigned ? '✓ ' : '+ '}{worker.owner_name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
    
                            <button 
                                onClick={handleSaveAssignments}
                                style={{ padding: '10px 18px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Gem bemanding
                            </button>
                        </div>
                    )}

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
                        ].filter(tab => {
                            if (profile?.role === 'worker' || profile?.role === 'apprentice') {
                                return tab.id !== 'materials';
                            }
                            return true;
                        }).map(tab => {
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
                                    <h4 style={{ margin: 0, color: '#1a1a1a' }}>Projektets Bygge-Logbog</h4>
                                    
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
                            </div>
                        )}

                        {/* TAB: ØKONOMI & FAKTURERING */}
                        {activeSubTab === 'finance' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                                
                                <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <DollarSign size={20} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#1a1a1a', fontWeight: 'bold' }}>Økonomi & Fakturering</h4>
                                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Send ratefakturaer og endelig regning direkte</span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                            <span style={{ color: '#475569' }}>Oprindeligt Tilbud (Ekskl. evt. Aftalesedler):</span>
                                            <strong style={{ color: '#1e293b' }}>{baseTotalPrice.toLocaleString('da-DK')} kr.</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                            <span style={{ color: '#475569' }}>Godkendte Aftalesedler (Merpris):</span>
                                            <strong style={{ color: '#16a34a' }}>+ {totalExtraPrice.toLocaleString('da-DK')} kr.</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                                            <span style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1.1rem' }}>Samlet Opgave-Total:</span>
                                            <strong style={{ color: '#0f172a', fontSize: '1.2rem' }}>{totalToBill.toLocaleString('da-DK')} kr.</strong>
                                        </div>
                                        
                                        {/* Allerede faktureret */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#fff7ed', borderRadius: '8px', borderLeft: '4px solid #f97316', marginTop: '12px' }}>
                                            <span style={{ color: '#9a3412', fontWeight: 'bold' }}>Allerede faktureret (Aconto):</span>
                                            <strong style={{ color: '#c2410c' }}>{(selectedCase?.raw_data?.invoiced_amount || 0).toLocaleString('da-DK')} kr.</strong>
                                        </div>
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#ecfdf5', borderRadius: '8px', borderLeft: '4px solid #10b981', marginTop: '4px' }}>
                                            <span style={{ color: '#065f46', fontWeight: 'bold', fontSize: '1.1rem' }}>Restbeløb til fakturering:</span>
                                            <strong style={{ color: '#064e3b', fontSize: '1.2rem' }}>
                                                {Math.max(0, totalToBill - (selectedCase?.raw_data?.invoiced_amount || 0)).toLocaleString('da-DK')} kr.
                                            </strong>
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                                        <button 
                                            onClick={() => handleOpenInvoiceModal('draft')}
                                            style={{ flex: 1, padding: '14px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 'bold', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                        >
                                            <ClipboardList size={18} /> Opret Fakturakladde
                                        </button>
                                        <button 
                                            onClick={() => handleOpenInvoiceModal('book_and_send')}
                                            style={{ flex: 2, padding: '14px', borderRadius: '10px', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                                        >
                                            <PackageCheck size={18} /> Bogfør & Send Faktura nu
                                        </button>
                                    </div>
                                </div>
                                
                                <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h4 style={{ margin: 0, color: '#1a1a1a' }}>Faktura Historik</h4>
                                    {(!selectedCase?.raw_data?.invoice_history || selectedCase.raw_data.invoice_history.length === 0) ? (
                                        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#6b7280', fontSize: '0.9rem' }}>
                                            Ingen fakturaer sendt endnu.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {selectedCase.raw_data.invoice_history.map((inv, idx) => (
                                                <div key={idx} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280' }}>
                                                        <span>{new Date(inv.date).toLocaleDateString('da-DK')}</span>
                                                        <span style={{ textTransform: 'capitalize' }}>{inv.system} ID: {inv.id}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#1e293b' }}>
                                                        <span>Bogførte beløb:</span>
                                                        <span style={{ color: '#10b981' }}>{Number(inv.amount).toLocaleString('da-DK')} kr.</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: TIMEREGISTRERING */}
                        {activeSubTab === 'timesheet' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                                
                                {/* TIMEOUT OVERSIGT */}
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
                                                📥 Eksportér til Lønsystem (CSV)
                                            </button>
                                            <button onClick={() => window.print()} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', backgroundColor: 'white', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', color: '#334155' }}>
                                                🖨️ Udskriv Timeseddel
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
                                                    
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                        {new Date(entry.date).toLocaleDateString('da-DK')}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* INDTAST NY TIMESEDDEL ELLER TJEK IND */}
                                <div style={{ backgroundColor: '#ffffff', padding: isMobileWorker ? '16px' : '24px', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
                                    
                                    {(profile?.role === 'worker' || profile?.role === 'apprentice') ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1a1a' }}>Stempling</h3>
                                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                                                {activeCheckIn ? `Du har været tjekket ind siden kl. ${activeCheckIn.startTime}` : 'Klar til at arbejde? Tjek ind med det samme.'}
                                            </p>
                                            
                                            {activeCheckIn ? (
                                                <button 
                                                    onClick={handleCheckOut}
                                                    style={{ width: '100%', padding: '24px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '16px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)', transition: 'transform 0.1s' }}
                                                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                                                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    ◼ STOP ARBEJDE
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={handleCheckIn}
                                                    style={{ width: '100%', padding: '24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '16px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)', transition: 'transform 0.1s' }}
                                                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                                                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    ▶ START ARBEJDE
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <h4 style={{ margin: 0, color: '#1a1a1a' }}>Registrer timer (Manuelt)</h4>
                                            
                                            <form onSubmit={handleAddTimeEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Medarbejder (Hvem)</label>
                                                    <select
                                                        value={newTime.employeeId}
                                                        onChange={(e) => setNewTime({ ...newTime, employeeId: e.target.value })}
                                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e8e6e1', fontSize: '0.9rem', backgroundColor: 'white' }}
                                                    >
                                                        <option value="">-- Vælg medarbejder --</option>
                                                        {team.map(worker => (
                                                            <option key={worker.id} value={worker.id}>{worker.owner_name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Starttid</label>
                                                        <input 
                                                            type="time"
                                                            value={newTime.startTime}
                                                            onChange={(e) => setNewTime({ ...newTime, startTime: e.target.value })}
                                                            style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Sluttid</label>
                                                        <input 
                                                            type="time"
                                                            value={newTime.endTime}
                                                            onChange={(e) => setNewTime({ ...newTime, endTime: e.target.value })}
                                                            style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                                                        />
                                                    </div>
                                                </div>

                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#4b5563', cursor: 'pointer' }}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={deductPause}
                                                        onChange={(e) => setDeductPause(e.target.checked)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                    Fratræk 30 min. selvbetalt frokostpause
                                                </label>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Dato</label>
                                                    <input 
                                                        type="date"
                                                        value={newTime.date}
                                                        onChange={(e) => setNewTime({ ...newTime, date: e.target.value })}
                                                        style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                                                    />
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Beskrivelse (Hvad har du lavet?)</label>
                                                    <input 
                                                        type="text"
                                                        value={newTime.desc}
                                                        onChange={(e) => setNewTime({ ...newTime, desc: e.target.value })}
                                                        placeholder="F.eks 'Bjælkelag færdiggjort og lagt vinddug'"
                                                        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', backgroundColor: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(12px)', padding: '14px 20px', borderRadius: '16px', fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}
                                                    />
                                                </div>

                                                <button 
                                                    type="submit"
                                                    style={{ padding: '12px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
                                                >
                                                    Registrer timer
                                                </button>
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

export default CaseManagement;
