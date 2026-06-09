import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Clock, CheckCircle, MessageSquare, Plus, Users, X, Trash2, Truck, ChevronDown, Palmtree, Thermometer, Briefcase, Coffee, PartyPopper, Search, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import GorgeousMultiSelect from './GorgeousMultiSelect';
import GorgeousSingleSelect from './GorgeousSingleSelect';

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

    // Define event types
    const EVENT_TYPES = [
        { id: 'Internt Møde', name: 'Internt Møde', icon: Users },
        { id: 'Kundemøde', name: 'Kundemøde', icon: Briefcase },
        { id: 'Materialelevering', name: 'Materialelevering', icon: Truck },
        { id: 'Firmaarrangement', name: 'Firmaarrangement', icon: PartyPopper },
        { id: 'Andet', name: 'Andet', icon: Coffee }
    ];

    const NOTIFICATION_PREFERENCES = [
        { id: 'none', name: 'Ingen påmindelse', icon: BellOff },
        { id: '1_hour', name: '1 time før', icon: Clock },
        { id: 'day_before', name: 'Dagen før', icon: CalendarIcon },
        { id: 'both', name: 'Begge dele', icon: Bell }
    ];

    const getEventStyle = (type) => {
        if (type === 'Materialelevering') return { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', leftBorder: '#f97316', icon: Truck };
        if (type === 'Kundemøde') return { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', leftBorder: '#0284c7', icon: Briefcase };
        if (type === 'Firmaarrangement') return { bg: '#fdf4ff', border: '#f0abfc', text: '#a21caf', leftBorder: '#d946ef', icon: PartyPopper };
        if (type === 'Andet') return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', leftBorder: '#94a3b8', icon: Coffee };
        return { bg: '#f0fdfa', border: '#5eead4', text: '#0f766e', leftBorder: '#14b8a6', icon: Users }; // Internt Møde fallback
    };

    // States
    const [view, setView] = useState('month');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [selectedMobileDate, setSelectedMobileDate] = useState(new Date());
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []); // 'month', 'week', 'year'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(['all']);


    
    // Drag and Drop & Modals
    const [draggedLead, setDraggedLead] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [popoverLead, setPopoverLead] = useState(null);
    const [collisionWarning, setCollisionWarning] = useState(null); // { lead, day, daysDuration }

    const [eventFormData, setEventFormData] = useState({
        title: '',
        type: 'Internt Møde', // 'Internt Møde', 'Kundemøde', 'Materialelevering'
        date: new Date().toISOString().substring(0,10),
        startTime: '10:00',
        endTime: '11:00',
        participants: ['all'],
        selectedLeadId: '', // For Materialelevering
        notification_preference: 'day_before'
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [hoverTooltip, setHoverTooltip] = useState(null); // { x, y, content }

    const openModalForDate = (dateObj) => {
        if (!isManager) return;
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        
        setEventFormData({
            title: '',
            type: 'Internt Møde',
            date: `${year}-${month}-${day}`,
            startTime: '10:00',
            endTime: '11:00',
            participants: ['all'],
            selectedLeadId: '',
            notification_preference: 'day_before'
        });
        setShowEventModal(true);
    };

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

        let leads = scheduledLeads.filter(lead => {
            const start = new Date(lead.raw_data.start_date); start.setHours(0,0,0,0);
            const end = new Date(lead.raw_data.end_date); end.setHours(23,59,59,999);
            return checkDate >= start && checkDate <= end;
        });

        let absences = allAbsences.filter(a => {
            const d = new Date(a.date); d.setHours(0,0,0,0);
            return d.getTime() === checkDate.getTime();
        });

        let events = calendarEvents.filter(e => {
            const d = new Date(e.date); d.setHours(0,0,0,0);
            return d.getTime() === checkDate.getTime();
        });

        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            leads = leads.filter(l => (l.case_number?.toLowerCase().includes(term) || l.project_category?.toLowerCase().includes(term) || l.raw_data?.project_title?.toLowerCase().includes(term)));
            absences = absences.filter(a => a.employeeName?.toLowerCase().includes(term) || a.absenceType?.toLowerCase().includes(term));
            events = events.filter(e => e.title?.toLowerCase().includes(term) || e.type?.toLowerCase().includes(term));
        }

        return { isHoliday, leads, absences, events };
    };

    // ----------------- ACTIONS -----------------

    const saveEvent = async (e) => {
        e.preventDefault();
        
        let finalParticipants = [...eventFormData.participants];
        let finalTitle = eventFormData.title;

        if (eventFormData.type === 'Materialelevering' && eventFormData.selectedLeadId) {
            const lead = relevantLeads.find(l => String(l.id) === String(eventFormData.selectedLeadId));
            if (lead) {
                const workers = lead.raw_data?.assigned_workers || [];
                const pms = lead.raw_data?.assigned_pm || [];
                finalParticipants = [...new Set([...workers, ...pms])];
                if (finalParticipants.length === 0) finalParticipants = ['all'];
                
                if (!finalTitle.includes(lead.project_category)) {
                    finalTitle = `Levering: ${lead.project_category} (${lead.case_number || String(lead.id).substring(0,6)}) - ${finalTitle}`;
                }
            }
        }

        const newEvent = {
            id: `evt-${Date.now()}`,
            title: finalTitle,
            type: eventFormData.type,
            date: eventFormData.date,
            startTime: eventFormData.startTime,
            endTime: eventFormData.endTime,
            participants: finalParticipants,
            relatedLeadId: eventFormData.selectedLeadId || null,
            notification_preference: eventFormData.notification_preference || 'day_before'
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
        
        // Simpel kollisions-tjek: Har nogen team members på sagen ferie i perioden, eller er der andre sager?
        let collisionFound = false;
        const assigned = draggedLead.raw_data?.assigned_workers || [];
        for (let d = new Date(selectedDate); d <= endDate; d.setDate(d.getDate() + 1)) {
             const items = getItemsForDay(new Date(d));
             if (items.absences.some(a => assigned.includes(a.employeeId))) {
                 collisionFound = true;
                 break;
             }
             if (items.leads.filter(l => l.id !== draggedLead.id).length > 0) {
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


    const renderMobileMonthView = () => {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', height: '100vh', overflowY: 'auto', paddingBottom: '100px' }}>
                
                {/* Mobile Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={prevPeriod} style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <ChevronLeft size={24} color="#0f172a" />
                        </button>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#0f172a', textTransform: 'capitalize' }}>
                            {format(currentDate, 'MMMM yyyy', { locale: da })}
                        </h2>
                        <button onClick={nextPeriod} style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <ChevronRight size={24} color="#0f172a" />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        {/* Søg (fiktiv knap pt.) */}
                        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><Search size={22} color="#0f172a" /></button>
                        {/* Tilføj aftale */}
                        {isManager && (
                            <button onClick={() => openModalForDate(selectedMobileDate)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                <Plus size={24} color="#0f172a" strokeWidth={3} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Grid */}
                <div style={{ padding: '0 16px' }}>
                    {/* Ugedage */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
                        {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((day, idx) => (
                            <div key={idx} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>{day}</div>
                        ))}
                    </div>

                    {/* Dage */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {Array.from({ length: startingEmptyCells }).map((_, idx) => (
                            <div key={`empty-${idx}`} style={{ aspectRatio: '1' }} />
                        ))}
                        
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                            const day = idx + 1;
                            const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                            const isSelected = selectedMobileDate.getDate() === day && selectedMobileDate.getMonth() === currentDate.getMonth() && selectedMobileDate.getFullYear() === currentDate.getFullYear();
                            const { isHoliday, leads, absences, events } = getItemsForDay(checkDate);

                            let hasDot = leads.length > 0 || absences.length > 0 || events.length > 0;
                            let dotColor = '#94a3b8';
                            if (leads.length > 0) dotColor = '#10b981';
                            if (absences.length > 0) dotColor = '#f59e0b';
                            if (events.length > 0 && leads.length === 0 && absences.length === 0) dotColor = '#3b82f6';
                            if (isHoliday) dotColor = '#ef4444';

                            return (
                                <div key={day} onClick={() => setSelectedMobileDate(checkDate)} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '8px', cursor: 'pointer', position: 'relative' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? '#2563eb' : (isToday ? '#eff6ff' : 'transparent'), color: isSelected ? '#fff' : (isToday ? '#2563eb' : (isHoliday ? '#ef4444' : '#0f172a')), fontWeight: isSelected || isToday ? '800' : '600', fontSize: '1rem', transition: 'all 0.2s' }}>
                                        {day}
                                    </div>
                                    {(hasDot || isHoliday) && (
                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? '#bfdbfe' : dotColor, position: 'absolute', bottom: '6px' }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ height: '1px', background: '#e2e8f0', margin: '16px 0' }} />

                {/* Mobile Agenda List */}
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', textTransform: 'capitalize' }}>
                            {format(selectedMobileDate, 'EEEE d. MMM', { locale: da })}
                        </h3>
                    </div>

                    {(() => {
                        const { events, absences, leads, isHoliday } = getItemsForDay(selectedMobileDate);
                        const hasAny = events.length > 0 || absences.length > 0 || leads.length > 0 || isHoliday;
                        
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {!hasAny && (
                                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>Ingen planlagte aktiviteter</p>
                                    </div>
                                )}
                                
                                {isHoliday && (
                                    <div style={{ background: '#f1f5f9', borderLeft: '4px solid #94a3b8', padding: '12px 16px', borderRadius: '12px', fontWeight: 'bold', color: '#475569' }}>
                                        Helligdag
                                    </div>
                                )}

                                {absences.map((a, i) => (
                                    <div key={`abs-${i}`} style={{ background: a.absenceType === 'Sygdom' ? '#fef2f2' : '#fff7ed', borderLeft: `4px solid ${a.absenceType === 'Sygdom' ? '#ef4444' : '#f97316'}`, padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {a.absenceType === 'Sygdom' ? <Thermometer size={20} color="#ef4444"/> : <Palmtree size={20} color="#f97316"/>}
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.95rem' }}>{a.absenceType}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{a.employeeName}</div>
                                        </div>
                                    </div>
                                ))}

                                {events.map(e => {
                                    const style = getEventStyle(e.type);
                                    const Icon = style.icon;
                                    return (
                                        <div key={e.id} style={{ background: style.bg, borderLeft: `4px solid ${style.leftBorder}`, padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ background: 'white', padding: '6px', borderRadius: '50%', color: style.text, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Icon size={18}/></div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 'bold', color: style.text, fontSize: '0.95rem' }}>{e.type}</div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>{e.startTime}</div>
                                                </div>
                                                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px', fontSize: '0.95rem' }}>{e.title}</div>
                                            </div>
                                        </div>
                                    )
                                })}

                                {leads.map(lead => {
                                    const colors = getStatusColor(lead.status);
                                    return (
                                        <div key={lead.id} onClick={() => onCaseClick(lead)} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.bg}`, padding: '12px 16px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px' }}>Sag: {lead.case_number || String(lead.id).substring(0,6)}</span>
                                                <span style={{ fontSize: '0.8rem', color: colors.text, fontWeight: 600 }}>{lead.status}</span>
                                            </div>
                                            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.95rem' }}>{lead.raw_data.project_title || lead.project_category}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        );
                    })()}
                </div>
            </div>
        );
    };

    // ----------------- RENDER VIEWS -----------------


    const renderMonthView = () => {
        return (
            <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflowX: 'auto' }}>
                <div style={{ minWidth: '900px', display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '16px' }}>
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
                                onClick={() => openModalForDate(checkDate)}
                                onMouseOver={e=> { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                onMouseOut={e=> { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = isToday ? '#3b82f6' : '#e2e8f0'; }}
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
                                    {events.map(e => {
                                        const style = getEventStyle(e.type);
                                        const Icon = style.icon;
                                        return (
                                            <div key={e.id} onClick={(evt) => evt.stopPropagation()} 
                                                onMouseEnter={(evt) => { const rect = evt.currentTarget.getBoundingClientRect(); setHoverTooltip({ x: rect.left + rect.width/2, y: rect.top, content: `${e.type}: ${e.title} (${e.startTime})` }); }}
                                                onMouseLeave={() => setHoverTooltip(null)}
                                                style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: '700', color: style.text, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Icon size={12}/>
                                                {e.startTime} - {e.title}
                                            </div>
                                        )
                                    })}

                                    {/* FRAVÆR */}
                                    {absences.map((a, i) => (
                                        <div key={`abs-${i}`} 
                                            onMouseEnter={(evt) => { const rect = evt.currentTarget.getBoundingClientRect(); setHoverTooltip({ x: rect.left + rect.width/2, y: rect.top, content: `${a.absenceType}: ${a.employeeName}` }); }}
                                            onMouseLeave={() => setHoverTooltip(null)}
                                            style={{ background: a.absenceType === 'Sygdom' ? '#fef2f2' : '#fff7ed', border: `1px solid ${a.absenceType === 'Sygdom' ? '#fca5a5' : '#fed7aa'}`, borderRadius: '8px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: '700', color: a.absenceType === 'Sygdom' ? '#dc2626' : '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setPopoverLead({ lead, x: rect.left, y: rect.top });
                                                }}
                                                onMouseEnter={(evt) => { const rect = evt.currentTarget.getBoundingClientRect(); setHoverTooltip({ x: rect.left + rect.width/2, y: rect.top, content: `Sag: ${lead.project_category} (${lead.case_number || 'Ny'})` }); }}
                                                onMouseLeave={() => setHoverTooltip(null)}
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
            </div>
        );
    };

    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Mandag er 1
        startOfWeek.setDate(diff);

        return (
            <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflowX: 'auto' }}>
                <div style={{ minWidth: '900px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', height: '100%', paddingBottom: '16px' }}>
                    {Array.from({ length: 7 }).map((_, idx) => {
                    const checkDate = new Date(startOfWeek);
                    checkDate.setDate(startOfWeek.getDate() + idx);
                    const isToday = new Date().getDate() === checkDate.getDate() && new Date().getMonth() === checkDate.getMonth();
                    const { isHoliday, leads, absences, events } = getItemsForDay(checkDate);

                    return (
                        <div key={idx} onClick={() => openModalForDate(checkDate)} style={{ background: isToday ? '#eff6ff' : '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: isManager ? 'pointer' : 'default', transition: 'all 0.2s' }}
                            onMouseOver={e=> { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                            onMouseOut={e=> { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
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
                                        <div key={lead.id} onClick={(e) => { e.stopPropagation(); onCaseClick(lead); }} style={{ background: colors.bg, borderRadius: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: '700', color: colors.text, cursor: 'pointer' }}>
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
                                {events.map(e => {
                                    const style = getEventStyle(e.type);
                                    return (
                                        <div key={e.id} onClick={(evt) => evt.stopPropagation()} style={{ background: style.bg, borderLeft: `4px solid ${style.leftBorder}`, borderRadius: '0 8px 8px 0', padding: '8px', fontSize: '0.8rem' }}>
                                            <strong>{e.startTime}</strong><br/>{e.title}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>
        );
    };

    const renderYearView = () => {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', flex: 1, overflowY: 'auto', padding: '4px' }}>
                {Array.from({ length: 12 }).map((_, mIdx) => {
                    return (
                        <div 
                            key={mIdx} 
                            onClick={() => { setView('month'); setCurrentDate(new Date(currentDate.getFullYear(), mIdx, 1)); }}
                            style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={e=> { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 25px -5px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                            onMouseOut={e=> { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                            <h4 style={{ margin: '0 0 12px', textAlign: 'center', color: '#0f172a' }}>{monthNames[mIdx]}</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {Array.from({ length: new Date(currentDate.getFullYear(), mIdx + 1, 0).getDate() }).map((_, dIdx) => {
                                    const d = new Date(currentDate.getFullYear(), mIdx, dIdx + 1);
                                    const items = getItemsForDay(d);
                                    let color = '#f1f5f9';
                                    if (items.isHoliday) color = '#e2e8f0';
                                    if (items.absences.length > 0) color = '#fed7aa';
                                    if (items.leads.length > 0) color = getStatusColor(items.leads[0].status).bg;
                                    if (items.events.length > 0 && items.leads.length === 0) color = '#bae6fd';
                                    if (items.leads.length > 2) color = '#3b82f6'; // Travl
                                    
                                    return <div key={dIdx} onClick={(e) => { e.stopPropagation(); openModalForDate(d); }} style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, cursor: isManager ? 'pointer' : 'default' }} title={`${dIdx+1}. ${monthNames[mIdx]}`} />
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        );
    };

    return (
        <>
            {isMobile ? renderMobileMonthView() : (
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
                        {/* Søge felt */}
                        <div style={{ position: 'relative' }}>
                            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text" 
                                placeholder="Søg i kalender..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: '10px 12px 10px 36px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', outline: 'none', width: '220px', transition: 'all 0.2s', fontWeight: '500' }}
                                onFocus={e=>e.target.style.borderColor='#3b82f6'}
                                onBlur={e=>e.target.style.borderColor='#e2e8f0'}
                            />
                        </div>

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
                                onMouseOver={e=> { if(view !== v) e.currentTarget.style.color = '#0f172a'; }}
                                onMouseOut={e=> { if(view !== v) e.currentTarget.style.color = '#64748b'; }}
                            >
                                {v === 'month' ? 'Måned' : v === 'week' ? 'Uge' : 'År'}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={prevPeriod} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='#f8fafc'} onMouseOut={e=>e.currentTarget.style.background='#fff'}><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentDate(new Date())} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='#f8fafc'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>I dag</button>
                        <button onClick={nextPeriod} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='#f8fafc'} onMouseOut={e=>e.currentTarget.style.background='#fff'}><ChevronRight size={20}/></button>
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
                            {/* Type knapper erstattet af GorgeousSingleSelect */}
                            <div style={{ zIndex: 2000, position: 'relative' }}>
                                <GorgeousSingleSelect
                                    options={EVENT_TYPES}
                                    selectedId={eventFormData.type}
                                    onChange={(newType) => setEventFormData({...eventFormData, type: newType})}
                                    placeholder="Vælg type"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input type="date" required value={eventFormData.date} onChange={e=>setEventFormData({...eventFormData, date: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: 1 }} />
                                <input type="time" required value={eventFormData.startTime} onChange={e=>setEventFormData({...eventFormData, startTime: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100px' }} />
                            </div>
                            
                            <div style={{ zIndex: 1900, position: 'relative' }}>
                                <GorgeousSingleSelect
                                    options={NOTIFICATION_PREFERENCES}
                                    selectedId={eventFormData.notification_preference}
                                    onChange={(newPref) => setEventFormData({...eventFormData, notification_preference: newPref})}
                                    placeholder="Påmindelse"
                                />
                            </div>

                            {eventFormData.type === 'Materialelevering' ? (
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>Vælg Sag (Projekt):</p>
                                    <div style={{ zIndex: 1000, position: 'relative' }}>
                                        <GorgeousSingleSelect
                                            options={relevantLeads.map(lead => ({
                                                id: lead.id,
                                                name: `${lead.case_number || String(lead.id).substring(0,6)} - ${lead.raw_data?.project_title || lead.project_category}`
                                            }))}
                                            selectedId={eventFormData.selectedLeadId}
                                            onChange={(newId) => setEventFormData({...eventFormData, selectedLeadId: newId})}
                                            placeholder="-- Vælg en sag --"
                                            showSearch={true}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px', background: '#eff6ff', padding: '12px', borderRadius: '8px' }}>
                                        <AlertCircle size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e3a8a', lineHeight: '1.4' }}>De håndværkere og byggeledere, der er tilknyttet denne sag, bliver automatisk sat som deltagere for materialeleveringen.</p>
                                    </div>
                                </div>
                            ) : (
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
                            )}

                            <button type="submit" style={{ padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>Gem Aftale</button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Hover Tooltip */}
            <AnimatePresence>
                {hoverTooltip && createPortal(
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{ position: 'fixed', left: hoverTooltip.x, top: hoverTooltip.y - 10, transform: 'translate(-50%, -100%)', background: '#0f172a', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', pointerEvents: 'none', zIndex: 100000, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}
                    >
                        {hoverTooltip.content}
                        <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #0f172a' }} />
                    </motion.div>,
                    document.body
                )}
            </AnimatePresence>

            {/* MODAL: KOLLISION ADVARSEL */}
            {collisionWarning && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }}>
                    <div style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <AlertCircle size={24} />
                        </div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.25rem', color: '#0f172a' }}>Er du sikker?</h3>
                        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>Der er allerede planlagt en anden sag eller ferie på denne dato. Vil du lægge sagen her alligevel?</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setCollisionWarning(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Fortryd</button>
                            <button onClick={() => confirmScheduleLead(collisionWarning.lead, collisionWarning.selectedDate, collisionWarning.endDate)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Ja, planlæg alligevel</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default CalendarView;
