import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Calendar, Plus, Clock, TrendingUp, AlertTriangle, Edit2, Trash2, X, Save, FileText, Lock, RotateCcw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { isWeekendOrHoliday } from '../../utils/holidays';
import { fetchPayrollSettings, isDateLocked, formatDa, getEffectiveLockedUntil, getConfig, suggestedBreakMinutes } from '../../utils/payroll';
import { mutateTimeEntries } from '../../utils/timeEntries';
import TimeRegistrationReminder from './TimeRegistrationReminder';

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
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%', minWidth: '180px' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    border: isOpen ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.1)', 
                    backgroundColor: 'rgba(255,255,255,0.7)', 
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: value ? '#1e293b' : '#94a3b8',
                    transition: 'all 0.2s',
                    boxShadow: isOpen ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)'
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

export default function WorkerTimesheet({ leadsData, myProfile, simulatedRole }) {
    const [selectedPeriod, setSelectedPeriod] = useState('this_month');
    const [payrollSettings, setPayrollSettings] = useState(null);
    const lockedUntil = getEffectiveLockedUntil(payrollSettings);
    const entryLocked = (entry) => isDateLocked(entry?.date, lockedUntil);

    useEffect(() => {
        const cid = myProfile?.company_id || myProfile?.id;
        if (cid) fetchPayrollSettings(cid).then(setPayrollSettings);
    }, [myProfile]);
    
    useEffect(() => {
        const handleOpenAdd = (e) => {
            const date = e.detail?.date || new Date().toISOString().substring(0, 10);
            setFormData({ 
                date: date, 
                endDate: date,
                regType: 'project',
                leadId: '', 
                absenceType: 'Sygdom',
                desc: '', 
                hours: '', 
                km: '', 
                startTime: '07:00', 
                endTime: '15:00',
                pauseMinutes: '30'
            });
            setIsAdding(true);
            setEditingEntry(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        window.addEventListener('open-add-timesheet', handleOpenAdd);
        return () => window.removeEventListener('open-add-timesheet', handleOpenAdd);
    }, []);
    
    // CRUD States
    const [isAdding, setIsAdding] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [deletingEntry, setDeletingEntry] = useState(null);
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().substring(0, 10), 
        endDate: new Date().toISOString().substring(0, 10),
        regType: 'project',
        leadId: '', 
        absenceType: 'Sygdom',
        desc: '', 
        hours: '', 
        km: '', 
        startTime: '07:00', 
        endTime: '15:00',
        pauseMinutes: '30'
    });

    // Auto-beregn timer ud fra start og slut og pause
    useEffect(() => {
        if (formData.startTime && formData.endTime) {
            const [sH, sM] = formData.startTime.split(':').map(Number);
            const [eH, eM] = formData.endTime.split(':').map(Number);
            let diffHours = (eH + eM/60) - (sH + sM/60);
            if (diffHours < 0) diffHours += 24; // If crossing midnight
            
            const pauseHours = (parseInt(formData.pauseMinutes) || 0) / 60;
            let finalHours = diffHours - pauseHours;
            if (finalHours < 0) finalHours = 0;
            
            setFormData(prev => ({ ...prev, hours: (Math.round(finalHours * 4) / 4).toString() }));
        }
    }, [formData.startTime, formData.endTime, formData.pauseMinutes]);

    // Tærskel-bevidst standard-pause ved NY registrering (firmaets regel, fx 30 min over 5 t).
    // Rører ikke en eksisterende registrering man redigerer, og kan altid overskrives manuelt.
    useEffect(() => {
        if (!isAdding || !formData.startTime || !formData.endTime) return;
        const [sH, sM] = formData.startTime.split(':').map(Number);
        const [eH, eM] = formData.endTime.split(':').map(Number);
        let gross = (eH + eM / 60) - (sH + sM / 60);
        if (gross < 0) gross += 24;
        const suggested = suggestedBreakMinutes(gross, getConfig(payrollSettings));
        setFormData(prev => (String(prev.pauseMinutes) === String(suggested) ? prev : { ...prev, pauseMinutes: String(suggested) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.startTime, formData.endTime, isAdding, payrollSettings]);

    // Opsamling af alle registreringer for DENNE ENE medarbejder
    const allEntries = useMemo(() => {
        let entries = [];
        leadsData.forEach(lead => {
            const leadEntries = lead.raw_data?.time_entries || [];
            leadEntries.forEach(t => {
                if (t.employeeId === myProfile?.id) {
                    entries.push({
                        ...t,
                        source: 'lead',
                        leadId: lead.id,
                        caseNumber: lead.case_number || String(lead.id).substring(0, 6),
                        leadName: lead.customer_name
                    });
                }
            });
        });

        const profileEntries = myProfile?.raw_data?.time_entries || [];
        profileEntries.forEach(t => {
            entries.push({
                ...t,
                source: 'profile',
                leadId: 'internal',
                caseNumber: 'INT',
                leadName: t.absenceType ? `Internt: ${t.absenceType}` : 'Internt / Fravær'
            });
        });

        return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [leadsData, myProfile]);

    // Ferie-logik (Lightweight HR)
    const vacationQuota = myProfile?.raw_data?.vacation_quota || 30; // Standard 30 dage
    
    const usedVacationDays = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const ferieEntries = allEntries.filter(e => {
            if (e.absenceType !== 'Ferie') return false;
            if (new Date(e.date).getFullYear() !== currentYear) return false;
            // Hvis det er en weekend eller helligdag, tæller det IKKE som en brugt feriedag
            if (isWeekendOrHoliday(e.date)) return false;
            return true;
        });
        const uniqueFerieDates = new Set(ferieEntries.map(e => e.date));
        return uniqueFerieDates.size;
    }, [allEntries]);
    
    const remainingVacationDays = vacationQuota - usedVacationDays;
    
    const [showVacationWarning, setShowVacationWarning] = useState(false);
    const [pendingSaveEvent, setPendingSaveEvent] = useState(null);

    const getPeriodDates = () => {
        const now = new Date();
        now.setHours(0,0,0,0);
        let start, end;
        
        const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 is Monday
        
        if (selectedPeriod === 'this_week') {
            start = new Date(now);
            start.setDate(now.getDate() - dayOfWeek);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23,59,59,999);
        } else if (selectedPeriod === 'last_week') {
            start = new Date(now);
            start.setDate(now.getDate() - dayOfWeek - 7);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23,59,59,999);
        } else if (selectedPeriod === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (selectedPeriod === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        } else if (selectedPeriod === 'this_year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        }
        
        return { start, end };
    };

    // Filtrering på periode
    const filteredEntries = useMemo(() => {
        const { start, end } = getPeriodDates();
        return allEntries.filter(entry => {
            const d = new Date(entry.date);
            return d >= start && d <= end;
        });
    }, [allEntries, selectedPeriod]);

    // Data til grafen (Stacked)
    const chartData = useMemo(() => {
        const dataMap = {};
        const reversedEntries = [...filteredEntries].reverse();
        reversedEntries.forEach(entry => {
            const dateStr = new Date(entry.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
            if (!dataMap[dateStr]) dataMap[dateStr] = { name: dateStr, hours: 0, absenceHours: 0 };
            
            if (entry.leadId === 'internal') {
                if (!['Ferie', 'Skole'].includes(entry.absenceType)) {
                    dataMap[dateStr].absenceHours += (entry.hours || 0);
                }
            } else {
                dataMap[dateStr].hours += (entry.hours || 0);
            }
        });
        return Object.values(dataMap);
    }, [filteredEntries]);

    // Aggregeringer
    const totalHours = filteredEntries.reduce((acc, curr) => acc + (curr.leadId !== 'internal' ? (curr.hours || 0) : 0), 0);
    const totalKm = filteredEntries.reduce((acc, curr) => acc + (curr.km || 0), 0);
    const absenceEntries = filteredEntries.filter(e => e.leadId === 'internal' && !['Ferie', 'Skole'].includes(e.absenceType));
    
    // Grupperet data til tabellen (så 14 dages ferie bliver én række)
    const groupedTableEntries = useMemo(() => {
        const grouped = [];
        const groupMap = {};

        filteredEntries.forEach(entry => {
            if (entry.leadId === 'internal' && ['Ferie', 'Skole'].includes(entry.absenceType)) {
                // Udled baseId (f.eks. 'time-12345678')
                const parts = entry.id.split('-');
                const baseId = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : entry.id;
                const groupKey = `${entry.employeeId}-${entry.absenceType}-${baseId}`;

                if (!groupMap[groupKey]) {
                    groupMap[groupKey] = {
                        ...entry,
                        isGrouped: true,
                        groupCount: 1,
                        allDates: [new Date(entry.date)]
                    };
                    grouped.push(groupMap[groupKey]);
                } else {
                    groupMap[groupKey].groupCount++;
                    groupMap[groupKey].allDates.push(new Date(entry.date));
                }
            } else {
                grouped.push(entry);
            }
        });

        // Sørg for at grupperede entries viser korrekt dato-interval
        grouped.forEach(g => {
            if (g.isGrouped && g.allDates.length > 1) {
                const sortedDates = g.allDates.sort((a, b) => a - b);
                const startDateStr = sortedDates[0].toLocaleDateString('da-DK', { day: '2-digit', month: 'short' });
                const endDateStr = sortedDates[sortedDates.length - 1].toLocaleDateString('da-DK', { day: '2-digit', month: 'short' });
                g.displayDate = `${startDateStr} - ${endDateStr}`;
                // Opdater selve 'date' feltet til det tidligste, for sorterings skyld
                g.date = sortedDates[0].toISOString();
            } else if (g.isGrouped) {
                g.displayDate = g.allDates[0].toLocaleDateString('da-DK', { day: '2-digit', month: 'short' });
            }
        });

        return grouped.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [filteredEntries]);

    // Aktive sager som svenden har adgang til at registrere på
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
                return ['Bekræftet opgave', 'Sæt i bero', 'Afbrudt Sag', 'Historik'].includes(lead.status);
            }

            return isAssigned && ['Bekræftet opgave', 'Historik', 'Sæt i bero', 'Afbrudt Sag'].includes(lead.status || '');
        });
    }, [leadsData, myProfile, simulatedRole]);

    const handleDeleteEntry = (entry) => {
        setDeletingEntry(entry);
    };

    const confirmDeleteEntry = async () => {
        const entry = deletingEntry;
        if (!entry) return;
        if (entryLocked(entry)) {
            toast.error('Timen er låst efter lønkørsel og kan ikke slettes.');
            setDeletingEntry(null);
            return;
        }

        if (entry.leadId === 'internal') {
            let removeIds;
            if (entry.isGrouped) {
                // Find alle medlems-id'er i ferie-/skoleperioden (samme base-id-præfiks).
                const parts = String(entry.id).split('-');
                const baseId = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : entry.id;
                const { data: latestData } = await supabase.from('carpenters').select('raw_data').eq('id', myProfile.id).single();
                const currentEntries = latestData?.raw_data?.time_entries || [];
                removeIds = currentEntries
                    .filter(t => {
                        const tParts = String(t.id).split('-');
                        const tBaseId = tParts.length >= 2 ? `${tParts[0]}-${tParts[1]}` : t.id;
                        return tBaseId === baseId;
                    })
                    .map(t => t.id);
            } else {
                removeIds = [entry.id];
            }

            try {
                await mutateTimeEntries({ table: 'carpenters', id: myProfile.id, removeIds });
                toast.success(entry.isGrouped ? 'Ferie-periode slettet.' : 'Registrering slettet.');
                setTimeout(() => window.location.reload(), 800);
            } catch {
                toast.error('Kunne ikke slette fravær/internt.');
            }
        } else {
            const lead = leadsData.find(l => l.id === entry.leadId);
            if (!lead) return toast.error('Sag ikke fundet');
            try {
                await mutateTimeEntries({ table: 'leads', id: lead.id, removeIds: [entry.id] });
                toast.success('Tidsregistrering slettet.');
                setTimeout(() => window.location.reload(), 800);
            } catch {
                toast.error('Kunne ikke slette tiden.');
            }
        }
    };

    const handleSaveEntry = async (e, overrideWarning = false) => {
        if (e) e.preventDefault();
        if (formData.regType === 'project' && !formData.leadId) return toast.error('Vælg venligst en sag');
        if (!formData.date) return toast.error('Vælg en dato');
        
        const isMultiDayAbsence = formData.regType === 'internal' && ['Ferie', 'Skole'].includes(formData.absenceType);
        const startDato = new Date(formData.date);
        const slutDato = (isMultiDayAbsence && formData.endDate) ? new Date(formData.endDate) : startDato;
        
        if (slutDato < startDato) return toast.error('Til-dato skal være efter Fra-dato');

        if (isDateLocked(formData.date, lockedUntil) || (isMultiDayAbsence && isDateLocked(formData.endDate, lockedUntil))) {
            return toast.error(`Datoen er i en låst lønperiode (til og med ${formatDa(lockedUntil)}). Kontakt din mester for at registrere her.`);
        }

        // Generer liste af datoer
        const datesToSave = [];
        let currDate = new Date(startDato);
        while (currDate <= slutDato) {
            if (isMultiDayAbsence) {
                const day = currDate.getDay();
                if (day !== 0 && day !== 6 && !isWeekendOrHoliday(currDate.toISOString().substring(0, 10))) {
                    datesToSave.push(currDate.toISOString().substring(0, 10));
                }
            } else {
                datesToSave.push(currDate.toISOString().substring(0, 10));
                break;
            }
            currDate.setDate(currDate.getDate() + 1);
        }

        if (datesToSave.length === 0) {
            return toast.error('Ingen gyldige arbejdsdage valgt (f.eks. kun weekender).');
        }

        // Tjek for overskridelse af ferie (hvis vi tilføjer nye dage)
        if (!overrideWarning && isMultiDayAbsence && formData.absenceType === 'Ferie') {
            const newFerieDays = datesToSave.filter(d => !allEntries.some(entry => entry.date === d && entry.absenceType === 'Ferie'));
            if (newFerieDays.length > 0 && remainingVacationDays - newFerieDays.length < 0) {
                setPendingSaveEvent(e);
                setShowVacationWarning(true);
                return; // Stop her, afvent modal
            }
        }
        
        try {
            if (formData.regType === 'internal') {
                const newEntries = datesToSave.map((dateStr, idx) => ({
                    id: (isAdding || datesToSave.length > 1) ? `time-${Date.now()}-${idx}` : editingEntry.id,
                    startTime: isMultiDayAbsence ? '' : (formData.startTime || ''),
                    endTime: isMultiDayAbsence ? '' : (formData.endTime || ''),
                    pauseMinutes: isMultiDayAbsence ? 0 : (parseInt(formData.pauseMinutes) || 0),
                    hours: isMultiDayAbsence ? 7.4 : (parseFloat(formData.hours) || 0),
                    date: dateStr,
                    desc: formData.desc || '',
                    employeeId: myProfile.id,
                    employeeName: myProfile.owner_name || myProfile.company_name || 'Ukendt',
                    km: isMultiDayAbsence ? 0 : (formData.km ? parseFloat(formData.km) : 0),
                    absenceType: formData.absenceType || 'Internt'
                }));

                const removeIds = (!isAdding && editingEntry) ? [editingEntry.id] : [];

                try {
                    await mutateTimeEntries({ table: 'carpenters', id: myProfile.id, removeIds, add: newEntries });
                } catch (error) {
                    console.error("Supabase RPC error (carpenters):", error);
                    throw new Error('Fejl ved gem internt: ' + error.message);
                }
            } else {
                const finalEntry = {
                    id: isAdding ? `time-${Date.now()}` : editingEntry.id,
                    startTime: formData.startTime || '',
                    endTime: formData.endTime || '',
                    pauseMinutes: parseInt(formData.pauseMinutes) || 0,
                    hours: parseFloat(formData.hours) || 0,
                    date: formData.date,
                    desc: formData.desc || '',
                    employeeId: myProfile.id,
                    employeeName: myProfile.owner_name || myProfile.company_name || 'Ukendt',
                    km: formData.km ? parseFloat(formData.km) : 0
                };

                const lead = leadsData.find(l => String(l.id) === String(formData.leadId));
                if (!lead) return toast.error('Sag ikke fundet');

                const removeIds = (!isAdding && editingEntry) ? [finalEntry.id] : [];

                try {
                    await mutateTimeEntries({ table: 'leads', id: lead.id, removeIds, add: [finalEntry] });
                } catch (error) {
                    console.error("Supabase RPC error (leads):", error);
                    throw new Error('Fejl ved gem tid på sag: ' + error.message);
                }
            }

            toast.success(isAdding ? 'Registrering tilføjet!' : 'Registrering opdateret!');
            setEditingEntry(null);
            setIsAdding(false);
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            console.error(err);
            const errorMsg = 'Fejl detaljer: ' + (err.message || JSON.stringify(err));
            toast.error(errorMsg);
        }
    };

    const openEdit = (entry) => {
        if (entryLocked(entry)) {
            toast.error(`Timerne er lønkørt og låst (til og med ${formatDa(lockedUntil)}). Kontakt din mester.`);
            return;
        }
        const isInternal = entry.leadId === 'internal';
        setFormData({
            date: entry.date || '',
            endDate: entry.date || '',
            regType: isInternal ? 'internal' : 'project',
            leadId: isInternal ? '' : (entry.leadId || ''),
            absenceType: isInternal ? (entry.absenceType || entry.desc || 'Sygdom') : 'Sygdom',
            desc: entry.desc || '',
            hours: entry.hours || '',
            km: entry.km || '',
            startTime: entry.startTime || '',
            endTime: entry.endTime || '',
            pauseMinutes: entry.pauseMinutes !== undefined ? String(entry.pauseMinutes) : '0'
        });
        setEditingEntry(entry);
        setIsAdding(false);
    };

    const openAdd = () => {
        setFormData({ 
            date: new Date().toISOString().substring(0, 10), 
            endDate: new Date().toISOString().substring(0, 10),
            regType: 'project',
            leadId: '', 
            absenceType: 'Sygdom',
            desc: '', 
            hours: '', 
            km: '', 
            startTime: '07:00', 
            endTime: '15:00',
            pauseMinutes: '30'
        });
        setIsAdding(true);
        setEditingEntry(null);
    };

    const computeHours = (start, end, pauseStr) => {
        if (!start || !end) return '';
        const s = new Date(`2000-01-01T${start}`);
        const e = new Date(`2000-01-01T${end}`);
        let diffMs = e - s;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
        const diffMin = (diffMs / (1000 * 60)) - (parseInt(pauseStr) || 0);
        return diffMin > 0 ? (Math.round((diffMin / 60) * 4) / 4) : 0;
    };

    // "Som i går": udfyld med din seneste registrering, på dags dato
    const fillFromLast = () => {
        const last = allEntries.find(e => e.employeeId === myProfile?.id) || allEntries[0];
        if (!last) { toast.error('Ingen tidligere registrering at kopiere.'); return; }
        const today = new Date().toISOString().substring(0, 10);
        setFormData({
            ...formData,
            date: today,
            endDate: today,
            regType: last.leadId === 'internal' ? 'internal' : 'project',
            leadId: last.leadId === 'internal' ? '' : (last.leadId || ''),
            absenceType: last.absenceType || 'Sygdom',
            desc: last.desc || '',
            hours: last.hours || '',
            km: last.km || '',
            startTime: last.startTime || '07:00',
            endTime: last.endTime || '15:00',
            pauseMinutes: last.pauseMinutes !== undefined ? String(last.pauseMinutes) : '30'
        });
        toast.success('Udfyldt som seneste registrering.');
    };

    const showModal = isAdding || editingEntry;

    const getPeriodLabel = () => {
        switch(selectedPeriod) {
            case 'this_week': return 'Denne Uge';
            case 'last_week': return 'Sidste Uge';
            case 'this_month': return 'Denne Måned';
            case 'last_month': return 'Sidste Måned';
            case 'this_year': return 'Dette År';
            default: return '';
        }
    };

    return (
        <div className="dashboard-workspace timesheet-view worker-timesheet" style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out', maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
            <TimeRegistrationReminder leadsData={leadsData} myProfile={myProfile} />
            
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 50, overflow: 'visible' }}>
                <div>
                    <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={28} color="#000" />
                        Timeregistrering
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Få det fulde overblik over dit timeforbrug og fravær.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <CustomSelect 
                        value={selectedPeriod}
                        onChange={setSelectedPeriod}
                        options={[
                            { value: 'this_week', label: 'Denne Uge' },
                            { value: 'last_week', label: 'Sidste Uge' },
                            { value: 'this_month', label: 'Denne Måned' },
                            { value: 'last_month', label: 'Sidste Måned' },
                            { value: 'this_year', label: 'Dette År' }
                        ]}
                    />

                    <button 
                        onClick={openAdd}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                        <Plus size={18} /> Opret registrering
                    </button>
                </div>
            </div>

            {/* STAT BOXES */}
            <div className="timesheet-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Arbejdstimer ({getPeriodLabel()})</span>
                    <strong style={{ fontSize: '2.5rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)' }}>
                            <Clock size={28} color="#3b82f6" />
                        </div>
                        {totalHours.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                </div>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kørte Kilometer ({getPeriodLabel()})</span>
                    <strong style={{ fontSize: '2.5rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)' }}>
                            <TrendingUp size={28} color="#10b981" />
                        </div>
                        {totalKm} km
                    </strong>
                </div>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fravær / Internt ({getPeriodLabel()})</span>
                    <strong style={{ fontSize: '2.5rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)' }}>
                            <AlertTriangle size={28} color="#f59e0b" />
                        </div>
                        {absenceEntries.reduce((acc, curr) => acc + (curr.hours || 0), 0).toFixed(2).replace('.', ',')} t
                    </strong>
                </div>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feriesaldo (i år)</span>
                    <strong style={{ fontSize: '2.5rem', color: remainingVacationDays <= 0 ? '#ef4444' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: remainingVacationDays <= 0 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)' }}>
                            <Calendar size={28} color={remainingVacationDays <= 0 ? "#ef4444" : "#3b82f6"} />
                        </div>
                        {remainingVacationDays} dage
                    </strong>
                </div>
            </div>

            {/* GRAF */}
            {chartData.length > 0 && (
                <div className="glass-panel" style={{ padding: '24px', animation: 'fadeIn 0.4s ease-out' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#1e293b' }}>Aktivitetsoversigt</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="hours" name="Arbejdstimer" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={30} animationDuration={1000} />
                                <Bar dataKey="absenceHours" name="Fravær / Internt" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={30} animationDuration={1000} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* TABEL */}
            <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
                {groupedTableEntries.length === 0 ? (
                    <div style={{ padding: '64px', textAlign: 'center', color: '#94a3b8' }}>
                        <Calendar size={64} style={{ opacity: 0.2, margin: '0 auto 16px auto' }} />
                        <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '1.2rem' }}>Ingen registreringer fundet</h4>
                        <p style={{ margin: 0, fontSize: '1rem' }}>Du har ikke registreret timer i denne periode.</p>
                    </div>
                ) : (
                    <div className="timesheet-table-container">
                        <table className="timesheet-table">
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <th style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dato</th>
                                    <th style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sag / Projekt</th>
                                    <th style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Beskrivelse</th>
                                    <th style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tidsrum</th>
                                    <th style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Timer</th>
                                    <th style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Kørsel</th>
                                    <th style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Handlinger</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedTableEntries.map((entry, idx) => {
                                    const isInternal = entry.leadId === 'internal';
                                    const locked = entryLocked(entry);

                                    return (
                                        <tr 
                                            key={entry.isGrouped ? `group-${entry.id}` : entry.id} 
                                            style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', transition: 'background-color 0.2s', cursor: entry.isGrouped ? 'default' : 'pointer' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'} 
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            onClick={() => {
                                                if (!entry.isGrouped) openEdit(entry);
                                            }}
                                        >
                                            <td data-label="Dato" style={{ padding: '20px 24px', color: '#1e293b', fontWeight: '600', fontSize: '0.95rem' }}>
                                                {entry.isGrouped ? entry.displayDate : new Date(entry.date).toLocaleDateString('da-DK', { day: '2-digit', month: 'short' })}
                                            </td>
                                            <td data-label="Sag / Projekt" style={{ padding: '20px 24px', fontSize: '0.95rem' }}>
                                                {isInternal ? (
                                                    <span style={{ color: '#ea580c', backgroundColor: '#ffedd5', padding: '6px 10px', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', display: 'inline-block' }}>
                                                        {entry.leadName}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                                                        {entry.caseNumber} - {entry.leadName}
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="Beskrivelse" style={{ padding: '20px 24px', color: '#64748b', fontSize: '0.95rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.desc}>
                                                {entry.desc || '-'}
                                            </td>
                                            <td data-label="Tidsrum" style={{ padding: '20px 24px', color: '#475569', fontSize: '0.95rem', fontWeight: '500' }}>
                                                {entry.isGrouped ? '-' : `${entry.startTime} - ${entry.endTime || '?'}`}
                                            </td>
                                            <td data-label="Timer" style={{ padding: '20px 24px', textAlign: 'right', fontWeight: '600', color: '#1e293b', fontSize: '1.05rem' }}>
                                                {entry.isGrouped ? `${entry.groupCount} dage` : (entry.hours ? entry.hours : '-')}
                                            </td>
                                            <td data-label="Kørsel" style={{ padding: '20px 24px', textAlign: 'right', fontWeight: '600', color: entry.km ? '#10b981' : '#94a3b8' }}>
                                                {entry.isGrouped ? '-' : (entry.km ? `${entry.km} km` : '-')}
                                            </td>
                                            <td data-label="Handlinger" style={{ padding: '20px 24px', textAlign: 'right' }}>
                                                {locked ? (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }} title={`Lønkørt og låst til og med ${formatDa(lockedUntil)}`}>
                                                        <Lock size={13} /> Låst
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        {!entry.isGrouped && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openEdit(entry); }}
                                                                title="Rediger registrering"
                                                                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry); }}
                                                            title={entry.isGrouped ? "Slet hele perioden" : "Slet registrering"}
                                                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL TIL SLETNING AF TIMER */}
            {deletingEntry && createPortal(
                <div className="dashboard-modal-overlay delete-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div className="dashboard-modal-panel" style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <Trash2 size={32} color="#ef4444" />
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold' }}>
                            Slet timeregistrering?
                        </h3>
                        <p style={{ color: '#475569', marginBottom: '24px', lineHeight: '1.5' }}>
                            {deletingEntry.isGrouped 
                                ? `Er du sikker på, du vil slette hele perioden (${deletingEntry.displayDate})? Dette fjerner alle underliggende feriedage på én gang.`
                                : `Er du sikker på, du vil slette registreringen fra d. ${new Date(deletingEntry.date).toLocaleDateString('da-DK')}? Dette kan ikke fortrydes.`
                            }
                        </p>
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                            <button 
                                onClick={() => setDeletingEntry(null)}
                                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                Annuller
                            </button>
                            <button 
                                onClick={confirmDeleteEntry}
                                style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                            >
                                Ja, slet
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL TIL FERIE ADVARSEL */}
            {showVacationWarning && createPortal(
                <div className="dashboard-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div className="dashboard-modal-panel" style={{ width: '100%', maxWidth: '450px', background: '#fff', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <AlertTriangle size={32} color="#ef4444" />
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold' }}>
                            Du overskrider din feriekvote
                        </h3>
                        <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            Du har pt. <strong>{remainingVacationDays} feriedage</strong> tilbage i år. Hvis du gemmer denne registrering, overskrider du din kvote.
                        </p>
                        <p style={{ margin: '0 0 32px 0', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5', fontStyle: 'italic' }}>
                            Tip: Hvis du har aftalt "Ferie uden løn" eller forskud på næste år med mester, kan du tvinge registreringen igennem. Den vil blive markeret for bogholderiet.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                            <button 
                                onClick={() => { setShowVacationWarning(false); setPendingSaveEvent(null); }}
                                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                Annuller
                            </button>
                            <button 
                                onClick={() => { setShowVacationWarning(false); handleSaveEntry(pendingSaveEvent, true); }}
                                style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                            >
                                Tving igennem (Gem)
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL TIL OPRET / REDIGER */}
            {showModal && createPortal(
                <div className="dashboard-modal-overlay timesheet-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div className="dashboard-modal-panel timesheet-modal-panel" style={{ width: '100%', maxWidth: '600px', background: '#fff', borderRadius: '16px', overflow: 'visible', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isAdding ? <Plus size={20} color="#3b82f6" /> : <Edit2 size={20} color="#3b82f6" />}
                                {isAdding ? 'Tilføj Tidsregistrering' : 'Rediger Tidsregistrering'}
                            </h3>
                            <button onClick={() => { setIsAdding(false); setEditingEntry(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEntry} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {isAdding && (
                                <button type="button" onClick={fillFromLast}
                                    style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#6d28d9', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.transform = 'none'; }}>
                                    <RotateCcw size={16} /> Som i går
                                </button>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Kategori</label>
                                    <CustomSelect 
                                        value={formData.regType}
                                        onChange={(val) => {
                                            setFormData({...formData, regType: val, leadId: ''});
                                        }}
                                        options={[
                                            { value: 'project', label: 'Sag / Projekt' },
                                            { value: 'internal', label: 'Internt Fravær' }
                                        ]}
                                    />
                                </div>
                                
                                {formData.regType === 'project' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Vælg Sag</label>
                                        <CustomSelect 
                                            value={formData.leadId}
                                            onChange={(val) => setFormData({...formData, leadId: val})}
                                            placeholder="-- Vælg Sag --"
                                            options={activeWorkerCases.length > 0 ? activeWorkerCases.map(l => {
                                                const extraText = (l.status === 'Sæt i bero') ? ' (Sat i bero)' : (l.status === 'Afbrudt Sag' ? ' (Afbrudt)' : '');
                                                return { value: l.id, label: `Sag ${l.case_number || String(l.id).substring(0,6)} - ${l.customer_name}${extraText}` };
                                            }) : [{ value: '', label: 'Ingen aktive sager' }]}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Type Fravær</label>
                                        <CustomSelect 
                                            value={formData.absenceType}
                                            onChange={(val) => setFormData({...formData, absenceType: val})}
                                            options={[
                                                { value: 'Sygdom', label: 'Sygdom' },
                                                { value: 'Ferie', label: 'Ferie' },
                                                { value: 'Skole', label: 'Skole / Uddannelse' },
                                                { value: 'Møde', label: 'Møde / Kontor' },
                                                { value: 'Værksted', label: 'Værksted / Oprydning' }
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>

                            {formData.regType === 'internal' && ['Ferie', 'Skole'].includes(formData.absenceType) ? (
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Fra Dato</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={formData.date}
                                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Til Dato</label>
                                        <input 
                                            type="date" 
                                            required
                                            min={formData.date}
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Dato</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                    />
                                </div>
                            )}

                            {!(formData.regType === 'internal' && ['Ferie', 'Skole'].includes(formData.absenceType)) && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Start tid *</label>
                                            <input 
                                                type="time" 
                                                required
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({...formData, startTime: e.target.value, hours: computeHours(e.target.value, formData.endTime, formData.pauseMinutes)})}
                                                style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Slut tid *</label>
                                            <input 
                                                type="time" 
                                                required
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({...formData, endTime: e.target.value, hours: computeHours(formData.startTime, e.target.value, formData.pauseMinutes)})}
                                                style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Pause (min.)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                placeholder="F.eks. 30"
                                                value={formData.pauseMinutes}
                                                onChange={(e) => setFormData({...formData, pauseMinutes: e.target.value, hours: computeHours(formData.startTime, formData.endTime, e.target.value)})}
                                                style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ fontSize: '1rem', fontWeight: '700', color: '#64748b', margin: 0 }}>Timer i alt (Beregnet automatisk)</label>
                                        <input 
                                            type="number" 
                                            readOnly
                                            placeholder="-"
                                            value={formData.hours}
                                            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1.25rem', color: '#64748b', backgroundColor: '#e2e8f0', fontWeight: '900', width: '120px', textAlign: 'center', cursor: 'not-allowed' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Kørte kilometer (Kørepenge)</label>
                                        <input 
                                            type="number" 
                                            step="1"
                                            min="0"
                                            placeholder="F.eks. 45"
                                            value={formData.km}
                                            onChange={(e) => setFormData({...formData, km: e.target.value})}
                                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                        />
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Beskrivelse / Type Fravær</label>
                                <textarea 
                                    required={!(formData.regType === 'internal' && ['Ferie', 'Skole'].includes(formData.absenceType))}
                                    rows="3"
                                    placeholder={formData.regType === 'internal' ? "Valgfri note til fraværet..." : "F.eks. 'Opsat gipslofter og spartlet'"}
                                    value={formData.desc}
                                    onChange={(e) => setFormData({...formData, desc: e.target.value})}
                                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', color: '#1e293b' }}
                                />
                            </div>

                            <div style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    {editingEntry && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteEntry(editingEntry)}
                                            style={{ background: '#fef2f2', border: 'none', padding: '10px 16px', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
                                        >
                                            <Trash2 size={18} /> Slet
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={() => { setIsAdding(false); setEditingEntry(null); }} style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Annuller</button>
                                    <button type="submit" style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Save size={18} /> Gem registrering
                                    </button>
                                </div>
                            </div>

                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
