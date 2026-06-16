import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Clock, Briefcase, Calendar, MapPin, ChevronDown, Phone, X, Play, Square, Users, MessageSquare, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';
import { startOfWeek, startOfMonth, isAfter, isSameDay, eachDayOfInterval, subDays, isWeekend, isToday, format } from 'date-fns';
import { da } from 'date-fns/locale';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { mutateTimeEntries } from '../../utils/timeEntries';
import { getTodaysMessagesForUser, getSeenSet, markSeen, countUnseen } from '../../utils/caseMessages';
import { getRoleLabel } from '../../utils/roles';
import { fetchPayrollSettings, getConfig, computeNetHours, suggestedBreakMinutes, DEFAULT_PAYROLL_CONFIG } from '../../utils/payroll';

// Klokkeslæt som "HH:MM" (kolon — kan altid læses, modsat dansk locale "HH.MM").
const toHHMM = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function WorkerOverview({ leadsData, myProfile, setActiveTab, setTargetCaseId, simulatedRole }) {
    // ---- EKSISTERENDE LOGIK (Beholdt for funktionel integritet) ----
    const activeWorkerCases = useMemo(() => {
        return leadsData.filter(lead => {
            const role = myProfile?.role;
            const workers = lead.raw_data?.assigned_workers || [];
            
            const pmData = lead.raw_data?.assigned_pm;
            const pms = Array.isArray(pmData) ? pmData : (pmData ? [pmData] : []);
            
            const isAssignedSales = pms.includes(myProfile?.id) || lead.assigned_to === myProfile?.id;
            const isAssignedWorker = workers.includes(myProfile?.id);
            
            const isAssigned = isAssignedSales || isAssignedWorker;

            if (simulatedRole && ['worker', 'apprentice', 'sales'].includes(role)) {
                return ['Bekræftet opgave', 'Sæt i bero', 'Afbrudt Sag'].includes(lead.status);
            }

            return isAssigned;
        });
    }, [leadsData, myProfile, simulatedRole]);

    const [selectedCheckInProject, setSelectedCheckInProject] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Firmaets løn-regler (auto-pause m.m.) — bruges ved tjek-ud.
    const [payrollCfg, setPayrollCfg] = useState(DEFAULT_PAYROLL_CONFIG);
    useEffect(() => {
        const cid = myProfile?.company_id || myProfile?.id;
        if (cid) fetchPayrollSettings(cid).then(s => setPayrollCfg(getConfig(s))).catch(() => {});
    }, [myProfile]);

    const activeCheckInInfo = useMemo(() => {
        for (const lead of activeWorkerCases) {
            const entries = lead.raw_data?.time_entries || [];
            const activeEntry = entries.find(t => t.employeeId === myProfile?.id && t.endTime === null);
            if (activeEntry) return { lead, activeEntry };
        }
        return null;
    }, [activeWorkerCases, myProfile]);

    const handleGlobalCheckIn = async () => {
        if (!selectedCheckInProject) {
            toast.error('Vælg venligst et projekt først!');
            return;
        }
        const leadToUpdate = activeWorkerCases.find(l => String(l.id) === String(selectedCheckInProject));
        if (!leadToUpdate) return;
        
        const now = new Date();
        const entry = {
            id: `time-${Date.now()}`,
            startTime: toHHMM(now),
            startedAt: now.toISOString(),   // robust tidsstempel — bruges til ur + timeberegning
            endTime: null,
            hours: 0,
            date: now.toISOString().substring(0, 10),
            desc: 'Aktiv tjek-ind (auto)',
            employeeId: myProfile?.id,
            employeeName: myProfile?.owner_name || myProfile?.company_name || myProfile?.email || 'Ukendt medarbejder'
        };
        
        try {
            await mutateTimeEntries({ table: 'leads', id: leadToUpdate.id, add: [entry] });
            toast.success('Du er nu tjekket ind!');
            setTimeout(() => window.location.reload(), 1000);
        } catch {
            toast.error('Fejl ved stempling.');
        }
    };

    const handleGlobalCheckOut = async () => {
        if (!activeCheckInInfo) return;

        const { lead, activeEntry } = activeCheckInInfo;
        const now = new Date();

        const entry = { ...activeEntry };
        entry.endTime = toHHMM(now);

        // Brutto-tid fra det robuste tidsstempel (falder tilbage på dato+klokkeslæt, kolon-sikret).
        const startMs = activeEntry.startedAt
            ? new Date(activeEntry.startedAt).getTime()
            : new Date(`${activeEntry.date}T${String(activeEntry.startTime || '').replace('.', ':')}`).getTime();
        let grossHours = (now.getTime() - startMs) / (1000 * 60 * 60);
        if (!isFinite(grossHours) || grossHours < 0) grossHours = 0;

        // Træk automatisk pause fra (firmaets regel) og afrund til kvarter.
        entry.pauseMinutes = suggestedBreakMinutes(grossHours, payrollCfg);
        entry.hours = computeNetHours(grossHours, payrollCfg);
        entry.desc = 'Arbejde udført (Tjek-ud)';

        try {
            // Atomisk: fjern den åbne registrering og tilføj den afsluttede i én operation.
            await mutateTimeEntries({ table: 'leads', id: lead.id, removeIds: [activeEntry.id], add: [entry] });
            toast.success('Tjekket ud! Timerne er nu gemt.');
            setTimeout(() => window.location.reload(), 1000);
        } catch {
            toast.error('Fejl ved udstempling.');
        }
    };

    const timeStats = useMemo(() => {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const monthStart = startOfMonth(now);

        let hoursThisWeek = 0;
        let hoursThisMonth = 0;

        leadsData.forEach(lead => {
            const timeEntries = lead.raw_data?.time_entries || [];
            
            timeEntries.forEach(entry => {
                if (entry.employeeId === myProfile?.id) {
                    const entryDate = new Date(entry.date);
                    const hours = Number(entry.hours || 0);
                    
                    if (isAfter(entryDate, monthStart) || isSameDay(entryDate, monthStart)) {
                        hoursThisMonth += hours;
                        if (isAfter(entryDate, weekStart) || isSameDay(entryDate, weekStart)) {
                            hoursThisWeek += hours;
                        }
                    }
                }
            });
        });

        return { hoursThisWeek, hoursThisMonth };
    }, [leadsData, myProfile]);


    // ---- NY LOGIK TIL COCKPIT (Manglende dage, etc.) ----
    const allEntries = useMemo(() => {
        let entries = [];
        (leadsData || []).forEach(lead => {
            const leadEntries = lead.raw_data?.time_entries || [];
            leadEntries.forEach(t => {
                if (t.employeeId === myProfile?.id) {
                    entries.push({ ...t, source: 'lead' });
                }
            });
        });

        const profileEntries = myProfile?.raw_data?.time_entries || [];
        profileEntries.forEach(t => {
            entries.push({ ...t, source: 'profile' });
        });

        return entries;
    }, [leadsData, myProfile]);

    const recentWorkDays = useMemo(() => {
        const today = new Date();
        const pastDays = eachDayOfInterval({
            start: subDays(today, 10), 
            end: today
        });
        
        const workDays = pastDays.filter(d => !isWeekend(d)).slice(-5);
        
        return workDays.map(date => {
            const hasTime = allEntries.some(entry => isSameDay(new Date(entry.date), date) && Number(entry.hours || 0) > 0);
            return {
                date,
                hasTime,
                isToday: isToday(date),
                label: isToday(date) ? 'I dag' : format(date, 'EEEE', { locale: da })
            };
        });
    }, [allEntries]);

    const hasMissingPastDays = recentWorkDays.some(d => !d.hasTime && !d.isToday);

    // Modal States
    const [activeModal, setActiveModal] = useState(null); // 'team', 'messages', 'cases', 'time'

    // --- Sags-beskeder (dagens huske-ting fra mester/projektleder) ---
    const [seenTick, setSeenTick] = useState(0);
    const myMessages = useMemo(() => getTodaysMessagesForUser(leadsData, myProfile?.id), [leadsData, myProfile]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const unseenMsgCount = useMemo(() => countUnseen(myMessages, getSeenSet()), [myMessages, seenTick]);
    const [showMsgPopup, setShowMsgPopup] = useState(false);
    const didAutoOpenRef = useRef(false);

    const markMyMessagesSeen = () => {
        markSeen(myMessages.map(m => m.id));
        setSeenTick(t => t + 1);
    };

    // Popper op ved første gang der er ulæste beskeder for i dag.
    useEffect(() => {
        if (didAutoOpenRef.current || !myMessages.length) return;
        didAutoOpenRef.current = true;
        if (countUnseen(myMessages, getSeenSet()) > 0) setShowMsgPopup(true);
    }, [myMessages]);

    // Fravær Logik
    const [selectedMissingDate, setSelectedMissingDate] = useState(null);
    const [absenceType, setAbsenceType] = useState('Syg');
    const [absenceHours, setAbsenceHours] = useState('7.5');

    const handleLogAbsence = async () => {
        if (!selectedMissingDate || !absenceHours || isNaN(absenceHours)) {
            toast.error('Udfyld venligst timer');
            return;
        }

        const newEntry = {
            id: `absence-${Date.now()}`,
            date: format(selectedMissingDate, 'yyyy-MM-dd'),
            hours: parseFloat(absenceHours),
            desc: `Internt: ${absenceType}`,
            absenceType: absenceType,
            employeeId: myProfile?.id,
            employeeName: myProfile?.owner_name || myProfile?.company_name || 'Medarbejder',
            startTime: '07:00',
            endTime: '15:00'
        };

        const currentProfileEntries = myProfile?.raw_data?.time_entries || [];
        const updatedEntries = [newEntry, ...currentProfileEntries];
        const newRawData = { ...(myProfile?.raw_data || {}), time_entries: updatedEntries };

        const { error } = await supabase.from('carpenters').update({ raw_data: newRawData }).eq('id', myProfile.id);

        if (error) {
            toast.error('Kunne ikke gemme fravær');
        } else {
            toast.success(`${absenceType} er registreret!`);
            setSelectedMissingDate(null);
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    // Tæller for aktiv timer
    const [activeTimerStr, setActiveTimerStr] = useState('00:00:00');
    useEffect(() => {
        if (!activeCheckInInfo) return;
        const ae = activeCheckInInfo.activeEntry;
        // Brug det robuste tidsstempel; fald tilbage på dato+klokkeslæt (kolon-sikret) for ældre stemplinger.
        const startTime = ae.startedAt
            ? new Date(ae.startedAt).getTime()
            : new Date(`${ae.date}T${String(ae.startTime || '').replace('.', ':')}`).getTime();
        if (!isFinite(startTime)) { setActiveTimerStr('00:00:00'); return; }

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const diff = now - startTime;
            if (diff < 0) return;
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            
            setActiveTimerStr(
                `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [activeCheckInInfo]);

    // ---- RENDER MODALS ----
    const renderModal = () => {
        if (!activeModal) return null;

        return createPortal(
            <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', paddingTop: 'max(24px, env(safe-area-inset-top, 40px))', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                        {activeModal === 'team' && 'Mit Team'}
                        {activeModal === 'messages' && 'Beskeder & Info'}
                        {activeModal === 'cases' && 'Mine Aktive Sager'}
                        {activeModal === 'time' && 'Timer & Fravær'}
                    </h2>
                    <button onClick={() => { setActiveModal(null); setSelectedMissingDate(null); }} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    
                    {/* TEAM MODAL */}
                    {activeModal === 'team' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', padding: '24px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    {myProfile?.avatar_url ? <img src={myProfile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/> : (myProfile?.owner_name || 'U').charAt(0)}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>{myProfile?.owner_name || myProfile?.company_name || 'Medarbejder'}</h3>
                                    <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '1rem' }}>
                                        {myProfile?.role === 'sales' ? 'Projektleder' : myProfile?.role === 'worker' ? 'Svend' : 'Lærling'}
                                    </p>
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <Users size={32} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                                <h4 style={{ margin: '0 0 8px', color: '#334155' }}>Dine Kollegaer</h4>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Team-overblik er i øjeblikket styret fra sagsniveau. Du kan se dine kollegaer inde på de specifikke sager, I er tildelt sammen.</p>
                            </div>
                        </div>
                    )}

                    {/* MESSAGES MODAL */}
                    {activeModal === 'messages' && (
                        myMessages.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', textAlign: 'center' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                    <MessageSquare size={32} color="#cbd5e1" />
                                </div>
                                <h3 style={{ margin: '0 0 8px', color: '#334155', fontSize: '1.2rem' }}>Ingen nye beskeder</h3>
                                <p style={{ margin: 0, maxWidth: '250px' }}>Du har læst alle interne beskeder. Tag en kop kaffe!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {myMessages.map(m => (
                                    <div key={m.id} style={{ background: m.forId ? '#fffbeb' : '#eff6ff', border: `1px solid ${m.forId ? '#fde68a' : '#bfdbfe'}`, borderRadius: '16px', padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: m.forId ? '#b45309' : '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                {m.forId ? 'Til dig' : 'Til holdet'} · {m.leadTitle}
                                            </span>
                                            {m.forId && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '999px' }}>Personlig</span>}
                                        </div>
                                        <p style={{ margin: '0 0 8px', fontSize: '1rem', color: '#0f172a', lineHeight: 1.5 }}>{m.text}</p>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            Fra {m.authorName}{m.authorRole ? ` · ${getRoleLabel(m.authorRole)}` : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* CASES MODAL */}
                    {activeModal === 'cases' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {activeWorkerCases.length === 0 ? (
                                <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '20px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                                    <p style={{ margin: 0, color: '#64748b' }}>Du har ingen aktive sager i dag.</p>
                                </div>
                            ) : (
                                activeWorkerCases.map((lead, idx) => {
                                    const title = lead.raw_data?.project_title || lead.project_category || 'Projekt';
                                    const caseNo = lead.case_number || String(lead.id).substring(0,6);
                                    const address = lead.customer_address || lead.raw_data?.customerDetails?.address;
                                    
                                    return (
                                        <div key={idx} style={{ background: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.05em' }}>SAG #{caseNo}</span>
                                                    <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '700' }}>{title}</h3>
                                                </div>
                                                <div style={{ padding: '6px 12px', background: '#ecfdf5', color: '#10b981', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>Aktiv</div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569', fontSize: '0.95rem' }}>
                                                    <Briefcase size={16} color="#94a3b8" />
                                                    <span>{lead.customer_name || 'Ukendt kunde'}</span>
                                                </div>
                                                {address && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569', fontSize: '0.95rem' }}>
                                                        <MapPin size={16} color="#94a3b8" />
                                                        <span>{address}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                                {address && (
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} 
                                                        target="_blank" rel="noopener noreferrer"
                                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#f1f5f9', color: '#3b82f6', borderRadius: '12px', textDecoration: 'none', fontWeight: '600' }}
                                                    >
                                                        <Navigation size={16} /> Vis Vej
                                                    </a>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        setActiveModal(null);
                                                        if (setTargetCaseId) setTargetCaseId(lead.id);
                                                        if (setActiveTab) setActiveTab('cases');
                                                    }}
                                                    style={{ flex: address ? 1 : 'none', width: address ? 'auto' : '100%', padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                >
                                                    Åbn Sag
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}

                    {/* TIME MODAL (Kalender & Manglende Timer) */}
                    {activeModal === 'time' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* Hurtig-Oversigt */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Denne Uge</span>
                                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{timeStats.hoursThisWeek.toFixed(1)} <span style={{fontSize: '1rem', color: '#94a3b8', fontWeight: '500'}}>t</span></div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Denne Måned</span>
                                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{timeStats.hoursThisMonth.toFixed(1)} <span style={{fontSize: '1rem', color: '#94a3b8', fontWeight: '500'}}>t</span></div>
                                </div>
                            </div>

                            {/* Fravær/Manglende Registrering Logik */}

                                <div style={{ background: hasMissingPastDays ? '#fef2f2' : '#f8fafc', padding: '24px', borderRadius: '20px', border: `1px solid ${hasMissingPastDays ? '#fecaca' : '#e2e8f0'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                        {hasMissingPastDays ? <AlertCircle size={24} color="#ef4444" /> : <CheckCircle2 size={24} color="#10b981" />}
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: hasMissingPastDays ? '#9f1239' : '#065f46', fontWeight: 'bold' }}>
                                            {hasMissingPastDays ? 'Hov! Du mangler at registrere timer' : 'Timeregistrering i top!'}
                                        </h3>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                        {recentWorkDays.map((day, idx) => {
                                            const isRed = !day.hasTime && !day.isToday;
                                            const isGreen = day.hasTime;
                                            
                                            return (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => { 
                                                        if (isRed) {
                                                            if (setActiveTab) setActiveTab('worker_timesheet');
                                                            setTimeout(() => {
                                                                window.dispatchEvent(new CustomEvent('open-add-timesheet', { detail: { date: format(day.date, 'yyyy-MM-dd') } }));
                                                            }, 100);
                                                        } 
                                                    }}
                                                    style={{ 
                                                        padding: '12px 4px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                                        background: isGreen ? '#ecfdf5' : isRed ? '#fff' : '#f1f5f9',
                                                        border: `1px solid ${isGreen ? '#a7f3d0' : isRed ? '#fca5a5' : '#cbd5e1'}`,
                                                        cursor: isRed ? 'pointer' : 'default',
                                                        boxShadow: isRed ? '0 4px 6px rgba(239,68,68,0.1)' : 'none'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: isGreen ? '#059669' : isRed ? '#dc2626' : '#64748b' }}>
                                                        {day.label.substring(0, 3)}
                                                    </span>
                                                    {isGreen ? <CheckCircle2 size={20} color="#10b981" /> : isRed ? <AlertCircle size={20} color="#ef4444" /> : <Clock size={20} color="#94a3b8" />}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    
                                    {hasMissingPastDays && (
                                        <p style={{ margin: '16px 0 0', fontSize: '0.85rem', color: '#ef4444', textAlign: 'center' }}>Tryk på en rød dag for at melde fravær (syg/ferie) eller gå til din timeregistrering og indtast arbejdstimer.</p>
                                    )}
                                </div>


                            <button 
                                onClick={() => {
                                    setActiveModal(null);
                                    if(setActiveTab) setActiveTab('worker_timesheet');
                                }}
                                style={{ width: '100%', padding: '16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                Gå til Fuld Timeregistrering
                            </button>
                        </div>
                    )}
                </div>
            </div>,
            document.body
        );
    };

    // ---- HOVED-LAYOUT (COCKPIT) ----
    return (
        <div style={{
            flex: 1, height: '100%', position: 'relative', zIndex: 10, 
            background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', padding: '20px 24px calc(90px + env(safe-area-inset-bottom, 20px)) 24px'
        }}>
            
            {/* TOP ROW: Widgets & Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', zIndex: 10 }}>
                {/* Top Left: Profil/Team */}
                <div onClick={() => setActiveModal('team')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>
                        <Users size={24} color="#3b82f6" />
                    </div>
                </div>

                {/* Header (Center) */}
                <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', fontWeight: '800' }}>
                        Hej {myProfile?.owner_name?.split(' ')[0] || 'Der'}!
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
                        Klar til at tage fat?
                    </p>
                </div>

                {/* Top Right: Messages */}
                <div onClick={() => { setActiveModal('messages'); markMyMessagesSeen(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.05)', position: 'relative' }}>
                        <MessageSquare size={24} color="#8b5cf6" />
                        {unseenMsgCount > 0 && (
                            <span style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: '20px', height: '20px', padding: '0 5px', borderRadius: '10px', background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(239,68,68,0.4)' }}>
                                {unseenMsgCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* MIDDLE ROW: THE BIG BUTTON */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', width: '100%', maxWidth: '300px', margin: '0 auto', flex: 1, zIndex: 20 }}>
                {activeCheckInInfo ? (
                    <>
                        <button 
                            onClick={handleGlobalCheckOut}
                            style={{ 
                                width: '220px', height: '220px', borderRadius: '50%', 
                                background: 'linear-gradient(145deg, #ef4444, #dc2626)',
                                border: 'none', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                boxShadow: '0 20px 40px rgba(239, 68, 68, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
                                cursor: 'pointer', animation: 'pulseRed 2s infinite cubic-bezier(0.4, 0, 0.6, 1)',
                                transition: 'transform 0.1s'
                            }}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Square size={48} fill="currentColor" />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Stop</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '900', marginTop: '8px', fontFamily: 'monospace' }}>{activeTimerStr}</span>
                            </div>
                        </button>
                        <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', textAlign: 'center', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>I gang med</p>
                            <h4 style={{ margin: '4px 0 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Sag {activeCheckInInfo.lead.case_number || String(activeCheckInInfo.lead.id).substring(0, 6)}
                                {(activeCheckInInfo.lead.raw_data?.project_title || activeCheckInInfo.lead.project_category) ? ` · ${activeCheckInInfo.lead.raw_data?.project_title || activeCheckInInfo.lead.project_category}` : ''}
                            </h4>
                            <div style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {activeCheckInInfo.lead.customer_name}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <button 
                            onClick={handleGlobalCheckIn}
                            style={{ 
                                width: '220px', height: '220px', borderRadius: '50%', 
                                background: 'linear-gradient(145deg, #10b981, #059669)',
                                border: 'none', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
                                cursor: 'pointer', transition: 'transform 0.1s'
                            }}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Play size={48} fill="currentColor" />
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Start</span>
                        </button>
                        
                        <div style={{ position: 'relative', width: '100%' }}>
                            <div 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                style={{ 
                                    padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', 
                                    background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)',
                                    fontSize: '1rem', color: selectedCheckInProject ? '#0f172a' : '#64748b', cursor: 'pointer',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.05)'
                                }}
                            >
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: selectedCheckInProject ? '700' : '500' }}>
                                    {selectedCheckInProject 
                                        ? (() => {
                                            const p = activeWorkerCases.find(l => String(l.id) === String(selectedCheckInProject));
                                            return p ? `${p.customer_name}` : 'Vælg projekt...';
                                        })()
                                        : 'Vælg projekt...'}
                                </span>
                                <ChevronDown size={20} style={{ color: '#94a3b8', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            </div>
                            
                            {isDropdownOpen && (
                                <div style={{ 
                                    position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '12px', 
                                    background: '#ffffff', borderRadius: '20px', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)', 
                                    border: '1px solid #f1f5f9', overflow: 'hidden', zIndex: 50, maxHeight: '250px', overflowY: 'auto'
                                }}>
                                    {activeWorkerCases.filter(l => l.status !== 'Historik').length === 0 ? (
                                        <div style={{ padding: '20px', color: '#64748b', textAlign: 'center' }}>Ingen aktive sager.</div>
                                    ) : (
                                        activeWorkerCases.filter(l => l.status !== 'Historik').map(lead => (
                                            <div 
                                                key={lead.id}
                                                onClick={() => { setSelectedCheckInProject(lead.id); setIsDropdownOpen(false); }}
                                                style={{ padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', color: '#0f172a' }}
                                            >
                                                <div style={{ fontWeight: '700' }}>{lead.customer_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Sag #{lead.case_number || String(lead.id).substring(0,6)}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* BOTTOM ROW: Widgets */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', zIndex: 10 }}>
                {/* Bottom Left: Cases */}
                <div onClick={() => setActiveModal('cases')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '24px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', position: 'relative' }}>
                        <Briefcase size={28} color="#0f172a" />
                        {activeWorkerCases.length > 0 && (
                            <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#0f172a', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #f8fafc' }}>
                                {activeWorkerCases.length}
                            </div>
                        )}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>Sager</span>
                </div>

                {/* Bottom Right: Time & Missing */}
                <div onClick={() => setActiveModal('time')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '24px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hasMissingPastDays ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 10px 20px rgba(0,0,0,0.05)', position: 'relative', animation: hasMissingPastDays ? 'pulseRed 2s infinite' : 'none' }}>
                        <Calendar size={28} color={hasMissingPastDays ? '#ef4444' : '#0f172a'} />
                        {hasMissingPastDays && (
                            <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #f8fafc' }} />
                        )}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: hasMissingPastDays ? '#ef4444' : '#475569' }}>Timer</span>
                </div>
            </div>

            {/* Modals are rendered here via portal */}
            {renderModal()}

            {/* Pop-up ved første åbning: dagens beskeder */}
            {showMsgPopup && myMessages.length > 0 && createPortal(
                <div onClick={() => { markMyMessagesSeen(); setShowMsgPopup(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 100002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={20} /></div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Beskeder til i dag</h3>
                        </div>
                        <div style={{ padding: '16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {myMessages.map(m => (
                                <div key={m.id} style={{ background: m.forId ? '#fffbeb' : '#eff6ff', border: `1px solid ${m.forId ? '#fde68a' : '#bfdbfe'}`, borderRadius: '14px', padding: '14px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: m.forId ? '#b45309' : '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{m.forId ? 'Til dig' : 'Til holdet'} · {m.leadTitle}</div>
                                    <p style={{ margin: '0 0 6px', fontSize: '1rem', color: '#0f172a', lineHeight: 1.5 }}>{m.text}</p>
                                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Fra {m.authorName}{m.authorRole ? ` · ${getRoleLabel(m.authorRole)}` : ''}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                            <button onClick={() => { markMyMessagesSeen(); setShowMsgPopup(false); }} style={{ width: '100%', padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>Forstået</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                @keyframes pulseRed {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
