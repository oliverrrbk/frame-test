import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { HardHat, CheckSquare, Camera, Clock, UserPlus, ChevronRight, AlertTriangle, TrendingUp, Plus, Trash2, Calendar, ShieldAlert, MapPin, User } from 'lucide-react';
import MaterialList from './MaterialList';
import toast from 'react-hot-toast';

const CaseManagement = ({ leads = [], profile, onUpdateLead, isModalView = false, selectedLeadId = null }) => {
    const [activeCases, setActiveCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('todo'); // 'todo', 'materials', 'logs', 'timesheet'
    const [team, setTeam] = useState([]);

    // States til delegering
    const [pmId, setPmId] = useState('');
    const [assignedWorkers, setAssignedWorkers] = useState([]);

    // States til to-do
    const [todoList, setTodoList] = useState([]);
    const [newTodoText, setNewTodoText] = useState('');

    // States til logs
    const [logsList, setLogsList] = useState([]);
    const [newLogText, setNewLogText] = useState('');
    const [logStatus, setLogStatus] = useState('green'); // 'green', 'yellow', 'red'
    const [logPhotos, setLogPhotos] = useState([]);

    // States til timeregistrering
    const [timeEntries, setTimeEntries] = useState([]);
    const [newTime, setNewTime] = useState({ hours: '', date: new Date().toISOString().substring(0, 10), desc: '', employeeId: '' });

    // States til Mesterens ugentlige medarbejder-tidsstyring
    const [selectedEmployeeForTidslog, setSelectedEmployeeForTidslog] = useState('');

    // Indlæs data
    useEffect(() => {
        const confirmed = leads.filter(l => l.status === 'Bekræftet opgave');
        
        if (profile?.role === 'worker') {
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
            setNewTime(prev => ({ ...prev, employeeId: profile.role === 'worker' ? profile.id : '' }));
        }
    }, [leads, isModalView, selectedLeadId, profile]);

    // Indlæs sags-data når en sag vælges
    useEffect(() => {
        if (selectedCase) {
            loadCaseData();
        }
    }, [selectedCase]);

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
                { id: 'mock-worker-2', owner_name: 'Kasper (Tømrerlærling)', role: 'worker' }
            ]);
        }
    };

    const loadCaseData = async () => {
        const caseId = selectedCase.id;

        // 1. Indlæs Delegering (PM og Workers)
        const savedPm = selectedCase.raw_data?.assigned_pm || '';
        const savedWorkers = selectedCase.raw_data?.assigned_workers || [];
        setPmId(savedPm);
        setAssignedWorkers(savedWorkers);

        // 2. Indlæs To-Do Liste
        const savedTodo = selectedCase.raw_data?.checklist || [];
        if (savedTodo.length > 0) {
            setTodoList(savedTodo);
        } else {
            // Indlæs standard to-do opskrifter baseret på kategori
            const defaultTodo = getDefaultChecklist(selectedCase.project_category);
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

    // Standard To-Do opskrifter for faglige anvisninger
    const getDefaultChecklist = (category) => {
        const base = [];
        switch (category) {
            case 'terrace':
                return [
                    { id: 't1', text: 'Afsætning: Kontroller højder, hjørner og vinkler (3-4-5 metoden)', done: false },
                    { id: 't2', text: 'Stolper: Udgravning af huller til min. 90 cm dybde (frostfri)', done: false },
                    { id: 't3', text: 'Fundament: Støbning af stolper eller fastgørelse til jordskruer', done: false },
                    { id: 't4', text: 'Bjælkelag: Montering af bærende remme og strøer (max 40cm afstand ved komposit, 50cm ved træ)', done: false },
                    { id: 't5', text: 'Vindspærre: Udrul ukrudtsdug under bjælkelaget', done: false },
                    { id: 't6', text: 'Udlægning: Lægning af dækbrædder med ensartede fuger (min. 5 mm)', done: false },
                    { id: 't7', text: 'Montering: Fastgørelse med rustfrie A4 skruer (skjult eller lige linjer)', done: false },
                    { id: 't8', text: 'Afslutning: Renskæring af kanter og efterslibning af afskæringer', done: false }
                ];
            case 'floor':
                return [
                    { id: 'f1', text: 'Nedrivning: Afmonter og bortskaf det gamle gulv/tæppe', done: false },
                    { id: 'f2', text: 'Klargøring: Støvsug, slib og kontroller undergulv for skævheder (max 2mm pr. 2m)', done: false },
                    { id: 'f3', text: 'Fugtspærre: Udlæg dampspærre med 20cm overlæg og tape samlinger', done: false },
                    { id: 'f4', text: 'Underlag: Læg akustikskum / støjdæmpende underlag', done: false },
                    { id: 'f5', text: 'Gulvlægning: Læg første 3 rækker med kiler mod væggene (10mm ekspansion)', done: false },
                    { id: 'f6', text: 'Tilpasning: Underfremning af dørkarme og tæt udskæring ved rør', done: false },
                    { id: 'f7', text: 'Gerigter: Montering af fodlister og fejelister (fastgøres kun i væg, ikke i gulv)', done: false }
                ];
            case 'ceilings':
                return [
                    { id: 'c1', text: 'Forberedelse: Nedtagning af eksisterende beklædning og opretning', done: false },
                    { id: 'c2', text: 'Isolering: Kontroller isoleringens tykkelse og stand (efterisoler om nødvendigt)', done: false },
                    { id: 'c3', text: 'Dampspærre: Monter dampspærrefolie 100% lufttæt med klemlister og tape', done: false },
                    { id: 'c4', text: 'Forskalling: Monter forskalling 22x95 c-c 30cm ved gips, c-c 60cm ved Troldtekt', done: false },
                    { id: 'c5', text: 'Loftsplader: Opsætning af loftplader med forskudte samlinger', done: false },
                    { id: 'c6', text: 'Akustikfuge: Fugning langs vægge med elastisk akustikfuge', done: false }
                ];
            case 'facades':
                return [
                    { id: 'fa1', text: 'Demontering: Nedtagning af gammel facadebeklædning og rengøring', done: false },
                    { id: 'fa2', text: 'Vindspærre: Monter vindspærrefolie (dug) stramt og vindtæt med tape', done: false },
                    { id: 'fa3', text: 'Afstandslister: Monter lodrette klemlister min. 21x45mm for god ventilation', done: false },
                    { id: 'fa4', text: 'Facadebeklædning: Opsætning af brædder (vandret/lodret) med rustfrie søm/skruer', done: false },
                    { id: 'fa5', text: 'Inddækning: Etabler lysninger og zink/alu-inddækninger over døre/vinduer', done: false }
                ];
            case 'fence':
                return [
                    { id: 'fe1', text: 'Afsætning: Kontroller skellinjer og snoretræk til hegnet', done: false },
                    { id: 'fe2', text: 'Stolper: Udgravning af stolpehuller c-c 180cm til frostfri dybde', done: false },
                    { id: 'fe3', text: 'Forankring: Sæt stolper i lod og støb med stolpebeton (2 poser pr. stolpe)', done: false },
                    { id: 'fe4', text: 'Hegn: Monter klinkebrædder, liste eller færdige lamelmoduler', done: false },
                    { id: 'fe5', text: 'Afslutning: Skru stolpehatte på for at beskytte mod regnvand', done: false }
                ];
            default:
                return [
                    { id: 'g1', text: 'Kontrol og opmåling før opstart', done: false },
                    { id: 'g2', text: 'Klargøring af arbejdssted og materialemodtagelse', done: false },
                    { id: 'g3', text: 'Udførelse af konstruktionsarbejde', done: false },
                    { id: 'g4', text: 'Oprydning, slutkontrol og aflevering', done: false }
                ];
        }
    };

    // Gemmer sagsoplysninger i Supabase/localStorage
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
            assigned_pm: pmId,
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
    const handleAddLog = (e) => {
        e.preventDefault();
        if (!newLogText.trim()) return;

        const currentAuthor = team.find(t => t.id === profile.id)?.owner_name || profile.owner_name || 'Mester';

        const newLog = {
            id: `log-${Date.now()}`,
            status: logStatus,
            text: newLogText.trim(),
            author: currentAuthor,
            date: new Date().toISOString(),
            photos: logPhotos
        };

        const updated = [newLog, ...logsList];
        setLogsList(updated);
        setNewLogText('');
        setLogPhotos([]);
        saveCaseDataToDb({ logs: updated });
        toast.success('Logbog opdateret!');
    };

    const handleSimulatePhotoUpload = () => {
        // Simulerer upload af foto fra byggepladsen
        const mockPhotos = [
            'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400',
            'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&q=80&w=400'
        ];
        // Vælg et tilfældigt byggeplads-billede
        const chosen = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];
        setLogPhotos([...logPhotos, chosen]);
        toast.success('Foto uploadet fra kamerarulle!');
    };

    // Timeregistrering-håndtering
    const handleAddTimeEntry = (e) => {
        e.preventDefault();
        if (!newTime.hours || !newTime.employeeId) {
            toast.error('Udfyld venligst medarbejder og antal timer');
            return;
        }

        const employeeName = team.find(t => t.id === newTime.employeeId)?.owner_name || 'Ukendt medarbejder';

        const entry = {
            id: `time-${Date.now()}`,
            hours: parseFloat(newTime.hours) || 0,
            date: newTime.date,
            desc: newTime.desc.trim() || 'Almindeligt tømrerarbejde',
            employeeId: newTime.employeeId,
            employeeName: employeeName
        };

        const updated = [entry, ...timeEntries];
        setTimeEntries(updated);
        setNewTime({ ...newTime, hours: '', desc: '' });
        saveCaseDataToDb({ time_entries: updated });
        toast.success('Timer registreret på sagen!');
    };

    // Beregn sagsfremskridt i procent
    const completedTodos = todoList.filter(t => t.done).length;
    const progressPercent = todoList.length > 0 ? Math.round((completedTodos / todoList.length) * 100) : 0;

    // Beregn tidsbudget overholdelse
    const totalActualHours = timeEntries.reduce((sum, item) => sum + item.hours, 0);
    const budgetedHours = parseFloat(selectedCase?.raw_data?.calc_data?.laborHours) || 40; // budget
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
                                                Kunde: {c.customer_name || 'Privatkunde'}
                                            </span>
                                            <span style={{ fontSize: '0.825rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={14} style={{ color: '#94a3b8' }} /> {c.customer_address || 'Adresse ikke angivet'}
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
                                <TrendingUp size={18} style={{ color: '#10b981' }} /> {profile?.role === 'worker' ? 'Min Ugeseddel (Dine timer)' : 'Mandskabets Tidsstyring (Central Ugeseddel)'}
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {team
                                    .filter(member => profile?.role !== 'worker' || member.id === profile.id)
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
                                style={{ display: isModalView ? 'none' : 'inline-block', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', padding: 0, textDecoration: 'underline', marginBottom: '8px' }}
                            >
                                ← Tilbage til sagsliste
                            </button>
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: 'bold', color: '#1a1a1a' }}>
                                {selectedCase.raw_data?.project_title || `Sag: ${selectedCase.project_category}`}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.9rem' }}>
                                <MapPin size={14} style={{ color: '#94a3b8' }} /> {selectedCase.customer_address || 'Adresse ikke angivet'} 
                                <span style={{ color: '#cbd5e1' }}>|</span> 
                                <strong>Kunde: {selectedCase.customer_name || 'Privatkunde'}</strong>
                            </div>
                        </div>
                        
                        {/* Status bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                    {profile?.role === 'worker' ? (
                        <div style={{ padding: '16px 20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                                <strong style={{ color: '#1a1a1a', marginRight: '6px' }}>Projektleder:</strong> 
                                {team.find(t => t.id === pmId)?.owner_name || 'Ikke tilknyttet endnu'}
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold' }}>Projektleder</span>
                                    <select 
                                        value={pmId} 
                                        onChange={(e) => setPmId(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e8e6e1', fontSize: '0.85rem', minWidth: '180px' }}
                                    >
                                        <option value="">-- Vælg Projektleder --</option>
                                        {team.filter(t => t.role === 'sales' || t.role === 'admin').map(pm => (
                                            <option key={pm.id} value={pm.id}>{pm.owner_name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold' }}>Tildelt Byggehold (Svende & Lærlinge)</span>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {team.filter(t => t.role === 'worker' || t.id !== profile.id).map(worker => {
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
                    <div style={{ display: 'flex', borderBottom: '1px solid #e8e6e1' }}>
                        {[
                            { id: 'todo', label: 'Bygge To-Do (KS)' },
                            { id: 'materials', label: 'Materialer' },
                            { id: 'logs', label: 'Progress Logbog' },
                            { id: 'timesheet', label: 'Timeregistrering' }
                        ].filter(tab => {
                            if (profile?.role === 'worker') {
                                return tab.id !== 'materials';
                            }
                            return true;
                        }).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                style={{ padding: '12px 24px', border: 'none', background: 'none', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', color: activeSubTab === tab.id ? '#1a1a1a' : '#6b7280', borderBottom: activeSubTab === tab.id ? '3px solid #10b981' : 'none', transition: 'all 0.2s' }}
                            >
                                {tab.label}
                            </button>
                        ))}
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
                                            
                                            {profile?.role !== 'worker' && (
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
                                {profile?.role !== 'worker' && (
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

                        {/* TAB 3: LIVE PROGRESS LOGBOG */}
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
                                                            {log.author} <span style={{ fontWeight: 'normal', color: '#6b7280' }}>tilføjede status</span>
                                                        </strong>
                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                            {new Date(log.date).toLocaleDateString('da-DK')} {new Date(log.date).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151', lineHeight: '1.5', backgroundColor: '#fcfcfc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f1ef' }}>
                                                        {log.text}
                                                    </p>

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

                                        {/* Foto-upload simulering */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Vedhæft byggeplads-foto (valgfrit)</label>
                                            <button
                                                type="button"
                                                onClick={handleSimulatePhotoUpload}
                                                style={{ padding: '10px 14px', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: '#ffffff', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500' }}
                                            >
                                                <Camera size={16} /> Upload foto fra kamera
                                            </button>
                                            {logPhotos.length > 0 && (
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✓ {logPhotos.length} foto(s) klar til indsendelse</p>
                                            )}
                                        </div>

                                        <button 
                                            type="submit"
                                            style={{ padding: '12px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
                                        >
                                            Gem i logbog
                                        </button>
                                    </form>
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
                                                            <span style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '30px', background: '#3b82f6', color: 'white', fontWeight: 'bold' }}>
                                                                {entry.hours} timer
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

                                {/* INDTAST NY TIMESEDDEL */}
                                <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
                                    <h4 style={{ margin: 0, color: '#1a1a1a' }}>Registrer nye timer</h4>
                                    
                                    <form onSubmit={handleAddTimeEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        
                                        {profile?.role === 'worker' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Medarbejder (Hvem)</label>
                                                <div style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e8e6e1', fontSize: '0.9rem', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 'bold' }}>
                                                    {profile.owner_name}
                                                </div>
                                            </div>
                                        ) : (
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
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Antal Timer</label>
                                                <input 
                                                    type="number"
                                                    step="0.25"
                                                    value={newTime.hours}
                                                    onChange={(e) => setNewTime({ ...newTime, hours: e.target.value })}
                                                    placeholder="F.eks. 7.5"
                                                    style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Dato</label>
                                                <input 
                                                    type="date"
                                                    value={newTime.date}
                                                    onChange={(e) => setNewTime({ ...newTime, date: e.target.value })}
                                                    style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>Beskrivelse (Hvad har du lavet?)</label>
                                            <input 
                                                type="text"
                                                value={newTime.desc}
                                                onChange={(e) => setNewTime({ ...newTime, desc: e.target.value })}
                                                placeholder="F.eks 'Bjælkelag færdiggjort og lagt vinddug'"
                                                style={{ border: '1px solid #e8e6e1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem' }}
                                            />
                                        </div>

                                        <button 
                                            type="submit"
                                            style={{ padding: '12px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
                                        >
                                            Registrer timer
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            )}
        </div>
    );
};

export default CaseManagement;
