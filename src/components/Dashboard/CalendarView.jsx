import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Clock, CheckCircle, MessageSquare, Plus, Users, X, Trash2, Truck, ChevronDown, Palmtree, Thermometer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import GorgeousMultiSelect from './GorgeousMultiSelect';

// ----------------- DANSKE HELLIGDAGE -----------------
const DANISH_HOLIDAYS_2026 = [
    '2026-01-01', // Nytårsdag
    '2026-04-02', // Skærtorsdag
    '2026-04-03', // Langfredag
    '2026-04-05', // Påskedag
    '2026-04-06', // 2. Påskedag
    '2026-05-14', // Kr. Himmelfartsdag
    '2026-05-24', // Pinsedag
    '2026-05-25', // 2. Pinsedag
    '2026-06-05', // Grundlovsdag
    '2026-12-24', // Juleaftensdag
    '2026-12-25', // 1. Juledag
    '2026-12-26', // 2. Juledag
];

const CalendarView = ({ leadsData, myProfile, simulatedRole, onCaseClick, setLeadsData, teamMembers = [], carpenterProfile, setCarpenterProfile }) => {
    const effectiveRole = simulatedRole || myProfile?.role;
    const isManager = ['admin', 'boss', 'accountant'].includes(effectiveRole);
    const userId = myProfile?.id;

    // States
    const [view, setView] = useState('month'); // 'month', 'week', 'year'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(['all']);


    
    // Drag and Drop & Modals
    const [draggedLead, setDraggedLead] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [popoverLead, setPopoverLead] = useState(null);
    const [collisionWarning, setCollisionWarning] = useState(null); // { lead, day, daysDuration }

    const [eventFormData, setEventFormData] = useState({
        title: '',
        type: 'Møde', // 'Møde' eller 'Levering'
        date: new Date().toISOString().substring(0,10),
        startTime: '10:00',
        endTime: '11:00',
        participants: ['all'] // 'all' eller array af userIds
    });

    // ----------------- DATA PREPARATION -----------------
    
    // 1. Relevante bygge-sager
    const relevantLeads = useMemo(() => {
        if (!leadsData) return [];
        return leadsData.filter(lead => {
            const status = lead.status || '';
            if (!['Bekræftet opgave', 'I gang', 'Sæt i bero', 'Afbrudt Sag'].includes(status)) return false;
            
            // Adgangskontrol
            if (!isManager && effectiveRole === 'sales') {
                if (!(lead.raw_data?.assigned_pm || []).includes(userId)) return false;
            } else if (!isManager) {
                if (!(lead.raw_data?.assigned_workers || []).includes(userId)) return false;
            }

            // Dropdown Filter (Hold)
            if (!selectedEmployeeIds.includes('all') && selectedEmployeeIds.length > 0) {
                const workers = lead.raw_data?.assigned_workers || [];
                const pms = lead.raw_data?.assigned_pm || [];
                if (!workers.some(w => selectedEmployeeIds.includes(String(w))) && !pms.some(p => selectedEmployeeIds.includes(String(p)))) return false;
            }

            return true;
        });
    }, [leadsData, isManager, effectiveRole, userId, selectedEmployeeIds]);

    const { scheduledLeads, unscheduledLeads } = useMemo(() => {
        const scheduled = [];
        const unscheduled = [];
        relevantLeads.forEach(lead => {
            if (lead.raw_data?.start_date) scheduled.push(lead);
            else unscheduled.push(lead);
        });
        return { scheduledLeads: scheduled, unscheduledLeads: unscheduled };
    }, [relevantLeads]);

    // 2. Fravær og Ferie (fra Timeregistrering)
    const allAbsences = useMemo(() => {
        let absences = [];
        const membersToCheck = selectedEmployeeIds.includes('all') ? teamMembers : teamMembers.filter(m => selectedEmployeeIds.includes(String(m?.id)));
        
        membersToCheck.forEach(member => {
            const timeEntries = member.raw_data?.time_entries || [];
            timeEntries.forEach(entry => {
                if (['Ferie', 'Sygdom', 'Skole'].includes(entry.absenceType)) {
                    absences.push({
                        ...entry,
                        employeeName: member.owner_name || member.company_name,
                        employeeId: member?.id
                    });
                }
            });
        });
        // Inkluder også egen profil hvis relevant
        if (selectedEmployeeIds.includes('all') || selectedEmployeeIds.includes(String(myProfile?.id))) {
            const myEntries = myProfile?.raw_data?.time_entries || [];
            myEntries.forEach(entry => {
                 if (['Ferie', 'Sygdom', 'Skole'].includes(entry.absenceType)) {
                    absences.push({
                        ...entry,
                        employeeName: myProfile.owner_name || myProfile.company_name,
                        employeeId: myProfile?.id
                    });
                 }
            });
        }
        return absences;
    }, [teamMembers, myProfile, selectedEmployeeIds]);

    // 3. Kalenderaftaler (Møder & Leveringer)
    const calendarEvents = useMemo(() => {
        const events = carpenterProfile?.raw_data?.calendar_events || [];
        if (selectedEmployeeIds.includes('all') || selectedEmployeeIds.length === 0) return events;
        return events.filter(e => e.participants.includes('all') || e.participants.some(p => selectedEmployeeIds.includes(String(p))));
    }, [carpenterProfile, selectedEmployeeIds]);


    // ----------------- CALENDAR HELPERS -----------------
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const startingEmptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mandag er 0

    const prevPeriod = () => {
        if (view === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        if (view === 'week') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
        if (view === 'year') setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
    };
    const nextPeriod = () => {
        if (view === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        if (view === 'week') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
        if (view === 'year') setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
    };

    const monthNames = ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'December'];

    // Tjek overlaps for en given dag
    const getItemsForDay = (checkDate) => {
        checkDate.setHours(0,0,0,0);
        
        // Fix timezone offset issue for toISOString locally
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const isHoliday = DANISH_HOLIDAYS_2026.includes(dateStr);

        const leads = scheduledLeads.filter(lead => {
            const start = new Date(lead.raw_data.start_date); start.setHours(0,0,0,0);
            const end = new Date(lead.raw_data.end_date); end.setHours(23,59,59,999);
            return checkDate >= start && checkDate <= end;
        });

        const absences = allAbsences.filter(a => {
            const d = new Date(a.date); d.setHours(0,0,0,0);
            return d.getTime() === checkDate.getTime();
        });

        const events = calendarEvents.filter(e => {
            const d = new Date(e.date); d.setHours(0,0,0,0);
            return d.getTime() === checkDate.getTime();
        });

        return { isHoliday, leads, absences, events };
    };

    // ----------------- ACTIONS -----------------

    const saveEvent = async (e) => {
        e.preventDefault();
        const newEvent = {
            id: `evt-${Date.now()}`,
            ...eventFormData
        };
        const updatedEvents = [...(carpenterProfile?.raw_data?.calendar_events || []), newEvent];
        const updatedRawData = { ...carpenterProfile.raw_data, calendar_events: updatedEvents };
        
        try {
            await supabase.from('carpenters').update({ raw_data: updatedRawData }).eq('id', carpenterProfile?.id);
            if (setCarpenterProfile) setCarpenterProfile({ ...carpenterProfile, raw_data: updatedRawData });
            toast.success('Aftale oprettet i kalenderen');
            setShowEventModal(false);
        } catch (error) {
            toast.error('Fejl ved oprettelse');
        }
    };

    const handleDropLead = (day) => {
        if (!draggedLead || !isManager) return;
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        
        // Find varighed
        let daysDuration = 1;
        if (draggedLead.raw_data?.start_date && draggedLead.raw_data?.end_date) {
             const s = new Date(draggedLead.raw_data.start_date);
             const e = new Date(draggedLead.raw_data.end_date);
             daysDuration = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
        } else {
             const laborHours = draggedLead.raw_data?.calc_data?.laborHours || 0;
             const weeks = Math.max(1, Math.ceil(laborHours / 37));
             daysDuration = weeks * 5;
        }

        // Tjek for ferie kollision
        const endDate = new Date(selectedDate);
        endDate.setDate(endDate.getDate() + daysDuration - 1);
        
        // Simpel kollisions-tjek: Har nogen team members på sagen ferie i perioden?
        let collisionFound = false;
        const assigned = draggedLead.raw_data?.assigned_workers || [];
        for (let d = new Date(selectedDate); d <= endDate; d.setDate(d.getDate() + 1)) {
             const abs = getItemsForDay(new Date(d)).absences;
             if (abs.some(a => assigned.includes(a.employeeId))) {
                 collisionFound = true;
                 break;
             }
        }

        if (collisionFound) {
             setCollisionWarning({ lead: draggedLead, selectedDate, endDate });
        } else {
             confirmScheduleLead(draggedLead, selectedDate, endDate);
        }
        setDraggedLead(null);
    };

    const confirmScheduleLead = async (lead, start, end) => {
        const updatedRawData = { ...lead.raw_data, start_date: start.toISOString(), end_date: end.toISOString() };
        const updatedLead = { ...lead, raw_data: updatedRawData };
        setLeadsData(prev => prev.map(l => l.id === lead?.id ? updatedLead : l));
        setCollisionWarning(null);
        try {
            await supabase.from('leads').update({ raw_data: updatedRawData }).eq('id', lead?.id);
            toast.success('Sag planlagt');
        } catch (error) {
            toast.error('Fejl ved gem kalenderdato');
        }
    };

    const removeLeadFromCalendar = async () => {
        if (!popoverLead) return;
        const updatedRawData = { ...popoverLead.raw_data };
        delete updatedRawData.start_date;
        delete updatedRawData.end_date;
        const updatedLead = { ...popoverLead.lead, raw_data: updatedRawData };
        
        setLeadsData(prev => prev.map(l => l.id === popoverLead?.lead?.id ? updatedLead : l));
        setPopoverLead(null);
        try {
            await supabase.from('leads').update({ raw_data: updatedRawData }).eq('id', popoverLead?.lead?.id);
            toast.success('Sag fjernet fra kalender');
        } catch (error) {
            toast.error('Fejl');
        }
    };

    const getStatusColor = (status) => {
        if (status === 'I gang') return { bg: '#dcfce7', border: '#86efac', text: '#166534' };
        if (status === 'Afbrudt Sag') return { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' }; // Rødlig
        if (status === 'Sæt i bero') return { bg: '#ffedd5', border: '#fdba74', text: '#c2410c' }; // Orange
        return { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3' }; // Bekræftet
    };

    // ----------------- RENDER VIEWS -----------------

    const renderMonthView = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                {/* Grid Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(day => (
                        <div key={day} style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid Body */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', flex: 1, gridAutoRows: 'minmax(130px, auto)' }}>
                    {Array.from({ length: startingEmptyCells }).map((_, idx) => (
                        <div key={`empty-${idx}`} style={{ background: 'rgba(241, 245, 249, 0.4)', borderRadius: '16px', border: '1px solid transparent' }} />
                    ))}
                    
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const day = idx + 1;
                        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                        const { isHoliday, leads, absences, events } = getItemsForDay(checkDate);

                        return (
                            <div 
                                key={day}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(226, 232, 240, 0.8)'; }}
                                onDragLeave={(e) => { e.currentTarget.style.background = isToday ? '#eff6ff' : (isHoliday ? '#f8fafc' : '#ffffff'); }}
                                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.background = isToday ? '#eff6ff' : (isHoliday ? '#f8fafc' : '#ffffff'); handleDropLead(day); }}
                                style={{ 
                                    background: isToday ? '#eff6ff' : (isHoliday ? '#f8fafc' : '#ffffff'), 
                                    borderRadius: '16px', 
                                    border: isToday ? '2px solid #3b82f6' : '1px solid #e2e8f0', 
                                    padding: '12px',
                                    display: 'flex', flexDirection: 'column', gap: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                                    transition: 'all 0.2s',
                                    opacity: isHoliday ? 0.7 : 1,
                                    overflow: 'hidden'
                                }}
                            >
                                <span style={{ fontWeight: isToday ? '800' : '600', color: isToday ? '#2563eb' : (isHoliday ? '#94a3b8' : '#64748b'), fontSize: '1.1rem' }}>
                                    {day} {isHoliday && <span style={{fontSize:'0.7rem', marginLeft:'4px'}}>Helligdag</span>}
                                </span>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                                    
                                    {/* MØDER & LEVERINGER */}
                                    {events.map(e => (
                                        <div key={e.id} style={{ background: e.type === 'Levering' ? '#fff7ed' : '#f0fdfa', border: `1px solid ${e.type === 'Levering' ? '#fdba74' : '#5eead4'}`, borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: '700', color: e.type === 'Levering' ? '#c2410c' : '#0f766e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {e.type === 'Levering' ? <Truck size={12}/> : <Clock size={12}/>}
                                            {e.startTime} - {e.title}
                                        </div>
                                    ))}

                                    {/* FRAVÆR */}
                                    {absences.map((a, i) => (
                                        <div key={`abs-${i}`} style={{ background: a.absenceType === 'Sygdom' ? '#fef2f2' : '#fff7ed', border: `1px solid ${a.absenceType === 'Sygdom' ? '#fca5a5' : '#fed7aa'}`, borderRadius: '8px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: '700', color: a.absenceType === 'Sygdom' ? '#dc2626' : '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {a.absenceType === 'Sygdom' ? <Thermometer size={12}/> : <Palmtree size={12}/>}
                                            {a.absenceType}: {a.employeeName?.split(' ')[0]}
                                        </div>
                                    ))}

                                    {/* SAGER */}
                                    {leads.map(lead => {
                                        const colors = getStatusColor(lead.status);
                                        const isStartDay = new Date(lead.raw_data.start_date).getDate() === day;
                                        return (
                                            <div 
                                                key={lead.id}
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setPopoverLead({ lead, x: rect.left, y: rect.top });
                                                }}
                                                draggable={isManager}
                                                onDragStart={() => setDraggedLead(lead)}
                                                style={{
                                                    background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '6px 8px', fontSize: '0.75rem', fontWeight: '700', color: colors.text, cursor: 'pointer',
                                                    borderLeft: isStartDay ? `4px solid ${colors.text}` : `1px solid ${colors.border}`,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {lead.case_number || String(lead.id).substring(0,6)}: {lead.raw_data?.project_title || lead.project_category}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        // Find mandag i denne uge
        const d = new Date(currentDate);
        const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
        d.setDate(d.getDate() - day);

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', flex: 1, height: '100%', overflowY: 'auto' }}>
                {Array.from({ length: 7 }).map((_, idx) => {
                    const checkDate = new Date(d);
                    checkDate.setDate(d.getDate() + idx);
                    const isToday = new Date().getDate() === checkDate.getDate() && new Date().getMonth() === checkDate.getMonth();
                    const { isHoliday, leads, absences, events } = getItemsForDay(checkDate);

                    return (
                        <div key={idx} style={{ background: isToday ? '#eff6ff' : '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ textAlign: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>{['Man','Tir','Ons','Tor','Fre','Lør','Søn'][idx]}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: isToday ? '#2563eb' : '#0f172a' }}>{checkDate.getDate()}</div>
                                {isHoliday && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Helligdag</div>}
                            </div>
                            
                            {/* "Hele dagen" Sager i toppen */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {leads.map(lead => {
                                    const colors = getStatusColor(lead.status);
                                    return (
                                        <div key={lead.id} onClick={() => onCaseClick(lead)} style={{ background: colors.bg, borderRadius: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: '700', color: colors.text, cursor: 'pointer' }}>
                                            {lead.case_number} - {lead.project_category}
                                        </div>
                                    )
                                })}
                            </div>
                            
                            {/* Fravær */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {absences.map((a, i) => (
                                    <div key={`abs-${i}`} style={{ background: a.absenceType === 'Sygdom' ? '#fef2f2' : '#fff7ed', border: `1px solid ${a.absenceType === 'Sygdom' ? '#fca5a5' : '#fed7aa'}`, borderRadius: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: '700', color: a.absenceType === 'Sygdom' ? '#dc2626' : '#ea580c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {a.absenceType === 'Sygdom' ? <Thermometer size={14}/> : <Palmtree size={14}/>}
                                        {a.absenceType}: {a.employeeName?.split(' ')[0]}
                                    </div>
                                ))}
                            </div>

                            {/* Tidsbestemte Møder under */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                {events.map(e => (
                                    <div key={e.id} style={{ background: e.type==='Levering'?'#fff7ed':'#f0fdfa', borderLeft: `4px solid ${e.type==='Levering'?'#f97316':'#14b8a6'}`, borderRadius: '0 8px 8px 0', padding: '8px', fontSize: '0.8rem' }}>
                                        <strong>{e.startTime}</strong><br/>{e.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderYearView = () => {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', flex: 1, overflowY: 'auto', padding: '4px' }}>
                {Array.from({ length: 12 }).map((_, mIdx) => {
                    return (
                        <div key={mIdx} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
                            <h4 style={{ margin: '0 0 12px', textAlign: 'center', color: '#0f172a' }}>{monthNames[mIdx]}</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {Array.from({ length: new Date(currentDate.getFullYear(), mIdx + 1, 0).getDate() }).map((_, dIdx) => {
                                    const d = new Date(currentDate.getFullYear(), mIdx, dIdx + 1);
                                    const items = getItemsForDay(d);
                                    let color = '#f1f5f9';
                                    if (items.isHoliday) color = '#e2e8f0';
                                    if (items.absences.length > 0) color = '#fed7aa';
                                    if (items.leads.length > 0) color = '#93c5fd';
                                    if (items.leads.length > 2) color = '#3b82f6'; // Travl
                                    
                                    return <div key={dIdx} style={{ width: '12px', height: '12px', borderRadius: '3px', background: color }} title={`${dIdx+1}. ${monthNames[mIdx]}`} />
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', gap: '24px', height: 'calc(100vh - 80px)', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Kalender Main Area */}
            <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', padding: '32px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Header Row 1: Titel og Filter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
                            {view === 'year' ? currentDate.getFullYear() : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                        </h2>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* Medarbejder Filter */}
                        <GorgeousMultiSelect 
                            options={[
                                { id: myProfile?.id, name: myProfile?.owner_name || myProfile?.company_name || 'Mig', isMe: true },
                                ...teamMembers.filter(m => String(m.id) !== String(myProfile?.id)).map(m => ({
                                    id: m.id,
                                    name: m.owner_name || m.company_name || 'Ukendt',
                                    isMe: false
                                }))
                            ]}
                            selectedIds={selectedEmployeeIds}
                            onChange={setSelectedEmployeeIds}
                        />

                        {/* + Ny Aftale */}
                        {isManager && (
                            <button onClick={() => setShowEventModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', background: '#0f172a', color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'none'}>
                                <Plus size={18} /> Ny Aftale
                            </button>
                        )}
                    </div>
                </div>

                {/* Header Row 2: View Toggles & Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                        {['month', 'week', 'year'].map(v => (
                            <button 
                                key={v}
                                onClick={() => setView(v)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: view === v ? '#fff' : 'transparent', color: view === v ? '#0f172a' : '#64748b', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: view === v ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', textTransform: 'capitalize' }}
                            >
                                {v === 'month' ? 'Måned' : v === 'week' ? 'Uge' : 'År'}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={prevPeriod} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentDate(new Date())} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: '600', cursor: 'pointer' }}>I dag</button>
                        <button onClick={nextPeriod} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight size={20}/></button>
                    </div>
                </div>

                {/* Grid */}
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'year' && renderYearView()}

            </div>

            {/* Sidebar for Ikke-planlagte sager */}
            {isManager && (
                <div style={{ width: '340px', background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: '800' }}>Klar til planlægning</h3>
                    <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#64748b' }}>Træk ind i kalenderen.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                        {unscheduledLeads.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8' }}>Ingen sager venter.</p>
                        ) : (
                            unscheduledLeads.map(lead => (
                                <div 
                                    key={lead.id} draggable onDragStart={() => setDraggedLead(lead)}
                                    style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', cursor: 'grab', display: 'flex', flexDirection: 'column', gap: '8px' }}
                                >
                                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', alignSelf: 'flex-start' }}>{lead.case_number || String(lead.id).substring(0,6)}</span>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>{lead.raw_data?.project_title || lead.project_category}</h4>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* POPOVER TIL SAG I KALENDER */}
            {popoverLead && createPortal(
                <div onClick={() => setPopoverLead(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
                    <div 
                        onClick={e => e.stopPropagation()}
                        style={{ position: 'absolute', top: popoverLead.y + 30, left: popoverLead.x, background: '#fff', borderRadius: '12px', padding: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}
                    >
                        <button onClick={() => { onCaseClick(popoverLead.lead); setPopoverLead(null); }} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#0f172a' }} onMouseOver={e=>e.currentTarget.style.background='#f1f5f9'} onMouseOut={e=>e.currentTarget.style.background='none'}>Gå til Ordrestyring</button>
                        {isManager && <button onClick={removeLeadFromCalendar} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#ef4444' }} onMouseOver={e=>e.currentTarget.style.background='#fef2f2'} onMouseOut={e=>e.currentTarget.style.background='none'}>Fjern fra kalender</button>}
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL: KOLLISION MED FERIE */}
            {collisionWarning && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }}>
                    <div style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                        <AlertCircle size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.25rem' }}>Ferie kollision!</h3>
                        <p style={{ margin: '0 0 24px', color: '#64748b' }}>En eller flere medarbejdere på denne sag har registreret fravær/ferie i den valgte periode.</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setCollisionWarning(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Annuller</button>
                            <button onClick={() => confirmScheduleLead(collisionWarning.lead, collisionWarning.selectedDate, collisionWarning.endDate)} style={{ flex: 1, padding: '12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Placer alligevel</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL: NY AFTALE */}
            {showEventModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }}>
                    <div style={{ width: '100%', maxWidth: '500px', background: '#fff', borderRadius: '16px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Opret Kalenderaftale</h3>
                            <button onClick={() => setShowEventModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X/></button>
                        </div>
                        <form onSubmit={saveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input required placeholder="Titel (fx Internt Møde, Gipslevering)" value={eventFormData.title} onChange={e=>setEventFormData({...eventFormData, title: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            {/* Type knapper */}
                            <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '12px' }}>
                                <button type="button" onClick={() => setEventFormData({...eventFormData, type: 'Møde'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: eventFormData.type === 'Møde' ? '#fff' : 'transparent', color: eventFormData.type === 'Møde' ? '#0f172a' : '#64748b', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: eventFormData.type === 'Møde' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Users size={16} /> Internt / Kundemøde
                                </button>
                                <button type="button" onClick={() => setEventFormData({...eventFormData, type: 'Levering'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: eventFormData.type === 'Levering' ? '#fff' : 'transparent', color: eventFormData.type === 'Levering' ? '#0f172a' : '#64748b', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: eventFormData.type === 'Levering' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Truck size={16} /> Materialelevering
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input type="date" required value={eventFormData.date} onChange={e=>setEventFormData({...eventFormData, date: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: 1 }} />
                                <input type="time" required value={eventFormData.startTime} onChange={e=>setEventFormData({...eventFormData, startTime: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100px' }} />
                            </div>

                            {/* Deltagere - Modern Chips */}
                            <div>
                                <p style={{ margin: '0 0 8px', fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>Deltagere:</p>
                                <GorgeousMultiSelect 
                                    options={[
                                        { id: myProfile?.id, name: myProfile?.owner_name || myProfile?.company_name || 'Mig', isMe: true },
                                        ...teamMembers.filter(m => String(m.id) !== String(myProfile?.id)).map(m => ({
                                            id: m.id,
                                            name: m.owner_name || m.company_name || 'Ukendt',
                                            isMe: false
                                        }))
                                    ]}
                                    selectedIds={eventFormData.participants}
                                    onChange={(newIds) => setEventFormData({...eventFormData, participants: newIds.includes('all') ? ['all'] : newIds})}
                                />
                            </div>

                            <button type="submit" style={{ padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>Gem Aftale</button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CalendarView;
