import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Clock, CheckCircle, MessageSquare, Plus, Users, X, Trash2, Truck, ChevronDown, Palmtree, Thermometer, Briefcase, Coffee, PartyPopper, Search, Bell, BellOff, MapPin, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import UserAvatar from '../ui/UserAvatar';
import GorgeousMultiSelect from './GorgeousMultiSelect';
import GorgeousSingleSelect from './GorgeousSingleSelect';
import { getDanishHolidays } from '../../utils/holidays';
import { mutateCalendarEvents } from '../../utils/calendarEvents';
import SectionTour from './SectionTour';
import { shouldShowCoach } from './coachmarks';

// Rundtur for Kalender (Bølge 2). Lyser hele afsnit op. Kun desktop, første gang.
const CALENDAR_TOUR_STEPS = [
    { sel: '[data-tour="calendar-title"]', placement: 'bottom', eyebrow: 'Kalender', title: 'Hold styr på holdet', body: 'Planlæg dine sager og se hvem der er hvor — på én tavle for hele firmaet.' },
    { sel: '[data-tour="calendar-views"]', placement: 'bottom', eyebrow: 'Visninger', title: 'Måned, uge, år — eller personale', body: 'Skift visning, alt efter om du vil have overblik eller se præcis hvem der laver hvad ("Personale").' },
    { sel: '[data-tour="calendar-filter"]', placement: 'bottom', eyebrow: 'Filtrér', title: 'Vis kun bestemte folk', body: 'Filtrér på medarbejder, så du kun ser deres aftaler og sager i kalenderen.' },
    { sel: '[data-tour="calendar-newevent"]', placement: 'bottom', eyebrow: 'Aftaler', title: 'Tilføj aftaler', body: 'Opret møder, materialeleveringer og andre aftaler direkte i kalenderen — med påmindelser.' },
    { sel: '[data-tour="calendar-sidebar"]', placement: 'left', eyebrow: 'Planlægning', title: 'Sager der venter på en dato', body: 'Bekræftede sager uden dato lander her. Træk dem ind i kalenderen — eller tryk Planlæg.' },
];

const CalendarView = ({ leadsData, myProfile, simulatedRole, onCaseClick, setLeadsData, teamMembers = [], carpenterProfile, setCarpenterProfile }) => {
    const effectiveRole = simulatedRole || myProfile?.role;
    const isManager = ['admin', 'boss', 'accountant'].includes(effectiveRole);
    const userId = myProfile?.id;
    // Rundtur: aktiv ved første besøg (desktop, første gang).
    const [calendarTourActive, setCalendarTourActive] = useState(() => shouldShowCoach('calendar_tour'));
    const [calendarStep, setCalendarStep] = useState(0);
    const calMainRef = useRef(null);     // kalender-hovedområdet (mål for fly-animationen)
    const sidebarDemoRef = useRef(null); // eksempel-sagskortet i sidebaren (start)
    const [flyVars, setFlyVars] = useState(null);

    // Åben firmakalender: alle roller må se folk-/tidslinje-visningen.
    const canViewTimeline = ['admin', 'boss', 'accountant', 'sales', 'worker', 'apprentice'].includes(effectiveRole);
    const canEditLead = (lead) => isManager || (lead?.raw_data?.assigned_pm || []).includes(userId);
    const canClickLead = (lead) => canEditLead(lead) || (lead?.raw_data?.assigned_workers || []).includes(userId);
    // Alle kan oprette events; rediger/slet kun på egne events (eller som mester/leder).
    const canEditEvent = (ev) => !ev || isManager || (ev.createdById && ev.createdById === userId);

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

    const RECURRENCE_OPTIONS = [
        { id: 'none', name: 'Ingen', short: 'Enkelt' },
        { id: 'weekly', name: 'Hver uge', short: 'Ugentlig' },
        { id: 'biweekly', name: 'Hver 14. dag', short: '14 dage' },
        { id: 'monthly', name: 'Hver måned', short: 'Månedlig' }
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
    const [showMobileFilter, setShowMobileFilter] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [mobileViewType, setMobileViewType] = useState('month'); // 'month', 'today' or 'timeline'
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []); // 'month', 'week', 'year'
    const [currentDate, setCurrentDate] = useState(new Date());

    // På sidste rundtur-trin: mål eksempel-kortet + dato-cellerne og lad en
    // spøgelses-kopi "flyve" fra sidebaren ind på rigtige dage i kalenderen.
    // (Placeret EFTER currentDate så vi ikke rammer TDZ i dependency-arrayet.)
    useEffect(() => {
        const onLast = calendarTourActive && calendarStep === CALENDAR_TOUR_STEPS.length - 1;
        if (!onLast) { setFlyVars(null); return; }
        const compute = () => {
            const card = sidebarDemoRef.current;
            if (!card) return;
            const c = card.getBoundingClientRect();
            const y = currentDate.getFullYear(), mo = currentDate.getMonth();
            const dim = new Date(y, mo + 1, 0).getDate();
            // Land på 3 hverdage (tirs→tors), aldrig i weekenden — det ser forkert ud
            // for en tømrer at "arbejde" lør/søn. Find en tirsdag (getDay()===2).
            const isTue = (d) => new Date(y, mo, d).getDay() === 2;
            let base = 0;
            for (let d = 9; d <= dim - 2; d++) { if (isTue(d)) { base = d; break; } }
            if (!base) for (let d = 1; d <= dim - 2; d++) { if (isTue(d)) { base = d; break; } }
            if (!base) base = Math.max(1, Math.min(15, dim - 2));
            const pad = (n) => String(n).padStart(2, '0');
            const cells = [base, base + 1, base + 2]
                .map(d => document.querySelector(`[data-cal-day="${y}-${pad(mo + 1)}-${pad(d)}"]`))
                .filter(Boolean)
                .map(el => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width) }; });
            if (!cells.length) { setFlyVars(null); return; }
            const first = cells[0];
            const targetX = first.left + 8, targetY = first.top + 38;
            setFlyVars({ left: Math.round(c.left), top: Math.round(c.top), width: Math.round(c.width), dx: Math.round(targetX - c.left), dy: Math.round(targetY - c.top), cells });
        };
        const id = requestAnimationFrame(compute);
        window.addEventListener('resize', compute);
        return () => { cancelAnimationFrame(id); window.removeEventListener('resize', compute); };
    }, [calendarTourActive, calendarStep, currentDate]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(userId ? [String(userId)] : ['all']);


    
    // Drag and Drop & Modals
    const [draggedLead, setDraggedLead] = useState(null);
    const [draggedEvent, setDraggedEvent] = useState(null);
    const dragTimeoutRef = useRef(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [popoverLead, setPopoverLead] = useState(null);
    // Vælg-ekstra-dage-tilstand: sagen der får ekstra dage ved klik på kalenderdage (desktop).
    const [addDayLead, setAddDayLead] = useState(null);
    // Mobil: bottom-sheet til at tilføje/fjerne ekstra dage med datovælger.
    const [extraDaySheet, setExtraDaySheet] = useState(null); // { leadId, dateInput }
    useEffect(() => {
        if (!addDayLead) return;
        const onKey = (e) => { if (e.key === 'Escape') setAddDayLead(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [addDayLead]);
    const [collisionWarning, setCollisionWarning] = useState(null); // { lead, day, daysDuration }

    // Sag-planlægning fra kalenderen (additivt — ny funktion)
    const [showAddChooser, setShowAddChooser] = useState(false);          // vælger: sag eller aftale
    const [chooserDate, setChooserDate] = useState(null);                 // dagen der blev trykket på
    const [showCasePicker, setShowCasePicker] = useState(false);          // vælg sag
    const [casePickerSearch, setCasePickerSearch] = useState('');
    const [scheduleConfirm, setScheduleConfirm] = useState(null);         // { lead, startDate, durationDays, mode }
    const [caseActionSheet, setCaseActionSheet] = useState(null);         // { lead } — tryk på sag

    const [eventFormData, setEventFormData] = useState({
        id: '',
        title: '',
        type: 'Internt Møde', // 'Internt Møde', 'Kundemøde', 'Materialelevering'
        startDate: new Date().toISOString().substring(0,10),
        endDate: new Date().toISOString().substring(0,10),
        startTime: '10:00',
        endTime: '11:00',
        allDay: false,
        location: '',
        notes: '',
        participants: ['all'],
        selectedLeadId: '', // For Materialelevering
        notification_preference: 'day_before',
        recurrence: 'none',
        recurrenceUntil: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [hoverTooltip, setHoverTooltip] = useState(null); // { x, y, content }
    const [registeredPopover, setRegisteredPopover] = useState(null); // { x, y, registered } — klikbar liste over dagens timer pr. sag (virker også på touch)

    // Aftalen der vises/redigeres lige nu — bruges til rettigheds-tjek i modalen.
    const editingEvent = eventFormData.id ? (carpenterProfile?.raw_data?.calendar_events || []).find(ev => ev.id === eventFormData.id) : null;
    const canModifyCurrentEvent = canEditEvent(editingEvent);

    const openModalForDate = (dateObj, eventToEdit = null) => {
        // Alle roller må oprette og se events i den fælles firmakalender.

        if (eventToEdit) {
            setEventFormData({
                id: eventToEdit.id || '',
                title: eventToEdit.title || '',
                type: eventToEdit.type || 'Internt Møde',
                startDate: eventToEdit.startDate || eventToEdit.date || new Date().toISOString().substring(0,10),
                endDate: eventToEdit.endDate || eventToEdit.date || new Date().toISOString().substring(0,10),
                startTime: eventToEdit.startTime || '10:00',
                endTime: eventToEdit.endTime || '11:00',
                allDay: !!eventToEdit.allDay,
                location: eventToEdit.location || '',
                notes: eventToEdit.notes || '',
                participants: eventToEdit.participants || ['all'],
                selectedLeadId: eventToEdit.relatedLeadId || '',
                notification_preference: eventToEdit.notification_preference || 'day_before',
                recurrence: eventToEdit.recurrence || 'none',
                recurrenceUntil: eventToEdit.recurrenceUntil || ''
            });
        } else if (dateObj) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            setEventFormData({
                id: '',
                title: '',
                type: 'Internt Møde',
                startDate: dateStr,
                endDate: dateStr,
                startTime: '10:00',
                endTime: '11:00',
                allDay: false,
                location: '',
                notes: '',
                participants: ['all'],
                selectedLeadId: '',
                notification_preference: 'day_before',
                recurrence: 'none',
                recurrenceUntil: ''
            });
        }
        setShowEventModal(true);
    };

    // Tryk på en vilkårlig dag i kalenderen: lad brugeren vælge om der skal
    // planlægges en sag eller oprettes en aftale (i stedet for at gå direkte
    // til aftale-modalen). Husker dagen, så begge veje starter på den dato.
    const openAddChooser = (dateObj) => {
        setChooserDate(dateObj || null);
        setShowAddChooser(true);
    };

    // ----------------- DATA PREPARATION -----------------
    
    // 1. Relevante bygge-sager
    // Basis: status + adgangskontrol (UDEN hold-dropdown-filter). Bruges til "Klar til
    // planlægning", så en netop bekræftet sag uden tildelt hold ALTID dukker op her —
    // også selvom kalenderen er filtreret til en bestemt medarbejder.
    const accessibleLeads = useMemo(() => {
        if (!leadsData) return [];
        return leadsData.filter(lead => {
            const status = lead.status || '';
            if (!['Bekræftet opgave', 'I gang', 'Sæt i bero', 'Afbrudt Sag'].includes(status)) return false;

            // Adgangskontrol
            if (!isManager && effectiveRole === 'sales') {
                // Projektlederen skal se andres sager for at bedømme belægning i kalenderen.
                // Redigeringsadgang styres individuelt af canEditLead() og canClickLead()
            } else if (!isManager) {
                const workers = lead.raw_data?.assigned_workers || [];
                const pms = Array.isArray(lead.raw_data?.assigned_pm) ? lead.raw_data.assigned_pm : (lead.raw_data?.assigned_pm ? [lead.raw_data.assigned_pm] : []);
                if (!workers.includes(userId) && !pms.includes(userId)) return false;
            }
            return true;
        });
    }, [leadsData, isManager, effectiveRole, userId]);

    // Med hold-dropdown-filteret lagt ovenpå — bruges til planlagte sager i selve gitteret.
    const relevantLeads = useMemo(() => {
        return accessibleLeads.filter(lead => {
            if (!selectedEmployeeIds.includes('all') && selectedEmployeeIds.length > 0) {
                const workers = lead.raw_data?.assigned_workers || [];
                const pms = lead.raw_data?.assigned_pm || [];
                // Sager uden tildelt hold hører ikke til nogen bestemt medarbejder. Vis dem
                // altid — ellers bliver en netop oprettet/bekræftet sag (der endnu ikke har
                // et hold) usynlig i gitteret, når kalenderen er filtreret til én person.
                // Det var årsagen til at planlagte sager "ikke satte sig ind på dagene".
                if (workers.length === 0 && pms.length === 0) return true;
                if (!workers.some(w => selectedEmployeeIds.includes(String(w))) && !pms.some(p => selectedEmployeeIds.includes(String(p)))) return false;
            }
            return true;
        });
    }, [accessibleLeads, selectedEmployeeIds]);

    const { scheduledLeads, unscheduledLeads } = useMemo(() => {
        // Planlagte sager følger hold-filteret (det man ser i kalenderen).
        const scheduled = relevantLeads.filter(lead => lead.raw_data?.start_date);
        // Uplanlagte sager ignorerer hold-filteret, så de altid kan findes og planlægges.
        const unscheduled = accessibleLeads.filter(lead => !lead.raw_data?.start_date);
        return { scheduledLeads: scheduled, unscheduledLeads: unscheduled };
    }, [relevantLeads, accessibleLeads]);

    // Personer der kan sættes på en sag (mester + hold), uden dubletter.
    const assignableMembers = useMemo(() => {
        const out = [];
        const seen = new Set();
        [myProfile, ...teamMembers].forEach(m => {
            if (!m || !m.id) return;
            const id = String(m.id);
            if (seen.has(id)) return;
            seen.add(id);
            out.push(m);
        });
        return out;
    }, [myProfile, teamMembers]);

    // 2. Fravær og Ferie (fra Timeregistrering)
    const allAbsences = useMemo(() => {
        let absences = [];
        const membersToCheck = selectedEmployeeIds.includes('all') ? teamMembers : teamMembers.filter(m => selectedEmployeeIds.includes(String(m?.id)));
        
        membersToCheck.forEach(member => {
            const timeEntries = member.raw_data?.time_entries || [];
            timeEntries.forEach(entry => {
                if (['Ferie', 'Sygdom', 'Skole'].includes(entry.absenceType)) {
                    // Maskér kollegers sygdom for ikke-ledere: vis neutralt som "Fraværende".
                    const masked = !isManager && entry.absenceType === 'Sygdom';
                    absences.push({
                        ...entry,
                        absenceType: masked ? 'Fraværende' : entry.absenceType,
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
    }, [teamMembers, myProfile, selectedEmployeeIds, isManager]);

    // 2b. Registrerede arbejdstimer pr. dag (fra Timeregistrering) — så man på sin egen
    //     kalender kan se hvad dagene FAKTISK gik med, og på hvilken sag. Fravær (Ferie/
    //     Sygdom/Skole) er bevidst udeladt her (vises separat som fravær ovenfor).
    const registeredHoursByDay = useMemo(() => {
        const byDay = {}; // 'YYYY-MM-DD' -> { total, byCase: { leadId: { label, name, hours } } }
        const wantAll = selectedEmployeeIds.includes('all');
        const wants = (id) => wantAll || selectedEmployeeIds.includes(String(id));
        (leadsData || []).forEach(lead => {
            (lead.raw_data?.time_entries || []).forEach(e => {
                if (e.absenceType || !e.date) return;
                if (!wants(e.employeeId)) return;
                const hrs = parseFloat(e.hours) || 0;
                if (hrs <= 0) return;
                const dayKey = String(e.date).slice(0, 10);
                const leadKey = String(lead.id);
                const label = lead.case_number ? `Sag ${lead.case_number}` : (lead.customer_name || 'Sag');
                if (!byDay[dayKey]) byDay[dayKey] = { total: 0, byCase: {} };
                byDay[dayKey].total += hrs;
                if (!byDay[dayKey].byCase[leadKey]) byDay[dayKey].byCase[leadKey] = { label, name: lead.customer_name || '', hours: 0 };
                byDay[dayKey].byCase[leadKey].hours += hrs;
            });
        });
        return byDay;
    }, [leadsData, selectedEmployeeIds]);

    // 3. Kalenderaftaler (Møder & Leveringer)
    const calendarEvents = useMemo(() => {
        const events = carpenterProfile?.raw_data?.calendar_events || [];
        if (selectedEmployeeIds.includes('all') || selectedEmployeeIds.length === 0) return events;
        return events.filter(e => (e.participants || []).includes('all') || (e.participants || []).some(p => selectedEmployeeIds.includes(String(p))));
    }, [carpenterProfile, selectedEmployeeIds]);


    // ----------------- CALENDAR HELPERS -----------------
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const startingEmptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mandag er 0

    const prevPeriod = () => {
        let newDate;
        if (view === 'month') newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        if (view === 'week' || view === 'timeline') newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
        if (view === 'year') newDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
        setCurrentDate(newDate);
        if (isMobile) setSelectedMobileDate(newDate);
    };
    const nextPeriod = () => {
        let newDate;
        if (view === 'month') newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        if (view === 'week' || view === 'timeline') newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7);
        if (view === 'year') newDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1);
        setCurrentDate(newDate);
        if (isMobile) setSelectedMobileDate(newDate);
    };

    const monthNames = ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'December'];

    const handleDragOverNav = (e, direction) => {
        e.preventDefault();
        if (!dragTimeoutRef.current) {
            dragTimeoutRef.current = setTimeout(() => {
                if (direction === 'prev') prevPeriod();
                if (direction === 'next') nextPeriod();
            }, 800);
        }
    };
    
    const clearDragTimeout = () => {
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }
    };

    // Ekstra arbejdsdage: enkeltdage ('YYYY-MM-DD', lokal tid) OVENI sagens
    // start/slut-interval, så en sag kan planlægges fx mandag + fredag.
    const leadExtraDays = (lead) => Array.isArray(lead?.raw_data?.extra_work_days) ? lead.raw_data.extra_work_days : [];
    const isExtraDayFor = (lead, dateStr) => leadExtraDays(lead).includes(dateStr);
    const toLocalDateStr = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Tjek overlaps for en given dag
    const getItemsForDay = (checkDate, { ignoreSearch = false } = {}) => {
        checkDate.setHours(0,0,0,0);
        
        // Fix timezone offset issue for toISOString locally
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const isHoliday = getDanishHolidays(checkDate.getFullYear()).has(dateStr);

        let leads = scheduledLeads.filter(lead => {
            // Ekstra arbejdsdage (ikke-sammenhængende planlægning): en eksplicit tilføjet dag
            // vises altid — også weekend/helligdag — den er et bevidst valg og slår flagene.
            if (isExtraDayFor(lead, dateStr)) return true;
            const start = new Date(lead.raw_data.start_date); start.setHours(0,0,0,0);
            // Manuelt oprettede sager (uden tilbud) har kun start_date, ingen end_date.
            // Fald tilbage til start_date, så en endagssag stadig placeres på sin dag
            // (ellers gav new Date(undefined) en Invalid Date, og sagen forsvandt helt).
            const end = new Date(lead.raw_data.end_date || lead.raw_data.start_date); end.setHours(23,59,59,999);
            if (checkDate >= start && checkDate <= end) {
                const isWeekend = checkDate.getDay() === 0 || checkDate.getDay() === 6;
                const allowWeekends = lead.raw_data.include_weekends === true;
                const allowHolidays = lead.raw_data.include_holidays === true;
                if ((isWeekend && !allowWeekends) || (isHoliday && !allowHolidays)) {
                    return false;
                }
                return true;
            }
            return false;
        });

        let absences = allAbsences.filter(a => {
            const d = new Date(a.date); d.setHours(0,0,0,0);
            return d.getTime() === checkDate.getTime();
        });

        let events = calendarEvents.filter(e => {
            const startStr = e.startDate || e.date;
            const endStr = e.endDate || e.date;
            if (!startStr) return false;
            
            const start = new Date(startStr); start.setHours(0,0,0,0);
            const end = new Date(endStr || startStr); end.setHours(23,59,59,999);
            
            return checkDate >= start && checkDate <= end;
        });

        if (!ignoreSearch && searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            leads = leads.filter(l => (l.case_number?.toLowerCase().includes(term) || l.project_category?.toLowerCase().includes(term) || l.raw_data?.project_title?.toLowerCase().includes(term)));
            absences = absences.filter(a => a.employeeName?.toLowerCase().includes(term) || a.absenceType?.toLowerCase().includes(term));
            events = events.filter(e => e.title?.toLowerCase().includes(term) || e.type?.toLowerCase().includes(term));
        }

        const registered = registeredHoursByDay[dateStr] || null;

        return { isHoliday, leads, absences, events, registered };
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedMobileDate(today);
    };

    const eventTimeLabel = (event) => event?.allDay ? 'Hele dagen' : `${event?.startTime || '10:00'} - ${event?.endTime || '11:00'}`;

    const getLeadLocation = (lead) => (
        lead?.address ||
        lead?.customer_address ||
        lead?.raw_data?.address ||
        lead?.raw_data?.customer_address ||
        lead?.raw_data?.details?.address ||
        lead?.raw_data?.details?.customerAddress ||
        ''
    );

    const toDateInputValue = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const parseDateInput = (value) => new Date(`${value}T00:00:00`);

    const addDaysToDate = (date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    };

    const addMonthsToDate = (date, months) => {
        const d = new Date(date);
        const day = d.getDate();
        d.setMonth(d.getMonth() + months);
        if (d.getDate() !== day) d.setDate(0);
        return d;
    };

    const getDefaultRecurrenceUntil = (startDate) => toDateInputValue(addMonthsToDate(parseDateInput(startDate), 3));

    const getRecurrenceName = (recurrence) => RECURRENCE_OPTIONS.find(option => option.id === recurrence)?.name || 'Gentagelse';

    const getRecurrencePreview = (formData) => {
        const previewBase = {
            id: 'preview',
            startDate: formData.startDate,
            endDate: formData.endDate
        };
        return buildRecurringEventDrafts(previewBase, formData);
    };

    const buildRecurringEventDrafts = (baseEvent, formData) => {
        if (formData.id || !formData.recurrence || formData.recurrence === 'none' || !formData.recurrenceUntil) {
            return [baseEvent];
        }

        const start = parseDateInput(formData.startDate);
        const end = parseDateInput(formData.endDate);
        const until = parseDateInput(formData.recurrenceUntil);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(until.getTime()) || until < start) {
            return [baseEvent];
        }

        const durationDays = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        const recurrenceGroupId = `rec-${Date.now()}`;
        const drafts = [];
        let occurrenceStart = new Date(start);
        let index = 0;

        while (occurrenceStart <= until && drafts.length < 60) {
            const occurrenceEnd = addDaysToDate(occurrenceStart, durationDays);
            drafts.push({
                ...baseEvent,
                id: index === 0 ? baseEvent.id : `${baseEvent.id}-r${index}`,
                startDate: toDateInputValue(occurrenceStart),
                endDate: toDateInputValue(occurrenceEnd),
                recurrence: formData.recurrence,
                recurrenceUntil: formData.recurrenceUntil,
                recurrenceGroupId,
                occurrenceIndex: index,
                recurrenceLabel: getRecurrenceName(formData.recurrence)
            });

            if (formData.recurrence === 'monthly') {
                occurrenceStart = addMonthsToDate(occurrenceStart, 1);
            } else {
                occurrenceStart = addDaysToDate(occurrenceStart, formData.recurrence === 'biweekly' ? 14 : 7);
            }
            index += 1;
        }

        return drafts;
    };

    const getEventConflictSummary = (formData) => {
        if (!formData?.startDate || !formData?.endDate) return [];
        const participants = formData.type === 'Materialelevering'
            ? (() => {
                const lead = relevantLeads.find(l => String(l.id) === String(formData.selectedLeadId));
                const workers = lead?.raw_data?.assigned_workers || [];
                const pms = lead?.raw_data?.assigned_pm || [];
                return [...new Set([...workers, ...pms].map(String))];
            })()
            : (formData.participants || []).map(String);

        const checksAll = participants.length === 0 || participants.includes('all');
        const conflicts = [];
        const ranges = buildRecurringEventDrafts({
            id: formData.id || 'draft',
            startDate: formData.startDate,
            endDate: formData.endDate
        }, formData);

        ranges.forEach(range => {
            const start = new Date(range.startDate + 'T00:00:00');
            const end = new Date(range.endDate + 'T00:00:00');
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const items = getItemsForDay(new Date(d), { ignoreSearch: true });
                const dayLabel = format(new Date(d), 'd. MMM', { locale: da });
                const otherEvents = items.events.filter(event => {
                    if (event.id === formData.id || event.id === range.id) return false;
                    if (checksAll || event.participants?.includes('all')) return true;
                    return (event.participants || []).some(id => participants.includes(String(id)));
                });
                const relevantAbsences = items.absences.filter(absence => checksAll || participants.includes(String(absence.employeeId)));
                const relevantLeadsForParticipants = items.leads.filter(lead => {
                    if (checksAll) return true;
                    const ids = [...(lead.raw_data?.assigned_workers || []), ...(lead.raw_data?.assigned_pm || [])].map(String);
                    return ids.some(id => participants.includes(id));
                });

                if (otherEvents.length > 0) conflicts.push(`${dayLabel}: ${otherEvents.length} anden aftale`);
                if (relevantAbsences.length > 0) conflicts.push(`${dayLabel}: ${relevantAbsences.length} fravær`);
                if (relevantLeadsForParticipants.length > 0) conflicts.push(`${dayLabel}: ${relevantLeadsForParticipants.length} sag(er) planlagt`);
            }
        });

        return conflicts.slice(0, 4);
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

        // Find original (ved redigering) for at bevare opretteren og tjekke rettigheder.
        const original = eventFormData.id
            ? (carpenterProfile?.raw_data?.calendar_events || []).find(ev => ev.id === eventFormData.id)
            : null;
        if (original && !canEditEvent(original)) {
            toast.error('Du kan kun ændre dine egne aftaler.');
            return;
        }

        const newEventObj = {
            id: eventFormData.id || `evt-${Date.now()}`,
            title: finalTitle,
            type: eventFormData.type,
            startDate: eventFormData.startDate,
            endDate: eventFormData.endDate,
            startTime: eventFormData.startTime,
            endTime: eventFormData.endTime,
            allDay: !!eventFormData.allDay,
            location: eventFormData.location?.trim() || '',
            notes: eventFormData.notes?.trim() || '',
            participants: finalParticipants,
            relatedLeadId: eventFormData.selectedLeadId || null,
            notification_preference: eventFormData.notification_preference || 'day_before',
            recurrence: original?.recurrence || eventFormData.recurrence || 'none',
            recurrenceUntil: original?.recurrenceUntil || eventFormData.recurrenceUntil || '',
            recurrenceGroupId: original?.recurrenceGroupId || null,
            occurrenceIndex: original?.occurrenceIndex ?? null,
            recurrenceLabel: original?.recurrenceLabel || getRecurrenceName(eventFormData.recurrence),
            createdById: original?.createdById || userId  // hvem oprettede aftalen
        };
        const eventsToAdd = buildRecurringEventDrafts(newEventObj, eventFormData);

        try {
            const updatedEvents = await mutateCalendarEvents({
                companyId: carpenterProfile?.id,
                removeIds: eventFormData.id ? [eventFormData.id] : [],
                add: eventsToAdd
            });
            if (setCarpenterProfile) setCarpenterProfile({ ...carpenterProfile, raw_data: { ...carpenterProfile.raw_data, calendar_events: updatedEvents } });
            toast.success(eventFormData.id ? 'Aftale opdateret' : eventsToAdd.length > 1 ? `${eventsToAdd.length} aftaler oprettet i kalenderen` : 'Aftale oprettet i kalenderen');
            setShowEventModal(false);
        } catch (error) {
            toast.error('Fejl ved gemning af aftale');
        }
    };

    const confirmDeleteEvent = async () => {
        if (!eventFormData.id) return;

        const original = (carpenterProfile?.raw_data?.calendar_events || []).find(ev => ev.id === eventFormData.id);
        if (original && !canEditEvent(original)) {
            toast.error('Du kan kun slette dine egne aftaler.');
            return;
        }

        try {
            const updatedEvents = await mutateCalendarEvents({
                companyId: carpenterProfile?.id,
                removeIds: [eventFormData.id]
            });
            if (setCarpenterProfile) setCarpenterProfile({ ...carpenterProfile, raw_data: { ...carpenterProfile.raw_data, calendar_events: updatedEvents } });
            toast.success('Aftale slettet');
            setShowDeleteConfirm(false);
            setShowEventModal(false);
        } catch (error) {
            toast.error('Fejl ved sletning');
        }
    };

    const handleDropLead = (targetDateObj) => {
        if (!draggedLead || !isManager) return;
        
        // Find varighed i hverdage
        let daysDuration = 1;
        const allowWeekends = draggedLead.raw_data?.include_weekends === true;
        const allowHolidays = draggedLead.raw_data?.include_holidays === true;

        if (draggedLead.raw_data?.start_date && draggedLead.raw_data?.end_date) {
             const s = new Date(draggedLead.raw_data.start_date); s.setHours(0,0,0,0);
             const e = new Date(draggedLead.raw_data.end_date); e.setHours(0,0,0,0);
             let count = 0;
             for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
                 const isWknd = d.getDay() === 0 || d.getDay() === 6;
                 const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                 const isHol = getDanishHolidays(d.getFullYear()).has(dStr);
                 if (!(isWknd && !allowWeekends) && !(isHol && !allowHolidays)) count++;
             }
             daysDuration = Math.max(1, count);
        } else {
             const laborHours = draggedLead.raw_data?.calc_data?.laborHours || 0;
             const weeks = Math.max(1, Math.ceil(laborHours / 37));
             daysDuration = weeks * 5; // arbejdsdage
        }

        // Tjek for ferie kollision
        const endDate = new Date(targetDateObj);
        endDate.setDate(endDate.getDate() + daysDuration - 1);
        
        // Simpel kollisions-tjek: Har nogen team members på sagen ferie i perioden, eller er der andre sager?
        let collisionFound = false;
        const assigned = draggedLead.raw_data?.assigned_workers || [];
        for (let d = new Date(targetDateObj); d <= endDate; d.setDate(d.getDate() + 1)) {
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

        // Åbn varigheds-bekræftelsen (samme trin på mobil og desktop). Kollision vises live i modalen.
        void collisionFound;
        const startStr = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;
        openScheduleConfirm(draggedLead, startStr, daysDuration, 'new');
        setDraggedLead(null);
    };

    const handleDropEvent = async (targetDateObj) => {
        if (!draggedEvent || !canEditEvent(draggedEvent)) return;
        
        const year = targetDateObj.getFullYear();
        const month = String(targetDateObj.getMonth() + 1).padStart(2, '0');
        const d = String(targetDateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${d}`;

        // Opdater start- og slutdato med samme forskel (hvis flerdages event)
        let start = new Date(draggedEvent.startDate || draggedEvent.date);
        let end = new Date(draggedEvent.endDate || draggedEvent.date);
        
        // Nulstil tider for at beregne rene dage forskel
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        const newEndDateObj = new Date(targetDateObj);
        newEndDateObj.setDate(newEndDateObj.getDate() + diffDays);
        const endYear = newEndDateObj.getFullYear();
        const endMonth = String(newEndDateObj.getMonth() + 1).padStart(2, '0');
        const endD = String(newEndDateObj.getDate()).padStart(2, '0');
        const endDateStr = `${endYear}-${endMonth}-${endD}`;

        const updatedEvent = { ...draggedEvent, startDate: dateStr, endDate: endDateStr };
        const movedId = draggedEvent.id;
        setDraggedEvent(null);

        try {
            const updatedEvents = await mutateCalendarEvents({
                companyId: carpenterProfile?.id,
                removeIds: [movedId],
                add: [updatedEvent]
            });
            if (setCarpenterProfile) setCarpenterProfile({ ...carpenterProfile, raw_data: { ...carpenterProfile.raw_data, calendar_events: updatedEvents } });
            toast.success('Aftale flyttet');
        } catch (error) {
            toast.error('Fejl ved flytning af aftale');
        }
    };

    const handleDropOnDate = (targetDateObj) => {
        clearDragTimeout();
        if (draggedLead) handleDropLead(targetDateObj);
        if (draggedEvent) handleDropEvent(targetDateObj);
    };

    const confirmScheduleLead = async (lead, start, end, allowWeekends, allowHolidays, assignedWorkers, extraDays) => {
        // Felter der altid gemmes ved planlægning. Holdet (assigned_workers) flettes kun
        // ind hvis det er angivet, så vi ikke nulstiller en eksisterende tildeling.
        // Ekstra dage skrives kun når de eksplicit er givet (modalen) — drag-drop rører dem ikke.
        const scheduleFields = { start_date: start.toISOString(), end_date: end.toISOString(), include_weekends: allowWeekends, include_holidays: allowHolidays };
        if (Array.isArray(assignedWorkers)) scheduleFields.assigned_workers = assignedWorkers;
        if (Array.isArray(extraDays)) scheduleFields.extra_work_days = extraDays;

        const updatedLead = { ...lead, raw_data: { ...lead.raw_data, ...scheduleFields } };
        setLeadsData(prev => prev.map(l => l.id === lead?.id ? updatedLead : l));
        setCollisionWarning(null);
        try {
            // Genhent frisk raw_data og flet KUN datoerne (+ evt. hold) ind, så samtidige
            // ændringer på sagen (checkliste, timer, bilag) ikke overskrives.
            const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', lead?.id).single();
            const merged = { ...(latest?.raw_data || lead.raw_data || {}), ...scheduleFields };
            await supabase.from('leads').update({ raw_data: merged }).eq('id', lead?.id);
            toast.success('Sag planlagt');
        } catch (error) {
            toast.error('Fejl ved gem kalenderdato');
        }
    };

    // ---- Sag-planlægning fra kalenderen (delt mobil + desktop) ----
    // Original estimat ud fra arbejdstimer (samme formel som drag-and-drop)
    const estimatFraTimer = (lead) => {
        const laborHours = lead?.raw_data?.calc_data?.laborHours || 0;
        return Math.max(1, Math.ceil(laborHours / 37)) * 5;
    };
    // Default-varighed: brug eksisterende start/slut hvis planlagt, ellers timer-estimat
    const estimerDage = (lead) => {
        if (lead?.raw_data?.start_date && lead?.raw_data?.end_date) {
            const s = new Date(lead.raw_data.start_date);
            const e = new Date(lead.raw_data.end_date);
            return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
        }
        return estimatFraTimer(lead);
    };
    const endFromDuration = (startStr, days, allowWeekends = false, allowHolidays = false) => {
        let current = new Date(startStr + 'T00:00:00');
        let daysAdded = 0;
        
        while (true) {
            const isWeekend = current.getDay() === 0 || current.getDay() === 6;
            const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
            const isHoliday = getDanishHolidays(current.getFullYear()).has(dateStr);
            
            const skipDay = (isWeekend && !allowWeekends) || (isHoliday && !allowHolidays);
            if (!skipDay) {
                daysAdded++;
            }
            if (daysAdded >= Math.max(1, days)) break;
            current.setDate(current.getDate() + 1);
        }
        return current;
    };
    const checkCollision = (lead, start, end, allowWeekends = false, allowHolidays = false) => {
        const assigned = lead?.raw_data?.assigned_workers || [];
        const s = new Date(start); s.setHours(0, 0, 0, 0);
        const e = new Date(end); e.setHours(0, 0, 0, 0);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            const isWknd = d.getDay() === 0 || d.getDay() === 6;
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const isHol = getDanishHolidays(d.getFullYear()).has(dStr);
            if ((isWknd && !allowWeekends) || (isHol && !allowHolidays)) continue;

            const items = getItemsForDay(new Date(d));
            if (items.absences.some(a => assigned.includes(a.employeeId))) return true;
            if (items.leads.filter(l => l.id !== lead.id).length > 0) return true;
        }
        return false;
    };
    // Arbejdsdagene i hovedperioden som datostrenge (samme skip-logik som endFromDuration) —
    // bruges af mini-kalenderen i planlægnings-modalen til at vise/beskytte perioden.
    const mainRangeDaysSet = (startStr, days, allowWeekends = false, allowHolidays = false) => {
        const set = new Set();
        const current = new Date(startStr + 'T00:00:00');
        let added = 0;
        let guard = 0;
        while (added < Math.max(1, days) && guard < 400) {
            const isWknd = current.getDay() === 0 || current.getDay() === 6;
            const ds = toLocalDateStr(current);
            const isHol = getDanishHolidays(current.getFullYear()).has(ds);
            if (!((isWknd && !allowWeekends) || (isHol && !allowHolidays))) { set.add(ds); added++; }
            current.setDate(current.getDate() + 1);
            guard++;
        }
        return set;
    };
    const openScheduleConfirm = (lead, startStr, days, mode = 'new') => {
        const allowWeekends = lead?.raw_data?.include_weekends === true;
        const allowHolidays = lead?.raw_data?.include_holidays === true;
        const assignedWorkers = (lead?.raw_data?.assigned_workers || []).map(String);
        // Ekstra dage redigeres lokalt i modalen og gemmes først ved "Gem/Planlæg".
        const extraDays = leadExtraDays(leadsData.find(l => l.id === lead?.id) || lead);
        setScheduleConfirm({ lead, startDate: startStr, durationDays: Math.max(1, days), mode, allowWeekends, allowHolidays, assignedWorkers, extraDays, calMonth: startStr.slice(0, 7), extraInput: '' });
    };
    const saveSchedule = () => {
        if (!scheduleConfirm) return;
        const { lead, startDate, durationDays, allowWeekends, allowHolidays, assignedWorkers, extraDays } = scheduleConfirm;
        const start = new Date(startDate + 'T00:00:00');
        const end = endFromDuration(startDate, durationDays, allowWeekends, allowHolidays);
        // Ekstra dage der falder på hovedperiodens arbejdsdage er overflødige — filtrér dem fra.
        const mainDays = mainRangeDaysSet(startDate, durationDays, allowWeekends, allowHolidays);
        const cleanExtra = [...new Set((extraDays || []).filter(d => !mainDays.has(d)))].sort();
        confirmScheduleLead(lead, start, end, allowWeekends, allowHolidays, assignedWorkers, cleanExtra);
        setScheduleConfirm(null);
        setShowCasePicker(false);
    };
    const unscheduleLead = async (lead) => {
        const localRaw = { ...lead.raw_data };
        delete localRaw.start_date;
        delete localRaw.end_date;
        delete localRaw.extra_work_days;
        setLeadsData(prev => prev.map(l => l.id === lead.id ? { ...lead, raw_data: localRaw } : l));
        setCaseActionSheet(null);
        try {
            // Genhent frisk raw_data og fjern KUN datoerne, så intet andet overskrives.
            const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const merged = { ...(latest?.raw_data || lead.raw_data || {}) };
            delete merged.start_date;
            delete merged.end_date;
            delete merged.extra_work_days;
            await supabase.from('leads').update({ raw_data: merged }).eq('id', lead.id);
            toast.success('Sag fjernet fra kalender');
        } catch (error) {
            toast.error('Fejl ved fjernelse');
        }
    };

    const removeLeadFromCalendar = async () => {
        if (!popoverLead) return;
        const leadId = popoverLead?.lead?.id;
        const localRaw = { ...(popoverLead.lead?.raw_data || {}) };
        delete localRaw.start_date;
        delete localRaw.end_date;
        delete localRaw.extra_work_days;
        setLeadsData(prev => prev.map(l => l.id === leadId ? { ...popoverLead.lead, raw_data: localRaw } : l));
        setPopoverLead(null);
        try {
            // Genhent frisk raw_data og fjern KUN datoerne, så intet andet overskrives.
            const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', leadId).single();
            const merged = { ...(latest?.raw_data || popoverLead.lead?.raw_data || {}) };
            delete merged.start_date;
            delete merged.end_date;
            delete merged.extra_work_days;
            await supabase.from('leads').update({ raw_data: merged }).eq('id', leadId);
            toast.success('Sag fjernet fra kalender');
        } catch (error) {
            toast.error('Fejl');
        }
    };

    // ---- Ekstra arbejdsdage (ikke-sammenhængende planlægning) ----
    const isDayInMainRange = (lead, dateStr) => {
        if (!lead?.raw_data?.start_date) return false;
        const d = new Date(dateStr + 'T00:00:00');
        const start = new Date(lead.raw_data.start_date); start.setHours(0, 0, 0, 0);
        const end = new Date(lead.raw_data.end_date || lead.raw_data.start_date); end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
    };

    const addExtraDayToLead = async (lead, dateStr) => {
        if (!isManager || !lead?.id) return false;
        if (isDayInMainRange(lead, dateStr)) {
            toast('Dagen ligger allerede i sagens planlægning.', { icon: 'ℹ️' });
            return false;
        }
        const nextDays = [...new Set([...leadExtraDays(lead), dateStr])].sort();
        const updatedLead = { ...lead, raw_data: { ...lead.raw_data, extra_work_days: nextDays } };
        setLeadsData(prev => prev.map(l => l.id === lead.id ? updatedLead : l));
        try {
            // Genhent frisk raw_data og flet KUN extra_work_days ind (samme mønster som planlægning).
            const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const latestRaw = latest?.raw_data || lead.raw_data || {};
            const mergedDays = [...new Set([...(Array.isArray(latestRaw.extra_work_days) ? latestRaw.extra_work_days : []), dateStr])].sort();
            await supabase.from('leads').update({ raw_data: { ...latestRaw, extra_work_days: mergedDays } }).eq('id', lead.id);
            // Blød kollisions-advarsel: er der andet på dagen, siger vi det — men blokerer ikke.
            const items = getItemsForDay(new Date(dateStr + 'T00:00:00'), { ignoreSearch: true });
            const clash = items.leads.some(l => l.id !== lead.id) || items.absences.length > 0;
            toast.success(`Ekstra dag tilføjet: ${format(new Date(dateStr + 'T00:00:00'), 'EEE d. MMM', { locale: da })}${clash ? ' (obs: der ligger allerede noget på dagen)' : ''}`);
            return true;
        } catch (error) {
            toast.error('Kunne ikke tilføje dagen. Prøv igen.');
            return false;
        }
    };

    const removeExtraDayFromLead = async (lead, dateStr) => {
        if (!isManager || !lead?.id) return;
        const nextDays = leadExtraDays(lead).filter(d => d !== dateStr);
        const localRaw = { ...lead.raw_data };
        if (nextDays.length > 0) localRaw.extra_work_days = nextDays; else delete localRaw.extra_work_days;
        setLeadsData(prev => prev.map(l => l.id === lead.id ? { ...lead, raw_data: localRaw } : l));
        try {
            const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const latestRaw = latest?.raw_data || lead.raw_data || {};
            const mergedDays = (Array.isArray(latestRaw.extra_work_days) ? latestRaw.extra_work_days : []).filter(d => d !== dateStr);
            const merged = { ...latestRaw };
            if (mergedDays.length > 0) merged.extra_work_days = mergedDays; else delete merged.extra_work_days;
            await supabase.from('leads').update({ raw_data: merged }).eq('id', lead.id);
            toast.success('Dag fjernet fra sagen');
        } catch (error) {
            toast.error('Kunne ikke fjerne dagen. Prøv igen.');
        }
    };

    // Klik på en dag i vælg-ekstra-dage-tilstand: toggle (fejlklik retter sig selv).
    const handleExtraDayClick = (checkDate) => {
        if (!addDayLead) return;
        const lead = leadsData.find(l => l.id === addDayLead.id) || addDayLead;
        const dateStr = toLocalDateStr(checkDate);
        if (isExtraDayFor(lead, dateStr)) {
            removeExtraDayFromLead(lead, dateStr);
        } else {
            addExtraDayToLead(lead, dateStr);
        }
    };

    const getStatusColor = (status) => {
        if (status === 'I gang') return { bg: '#dcfce7', border: '#86efac', text: '#166534' };
        if (status === 'Afbrudt Sag') return { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' }; // Rødlig
        if (status === 'Sæt i bero') return { bg: '#ffedd5', border: '#fdba74', text: '#c2410c' }; // Orange
        return { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3' }; // Bekræftet
    };

    const renderMobileMyDayView = () => {
        const dayItems = getItemsForDay(new Date(selectedMobileDate));
        const myId = String(userId || '');
        const myEvents = dayItems.events.filter(event => event.participants?.includes('all') || (event.participants || []).map(String).includes(myId));
        const myAbsences = dayItems.absences.filter(absence => String(absence.employeeId) === myId);
        const myLeads = dayItems.leads.filter(lead => {
            const ids = [...(lead.raw_data?.assigned_workers || []), ...(lead.raw_data?.assigned_pm || [])].map(String);
            return ids.includes(myId) || isManager;
        });
        const hasAny = myEvents.length > 0 || myAbsences.length > 0 || myLeads.length > 0 || dayItems.isHoliday || (dayItems.registered?.total > 0);

        return (
            <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 18px 36px rgba(15,23,42,0.22)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                            <div style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Min dag</div>
                            <h3 style={{ margin: '4px 0 0', fontSize: '1.45rem', fontWeight: 900, textTransform: 'capitalize' }}>
                                {format(selectedMobileDate, 'EEEE d. MMM', { locale: da })}
                            </h3>
                        </div>
                        <button onClick={goToToday} style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '14px', padding: '10px 12px', fontWeight: 800, cursor: 'pointer' }}>
                            I dag
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '18px' }}>
                        {[
                            { label: 'Sager', value: myLeads.length },
                            { label: 'Aftaler', value: myEvents.length },
                            { label: 'Fravær', value: myAbsences.length }
                        ].map(item => (
                            <div key={item.label} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '10px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{item.value}</div>
                                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700 }}>{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {!hasAny && (
                    <div style={{ padding: '28px 18px', textAlign: 'center', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        <CalendarIcon size={34} color="#94a3b8" style={{ marginBottom: '10px' }} />
                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Ingen planlagte aktiviteter</div>
                        <div style={{ fontSize: '0.9rem' }}>Du har ikke noget i kalenderen på denne dag.</div>
                    </div>
                )}

                {dayItems.isHoliday && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #94a3b8', borderRadius: '16px', padding: '14px 16px', fontWeight: 800, color: '#475569' }}>
                        Helligdag
                    </div>
                )}

                {dayItems.registered && dayItems.registered.total > 0 && (
                    <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderLeft: '4px solid #06b6d4', borderRadius: '16px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0e7490', fontWeight: 800, fontSize: '0.95rem' }}>
                            <Clock size={18} /> {dayItems.registered.total.toFixed(2)} timer registreret
                        </div>
                        {Object.values(dayItems.registered.byCase).map((c, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                                <span>{c.label}{c.name ? ` · ${c.name}` : ''}</span>
                                <strong style={{ color: '#0e7490' }}>{c.hours.toFixed(2)} t</strong>
                            </div>
                        ))}
                    </div>
                )}

                {myAbsences.map((absence, index) => (
                    <div key={`my-absence-${index}`} style={{ background: absence.absenceType === 'Sygdom' ? '#fef2f2' : '#fff7ed', border: `1px solid ${absence.absenceType === 'Sygdom' ? '#fecaca' : '#fed7aa'}`, borderLeft: `4px solid ${absence.absenceType === 'Sygdom' ? '#ef4444' : '#f97316'}`, borderRadius: '16px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {absence.absenceType === 'Sygdom' ? <Thermometer size={22} color="#ef4444"/> : <Palmtree size={22} color="#f97316"/>}
                        <div>
                            <div style={{ fontWeight: 900, color: '#0f172a' }}>{absence.absenceType}</div>
                            <div style={{ fontSize: '0.86rem', color: '#64748b' }}>{absence.employeeName}</div>
                        </div>
                    </div>
                ))}

                {myEvents.map(event => {
                    const style = getEventStyle(event.type);
                    const Icon = style.icon;
                    return (
                        <div key={event.id} onClick={() => openModalForDate(null, event)} style={{ background: '#fff', border: `1px solid ${style.border}`, borderLeft: `4px solid ${style.leftBorder}`, borderRadius: '18px', padding: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.05)', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: style.bg, color: style.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icon size={21} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ color: style.text, fontWeight: 900, fontSize: '0.86rem' }}>{event.type}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 800 }}>{eventTimeLabel(event)}</div>
                                    </div>
                                    <div style={{ marginTop: '3px', color: '#0f172a', fontWeight: 900, fontSize: '1rem' }}>{event.title}</div>
                                    {event.location && (
                                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.86rem', fontWeight: 600 }}>
                                            <MapPin size={15} color="#64748b" /> {event.location}
                                        </div>
                                    )}
                                    {event.notes && (
                                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.35 }}>
                                            <MessageSquare size={15} color="#94a3b8" style={{ marginTop: '1px', flexShrink: 0 }} /> {event.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {myLeads.map(lead => {
                    const colors = getStatusColor(lead.status);
                    const location = getLeadLocation(lead);
                    return (
                        <div key={lead.id} onClick={() => setCaseActionSheet({ lead })} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.text}`, borderRadius: '18px', padding: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.05)', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '999px' }}>Sag {lead.case_number || String(lead.id).substring(0,6)}</span>
                                <span style={{ fontSize: '0.78rem', color: colors.text, fontWeight: 900 }}>{lead.status}</span>
                            </div>
                            <div style={{ marginTop: '8px', fontWeight: 900, color: '#0f172a', fontSize: '1.02rem' }}>{lead.raw_data?.project_title || lead.project_category}</div>
                            {location && (
                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.86rem', fontWeight: 600 }}>
                                    <MapPin size={15} color="#64748b" /> {location}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };


    const renderMobileMonthView = () => {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', height: '100vh', overflowY: 'auto', paddingBottom: '100px' }}>
                
                {/* Mobile Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <button onClick={prevPeriod} style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <ChevronLeft size={24} color="#0f172a" />
                        </button>
                        
                        {showMobileSearch ? (
                            <input 
                                autoFocus
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Søg..."
                                style={{ flex: 1, border: 'none', outline: 'none', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', fontSize: '1rem', width: '100%' }}
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: '#0f172a', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                    {format(currentDate, 'MMMM yyyy', { locale: da })}
                                </h2>
                                <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px', marginTop: '8px' }}>
                                    <button onClick={() => setMobileViewType('month')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 16px', borderRadius: '8px', border: 'none', background: mobileViewType === 'month' ? '#fff' : 'transparent', color: mobileViewType === 'month' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: mobileViewType === 'month' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
                                        <CalendarIcon size={16} />
                                    </button>
                                    <button onClick={() => { setMobileViewType('today'); goToToday(); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 16px', borderRadius: '8px', border: 'none', background: mobileViewType === 'today' ? '#fff' : 'transparent', color: mobileViewType === 'today' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: mobileViewType === 'today' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
                                        <Clock size={16} />
                                    </button>
                                    {canViewTimeline && (
                                        <button onClick={() => setMobileViewType('timeline')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 16px', borderRadius: '8px', border: 'none', background: mobileViewType === 'timeline' ? '#fff' : 'transparent', color: mobileViewType === 'timeline' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: mobileViewType === 'timeline' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
                                            <Users size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <button onClick={nextPeriod} style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <ChevronRight size={24} color="#0f172a" />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginLeft: '12px' }}>
                        {/* Søg */}
                        <button onClick={() => { setShowMobileSearch(!showMobileSearch); if(showMobileSearch) setSearchTerm(''); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                            {showMobileSearch ? <X size={22} color="#0f172a" /> : <Search size={22} color="#0f172a" />}
                        </button>
                        
                        {/* Mobil Medarbejder Filter */}
                        {(
                            <button onClick={() => setShowMobileFilter(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', position: 'relative' }}>
                                <Users size={22} color="#0f172a" />
                                {selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes('all') && (
                                    <div style={{ position: 'absolute', top: '-2px', right: '-4px', background: '#3b82f6', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #fff' }} />
                                )}
                            </button>
                        )}
                        
                        {/* Tilføj aftale */}
                        {(
                            <button onClick={() => openAddChooser(selectedMobileDate)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                <Plus size={24} color="#0f172a" strokeWidth={3} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Content Area */}
                {(showMobileSearch && searchTerm.trim() !== '') ? (
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#0f172a' }}>Søgeresultater</h3>
                        {(() => {
                            const term = searchTerm.toLowerCase();
                            const matchedLeads = relevantLeads.filter(l => (l.case_number?.toLowerCase().includes(term) || l.project_category?.toLowerCase().includes(term) || l.raw_data?.project_title?.toLowerCase().includes(term)));
                            const matchedAbsences = allAbsences.filter(a => a.employeeName?.toLowerCase().includes(term) || a.absenceType?.toLowerCase().includes(term));
                            const matchedEvents = calendarEvents.filter(e => e.title?.toLowerCase().includes(term) || e.type?.toLowerCase().includes(term));
                            
                            if (matchedLeads.length === 0 && matchedAbsences.length === 0 && matchedEvents.length === 0) {
                                return <p style={{ color: '#64748b', textAlign: 'center', marginTop: '20px' }}>Ingen resultater for "{searchTerm}"</p>;
                            }

                            return (
                                <>
                                    {matchedEvents.map(e => (
                                        <div key={e.id} onClick={() => openModalForDate(null, e)} style={{ padding: '16px', background: '#ecfdf5', borderLeft: '4px solid #10b981', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#065f46' }}>{e.title}</h4>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#059669' }}>{format(new Date(e.startDate || e.date), 'd. MMM yyyy', { locale: da })} · {eventTimeLabel(e)} · {e.type}</p>
                                                {e.location && <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#047857' }}>{e.location}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    {matchedAbsences.map((a, i) => (
                                        <div key={`abs-${i}`} style={{ padding: '16px', background: '#fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: '12px' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#92400e' }}>{a.employeeName} ({a.absenceType})</h4>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#b45309' }}>{format(new Date(a.date), 'd. MMM yyyy', { locale: da })}</p>
                                        </div>
                                    ))}
                                    {matchedLeads.map(l => (
                                        <div key={l.id} onClick={() => onCaseClick(l)} style={{ padding: '16px', background: '#f8fafc', borderLeft: '4px solid #3b82f6', borderRadius: '12px', cursor: 'pointer' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>{l.project_category} (Sag {l.case_number || l.id})</h4>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#475569' }}>Start: {format(new Date(l.raw_data?.start_date), 'd. MMM yyyy', { locale: da })}</p>
                                        </div>
                                    ))}
                                </>
                            );
                        })()}
                    </div>
                ) : (
                    <>
                        {mobileViewType === 'timeline' ? (() => {
                            const startOfWeekMobile = new Date(currentDate);
                            const dayOfWeekMobile = startOfWeekMobile.getDay();
                            const diffMobile = startOfWeekMobile.getDate() - dayOfWeekMobile + (dayOfWeekMobile === 0 ? -6 : 1);
                            startOfWeekMobile.setDate(diffMobile);

                            return (
                            <div style={{ padding: '0 0 16px 0', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', minWidth: 'max-content', padding: '0 12px' }}>
                                    <div style={{ width: '56px', flexShrink: 0 }}></div>
                                    {Array.from({ length: 5 }).map((_, i) => {
                                        const d = new Date(startOfWeekMobile);
                                        d.setDate(startOfWeekMobile.getDate() + i);
                                        const isToday = new Date().getDate() === d.getDate() && new Date().getMonth() === d.getMonth() && new Date().getFullYear() === d.getFullYear();
                                        const shortDayName = format(d, 'eeeee', { locale: da }); // e.g., 'M', 'T'
                                        return (
                                            <div key={i} style={{ width: '48px', flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: isToday ? '#2563eb' : '#64748b', textTransform: 'uppercase' }}>{shortDayName}</span>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isToday ? '#2563eb' : 'transparent', color: isToday ? '#fff' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '700' }}>
                                                    {d.getDate()}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 'max-content', padding: '0 12px' }}>
                                    {[
                                        { id: String(myProfile?.id), name: myProfile?.owner_name || myProfile?.company_name || 'Mig' },
                                        ...teamMembers.filter(m => String(m.id) !== String(myProfile?.id)).map(m => ({
                                            id: String(m.id),
                                            name: m.owner_name || m.company_name || 'Ukendt'
                                        }))
                                    ].map((emp, empIdx) => {
                                        if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes('all') && !selectedEmployeeIds.includes(emp.id)) return null;

                                        const empAvatar = String(emp.id) === String(myProfile?.id) ? myProfile?.avatar_url : (teamMembers.find(t => String(t.id) === String(emp.id))?.avatar_url);

                                        return (
                                            <div key={emp.id} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <div style={{ width: '56px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                                    <UserAvatar name={emp.name} avatarUrl={empAvatar} size={36} />
                                                </div>
                                                {Array.from({ length: 5 }).map((_, i) => {
                                                    const d = new Date(startOfWeekMobile);
                                                    d.setDate(startOfWeekMobile.getDate() + i);
                                                    const items = getItemsForDay(d);
                                                    const empAbsences = items.absences.filter(a => String(a.employeeId) === emp.id);
                                                    const empLeads = items.leads.filter(l => (l.raw_data?.assigned_workers || []).includes(emp.id) || (l.raw_data?.assigned_pm || []).includes(emp.id));
                                                    const empEvents = items.events.filter(e => e.participants.includes('all') || e.participants.includes(emp.id));
                                                    
                                                    const pills = [];
                                                    if (empAbsences.length > 0) {
                                                        const isSygdom = empAbsences.some(a => a.absenceType === 'Sygdom');
                                                        pills.push(<div key={`abs`} style={{ width: '100%', height: '6px', borderRadius: '3px', background: isSygdom ? '#ef4444' : '#f59e0b' }} />);
                                                    }
                                                    if (empLeads.length > 0) {
                                                        pills.push(<div key={`lead`} style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#3b82f6' }} />);
                                                    }
                                                    if (empEvents.length > 0) {
                                                        pills.push(<div key={`event`} style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#10b981' }} />);
                                                    }

                                                    const isToday = new Date().getDate() === d.getDate() && new Date().getMonth() === d.getMonth() && new Date().getFullYear() === d.getFullYear();

                                                    return (
                                                        <div key={i} 
                                                            onClick={() => {
                                                                if (empLeads.length === 1 && empEvents.length === 0 && empAbsences.length === 0) {
                                                                    setCaseActionSheet({ lead: empLeads[0] });
                                                                } else if (pills.length > 0) {
                                                                    setCurrentDate(d);
                                                                    setMobileViewType('month');
                                                                    setSelectedMobileDate(d);
                                                                }
                                                            }}
                                                            style={{ width: '48px', flexShrink: 0, height: '48px', background: isToday ? '#eff6ff' : '#f8fafc', border: isToday ? '1px solid #bfdbfe' : '1px solid #e2e8f0', borderRadius: '12px', padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', cursor: pills.length > 0 ? 'pointer' : 'default' }}>
                                                            {pills.length === 0 && (
                                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1', margin: '0 auto' }} />
                                                            )}
                                                            {pills}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            );
                        })() : mobileViewType === 'today' ? renderMobileMyDayView() : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                                const { events, absences, leads, isHoliday, registered } = getItemsForDay(selectedMobileDate);
                                const hasAny = events.length > 0 || absences.length > 0 || leads.length > 0 || isHoliday || (registered?.total > 0);

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {!hasAny && (
                                            <div style={{ padding: '24px 0', textAlign: 'center' }}>
                                                <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>Ingen planlagte aktiviteter</p>
                                            </div>
                                        )}

                                        {registered && registered.total > 0 && (
                                            <div style={{ background: '#ecfeff', borderLeft: '4px solid #06b6d4', padding: '12px 16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0e7490', fontWeight: 800, fontSize: '0.95rem' }}>
                                                    <Clock size={18} /> {registered.total.toFixed(2)} timer registreret
                                                </div>
                                                {Object.values(registered.byCase).map((c, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                                                        <span>{c.label}{c.name ? ` · ${c.name}` : ''}</span>
                                                        <strong style={{ color: '#0e7490' }}>{c.hours.toFixed(2)} t</strong>
                                                    </div>
                                                ))}
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
                                                <div key={e.id} onClick={() => openModalForDate(null, e)} style={{ background: style.bg, borderLeft: `4px solid ${style.leftBorder}`, padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                                                    <div style={{ background: 'white', padding: '6px', borderRadius: '50%', color: style.text, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Icon size={18}/></div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ fontWeight: 'bold', color: style.text, fontSize: '0.95rem' }}>{e.type}</div>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>{eventTimeLabel(e)}</div>
                                                        </div>
                                                        <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px', fontSize: '0.95rem' }}>{e.title}</div>
                                                        {e.location && (
                                                            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#64748b' }}>
                                                                <MapPin size={12} /> {e.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {leads.map(lead => {
                                            const colors = getStatusColor(lead.status);
                                            return (
                                                <div key={lead.id} onClick={() => setCaseActionSheet({ lead })} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.bg}`, padding: '12px 16px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
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
                        )}
                    </>
                )}

                {/* MOBILE FILTER MODAL (Fullscreen Centered) */}
                {showMobileFilter && createPortal(
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
                            style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px 20px', width: '100%', maxWidth: '400px', maxHeight: '90vh', position: 'relative', zIndex: 1, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Users size={24} color="#2563eb" /> Vælg Kalender
                                </h2>
                                <button onClick={() => setShowMobileFilter(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={20} color="#64748b" />
                                </button>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto' }} className="custom-scroll">
                                <div 
                                    onClick={() => { setSelectedEmployeeIds(['all']); setShowMobileFilter(false); }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', background: selectedEmployeeIds.includes('all') ? '#eff6ff' : '#f8fafc', border: selectedEmployeeIds.includes('all') ? '2px solid #3b82f6' : '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <span style={{ fontSize: '1.05rem', fontWeight: '700', color: selectedEmployeeIds.includes('all') ? '#1d4ed8' : '#334155' }}>Firmaet (Alle)</span>
                                    {selectedEmployeeIds.includes('all') && <CheckCircle size={22} color="#3b82f6" />}
                                </div>

                                {[
                                    { id: String(myProfile?.id), name: myProfile?.owner_name || myProfile?.company_name || 'Mig', isMe: true },
                                    ...teamMembers.filter(m => String(m.id) !== String(myProfile?.id)).map(m => ({
                                        id: String(m.id),
                                        name: m.owner_name || m.company_name || 'Ukendt',
                                        isMe: false
                                    }))
                                ].map(emp => {
                                    const isSelected = selectedEmployeeIds.includes(emp.id) && !selectedEmployeeIds.includes('all');
                                    return (
                                        <div 
                                            key={emp.id}
                                            onClick={() => { setSelectedEmployeeIds([emp.id]); setShowMobileFilter(false); }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', background: isSelected ? '#eff6ff' : '#fff', border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <UserAvatar name={emp.name} avatarUrl={emp.isMe ? myProfile?.avatar_url : (teamMembers.find(t => String(t.id) === String(emp.id))?.avatar_url)} size={36} />
                                                <span style={{ fontSize: '1.05rem', fontWeight: '600', color: isSelected ? '#1e293b' : '#475569' }}>{emp.name}</span>
                                            </div>
                                            {isSelected && <CheckCircle size={22} color="#3b82f6" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </div>
        );
    };

    // ----------------- RENDER VIEWS -----------------

    const renderTimelineView = () => {
        const startOfWeek = new Date(currentDate);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        return (
            <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflowX: 'auto', overflowY: 'auto' }}>
                <div style={{ minWidth: '100%', paddingBottom: '16px' }}>
                    
                    {/* Header: Dage */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ width: '150px', flexShrink: 0, fontWeight: '800', color: '#0f172a', fontSize: '0.9rem', padding: '12px 8px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 11, borderRight: '1px solid #e2e8f0' }}>Medarbejder</div>
                        {Array.from({ length: 7 }).map((_, idx) => {
                            const checkDate = new Date(startOfWeek);
                            checkDate.setDate(startOfWeek.getDate() + idx);
                            const isToday = new Date().getDate() === checkDate.getDate() && new Date().getMonth() === checkDate.getMonth() && new Date().getFullYear() === checkDate.getFullYear();
                            return (
                                <div key={idx} className="cal-day-header" style={{ flex: 1, minWidth: 0, textAlign: 'center', fontWeight: '700', fontSize: '0.85rem', color: isToday ? '#2563eb' : '#0f172a', background: isToday ? '#eff6ff' : 'transparent', padding: '12px 8px', borderRadius: '8px' }}>
                                    {format(checkDate, 'eee d. MMM', { locale: da })}
                                </div>
                            )
                        })}
                    </div>

                    {/* Rækker (Medarbejdere) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                            { id: String(myProfile?.id), name: myProfile?.owner_name || myProfile?.company_name || 'Mig' },
                            ...teamMembers.filter(m => String(m.id) !== String(myProfile?.id)).map(m => ({
                                id: String(m.id),
                                name: m.owner_name || m.company_name || 'Ukendt'
                            }))
                        ].map(emp => {
                            if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes('all') && !selectedEmployeeIds.includes(emp.id)) return null;

                            return (
                                <div key={emp.id} style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                    <div className="cal-employee-name" style={{ width: '150px', flexShrink: 0, fontWeight: '700', fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', padding: '0 8px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 5, borderRight: '1px solid #e2e8f0' }}>
                                        {emp.name}
                                    </div>
                                    {Array.from({ length: 7 }).map((_, idx) => {
                                        const checkDate = new Date(startOfWeek);
                                        checkDate.setDate(startOfWeek.getDate() + idx);
                                        const items = getItemsForDay(checkDate);
                                        
                                        const empAbsences = items.absences.filter(a => String(a.employeeId) === emp.id);
                                        const empLeads = items.leads.filter(l => (l.raw_data?.assigned_workers || []).includes(emp.id) || (l.raw_data?.assigned_pm || []).includes(emp.id));
                                        const empEvents = items.events.filter(e => e.participants.includes('all') || e.participants.includes(emp.id));
                                        const isOverbooked = empLeads.length + empEvents.length > 1;

                                        return (
                                            <div 
                                                key={idx} 
                                                className="cal-grid-cell"
                                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(226, 232, 240, 0.8)'; }}
                                                onDragLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                                                onDrop={(e) => { 
                                                    e.preventDefault(); 
                                                    e.currentTarget.style.background = '#fff'; 
                                                    handleDropOnDate(checkDate); 
                                                }}
                                                style={{ flex: 1, minWidth: 0, minHeight: '80px', background: '#fff', border: '1px dashed #e2e8f0', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {isOverbooked && <div style={{ fontSize: '0.7rem', color: '#fff', background: '#ef4444', padding: '2px 4px', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>Dobbeltbooket</div>}
                                                
                                                {empAbsences.map((a, i) => (
                                                    <div key={`abs-${i}`} style={{ background: a.absenceType === 'Sygdom' ? '#fef2f2' : '#fff7ed', border: `1px solid ${a.absenceType === 'Sygdom' ? '#fca5a5' : '#fed7aa'}`, borderRadius: '4px', padding: '4px', fontSize: '0.7rem', fontWeight: '700', color: a.absenceType === 'Sygdom' ? '#dc2626' : '#ea580c' }}>
                                                        {a.absenceType}
                                                    </div>
                                                ))}
                                                
                                                {empLeads.map(lead => {
                                                    const colors = getStatusColor(lead.status);
                                                    return (
                                                        <div key={lead.id} 
                                                            className="cal-event-card"
                                                            draggable={canEditLead(lead)}
                                                            onDragStart={() => setDraggedLead(lead)}
                                                            onDragEnd={() => setDraggedLead(null)}
                                                            onClick={(e) => { e.stopPropagation(); if (canClickLead(lead)) onCaseClick(lead); }} 
                                                            style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px', padding: '6px 4px', fontSize: '0.75rem', fontWeight: '700', color: colors.text, cursor: canEditLead(lead) ? 'grab' : (canClickLead(lead) ? 'pointer' : 'default'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            Sag {lead.case_number || String(lead.id).substring(0,4)}
                                                        </div>
                                                    )
                                                })}

                                                {empEvents.map(e => {
                                                    const style = getEventStyle(e.type);
                                                    return (
                                                        <div key={e.id} 
                                                            className="cal-event-card"
                                                            draggable={isManager}
                                                            onDragStart={() => setDraggedEvent(e)}
                                                            onDragEnd={() => setDraggedEvent(null)}
                                                            onClick={(evt) => { evt.stopPropagation(); openModalForDate(null, e); }} 
                                                            style={{ background: style.bg, borderLeft: `3px solid ${style.leftBorder}`, borderRadius: '2px 4px 4px 2px', padding: '4px', fontSize: '0.75rem', cursor: isManager ? 'grab' : 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {eventTimeLabel(e)} {e.title}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    };


    const renderMonthView = () => {
        return (
            <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflowX: 'auto' }}>
                <div style={{ minWidth: '100%', display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '16px' }}>
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
                        const { isHoliday, leads, absences, events, registered } = getItemsForDay(checkDate);
                        const cellDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                        return (
                            <div
                                key={day}
                                data-cal-day={cellDateStr}
                                onClick={() => addDayLead ? handleExtraDayClick(checkDate) : openAddChooser(checkDate)}
                                onMouseOver={e=> { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = addDayLead ? '#7c3aed' : '#3b82f6'; }}
                                onMouseOut={e=> { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = addDayLead ? '#c4b5fd' : (isToday ? '#3b82f6' : '#e2e8f0'); }}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(226, 232, 240, 0.8)'; }}
                                onDragLeave={(e) => { e.currentTarget.style.background = isToday ? '#eff6ff' : (isHoliday ? '#f8fafc' : '#ffffff'); clearDragTimeout(); }}
                                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.background = isToday ? '#eff6ff' : (isHoliday ? '#f8fafc' : '#ffffff'); handleDropOnDate(checkDate); }}
                                style={{
                                    background: isToday ? '#eff6ff' : (isHoliday ? '#f8fafc' : '#ffffff'),
                                    borderRadius: '16px',
                                    border: addDayLead ? '1px dashed #c4b5fd' : (isToday ? '2px solid #3b82f6' : '1px solid #e2e8f0'),
                                    padding: '12px',
                                    display: 'flex', flexDirection: 'column', gap: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                                    transition: 'all 0.2s',
                                    opacity: isHoliday ? 0.7 : 1,
                                    overflow: 'hidden',
                                    cursor: addDayLead ? 'copy' : undefined
                                }}
                            >
                                <span style={{ fontWeight: isToday ? '800' : '600', color: isToday ? '#2563eb' : (isHoliday ? '#94a3b8' : '#64748b'), fontSize: '1.1rem' }}>
                                    {day} {isHoliday && <span style={{fontSize:'0.7rem', marginLeft:'4px'}}>Helligdag</span>}
                                </span>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                                    
                                    {/* MØDER & LEVERINGER */}
                                    {events.map(ev => {
                                        const evStyle = getEventStyle(ev.type);
                                        return (
                                            <div 
                                                key={ev.id} 
                                                onClick={(e) => { e.stopPropagation(); openModalForDate(null, ev); }}
                                                draggable={isManager}
                                                onDragStart={() => setDraggedEvent(ev)}
                                                onDragEnd={() => setDraggedEvent(null)}
                                                style={{ 
                                                    background: evStyle.bg, color: evStyle.text, 
                                                    fontSize: '0.75rem', padding: '4px 6px', 
                                                    borderRadius: '4px', borderLeft: `3px solid ${evStyle.leftBorder}`,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    cursor: isManager ? 'grab' : 'pointer'
                                                }}
                                                title={ev.title}
                                            >
                                                <evStyle.icon size={12}/>
                                                {eventTimeLabel(ev)} - {ev.title}
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
                                        const isExtra = isExtraDayFor(lead, cellDateStr);
                                        return (
                                            <div
                                                key={lead.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (addDayLead) { handleExtraDayClick(checkDate); return; }
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setPopoverLead({ lead, x: rect.left, y: rect.top, dateStr: cellDateStr });
                                                }}
                                                onMouseEnter={(evt) => { const rect = evt.currentTarget.getBoundingClientRect(); setHoverTooltip({ x: rect.left + rect.width/2, y: rect.top, content: `Sag: ${lead.project_category} (${lead.case_number || 'Ny'})${isExtra ? ' · Ekstra dag' : ''}` }); }}
                                                onMouseLeave={() => setHoverTooltip(null)}
                                                draggable={isManager}
                                                onDragStart={() => setDraggedLead(lead)}
                                                style={{
                                                    background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '6px 8px', fontSize: '0.75rem', fontWeight: '700', color: colors.text, cursor: 'pointer',
                                                    borderLeft: isExtra ? `4px dashed ${colors.text}` : (isStartDay ? `4px solid ${colors.text}` : `1px solid ${colors.border}`),
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {isExtra && '＋ '}{lead.case_number || String(lead.id).substring(0,6)}: {lead.raw_data?.project_title || lead.project_category}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* REGISTREREDE TIMER (hvad dagen faktisk gik med, og på hvilken sag).
                                        Klik åbner popover med per-sag-listen (hover-tooltip virker ikke på touch). */}
                                    {registered && registered.total > 0 && (() => {
                                        const cases = Object.values(registered.byCase);
                                        return (
                                        <div
                                            onClick={(evt) => { evt.stopPropagation(); setHoverTooltip(null); const rect = evt.currentTarget.getBoundingClientRect(); setRegisteredPopover({ x: rect.left + rect.width/2, y: rect.bottom, registered }); }}
                                            onMouseEnter={(evt) => { const rect = evt.currentTarget.getBoundingClientRect(); setHoverTooltip({ x: rect.left + rect.width/2, y: rect.top, content: cases.map(c => `${c.label}: ${c.hours.toFixed(2)} t`).join('  ·  ') }); }}
                                            onMouseLeave={() => setHoverTooltip(null)}
                                            style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '8px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 800, color: '#0e7490', cursor: 'pointer' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {registered.total.toFixed(2).replace(/\.?0+$/, '')} t registreret
                                            </div>
                                            {cases.length <= 2 && (
                                                <div style={{ fontWeight: 600, color: '#155e75', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {cases.map(c => c.label).join(' · ')}
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })()}
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
                <div style={{ minWidth: '100%', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', height: '100%', paddingBottom: '16px' }}>
                    {Array.from({ length: 7 }).map((_, idx) => {
                    const checkDate = new Date(startOfWeek);
                    checkDate.setDate(startOfWeek.getDate() + idx);
                    const isToday = new Date().getDate() === checkDate.getDate() && new Date().getMonth() === checkDate.getMonth();
                    const { isHoliday, leads, absences, events, registered } = getItemsForDay(checkDate);

                    return (
                        <div key={idx} onClick={() => addDayLead ? handleExtraDayClick(checkDate) : openAddChooser(checkDate)}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(226, 232, 240, 0.8)'; }}
                            onDragLeave={(e) => { e.currentTarget.style.background = isToday ? '#eff6ff' : '#fff'; clearDragTimeout(); }}
                            onDrop={(e) => { e.preventDefault(); e.currentTarget.style.background = isToday ? '#eff6ff' : '#fff'; handleDropOnDate(checkDate); }}
                            style={{ background: isToday ? '#eff6ff' : '#fff', borderRadius: '16px', border: addDayLead ? '1px dashed #c4b5fd' : '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: addDayLead ? 'copy' : (isManager ? 'pointer' : 'default'), transition: 'all 0.2s' }}
                            onMouseOver={e=> { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = addDayLead ? '#7c3aed' : '#3b82f6'; }}
                            onMouseOut={e=> { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = addDayLead ? '#c4b5fd' : '#e2e8f0'; }}
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
                                        <div key={lead.id} 
                                            draggable={canEditLead(lead)}
                                            onDragStart={() => setDraggedLead(lead)}
                                            onDragEnd={() => setDraggedLead(null)}
                                            onClick={(e) => { e.stopPropagation(); if (canClickLead(lead)) onCaseClick(lead); }} 
                                            style={{ background: colors.bg, borderRadius: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: '700', color: colors.text, cursor: canEditLead(lead) ? 'grab' : (canClickLead(lead) ? 'pointer' : 'default') }}>
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
                                        <div key={e.id}
                                            draggable={isManager}
                                            onDragStart={() => setDraggedEvent(e)}
                                            onDragEnd={() => setDraggedEvent(null)}
                                            onClick={(evt) => { evt.stopPropagation(); openModalForDate(null, e); }}
                                            style={{ background: style.bg, borderLeft: `4px solid ${style.leftBorder}`, borderRadius: '0 8px 8px 0', padding: '8px', fontSize: '0.8rem', cursor: isManager ? 'grab' : 'pointer' }}>
                                            <strong>{eventTimeLabel(e)}</strong><br/>{e.title}
                                            {e.location && <div style={{ marginTop: '4px', color: '#64748b' }}>{e.location}</div>}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Registrerede timer — inkl. hvilken sag de er registreret på */}
                            {registered && registered.total > 0 && (
                                <div style={{ marginTop: 'auto', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '10px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 800, color: '#0e7490' }}>
                                        <Clock size={13} /> {registered.total.toFixed(2).replace(/\.?0+$/, '')} t registreret
                                    </div>
                                    {Object.values(registered.byCase).map((c, i) => (
                                        <div key={i} style={{ fontSize: '0.72rem', color: '#155e75', display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}{c.name ? ` — ${c.name}` : ''}</span>
                                            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{c.hours.toFixed(2).replace(/\.?0+$/, '')} t</span>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                                    
                                    return <div key={dIdx} onClick={(e) => { e.stopPropagation(); openAddChooser(d); }} style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, cursor: isManager ? 'pointer' : 'default' }} title={`${dIdx+1}. ${monthNames[mIdx]}`} />
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
            <div ref={calMainRef} style={{ flex: 1, background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', padding: '32px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Header Row 1: Titel og Filter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div data-tour="calendar-title">
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
                        <div data-tour="calendar-filter" style={{ display: 'flex' }}>
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
                        </div>

                        {/* + Ny Aftale */}
                        {(
                            <button data-tour="calendar-newevent" onClick={() => setShowEventModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', background: '#0f172a', color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'none'}>
                                <Plus size={18} /> Ny Aftale
                            </button>
                        )}
                    </div>
                </div>

                {/* Header Row 2: View Toggles & Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div data-tour="calendar-views" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                        {['month', 'week', 'year', ...(canViewTimeline ? ['timeline'] : [])].map(v => (
                            <button 
                                key={v}
                                onClick={() => setView(v)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: view === v ? '#fff' : 'transparent', color: view === v ? '#0f172a' : '#64748b', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: view === v ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', textTransform: 'capitalize' }}
                                onMouseOver={e=> { if(view !== v) e.currentTarget.style.color = '#0f172a'; }}
                                onMouseOut={e=> { if(view !== v) e.currentTarget.style.color = '#64748b'; }}
                            >
                                {v === 'timeline' && <Users size={16} />}
                                {v === 'month' ? 'Måned' : v === 'week' ? 'Uge' : v === 'year' ? 'År' : 'Personale'}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="cal-nav-btn" onClick={prevPeriod} onDragOver={(e) => handleDragOverNav(e, 'prev')} onDragLeave={clearDragTimeout} onDrop={clearDragTimeout} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={20}/></button>
                        <button className="cal-nav-btn" onClick={() => setCurrentDate(new Date())} onDragOver={(e) => e.preventDefault()} onDrop={clearDragTimeout} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: '600', cursor: 'pointer' }}>I dag</button>
                        <button className="cal-nav-btn" onClick={nextPeriod} onDragOver={(e) => handleDragOverNav(e, 'next')} onDragLeave={clearDragTimeout} onDrop={clearDragTimeout} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight size={20}/></button>
                    </div>
                </div>

                {/* Grid */}
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'year' && renderYearView()}
                {view === 'timeline' && renderTimelineView()}

            </div>

            {/* Sidebar for Ikke-planlagte sager */}
            {canViewTimeline && (() => {
                const pending = unscheduledLeads.filter(l => canEditLead(l));
                return (
                <div data-tour="calendar-sidebar" style={{ width: '340px', background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 4px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Klar til planlægning</h3>
                        {pending.length > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px', height: '24px', padding: '0 7px', borderRadius: '999px', background: '#f1f5f9', color: '#64748b', fontSize: '0.8rem', fontWeight: 800, border: '1px solid #e2e8f0' }}>{pending.length}</span>
                        )}
                    </div>
                    <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#64748b' }}>
                        {pending.length > 0 ? 'Træk ind i kalenderen — eller tryk Planlæg, når du er klar.' : 'Træk ind i kalenderen.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: calendarTourActive ? 'visible' : 'auto' }}>
                        {/* Under rundvisningen: en eksempel-sag (mockup). En spøgelses-kopi
                            "flyver" ind i kalenderen (se flyVars-portal). Forsvinder når turen slutter. */}
                        {calendarTourActive ? (
                            <>
                                <div style={{ position: 'relative', marginTop: 12 }}>
                                    <span style={{ position: 'absolute', top: -10, left: 14, zIndex: 1, background: '#0f172a', color: '#fff', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '20px', boxShadow: '0 4px 10px rgba(15,23,42,0.25)' }}>Eksempel</span>
                                    <div ref={sidebarDemoRef} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'grab' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', alignSelf: 'flex-start' }}>Sag 1043</span>
                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Nyt trægulv i stue</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Bruns Byg ApS</p>
                                        </div>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', borderRadius: '10px', background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>
                                            <CalendarIcon size={15} /> Planlæg
                                        </div>
                                    </div>
                                </div>
                                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', margin: '4px 0 0' }}>← Træk ind i kalenderen, eller tryk Planlæg</p>
                            </>
                        ) : pending.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8' }}>Ingen sager venter.</p>
                        ) : (
                            pending.map(lead => {
                                const customer = lead.customer_name || lead.raw_data?.customer_name;
                                return (
                                <div
                                    key={lead.id} draggable onDragStart={() => setDraggedLead(lead)}
                                    style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', cursor: 'grab', display: 'flex', flexDirection: 'column', gap: '10px' }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', alignSelf: 'flex-start' }}>Sag {lead.case_number || String(lead.id).substring(0,6)}</span>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>{lead.raw_data?.project_title || lead.project_category}</h4>
                                        {customer && <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{customer}</p>}
                                    </div>
                                    {isManager && (
                                        <button
                                            onClick={() => { const t = new Date(); const startStr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`; openScheduleConfirm(lead, startStr, estimerDage(lead), 'new'); }}
                                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', borderRadius: '10px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                                            <CalendarIcon size={15} /> Planlæg
                                        </button>
                                    )}
                                </div>
                                );
                            })
                        )}
                    </div>
                </div>
                );
            })()}
                </div>
            )}

            {/* VÆLG-EKSTRA-DAGE-TILSTAND: flydende glas-pille med instruktion + Færdig */}
            {addDayLead && createPortal(
                <div style={{ position: 'fixed', top: '18px', left: '50%', transform: 'translateX(-50%)', zIndex: 100001, display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 12px 10px 20px', borderRadius: '999px', background: 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(109,40,217,0.92))', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 16px 40px rgba(109,40,217,0.4)', color: '#fff', maxWidth: 'calc(100vw - 32px)' }}>
                    <CalendarIcon size={18} style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Vælg ekstra dage til sag {addDayLead.case_number || String(addDayLead.id).substring(0,6)} — tryk på dagene i kalenderen
                    </div>
                    <button
                        onClick={() => setAddDayLead(null)}
                        style={{ flexShrink: 0, padding: '8px 18px', borderRadius: '999px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,0.35)', transition: 'transform 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        Færdig
                    </button>
                </div>,
                document.body
            )}

            {/* POPOVER TIL SAG I KALENDER */}
            {popoverLead && createPortal(
                <div onClick={() => setPopoverLead(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
                    <div 
                        onClick={e => e.stopPropagation()}
                        style={{ position: 'absolute', top: popoverLead.y + 30, left: popoverLead.x, background: '#fff', borderRadius: '12px', padding: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}
                    >
                        <button onClick={() => { onCaseClick(popoverLead.lead); setPopoverLead(null); }} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#0f172a' }} onMouseOver={e=>e.currentTarget.style.background='#f1f5f9'} onMouseOut={e=>e.currentTarget.style.background='none'}>Gå til Ordrestyring</button>
                        {isManager && <button onClick={() => { const l = popoverLead.lead; setPopoverLead(null); const startStr = l.raw_data?.start_date ? new Date(l.raw_data.start_date).toISOString().substring(0,10) : new Date().toISOString().substring(0,10); openScheduleConfirm(l, startStr, estimerDage(l), 'edit'); }} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#2563eb' }} onMouseOver={e=>e.currentTarget.style.background='#eff6ff'} onMouseOut={e=>e.currentTarget.style.background='none'}>Redigér planlægning</button>}
                        {isManager && <button onClick={() => { setAddDayLead(popoverLead.lead); setPopoverLead(null); }} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#7c3aed' }} onMouseOver={e=>e.currentTarget.style.background='#f5f3ff'} onMouseOut={e=>e.currentTarget.style.background='none'}>Tilføj ekstra dage</button>}
                        {isManager && popoverLead.dateStr && isExtraDayFor(popoverLead.lead, popoverLead.dateStr) && (
                            <button onClick={() => { removeExtraDayFromLead(popoverLead.lead, popoverLead.dateStr); setPopoverLead(null); }} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#ef4444' }} onMouseOver={e=>e.currentTarget.style.background='#fef2f2'} onMouseOut={e=>e.currentTarget.style.background='none'}>Fjern denne dag</button>
                        )}
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

            {/* MODAL: SLET AFTALE BEKRÆFTELSE */}
            {showDeleteConfirm && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000000, padding: '20px' }}>
                    <div style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '24px', padding: '32px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Trash2 size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>Slet aftale?</h3>
                        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>Er du sikker på, at du vil slette denne aftale? Dette kan ikke fortrydes.</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>Annuller</button>
                            <button onClick={confirmDeleteEvent} style={{ flex: 1, padding: '14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>Ja, slet aftale</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL: NY AFTALE */}
            {showEventModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'flex-end' : 'center', zIndex: 100000, padding: isMobile ? 0 : '20px' }}>
                    <div style={{ width: '100%', maxWidth: isMobile ? '100%' : '500px', maxHeight: isMobile ? '92dvh' : '90vh', overflowY: 'auto', background: '#fff', borderRadius: isMobile ? '24px 24px 0 0' : '16px', padding: isMobile ? '24px 20px calc(env(safe-area-inset-bottom) + 24px)' : '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{eventFormData.id ? 'Rediger Aftale' : 'Opret Kalenderaftale'}</h3>
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

                            <button
                                type="button"
                                onClick={() => setEventFormData(prev => ({ ...prev, allDay: !prev.allDay }))}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    border: eventFormData.allDay ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                    background: eventFormData.allDay ? '#eff6ff' : '#fff',
                                    color: eventFormData.allDay ? '#1d4ed8' : '#475569',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={18} /> Heldagsaftale</span>
                                <span style={{ width: '44px', height: '24px', borderRadius: '999px', background: eventFormData.allDay ? '#2563eb' : '#cbd5e1', padding: '3px', boxSizing: 'border-box', display: 'flex', justifyContent: eventFormData.allDay ? 'flex-end' : 'flex-start', transition: 'all 0.2s' }}>
                                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', display: 'block' }} />
                                </span>
                            </button>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Start</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="date" required value={eventFormData.startDate} onChange={e=> {
                                            const newStart = e.target.value;
                                            setEventFormData(prev => ({
                                                ...prev, 
                                                startDate: newStart,
                                                endDate: prev.endDate < newStart ? newStart : prev.endDate,
                                                recurrenceUntil: prev.recurrence !== 'none' && (!prev.recurrenceUntil || prev.recurrenceUntil < newStart) ? getDefaultRecurrenceUntil(newStart) : prev.recurrenceUntil
                                            }))
                                        }} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: 1 }} />
                                        {!eventFormData.allDay && <input type="time" required value={eventFormData.startTime} onChange={e=> {
                                            const newTime = e.target.value;
                                            setEventFormData(prev => {
                                                if (prev.startDate === prev.endDate && prev.endTime < newTime) {
                                                    return {...prev, startTime: newTime, endTime: newTime};
                                                }
                                                return {...prev, startTime: newTime};
                                            })
                                        }} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: 1 }} />}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Slut</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="date" required value={eventFormData.endDate} min={eventFormData.startDate} onChange={e=>setEventFormData({...eventFormData, endDate: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: 1 }} />
                                        {!eventFormData.allDay && <input type="time" required value={eventFormData.endTime} onChange={e=>setEventFormData({...eventFormData, endTime: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: 1 }} />}
                                    </div>
                                </div>
                            </div>

                            {!eventFormData.id ? (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(248,250,252,0.96), rgba(239,246,255,0.9))',
                                    border: '1px solid rgba(191,219,254,0.9)',
                                    boxShadow: '0 14px 30px rgba(15,23,42,0.08)',
                                    borderRadius: '18px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '38px', height: '38px', borderRadius: '14px', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Repeat size={19} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>Gentagelse</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Til faste byggemøder, kontordage eller rutiner</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
                                        {RECURRENCE_OPTIONS.map(option => {
                                            const active = eventFormData.recurrence === option.id;
                                            return (
                                                <motion.button
                                                    key={option.id}
                                                    type="button"
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => setEventFormData(prev => ({
                                                        ...prev,
                                                        recurrence: option.id,
                                                        recurrenceUntil: option.id === 'none' ? '' : (prev.recurrenceUntil || getDefaultRecurrenceUntil(prev.startDate))
                                                    }))}
                                                    style={{
                                                        border: active ? '1px solid #2563eb' : '1px solid #dbeafe',
                                                        background: active ? '#1d4ed8' : 'rgba(255,255,255,0.86)',
                                                        color: active ? '#fff' : '#334155',
                                                        borderRadius: '14px',
                                                        padding: '10px 8px',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 900,
                                                        cursor: 'pointer',
                                                        boxShadow: active ? '0 10px 18px rgba(37,99,235,0.24)' : '0 8px 16px rgba(15,23,42,0.04)'
                                                    }}
                                                >
                                                    {option.short}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                    {eventFormData.recurrence !== 'none' && (
                                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', alignItems: isMobile ? 'stretch' : 'center' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gentag indtil</label>
                                                <input
                                                    type="date"
                                                    min={eventFormData.startDate}
                                                    value={eventFormData.recurrenceUntil || getDefaultRecurrenceUntil(eventFormData.startDate)}
                                                    onChange={e => setEventFormData({ ...eventFormData, recurrenceUntil: e.target.value })}
                                                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '12px', border: '1px solid #bfdbfe', background: '#fff', fontWeight: 800, color: '#0f172a' }}
                                                />
                                            </div>
                                            {(() => {
                                                const preview = getRecurrencePreview({
                                                    ...eventFormData,
                                                    recurrenceUntil: eventFormData.recurrenceUntil || getDefaultRecurrenceUntil(eventFormData.startDate)
                                                });
                                                return (
                                                    <div style={{ flex: 1, background: '#fff', border: '1px solid #dbeafe', borderRadius: '14px', padding: '12px', color: '#1e3a8a', fontSize: '0.84rem', fontWeight: 800, lineHeight: 1.35 }}>
                                                        Opretter {preview.length} aftale{preview.length === 1 ? '' : 'r'} som {getRecurrenceName(eventFormData.recurrence).toLowerCase()}.
                                                        {preview.length >= 60 && <div style={{ marginTop: '4px', color: '#b45309' }}>Grænse: maks. 60 gentagelser ad gangen.</div>}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ) : eventFormData.recurrence && eventFormData.recurrence !== 'none' ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '12px', color: '#1e3a8a', fontSize: '0.84rem', fontWeight: 800, lineHeight: 1.4 }}>
                                    <Repeat size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
                                    <div>Denne aftale er del af en gentagende serie. Ændringer her gælder kun denne ene aftale.</div>
                                </div>
                            ) : null}

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
                                            onChange={(newId) => {
                                                const lead = relevantLeads.find(l => String(l.id) === String(newId));
                                                setEventFormData({
                                                    ...eventFormData,
                                                    selectedLeadId: newId,
                                                    location: eventFormData.location || getLeadLocation(lead)
                                                });
                                            }}
                                            placeholder="-- Vælg en sag --"
                                            showSearch={true}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px', background: '#eff6ff', padding: '12px', borderRadius: '8px' }}>
                                        <AlertCircle size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e3a8a', lineHeight: '1.4' }}>De tømrere og byggeledere, der er tilknyttet denne sag, bliver automatisk sat som deltagere for materialeleveringen.</p>
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

                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Adresse / lokation</label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input placeholder="Fx byggeplads, leveringsadresse eller mødelokale" value={eventFormData.location} onChange={e=>setEventFormData({...eventFormData, location: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 36px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                                {eventFormData.location?.trim() && (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventFormData.location)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                    >
                                        <MapPin size={14} /> Åbn i Google Maps
                                    </a>
                                )}
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Note</label>
                                <textarea placeholder="Fx ring før levering, parkering, nøgleboks, kunden er hjemme efter 12..." value={eventFormData.notes} onChange={e=>setEventFormData({...eventFormData, notes: e.target.value})} rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                            
                            <div style={{ zIndex: 1900, position: 'relative' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', display: 'block' }}>Påmindelse</label>
                                <GorgeousSingleSelect
                                    options={NOTIFICATION_PREFERENCES}
                                    selectedId={eventFormData.notification_preference}
                                    onChange={(newPref) => setEventFormData({...eventFormData, notification_preference: newPref})}
                                    placeholder="Påmindelse"
                                />
                            </div>

                            {(() => {
                                const conflicts = getEventConflictSummary(eventFormData);
                                if (conflicts.length === 0) return null;
                                return (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px', color: '#92400e', fontSize: '0.85rem', lineHeight: 1.45 }}>
                                        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                                        <div>
                                            <strong style={{ display: 'block', marginBottom: '3px' }}>Mulig konflikt i kalenderen</strong>
                                            {conflicts.map((item, index) => <div key={index}>{item}</div>)}
                                            {conflicts.length >= 4 && <div>Der kan være flere konflikter i perioden.</div>}
                                        </div>
                                    </div>
                                );
                            })()}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                {eventFormData.id && canModifyCurrentEvent && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <Trash2 size={18} /> Slet
                                    </button>
                                )}
                                {eventFormData.id && eventFormData.selectedLeadId && typeof onCaseClick === 'function' && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const lead = relevantLeads.find(l => String(l.id) === String(eventFormData.selectedLeadId));
                                            if (lead) {
                                                setShowEventModal(false);
                                                onCaseClick(lead);
                                            }
                                        }}
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        Gå til sag
                                    </button>
                                )}
                                {(!eventFormData.id || canModifyCurrentEvent) ? (
                                    <button type="submit" style={{ flex: eventFormData.id ? 2 : 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                                        {eventFormData.id ? 'Gem ændringer' : 'Opret aftale'}
                                    </button>
                                ) : (
                                    <div style={{ flex: 2, padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', alignSelf: 'center' }}>
                                        Kun opretteren eller en leder kan ændre denne aftale.
                                    </div>
                                )}
                            </div>
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

            {/* POPOVER: DAGENS REGISTREREDE TIMER PR. SAG (klik/touch) */}
            {registeredPopover && createPortal(
                <div onClick={() => setRegisteredPopover(null)} style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            left: Math.min(Math.max(registeredPopover.x, 140), (window.innerWidth || 320) - 140),
                            top: registeredPopover.y + 8,
                            transform: 'translateX(-50%)',
                            width: '260px', maxHeight: '50vh', overflowY: 'auto',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.97), rgba(255,255,255,0.92))',
                            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                            border: '1px solid rgba(165,243,252,0.9)', borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(15,23,42,0.18)', padding: '14px 16px',
                            animation: 'fadeIn 0.15s ease-out'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: '#0e7490' }}>
                                <Clock size={15} /> {registeredPopover.registered.total.toFixed(2).replace(/\.?0+$/, '')} t registreret
                            </div>
                            <button onClick={() => setRegisteredPopover(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex' }}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Object.values(registeredPopover.registered.byCase).map((c, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '10px', padding: '8px 10px' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#155e75', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>
                                        {c.name && <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0e7490', whiteSpace: 'nowrap' }}>{c.hours.toFixed(2).replace(/\.?0+$/, '')} t</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}

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
            {/* MODAL: "+"-VÆLGER (Ny begivenhed / Tilføj sag) */}
            {showAddChooser && createPortal(
                <div onClick={() => { setShowAddChooser(false); setChooserDate(null); }} style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '20px' }}>
                    <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: isMobile ? 40 : 16, scale: isMobile ? 1 : 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: '#fff', width: '100%', maxWidth: isMobile ? '100%' : '440px', borderRadius: isMobile ? '24px 24px 0 0' : '24px', padding: isMobile ? '24px 20px calc(env(safe-area-inset-bottom) + 24px)' : '28px', boxShadow: '0 24px 48px -12px rgba(15,23,42,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Tilføj til kalenderen</h3>
                                {chooserDate && <p style={{ margin: '3px 0 0', fontSize: '0.88rem', color: '#64748b', textTransform: 'capitalize' }}>{format(chooserDate, 'EEEE d. MMMM', { locale: da })}</p>}
                            </div>
                            <button onClick={() => { setShowAddChooser(false); setChooserDate(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { Icon: Briefcase, color: '#7c3aed', bg: '#ede9fe', title: 'Planlæg en sag', desc: 'Vælg en sag og læg den i kalenderen', onClick: () => { setShowAddChooser(false); setShowCasePicker(true); } },
                                { Icon: CalendarIcon, color: '#0284c7', bg: '#e0f2fe', title: 'Opret kalenderaftale', desc: 'Møde, levering, arrangement m.m.', onClick: () => { setShowAddChooser(false); openModalForDate(chooserDate || selectedMobileDate); } }
                            ].map((opt, i) => {
                                const Icon = opt.Icon;
                                return (
                                    <button key={i} onClick={opt.onClick} style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = opt.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 18px rgba(15,23,42,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                        <div style={{ width: '46px', height: '46px', flexShrink: 0, borderRadius: '14px', background: opt.bg, color: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={22} /></div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.02rem' }}>{opt.title}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{opt.desc}</div>
                                        </div>
                                        <ChevronRight size={18} color="#cbd5e1" />
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}

            {/* MODAL: VÆLG SAG (fuldskærm på mobil) */}
            {showCasePicker && createPortal(
                <div onClick={() => { setShowCasePicker(false); setCasePickerSearch(''); }} style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '20px' }}>
                    <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: '#fff', width: '100%', maxWidth: isMobile ? '100%' : '520px', height: isMobile ? '100dvh' : 'auto', maxHeight: isMobile ? '100dvh' : '85vh', borderRadius: isMobile ? 0 : '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px -12px rgba(15,23,42,0.3)' }}>
                        <div style={{ padding: isMobile ? 'calc(env(safe-area-inset-top) + 16px) 20px 16px' : '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Vælg sag</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Bekræftede og igangværende sager</p>
                            </div>
                            <button onClick={() => { setShowCasePicker(false); setCasePickerSearch(''); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}><X size={18} /></button>
                        </div>
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input value={casePickerSearch} onChange={e => setCasePickerSearch(e.target.value)} placeholder="Søg sag eller kunde..." style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none' }} />
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(() => {
                                const term = casePickerSearch.toLowerCase();
                                // Vis alle tilgængelige sager (ikke begrænset af hold-dropdownen), så
                                // også uplanlagte/utildelte sager kan vælges og planlægges herfra.
                                const list = accessibleLeads.filter(l => !term || (l.case_number?.toLowerCase().includes(term) || l.project_category?.toLowerCase().includes(term) || l.customer_name?.toLowerCase().includes(term) || l.raw_data?.project_title?.toLowerCase().includes(term)));
                                if (list.length === 0) return <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '24px' }}>Ingen sager fundet</p>;
                                return list.map(lead => {
                                    const days = estimerDage(lead);
                                    const scheduled = !!lead.raw_data?.start_date;
                                    return (
                                        <button key={lead.id} onClick={() => {
                                            // Start på den dag brugeren trykkede på i kalenderen (falder tilbage
                                            // til sagens egen dato, hvis den allerede er planlagt, ellers i dag).
                                            const base = chooserDate || (isMobile ? selectedMobileDate : new Date());
                                            const startStr = lead.raw_data?.start_date ? new Date(lead.raw_data.start_date).toISOString().substring(0, 10) : `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
                                            setShowCasePicker(false);
                                            setChooserDate(null);
                                            openScheduleConfirm(lead, startStr, days, scheduled ? 'edit' : 'new');
                                        }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#f8fafc'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}>
                                            <div style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Briefcase size={20} /></div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.98rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.raw_data?.project_title || lead.project_category}</div>
                                                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Sag {lead.case_number || String(lead.id).substring(0, 6)} · ~{days} dage{scheduled ? ' · planlagt' : ''}</div>
                                            </div>
                                            <ChevronRight size={18} color="#cbd5e1" />
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}

            {/* MODAL: VARIGHEDS-BEKRÆFTELSE (mobil + desktop) */}
            {scheduleConfirm && createPortal(
                <div onClick={() => setScheduleConfirm(null)} style={{ position: 'fixed', inset: 0, zIndex: 100001, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '20px' }}>
                    <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: isMobile ? 40 : 16, scale: isMobile ? 1 : 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: '#fff', width: '100%', maxWidth: isMobile ? '100%' : '460px', maxHeight: isMobile ? '92vh' : '90vh', overflowY: 'auto', borderRadius: isMobile ? '24px 24px 0 0' : '24px', padding: isMobile ? '24px 20px calc(env(safe-area-inset-bottom) + 24px)' : '28px', boxShadow: '0 24px 48px -12px rgba(15,23,42,0.35)' }}>
                        {(() => {
                            const lead = scheduleConfirm.lead;
                            const startStr = scheduleConfirm.startDate;
                            const days = scheduleConfirm.durationDays;
                            const allowWknd = scheduleConfirm.allowWeekends;
                            const allowHol = scheduleConfirm.allowHolidays;
                            const end = endFromDuration(startStr, days, allowWknd, allowHol);
                            const collision = checkCollision(lead, new Date(startStr + 'T00:00:00'), end, allowWknd, allowHol);
                            // Var sagen allerede planlagt, da modalen blev åbnet? (edit-tilstand)
                            const alreadyScheduled = scheduleConfirm.mode === 'edit' && !!lead.raw_data?.start_date;
                            const existingStart = lead.raw_data?.start_date ? new Date(lead.raw_data.start_date) : null;
                            const existingEnd = lead.raw_data?.end_date ? new Date(lead.raw_data.end_date) : existingStart;
                            return (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CalendarIcon size={24} /></div>
                                        <div style={{ minWidth: 0 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{scheduleConfirm.mode === 'edit' ? 'Redigér planlægning' : 'Planlæg sag'}</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.raw_data?.project_title || lead.project_category} · Sag {lead.case_number || String(lead.id).substring(0, 6)}</p>
                                        </div>
                                    </div>

                                    {alreadyScheduled ? (
                                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '14px 16px', marginBottom: '18px', color: '#92400e', fontSize: '0.95rem', lineHeight: 1.5, display: 'flex', gap: '10px' }}>
                                            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                                            <span>Denne sag er allerede planlagt <strong style={{ textTransform: 'capitalize' }}>{format(existingStart, 'd. MMM', { locale: da })} – {format(existingEnd, 'd. MMM yyyy', { locale: da })}</strong>. Vil du ændre eller forlænge perioden nedenfor?</span>
                                        </div>
                                    ) : (
                                        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '14px', padding: '14px 16px', marginBottom: '18px', color: '#0369a1', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                            Denne sag er estimeret til at vare <strong>{estimatFraTimer(lead)} dage</strong>. Passer det — eller vil du justere?
                                        </div>
                                    )}

                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Startdato</label>
                                    <input type="date" value={startStr} onChange={e => setScheduleConfirm(s => ({ ...s, startDate: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none', marginBottom: '16px' }} />

                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Varighed</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button onClick={() => setScheduleConfirm(s => ({ ...s, durationDays: Math.max(1, s.durationDays - 1) }))} style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>−</button>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{days} {days === 1 ? 'dag' : 'dage'}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'capitalize' }}>{format(new Date(startStr + 'T00:00:00'), 'd. MMM', { locale: da })} – {format(end, 'd. MMM yyyy', { locale: da })}</div>
                                        </div>
                                        <button onClick={() => setScheduleConfirm(s => ({ ...s, durationDays: s.durationDays + 1 }))} style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>+</button>
                                    </div>

                                    {collision && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '10px 12px', color: '#b45309', fontSize: '0.85rem', marginTop: '14px' }}>
                                            <AlertCircle size={16} style={{ flexShrink: 0 }} /> Der er allerede ferie eller en anden sag i perioden.
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '18px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                                            <input type="checkbox" checked={allowWknd} onChange={e => setScheduleConfirm(s => ({...s, allowWeekends: e.target.checked}))} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f172a' }} />
                                            Inkludér weekender
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                                            <input type="checkbox" checked={allowHol} onChange={e => setScheduleConfirm(s => ({...s, allowHolidays: e.target.checked}))} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f172a' }} />
                                            Inkludér helligdage
                                        </label>
                                    </div>

                                    {/* EKSTRA DAGE — interaktiv mini-kalender: klik enkeltdage til/fra (fx man + fre),
                                        eller vælg en dato manuelt. Gemmes først når man trykker Planlæg/Gem. */}
                                    {(() => {
                                        const extraDays = scheduleConfirm.extraDays || [];
                                        const mainDays = mainRangeDaysSet(startStr, days, allowWknd, allowHol);
                                        const anchor = new Date(`${scheduleConfirm.calMonth || startStr.slice(0, 7)}-01T00:00:00`);
                                        const y = anchor.getFullYear(), m = anchor.getMonth();
                                        const daysInM = new Date(y, m + 1, 0).getDate();
                                        const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // mandag = 0
                                        const todayStr = toLocalDateStr(new Date());
                                        const shiftMonth = (delta) => setScheduleConfirm(s => {
                                            const d = new Date(anchor); d.setMonth(d.getMonth() + delta);
                                            return { ...s, calMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
                                        });
                                        const toggleDay = (ds) => setScheduleConfirm(s => {
                                            const cur = s.extraDays || [];
                                            return { ...s, extraDays: cur.includes(ds) ? cur.filter(x => x !== ds) : [...cur, ds].sort() };
                                        });
                                        const addFromInput = () => {
                                            const ds = scheduleConfirm.extraInput;
                                            if (!ds) return;
                                            if (mainDays.has(ds)) { toast('Dagen ligger allerede i hovedperioden.', { icon: 'ℹ️' }); return; }
                                            if (extraDays.includes(ds)) { toast('Dagen er allerede tilføjet.', { icon: 'ℹ️' }); return; }
                                            setScheduleConfirm(s => ({ ...s, extraDays: [...(s.extraDays || []), ds].sort(), extraInput: '', calMonth: ds.slice(0, 7) }));
                                        };
                                        const navBtn = { width: '32px', height: '32px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 };
                                        return (
                                            <div style={{ marginTop: '18px' }}>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Ekstra dage <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(valgfrit)</span></label>
                                                <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.45 }}>
                                                    Tryk på dage i kalenderen for at planlægge enkeltdage udenfor perioden — fx mandag og fredag uden dagene imellem. <span style={{ color: '#2563eb', fontWeight: 600 }}>Blå</span> = hovedperioden, <span style={{ color: '#7c3aed', fontWeight: 600 }}>lilla</span> = dine ekstra dage.
                                                </p>
                                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', background: '#fff' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                        <button type="button" onClick={() => shiftMonth(-1)} style={navBtn} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}><ChevronLeft size={16} /></button>
                                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', textTransform: 'capitalize' }}>{format(anchor, 'MMMM yyyy', { locale: da })}</div>
                                                        <button type="button" onClick={() => shiftMonth(1)} style={navBtn} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}><ChevronRight size={16} /></button>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                                                        {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d, i) => (
                                                            <div key={i} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{d}</div>
                                                        ))}
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                                        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
                                                        {Array.from({ length: daysInM }).map((_, i) => {
                                                            const dayNum = i + 1;
                                                            const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                                            const isMain = mainDays.has(ds);
                                                            const isExtra = extraDays.includes(ds);
                                                            const isToday = ds === todayStr;
                                                            return (
                                                                <button
                                                                    key={ds}
                                                                    type="button"
                                                                    onClick={() => isMain ? toast('Dagen ligger allerede i hovedperioden.', { icon: 'ℹ️' }) : toggleDay(ds)}
                                                                    title={isMain ? 'Hovedperiode' : (isExtra ? 'Fjern ekstra dag' : 'Tilføj som ekstra dag')}
                                                                    style={{
                                                                        height: '36px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700,
                                                                        border: isToday && !isMain && !isExtra ? '2px solid #93c5fd' : '1px solid transparent',
                                                                        background: isMain ? '#2563eb' : (isExtra ? '#7c3aed' : '#f8fafc'),
                                                                        color: (isMain || isExtra) ? '#fff' : '#475569',
                                                                        cursor: isMain ? 'default' : 'pointer',
                                                                        transition: 'all 0.12s ease',
                                                                        padding: 0
                                                                    }}
                                                                    onMouseEnter={e => { if (!isMain && !isExtra) { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.color = '#6d28d9'; e.currentTarget.style.border = '1px solid #c4b5fd'; } }}
                                                                    onMouseLeave={e => { if (!isMain && !isExtra) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.border = isToday ? '2px solid #93c5fd' : '1px solid transparent'; } }}
                                                                >
                                                                    {dayNum}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                {extraDays.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                                        {extraDays.map(d => (
                                                            <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f5f3ff', border: '1px dashed #c4b5fd', borderRadius: '999px', padding: '5px 7px 5px 11px', fontSize: '0.8rem', fontWeight: 700, color: '#6d28d9' }}>
                                                                {format(new Date(d + 'T00:00:00'), 'EEE d. MMM', { locale: da })}
                                                                <button type="button" onClick={() => toggleDay(d)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', border: 'none', background: '#ede9fe', color: '#7c3aed', cursor: 'pointer', padding: 0 }}><X size={11} /></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                                    <input type="date" value={scheduleConfirm.extraInput || ''} onChange={e => setScheduleConfirm(s => ({ ...s, extraInput: e.target.value }))}
                                                        style={{ flex: 1, boxSizing: 'border-box', padding: '11px 12px', borderRadius: '11px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none', color: '#0f172a' }} />
                                                    <button type="button" onClick={addFromInput} disabled={!scheduleConfirm.extraInput}
                                                        style={{ flexShrink: 0, padding: '11px 16px', borderRadius: '11px', border: 'none', background: scheduleConfirm.extraInput ? '#7c3aed' : '#e2e8f0', color: scheduleConfirm.extraInput ? '#fff' : '#94a3b8', fontWeight: 800, fontSize: '0.88rem', cursor: scheduleConfirm.extraInput ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Plus size={15} /> Tilføj dag
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {isManager && assignableMembers.length > 0 && (() => {
                                        const selected = scheduleConfirm.assignedWorkers || [];
                                        const toggle = (id) => setScheduleConfirm(s => {
                                            const cur = s.assignedWorkers || [];
                                            return { ...s, assignedWorkers: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
                                        });
                                        return (
                                            <div style={{ marginTop: '18px' }}>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Hold på opgaven</label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {assignableMembers.map(m => {
                                                        const id = String(m.id);
                                                        const active = selected.includes(id);
                                                        const name = m.owner_name || m.company_name || 'Medarbejder';
                                                        return (
                                                            <button key={id} type="button" onClick={() => toggle(id)}
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 12px 7px 7px', borderRadius: '999px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, transition: 'all 0.15s', border: active ? '1px solid #2563eb' : '1px solid #e2e8f0', background: active ? '#eff6ff' : '#fff', color: active ? '#1d4ed8' : '#475569' }}>
                                                                <UserAvatar name={name} avatarUrl={m.avatar_url} size={22} ring={false} />
                                                                {name.split(' ')[0]}
                                                                {active && <CheckCircle size={15} />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {selected.length === 0 && (
                                                    <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Vælg hvem der er sat på opgaven.</p>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '22px' }}>
                                        <button onClick={() => setScheduleConfirm(null)} style={{ flex: '0 0 auto', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Annullér</button>
                                        <button onClick={saveSchedule} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 16px rgba(15,23,42,0.2)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                            <CheckCircle size={18} /> {scheduleConfirm.mode === 'edit' ? 'Gem ændringer' : 'Planlæg i kalender'}
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </motion.div>
                </div>,
                document.body
            )}

            {/* MODAL: VALGMENU VED TRYK PÅ SAG (mobil) */}
            {caseActionSheet && createPortal(
                <div onClick={() => setCaseActionSheet(null)} style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: '#fff', width: '100%', borderRadius: '24px 24px 0 0', padding: '20px 20px calc(env(safe-area-inset-bottom) + 20px)', boxShadow: '0 -8px 32px rgba(15,23,42,0.18)' }}>
                        <div style={{ marginBottom: '14px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{caseActionSheet.lead.raw_data?.project_title || caseActionSheet.lead.project_category}</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Sag {caseActionSheet.lead.case_number || String(caseActionSheet.lead.id).substring(0, 6)}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { Icon: Briefcase, label: 'Åbn sag', color: '#0f172a', onClick: () => { const l = caseActionSheet.lead; setCaseActionSheet(null); onCaseClick(l); } },
                                ...(isManager ? [{ Icon: CalendarIcon, label: 'Redigér planlægning', color: '#2563eb', onClick: () => { const l = caseActionSheet.lead; setCaseActionSheet(null); const startStr = l.raw_data?.start_date ? new Date(l.raw_data.start_date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10); openScheduleConfirm(l, startStr, estimerDage(l), 'edit'); } }] : []),
                                ...(isManager ? [{ Icon: Plus, label: 'Tilføj ekstra dag', color: '#7c3aed', onClick: () => { const l = caseActionSheet.lead; setCaseActionSheet(null); setExtraDaySheet({ leadId: l.id, dateInput: toLocalDateStr(selectedMobileDate || new Date()) }); } }] : []),
                                ...(isManager ? [{ Icon: Trash2, label: 'Fjern fra kalender', color: '#ef4444', onClick: () => unscheduleLead(caseActionSheet.lead) }] : [])
                            ].map((a, i) => {
                                const Icon = a.Icon;
                                return (
                                    <button key={i} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left', background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: '14px', padding: '15px', cursor: 'pointer', color: a.color, fontWeight: 600, fontSize: '1rem', transition: 'all 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                                        <Icon size={20} /> {a.label}
                                    </button>
                                );
                            })}
                            <button onClick={() => setCaseActionSheet(null)} style={{ marginTop: '4px', padding: '14px', borderRadius: '14px', border: 'none', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>Luk</button>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}

            {/* MODAL: EKSTRA DAGE (mobil) — datovælger + chips over sagens ekstra dage */}
            {extraDaySheet && createPortal(
                (() => {
                    const sheetLead = leadsData.find(l => l.id === extraDaySheet.leadId);
                    if (!sheetLead) return null;
                    const days = leadExtraDays(sheetLead);
                    return (
                        <div onClick={() => setExtraDaySheet(null)} style={{ position: 'fixed', inset: 0, zIndex: 100001, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '24px 24px 0 0', padding: '20px 20px calc(env(safe-area-inset-bottom) + 20px)', boxShadow: '0 -8px 32px rgba(15,23,42,0.18)' }}>
                                <div style={{ width: '40px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', margin: '0 auto 18px auto' }} />
                                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Plus size={18} color="#7c3aed" /> Ekstra dage
                                </h3>
                                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                                    Sag {sheetLead.case_number || String(sheetLead.id).substring(0, 6)} — planlæg enkeltdage udover den sammenhængende periode.
                                </p>
                                {days.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                        {days.map(d => (
                                            <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f5f3ff', border: '1px dashed #c4b5fd', borderRadius: '999px', padding: '6px 8px 6px 12px', fontSize: '0.82rem', fontWeight: 700, color: '#6d28d9' }}>
                                                {format(new Date(d + 'T00:00:00'), 'EEE d. MMM', { locale: da })}
                                                <button onClick={() => removeExtraDayFromLead(sheetLead, d)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: '#ede9fe', color: '#7c3aed', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="date"
                                        value={extraDaySheet.dateInput}
                                        onChange={(e) => setExtraDaySheet(prev => ({ ...prev, dateInput: e.target.value }))}
                                        style={{ flex: 1, padding: '13px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontWeight: 600, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                    <button
                                        onClick={() => { if (extraDaySheet.dateInput) addExtraDayToLead(sheetLead, extraDaySheet.dateInput); }}
                                        style={{ flexShrink: 0, padding: '13px 20px', borderRadius: '12px', border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 6px 16px rgba(124,58,237,0.3)' }}
                                    >
                                        Tilføj dag
                                    </button>
                                </div>
                                <button onClick={() => setExtraDaySheet(null)} style={{ marginTop: '14px', width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Færdig</button>
                            </motion.div>
                        </div>
                    );
                })(),
                document.body
            )}

            {/* Rundtur for Kalender — kun desktop, første gang. */}
            {!isMobile && calendarTourActive && (
                <SectionTour
                    tourKey="calendar_tour"
                    steps={CALENDAR_TOUR_STEPS}
                    onStepChange={setCalendarStep}
                    onDone={() => setCalendarTourActive(false)}
                />
            )}

            {/* Spøgelses-kopi der "flyver" fra eksempel-sagen ind i kalenderen (sidste trin).
                Lagt over spotlight-dæmpningen (z over hullet, under boblen), så den ses. */}
            {flyVars && createPortal(
                <>
                    <style>{`
                        @keyframes calFly{0%{transform:translate(0,0) scale(1) rotate(0);opacity:0;}10%{opacity:1;}16%{transform:translate(-6px,-8px) scale(1.03) rotate(-2deg);}66%{transform:translate(var(--fly-dx),var(--fly-dy)) scale(.82) rotate(-3deg);opacity:1;}80%{transform:translate(var(--fly-dx),var(--fly-dy)) scale(.66) rotate(0);opacity:0;}100%{transform:translate(var(--fly-dx),var(--fly-dy)) scale(.66);opacity:0;}}
                        @keyframes calLand{0%,62%{opacity:0;transform:scale(.6) translateY(-6px);}70%{opacity:1;transform:scale(1.08) translateY(0);}77%{transform:scale(1);}90%{opacity:1;}100%{opacity:0;transform:scale(1);}}
                    `}</style>
                    {/* spøgelses-kortet der flyver */}
                    <div style={{ position: 'fixed', left: flyVars.left, top: flyVars.top, width: flyVars.width, transformOrigin: 'top left', zIndex: 100045, pointerEvents: 'none', ['--fly-dx']: `${flyVars.dx}px`, ['--fly-dy']: `${flyVars.dy}px`, animation: 'calFly 2.8s ease-in-out infinite' }}>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px', boxShadow: '0 24px 48px rgba(15,23,42,0.30)' }}>
                            <span style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '8px' }}>Sag 1043</span>
                            <h4 style={{ margin: '8px 0 2px', fontSize: '0.95rem', fontWeight: 700 }}>Nyt trægulv i stue</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Bruns Byg ApS</p>
                        </div>
                    </div>
                    {/* den landede aftale — popper op PÅ de rigtige dage i kalenderen,
                        lige når kortet "slippes", og strækker sig over flere dage. */}
                    {(flyVars.cells || []).map((cell, i) => (
                        <div key={i} style={{ position: 'fixed', left: cell.left + 8, top: cell.top + 38, width: cell.width - 16, zIndex: 100045, pointerEvents: 'none', transformOrigin: 'top left', animation: 'calLand 2.8s ease-in-out infinite', animationDelay: `${i * 90}ms` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#ecfdf5', borderLeft: '3px solid #10b981', borderRadius: '4px', padding: '4px 6px', boxShadow: '0 6px 16px rgba(16,185,129,0.22)' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i === 0 ? 'Nyt trægulv i stue' : 'Trægulv'}</span>
                            </div>
                        </div>
                    ))}
                </>,
                document.body
            )}
        </>
    );
};

export default CalendarView;
