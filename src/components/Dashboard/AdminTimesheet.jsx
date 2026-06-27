import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, ChevronDown, Check, FileText, User, Calendar, Plus, Clock, Search, TrendingUp, AlertTriangle, Edit2, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { isWeekendOrHoliday } from '../../utils/holidays';
import PayrollControls from './PayrollControls';
import {
    fetchPayrollSettings, isDateLocked, formatDa, currentPeriod, getEffectiveLockedUntil, getConfig,
    lastCompletedPeriodRange, aggregatePayroll, buildSummaryCSV, buildLonartCSV, downloadCSV, toDateKey
} from '../../utils/payroll';
import { mutateTimeEntries } from '../../utils/timeEntries';
import { getRoleLabel } from '../../utils/roles';
import UserAvatar from '../ui/UserAvatar';
import { Lock, FileSpreadsheet, RotateCcw, IdCard, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidLonnummer, nextLonnummer } from '../../utils/payroll';
import SectionTour from './SectionTour';
import { shouldShowCoach } from './coachmarks';

// Rundtur for Løn & Timer — spotlight på den RIGTIGE UI: åbner de ægte
// Løn-indstillinger og går sektionerne igennem. Kun desktop, admin/bogholder.
const PAYROLL_TOUR_SETTINGS_FROM = 1; // trin 1+ kræver at indstillings-modalen er åben
const PAYROLL_TOUR_STEPS = [
    { sel: '[data-tour="payroll-settings-btn"]', placement: 'top', eyebrow: 'Løn & Timer', title: 'Alt styres herfra', body: 'Lønperiode, lås, arbejdsdag og lønart-koder bor under tandhjulet. Lad os åbne det og gå det igennem.' },
    { sel: '[data-tour="payroll-cycle"]', placement: 'right', eyebrow: 'Lønperiode', title: 'Måned eller hver 14. dag', body: 'Vælg rytmen, der passer jer — Frame regner perioderne ud automatisk.' },
    { sel: '[data-tour="payroll-lock"]', placement: 'right', eyebrow: 'Lås', title: 'Automatisk lås', body: 'Når en periode er kørt, låses den automatisk efter din frist — så tallene ikke ændrer sig bagefter. Genåbn hvis noget skal rettes.' },
    { sel: '[data-tour="payroll-absence"]', placement: 'right', eyebrow: 'Arbejdsdag', title: 'Arbejdsdag, frokost & ferie', body: 'Sæt standard arbejdsdag og automatisk frokostpause — og om ferie/fravær eksporteres i dage eller timer.' },
    { sel: '[data-tour="payroll-codes"]', placement: 'right', eyebrow: 'Lønart-koder', title: 'Jeres egne numre', body: 'Indtast lønart-numrene fra jeres lønsystem (normaltimer, ferie, sygdom, kørsel …), så eksport-filen passer 1:1.' },
];

const CustomSelect = ({ value, onChange, options, placeholder, style = {} }) => {
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
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%', minWidth: '180px', ...style }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={(e) => {
                    if(!isOpen) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = isOpen ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)';
                }}
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

const ExportMenuItem = ({ title, desc, onClick }) => (
    <div onClick={onClick}
        style={{ padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.12s' }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{title}</div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '1px' }}>{desc}</div>
    </div>
);

// feature flag to toggle back to old design if needed
const USE_UNIFIED_PAYROLL_MODAL = true;

export default function AdminTimesheet({ leadsData, profile, onDataChange }) {
    // Let SPA-opdatering i stedet for fuld sidegenindlæsning.
    const refresh = () => { if (onDataChange) onDataChange(); else window.location.reload(); };
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    // Rundtur: spotlight på den rigtige UI + åbn de ægte Løn-indstillinger.
    const [payrollTourActive, setPayrollTourActive] = useState(() => !isMobile && ['admin', 'accountant'].includes(profile?.role) && shouldShowCoach('payroll_tour'));
    const [payrollStep, setPayrollStep] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [teamMembers, setTeamMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('this_month');
    const [selectedUser, setSelectedUser] = useState('all');
    const [payrollSettings, setPayrollSettings] = useState(null);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [isStamdataModalOpen, setIsStamdataModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const exportMenuRef = useRef(null);
    const payrollCompanyId = profile?.company_id || profile?.id;
    const lockedUntil = getEffectiveLockedUntil(payrollSettings);
    
    // CRUD States
    const [isAdding, setIsAdding] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [deletingEntry, setDeletingEntry] = useState(null);
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().substring(0, 10), 
        endDate: new Date().toISOString().substring(0, 10),
        employeeId: '', 
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

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                // Fetch alle carpenters som hører til dette company_id PLUS mesteren selv
                const companyId = profile?.company_id || profile?.id;
                const { data, error } = await supabase
                    .from('carpenters')
                    .select('*')
                    .or(`company_id.eq.${companyId},id.eq.${companyId}`);
                
                if (error) throw error;
                setTeamMembers(data || []);
            } catch (err) {
                console.error('Fejl ved hentning af team:', err);
                toast.error('Kunne ikke hente medarbejdere');
            } finally {
                setIsLoading(false);
            }
        };

        if (profile) fetchTeam();
        if (payrollCompanyId) fetchPayrollSettings(payrollCompanyId).then(setPayrollSettings);
    }, [profile]);

    // Payroll Reminder Widget Logic
    const [payrollReminder, setPayrollReminder] = useState(null);

    useEffect(() => {
        if (!payrollSettings || !teamMembers.length || !leadsData) {
            setPayrollReminder(null);
            return;
        }
        
        const cycle = payrollSettings.payroll_cycle;
        const anchor = payrollSettings.cycle_anchor_date;
        if (!cycle) return;

        try {
            const { start, end } = currentPeriod(cycle, anchor);
            const endDate = new Date(end);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const diffDays = Math.floor((endDate - today) / (1000 * 60 * 60 * 24));
            
            // Hvis vi er 3 dage eller mindre fra lønperiodens afslutning (eller den lige er overskredet men ikke låst endnu)
            if (diffDays >= -3 && diffDays <= 3) {
                const startDate = new Date(start);
                let workdaysPassed = 0;
                for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
                    if (d > endDate) break; // Don't count days after the period ended
                    const day = d.getDay();
                    if (day !== 0 && day !== 6) { // Not weekend
                        workdaysPassed++;
                    }
                }
                
                const expectedHours = workdaysPassed * 7.4;
                const missingEmployees = [];
                
                teamMembers.forEach(member => {
                    let registeredHours = 0;
                    
                    // Internal
                    const internalEntries = member.raw_data?.time_entries || [];
                    internalEntries.forEach(entry => {
                        if (entry.date >= start && entry.date <= end) {
                            registeredHours += parseFloat(entry.hours) || 0;
                        }
                    });
                    
                    // Projects
                    leadsData.forEach(lead => {
                        const leadEntries = lead.raw_data?.time_entries || [];
                        leadEntries.forEach(entry => {
                            if (entry.employeeId === member.id && entry.date >= start && entry.date <= end) {
                                registeredHours += parseFloat(entry.hours) || 0;
                            }
                        });
                    });
                    
                    const missing = expectedHours - registeredHours;
                    // Tærskel på 7.4 (en fuld dag) før de flagges
                    if (missing >= 7.4) {
                        missingEmployees.push({
                            name: member.owner_name || member.company_name || 'Ukendt',
                            missingHours: Math.round(missing * 10) / 10
                        });
                    }
                });
                
                if (missingEmployees.length > 0) {
                    setPayrollReminder({
                        endDate: end,
                        diffDays,
                        missingEmployees
                    });
                } else {
                    setPayrollReminder(null);
                }
            } else {
                setPayrollReminder(null);
            }
        } catch (err) {
            console.error("Fejl ved beregning af løn-reminder:", err);
            setPayrollReminder(null);
        }
    }, [payrollSettings, teamMembers, leadsData]);

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

    // Opsamling af alle registreringer
    const allEntries = useMemo(() => {
        let entries = [];
        // Byggesager (leads)
        leadsData.forEach(lead => {
            const leadEntries = lead.raw_data?.time_entries || [];
            leadEntries.forEach(t => {
                entries.push({
                    ...t,
                    source: 'lead',
                    leadId: lead.id,
                    caseNumber: lead.case_number || String(lead.id).substring(0, 6),
                    leadName: lead.customer_name
                });
            });
        });

        // Interne registreringer (fra carpenters)
        teamMembers.forEach(member => {
            const profileEntries = member.raw_data?.time_entries || [];
            profileEntries.forEach(t => {
                entries.push({
                    ...t,
                    source: 'profile',
                    leadId: 'internal',
                    caseNumber: 'INT',
                    leadName: t.absenceType ? `Internt: ${t.absenceType}` : 'Internt / Fravær'
                });
            });
        });

        return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [leadsData, teamMembers]);

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

    // Filtrering på måned og bruger
    const filteredEntries = useMemo(() => {
        const { start, end } = getPeriodDates();
        return allEntries.filter(entry => {
            const matchUser = selectedUser === 'all' || entry.employeeId === selectedUser;
            if (!matchUser) return false;
            
            const d = new Date(entry.date);
            return d >= start && d <= end;
        });
    }, [allEntries, selectedPeriod, selectedUser]);

    // Data til grafen (kun når én bestemt medarbejder er valgt)
    const chartData = useMemo(() => {
        if (selectedUser === 'all') return [];
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
    }, [filteredEntries, selectedUser]);

    // Aggregeringer
    const totalHours = filteredEntries.reduce((acc, curr) => acc + (curr.leadId !== 'internal' ? (curr.hours || 0) : 0), 0);
    const totalKm = filteredEntries.reduce((acc, curr) => acc + (curr.km || 0), 0);
    
    // Vi ekskluderer Ferie og Skole fra fraværsboksen, da de vises særskilt/grupperet
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

    // Ferie-saldo udregning (Gennemsnit for alle, specifik for én)
    const vacationStats = useMemo(() => {
        const currentYear = new Date().getFullYear();
        
        if (selectedUser === 'all') {
            if (!teamMembers || teamMembers.length === 0) return { title: 'Gns. Feriesaldo pr. mand', remaining: 0 };
            
            let totalQuota = 0;
            const usedPerEmployee = {};
            
            teamMembers.forEach(member => {
                totalQuota += member.raw_data?.vacation_quota || 30;
            });
            
            allEntries.forEach(e => {
                if (e.absenceType !== 'Ferie') return;
                if (new Date(e.date).getFullYear() !== currentYear) return;
                if (isWeekendOrHoliday(e.date)) return;
                if (!teamMembers.some(m => m.id === e.employeeId)) return;
                
                if (!usedPerEmployee[e.employeeId]) usedPerEmployee[e.employeeId] = new Set();
                usedPerEmployee[e.employeeId].add(e.date);
            });
            
            let totalUsed = 0;
            Object.values(usedPerEmployee).forEach(datesSet => {
                totalUsed += datesSet.size;
            });
            
            const totalRemaining = totalQuota - totalUsed;
            const averageRemaining = Math.round((totalRemaining / teamMembers.length) * 10) / 10;
            
            return { title: 'Gns. Feriesaldo pr. mand', remaining: averageRemaining };
        } else {
            const member = teamMembers.find(m => m.id === selectedUser);
            const quota = member?.raw_data?.vacation_quota || 30;
            
            const ferieEntries = allEntries.filter(e => {
                if (e.employeeId !== selectedUser) return false;
                if (e.absenceType !== 'Ferie') return false;
                if (new Date(e.date).getFullYear() !== currentYear) return false;
                if (isWeekendOrHoliday(e.date)) return false;
                return true;
            });
            
            const uniqueFerieDates = new Set(ferieEntries.map(e => e.date));
            const used = uniqueFerieDates.size;
            
            return { title: 'Feriesaldo i år', remaining: quota - used };
        }
    }, [selectedUser, allEntries, teamMembers]);
    
    const handleExportCSV = () => {
        let csvContent = "Dato,Medarbejder,Sag/Type,Beskrivelse,Starttid,Sluttid,Timer,Kilometer\n";
        // Udelad åbne stempler (tjek-ind uden tjek-ud) — de har 0 timer og er kun støj i eksporten.
        filteredEntries.filter(e => e.endTime !== null).forEach(e => {
            const member = teamMembers.find(m => m.id === e.employeeId);
            const name = member?.owner_name || member?.company_name || 'Slettet/Ukendt';
            const row = [
                e.date,
                `"${name}"`,
                `"${e.caseNumber} - ${e.leadName}"`,
                `"${e.desc || ''}"`,
                e.startTime,
                e.endTime || '',
                e.hours || 0,
                e.km || 0
            ].join(',');
            csvContent += row + "\n";
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Loen_Timer_${selectedPeriod}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Luk eksport-menuen ved klik udenfor
    useEffect(() => {
        const handler = (e) => { if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setExportMenuOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Universel løneksport for den senest afsluttede lønperiode
    const exportPayroll = (format) => {
        const cycle = payrollSettings?.cycle || 'monthly';
        const anchor = payrollSettings?.anchor;
        const cfg = getConfig(payrollSettings);
        const { start, end } = lastCompletedPeriodRange(cycle, anchor);
        const inRange = allEntries.filter(e => {
            if (e.endTime === null) return false; // udelad åbne stempler (ikke tjekket ud endnu)
            const k = toDateKey(e.date);
            return k >= start && k <= end;
        });
        if (inRange.length === 0) {
            toast.error(`Ingen registreringer i seneste periode (${formatDa(start)} – ${formatDa(end)}).`);
            setExportMenuOpen(false);
            return;
        }
        const agg = aggregatePayroll(inRange, cfg);
        const rows = Object.values(agg).map(r => {
            const m = teamMembers.find(t => t.id === r.employeeId);
            return { ...r, name: m?.owner_name || m?.company_name || 'Ukendt', lonnummer: m?.raw_data?.lonnummer || '' };
        }).filter(r => r.normalHours || r.vacation || r.sick || r.other || r.mileage);
        const periodLabel = `${start} – ${end}`;
        if (format === 'lonart') {
            downloadCSV(`Loneksport_lonart_${start}_${end}.csv`, buildLonartCSV(rows, cfg.lonart, periodLabel));
        } else {
            downloadCSV(`Loneksport_opsummering_${start}_${end}.csv`, buildSummaryCSV(rows));
        }
        toast.success(`Løneksport hentet for ${formatDa(start)} – ${formatDa(end)}.`);
        setExportMenuOpen(false);
    };

    // Hent data for eksporten (seneste lønperiode)
    const getExportData = () => {
        const cycle = payrollSettings?.cycle || 'monthly';
        const anchor = payrollSettings?.anchor;
        const range = lastCompletedPeriodRange(cycle, anchor);
        const start = range.start;
        const end = range.end;
        const entries = allEntries.filter(e => {
            if (e.endTime === null) return false;
            const k = toDateKey(e.date);
            return k >= start && k <= end;
        });
        
        const cfg = getConfig(payrollSettings);
        const agg = aggregatePayroll(entries, cfg);
        const rows = Object.values(agg).map(r => {
            const m = teamMembers.find(t => t.id === r.employeeId);
            return {
                ...r,
                name: m?.owner_name || m?.company_name || 'Ukendt',
                lonnummer: m?.raw_data?.lonnummer || ''
            };
        }).filter(r => r.normalHours || r.vacation || r.sick || r.other || r.mileage);

        const totalHours = rows.reduce((acc, r) => acc + (r.normalHours || 0), 0);
        const totalKm = rows.reduce((acc, r) => acc + (r.mileage || 0), 0);
        const totalAbsence = rows.reduce((acc, r) => acc + (r.vacation || 0) + (r.sick || 0) + (r.other || 0), 0);
        const absenceUnitText = cfg.absence_unit === 'hours' ? 't' : 'dage';

        return { start, end, rows, totalHours, totalKm, totalAbsence, absenceUnitText, entries };
    };

    // Trigger download af den valgte filtype baseret på modalens data
    const triggerDownload = (format, data) => {
        const { start, end, rows, entries } = data;
        const cfg = getConfig(payrollSettings);
        const periodLabel = `${start} – ${end}`;
        
        if (format === 'lonart') {
            downloadCSV(`Loneksport_lonart_${start}_${end}.csv`, buildLonartCSV(rows, cfg.lonart, periodLabel));
            toast.success(`Lønfil hentet for ${formatDa(start)} – ${formatDa(end)}.`);
        } else if (format === 'summary') {
            downloadCSV(`Loneksport_opsummering_${start}_${end}.csv`, buildSummaryCSV(rows));
            toast.success(`Opsummering hentet for ${formatDa(start)} – ${formatDa(end)}.`);
        } else if (format === 'kontrol') {
            let csvContent = "Dato,Medarbejder,Sag/Type,Beskrivelse,Starttid,Sluttid,Timer,Kilometer\n";
            entries.forEach(e => {
                const member = teamMembers.find(m => m.id === e.employeeId);
                const name = member?.owner_name || member?.company_name || 'Slettet/Ukendt';
                const row = [
                    e.date,
                    `"${name}"`,
                    `"${e.caseNumber} - ${e.leadName}"`,
                    `"${e.desc || ''}"`,
                    e.startTime,
                    e.endTime || '',
                    e.hours || 0,
                    e.km || 0
                ].join(',');
                csvContent += row + "\n";
            });

            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Loen_Timer_${start}_${end}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Kontrol-CSV hentet for ${formatDa(start)} – ${formatDa(end)}.`);
        }
    };

    // Gem den aktuelle brugers (Mester/Bogholder) eget lønnummer — med validering.
    const saveActorLonnummer = async (value) => {
        const v = String(value ?? '').trim();
        if (v && !/^\d+$/.test(v)) throw new Error('Lønnummer må kun indeholde tal.');
        const dup = teamMembers.some(m => m.id !== profile.id && v && String(m.raw_data?.lonnummer ?? '').trim() === v);
        if (dup) throw new Error('Lønnummeret er allerede i brug af en anden.');
        const me = teamMembers.find(m => m.id === profile.id);
        const newRaw = { ...(me?.raw_data || {}), lonnummer: v };
        const { error } = await supabase.from('carpenters').update({ raw_data: newRaw }).eq('id', profile.id);
        if (error) throw new Error(error.message);
        setTeamMembers(prev => prev.map(m => m.id === profile.id ? { ...m, raw_data: newRaw } : m));
    };

    const handleDeleteEntry = (entry) => {
        setDeletingEntry(entry);
    };

    const confirmDeleteEntry = async () => {
        const entry = deletingEntry;
        if (!entry) return;
        if (entryLocked(entry)) {
            toast.error('Registreringen er låst efter lønkørsel og kan ikke slettes.');
            setDeletingEntry(null);
            return;
        }

        if (entry.leadId === 'internal') {
            const member = teamMembers.find(m => m.id === entry.employeeId);
            if (!member) return toast.error('Medarbejder ikke fundet');

            let removeIds;
            if (entry.isGrouped) {
                // Find alle medlems-id'er i ferie-/skoleperioden (samme base-id-præfiks).
                const parts = String(entry.id).split('-');
                const baseId = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : entry.id;
                const { data: latestData } = await supabase.from('carpenters').select('raw_data').eq('id', member.id).single();
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
                await mutateTimeEntries({ table: 'carpenters', id: member.id, removeIds });
                toast.success(entry.isGrouped ? 'Ferie-periode slettet.' : 'Registrering slettet.');
                refresh();
            } catch {
                toast.error('Kunne ikke slette fravær/internt.');
            }
        } else {
            const lead = leadsData.find(l => l.id === entry.leadId);
            if (!lead) return toast.error('Sag ikke fundet');
            try {
                await mutateTimeEntries({ table: 'leads', id: lead.id, removeIds: [entry.id] });
                toast.success('Tidsregistrering slettet.');
                refresh();
            } catch {
                toast.error('Kunne ikke slette tiden.');
            }
        }
    };

    const handleSaveEntry = async (e) => {
        e.preventDefault();
        if (!formData.employeeId) return toast.error('Vælg en medarbejder');
        if (formData.regType === 'project' && !formData.leadId) return toast.error('Vælg venligst en sag');
        if (!formData.date) return toast.error('Vælg en dato');
        
        const isMultiDayAbsence = formData.regType === 'internal' && ['Ferie', 'Skole'].includes(formData.absenceType);
        const startDato = new Date(formData.date);
        const slutDato = (isMultiDayAbsence && formData.endDate) ? new Date(formData.endDate) : startDato;
        
        if (slutDato < startDato) return toast.error('Til-dato skal være efter Fra-dato');

        if (isDateLocked(formData.date, lockedUntil) || (isMultiDayAbsence && isDateLocked(formData.endDate, lockedUntil))) {
            return toast.error(`Datoen ligger i en låst lønperiode (til og med ${formatDa(lockedUntil)}). Genåbn perioden for at registrere her.`);
        }

        // Generer liste af datoer
        const datesToSave = [];
        let currDate = new Date(startDato);
        while (currDate <= slutDato) {
            // Hvis det er ferie/skole, tjek om det er weekend eller helligdag
            if (isMultiDayAbsence) {
                const day = currDate.getDay();
                if (day !== 0 && day !== 6 && !isWeekendOrHoliday(currDate.toISOString().substring(0, 10))) {
                    datesToSave.push(currDate.toISOString().substring(0, 10));
                }
            } else {
                datesToSave.push(currDate.toISOString().substring(0, 10));
                break; // Kun én dag hvis ikke ferie
            }
            currDate.setDate(currDate.getDate() + 1);
        }

        if (datesToSave.length === 0) {
            return toast.error('Ingen gyldige arbejdsdage valgt (f.eks. kun weekender).');
        }

        try {
            if (formData.regType === 'internal') {
                if (formData.employeeId === 'collective') {
                    // KOLLEKTIV FERIE (Alle medarbejdere) — atomisk append pr. medarbejder.
                    const updates = teamMembers.map((member) => {
                        const newEntries = datesToSave.map((dateStr, idx) => ({
                            id: `time-${Date.now()}-${member.id}-${idx}`,
                            startTime: '',
                            endTime: '',
                            pauseMinutes: 0,
                            hours: 7.4,
                            date: dateStr,
                            desc: formData.desc || 'Kollektiv Ferie / Lukket',
                            employeeId: member.id,
                            employeeName: member.owner_name || member.company_name || 'Ukendt',
                            km: 0,
                            absenceType: formData.absenceType || 'Ferie'
                        }));
                        return mutateTimeEntries({ table: 'carpenters', id: member.id, add: newEntries });
                    });

                    await Promise.all(updates);
                } else {
                    // ENKELT MEDARBEJDER
                    const member = teamMembers.find(m => m.id === formData.employeeId);
                    if (!member) return toast.error('Medarbejder ikke fundet');

                    const newEntries = datesToSave.map((dateStr, idx) => ({
                        id: (isAdding || datesToSave.length > 1) ? `time-${Date.now()}-${idx}` : editingEntry.id,
                        startTime: isMultiDayAbsence ? '' : (formData.startTime || ''),
                        endTime: isMultiDayAbsence ? '' : (formData.endTime || ''),
                        pauseMinutes: isMultiDayAbsence ? 0 : (parseInt(formData.pauseMinutes) || 0),
                        hours: isMultiDayAbsence ? 7.4 : (parseFloat(formData.hours) || 0),
                        date: dateStr,
                        desc: formData.desc || '',
                        employeeId: formData.employeeId,
                        employeeName: member.owner_name || member.company_name || 'Ukendt',
                        km: isMultiDayAbsence ? 0 : (formData.km ? parseFloat(formData.km) : 0),
                        absenceType: formData.absenceType || 'Internt'
                    }));

                    const removeIds = (!isAdding && editingEntry) ? [editingEntry.id] : [];

                    try {
                        await mutateTimeEntries({ table: 'carpenters', id: member.id, removeIds, add: newEntries });
                    } catch (error) {
                        console.error("Supabase RPC error (carpenters):", error);
                        throw new Error('Fejl ved gem internt: ' + error.message);
                    }
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
                    employeeId: formData.employeeId,
                    employeeName: teamMembers.find(m => m.id === formData.employeeId)?.owner_name || '',
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
            refresh();
        } catch (err) {
            console.error(err);
            const errorMsg = 'Fejl detaljer: ' + (err.message || JSON.stringify(err));
            toast.error(errorMsg);
        }
    };

    const entryLocked = (entry) => isDateLocked(entry?.date, lockedUntil);

    const computeHours = (start, end, pauseStr) => {
        if (!start || !end) return '';
        const s = new Date(`2000-01-01T${start}`);
        const e = new Date(`2000-01-01T${end}`);
        let diffMs = e - s;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
        const diffMin = (diffMs / (1000 * 60)) - (parseInt(pauseStr) || 0);
        return diffMin > 0 ? (Math.round((diffMin / 60) * 4) / 4) : 0;
    };

    const openEdit = (entry) => {
        if (entryLocked(entry)) {
            toast.error(`Perioden er lønkørt og låst (til og med ${formatDa(lockedUntil)}). Genåbn for at redigere.`);
            return;
        }
        const isInternal = entry.leadId === 'internal';
        setFormData({
            date: entry.date || '',
            endDate: entry.date || '',
            employeeId: entry.employeeId || '',
            regType: isInternal ? 'internal' : 'project',
            leadId: isInternal ? '' : (entry.leadId || ''),
            absenceType: isInternal ? (entry.absenceType || entry.desc || 'Sygdom') : 'Sygdom',
            desc: entry.desc || '',
            hours: entry.hours !== undefined && entry.hours !== '' ? entry.hours : computeHours(entry.startTime || '', entry.endTime || '', entry.pauseMinutes !== undefined ? String(entry.pauseMinutes) : '0'),
            km: entry.km || '',
            startTime: (entry.startTime || '').replace('.', ':'),
            endTime: (entry.endTime || '').replace('.', ':'),
            pauseMinutes: entry.pauseMinutes !== undefined ? String(entry.pauseMinutes) : '0'
        });
        setEditingEntry(entry);
        setIsAdding(false);
    };

    const openAdd = () => {
        setFormData({ 
            date: new Date().toISOString().substring(0, 10), 
            endDate: new Date().toISOString().substring(0, 10),
            employeeId: profile?.id || '', 
            regType: 'project',
            leadId: '', 
            absenceType: 'Sygdom',
            desc: '', 
            hours: computeHours('07:00', '15:00', '30'), 
            km: '', 
            startTime: '07:00', 
            endTime: '15:00',
            pauseMinutes: '30'
        });
        setIsAdding(true);
        setEditingEntry(null);
    };

    // "Som i går": udfyld med den valgte medarbejders seneste registrering, på dags dato
    const fillFromLast = () => {
        if (!formData.employeeId) { toast.error('Vælg en medarbejder først.'); return; }
        const last = allEntries.find(e => e.employeeId === formData.employeeId);
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
            hours: last.hours !== undefined && last.hours !== '' ? last.hours : computeHours(last.startTime || '07:00', last.endTime || '15:00', last.pauseMinutes !== undefined ? String(last.pauseMinutes) : '30'),
            km: last.km || '',
            startTime: (last.startTime || '07:00').replace('.', ':'),
            endTime: (last.endTime || '15:00').replace('.', ':'),
            pauseMinutes: last.pauseMinutes !== undefined ? String(last.pauseMinutes) : '30'
        });
        toast.success('Udfyldt som seneste registrering.');
    };

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Henter medarbejderdata...</div>;
    }

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

    const handleLonnummerInput = (employeeId, value) => {
        setTeamMembers(teamMembers.map(m => m.id === employeeId ? { ...m, raw_data: { ...(m.raw_data || {}), lonnummer: value } } : m));
    };

    const handleLonnummerBlur = async (member) => {
        const v = String(member.raw_data?.lonnummer ?? '').trim();
        if (v && !isValidLonnummer(v)) {
            toast.error('Lønnummer må kun indeholde tal.');
            return;
        }
        const dup = [...teamMembers, { id: profile.id, raw_data: profile.raw_data }]
            .some(m => m.id !== member.id && v && String(m.raw_data?.lonnummer ?? '').trim() === v);
        if (dup) {
            toast.error('Lønnummeret er allerede i brug af en anden.');
            setTeamMembers(teamMembers.map(m => m.id === member.id ? { ...m, raw_data: { ...(m.raw_data || {}), lonnummer: '' } } : m));
            return;
        }
        const newRawData = { ...(member.raw_data || {}), lonnummer: v };
        const { error } = await supabase.from('carpenters').update({ raw_data: newRawData }).eq('id', member.id);
        if (error) {
            console.error("Kunne ikke opdatere lønnummer:", error);
            toast.error('Kunne ikke gemme lønnummer.');
        } else {
            toast.success('Lønnummer gemt');
        }
    };

    const handleVacationQuotaUpdate = async (employeeId, currentRawData, newQuota) => {
        const parsedQuota = parseInt(newQuota);
        if (isNaN(parsedQuota) || parsedQuota < 0) return;
        const newRawData = { ...currentRawData, vacation_quota: parsedQuota };
        setTeamMembers(teamMembers.map(m => m.id === employeeId ? { ...m, raw_data: newRawData } : m));
        const { error } = await supabase.from('carpenters').update({ raw_data: newRawData }).eq('id', employeeId);
        if (error) {
            console.error("Kunne ikke opdatere feriesaldo:", error);
            toast.error('Kunne ikke gemme feriekvote.');
        }
    };

    return (
        <div className="dashboard-workspace timesheet-view admin-timesheet" style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out', maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
            <div className="glass-panel" style={{ 
                padding: isMobile ? '16px' : '24px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'flex-start', 
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: 'wrap', 
                gap: '16px', 
                position: 'relative', 
                zIndex: 50, 
                overflow: 'visible' 
            }}>
                <div>
                    <h2 style={{ margin: '0 0 4px 0', color: '#1a1a1a', fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={isMobile ? 22 : 28} color="#000" />
                        Løn & Timer
                    </h2>
                    {!isMobile && <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Kontrol, redigering og eksport af medarbejdernes tids- og kørselsregistreringer.</p>}
                </div>
                
                {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                        {/* Dropdowns side-by-side to save vertical space */}
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <CustomSelect 
                                    value={selectedUser}
                                    onChange={setSelectedUser}
                                    options={[
                                        { value: 'all', label: 'Alle medarbejdere' },
                                        ...teamMembers.map(m => ({ value: m.id, label: `${m.owner_name || m.company_name} (${getRoleLabel(m.role)})` }))
                                    ]}
                                    style={{ minWidth: '0' }}
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
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
                                    style={{ minWidth: '0' }}
                                />
                            </div>
                        </div>

                        {/* Apple-style Control Grid (2x2) */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '10px', 
                            width: '100%',
                            marginTop: '4px'
                        }}>
                            {/* 1. Løneksport (Primary action, dark and prominent) */}
                            {USE_UNIFIED_PAYROLL_MODAL ? (
                                <button 
                                    onClick={() => setIsExportModalOpen(true)}
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '6px', 
                                        padding: '14px 10px', 
                                        borderRadius: '16px', 
                                        border: 'none', 
                                        backgroundColor: '#000', 
                                        color: '#fff', 
                                        fontWeight: 'bold', 
                                        fontSize: '0.82rem', 
                                        cursor: 'pointer', 
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                    onMouseUp={e => e.currentTarget.style.transform = 'none'}
                                    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                    onTouchEnd={e => e.currentTarget.style.transform = 'none'}
                                >
                                    <FileSpreadsheet size={22} color="#fff" />
                                    <span>Løneksport</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setExportMenuOpen(o => !o)}
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '6px', 
                                        padding: '14px 10px', 
                                        borderRadius: '16px', 
                                        border: 'none', 
                                        backgroundColor: '#000', 
                                        color: '#fff', 
                                        fontWeight: 'bold', 
                                        fontSize: '0.82rem', 
                                        cursor: 'pointer', 
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                    onMouseUp={e => e.currentTarget.style.transform = 'none'}
                                >
                                    <FileSpreadsheet size={22} color="#fff" />
                                    <span>Løneksport</span>
                                </button>
                            )}

                            {/* 2. Opret registrering (Plus action, light and clean) */}
                            <button 
                                onClick={openAdd}
                                style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '6px', 
                                    padding: '14px 10px', 
                                    borderRadius: '16px', 
                                    border: '1px solid #e2e8f0', 
                                    backgroundColor: '#fff', 
                                    color: '#1a1a1a', 
                                    fontWeight: 'bold', 
                                    fontSize: '0.82rem', 
                                    cursor: 'pointer', 
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)' 
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'none'}
                                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                onTouchEnd={e => e.currentTarget.style.transform = 'none'}
                            >
                                <Plus size={22} color="#000" />
                                <span>Opret tid</span>
                            </button>

                            {/* 3. Stamdata & Ferie (Info/IdCard action, light translucent blue) */}
                            <button 
                                onClick={() => setIsStamdataModalOpen(true)}
                                style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '6px', 
                                    padding: '14px 10px', 
                                    borderRadius: '16px', 
                                    border: '1px solid rgba(37,99,235,0.15)', 
                                    backgroundColor: 'rgba(239, 246, 255, 0.7)', 
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)',
                                    color: '#1e3a8a', 
                                    fontWeight: 'bold', 
                                    fontSize: '0.82rem', 
                                    cursor: 'pointer', 
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                                    boxShadow: '0 2px 4px rgba(37,99,235,0.02)' 
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 246, 255, 0.9)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 246, 255, 0.7)'; e.currentTarget.style.transform = 'none'; }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'none'}
                                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                onTouchEnd={e => e.currentTarget.style.transform = 'none'}
                            >
                                <IdCard size={22} className="text-blue-600" />
                                <span>Stamdata</span>
                            </button>

                            {/* 4. Eksporter visning (Download active view, clean gray style) */}
                            {USE_UNIFIED_PAYROLL_MODAL && (
                                <button 
                                    onClick={handleExportCSV}
                                    title="Eksporter den aktuelle tabelvisning til CSV"
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '6px', 
                                        padding: '14px 10px', 
                                        borderRadius: '16px', 
                                        border: '1px solid #e2e8f0', 
                                        backgroundColor: '#fff', 
                                        color: '#475569', 
                                        fontWeight: 'bold', 
                                        fontSize: '0.82rem', 
                                        cursor: 'pointer', 
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)' 
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
                                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                    onMouseUp={e => e.currentTarget.style.transform = 'none'}
                                    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                    onTouchEnd={e => e.currentTarget.style.transform = 'none'}
                                >
                                    <Download size={22} color="#475569" />
                                    <span>Eksporter</span>
                                </button>
                            )}
                        </div>

                        {/* Lock status & Settings grouped row */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', marginTop: '4px', flexWrap: 'wrap' }}>
                            <PayrollControls
                                companyId={payrollCompanyId}
                                role={profile?.role}
                                actorId={profile?.id}
                                actorName={profile?.owner_name || profile?.company_name || profile?.email}
                                settings={payrollSettings}
                                onUpdated={setPayrollSettings}
                                actorLonnummer={teamMembers.find(m => m.id === profile?.id)?.raw_data?.lonnummer || ''}
                                existingLonnumre={teamMembers.filter(m => m.id !== profile?.id).map(m => m.raw_data?.lonnummer).filter(Boolean)}
                                onSaveActorLonnummer={saveActorLonnummer}
                            />
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <CustomSelect 
                            value={selectedUser}
                            onChange={setSelectedUser}
                            options={[
                                { value: 'all', label: 'Alle medarbejdere' },
                                ...teamMembers.map(m => ({ value: m.id, label: `${m.owner_name || m.company_name} (${getRoleLabel(m.role)})` }))
                            ]}
                        />
                        
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

                        {USE_UNIFIED_PAYROLL_MODAL && (
                            <button 
                                onClick={handleExportCSV}
                                title="Eksporter den aktuelle tabelvisning til CSV"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#475569', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px) scale(1)'}
                            >
                                <Download size={18} color="#64748b" />
                                <span className="hidden sm:inline">Eksporter visning</span>
                            </button>
                        )}

                        <button 
                            onClick={openAdd}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                        >
                            <Plus size={18} /> Opret registrering
                        </button>

                        <button 
                            onClick={() => setIsStamdataModalOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                            className="stamdata-btn"
                        >
                            <IdCard size={18} className="text-blue-600" />
                            <span className="hidden sm:inline">Stamdata & Ferie</span>
                        </button>

                        {USE_UNIFIED_PAYROLL_MODAL ? (
                            <button 
                                onClick={() => setIsExportModalOpen(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.25)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                            >
                                <FileSpreadsheet size={18} /> Løneksport
                            </button>
                        ) : (
                            <div ref={exportMenuRef} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setExportMenuOpen(o => !o)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.25)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                                >
                                    <FileSpreadsheet size={18} /> Løneksport
                                    <ChevronDown size={16} style={{ transform: exportMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                </button>

                                {exportMenuOpen && (
                                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '320px', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 16px 32px -8px rgba(15,23,42,0.18)', zIndex: 100000, overflow: 'hidden', padding: '8px', animation: 'fadeIn 0.15s ease-out' }}>
                                        {/* PRIMÆR: filen man importerer i lønsystemet */}
                                        <div
                                            onClick={() => exportPayroll('lonart')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', cursor: 'pointer', background: '#eff6ff', border: '1px solid #bfdbfe', transition: 'all 0.15s' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'none'; }}
                                        >
                                            <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '10px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Download size={20} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Lønfil til lønsystem</span>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Anbefalet</span>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: '#3b82f6', marginTop: '2px' }}>Den du importerer direkte i lønsystemet · seneste lønperiode</div>
                                            </div>
                                        </div>

                                        {/* SEKUNDÆR: til at dobbelttjekke perioden */}
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '12px 10px 4px' }}>Til at dobbelttjekke perioden:</div>
                                        <ExportMenuItem title="Opsummering" desc="Normaltimer, ferie, sygdom, kørsel pr. medarbejder" onClick={() => exportPayroll('summary')} />
                                        <ExportMenuItem title="Kontrol-CSV" desc="Alle rå linjer · valgt periode" onClick={() => { handleExportCSV(); setExportMenuOpen(false); }} />
                                    </div>
                                )}
                            </div>
                        )}

                        <PayrollControls
                            companyId={payrollCompanyId}
                            role={profile?.role}
                            actorId={profile?.id}
                            actorName={profile?.owner_name || profile?.company_name || profile?.email}
                            settings={payrollSettings}
                            onUpdated={setPayrollSettings}
                            actorLonnummer={teamMembers.find(m => m.id === profile?.id)?.raw_data?.lonnummer || ''}
                            existingLonnumre={teamMembers.filter(m => m.id !== profile?.id).map(m => m.raw_data?.lonnummer).filter(Boolean)}
                            onSaveActorLonnummer={saveActorLonnummer}
                            tourOpen={payrollTourActive && payrollStep >= PAYROLL_TOUR_SETTINGS_FROM}
                        />
                    </div>
                )}
            </div>

            {payrollTourActive && (
                <SectionTour
                    tourKey="payroll_tour"
                    steps={PAYROLL_TOUR_STEPS}
                    zBase={100130}
                    onStepChange={setPayrollStep}
                    onDone={() => setPayrollTourActive(false)}
                />
            )}

            {/* PAYROLL REMINDER WIDGET */}
            {payrollReminder && (
                <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '12px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: '#f97316' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ backgroundColor: '#ffedd5', padding: '12px', borderRadius: '50%', color: '#ea580c' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#9a3412', fontSize: '1.25rem', fontWeight: 'bold' }}>
                                Husk! Lønkørsel for perioden (slutter {formatDa(payrollReminder.endDate)}) nærmer sig.
                            </h3>
                            <p style={{ margin: '0 0 16px 0', color: '#c2410c', fontSize: '1rem', lineHeight: '1.5' }}>
                                Følgende medarbejdere mangler minimum en hel dags timer for at ramme det forventede antal timer indtil i dag:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                                {payrollReminder.missingEmployees.map((emp, i) => (
                                    <div key={i} style={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <User size={16} color="#ea580c" />
                                            <strong style={{ color: '#9a3412', fontSize: '0.95rem' }}>{emp.name}</strong>
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: '#ea580c', fontWeight: 'bold', backgroundColor: '#ffedd5', padding: '4px 8px', borderRadius: '4px' }}>
                                            Mangler ~{emp.missingHours} timer
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STAT BOXES */}
            <div className="timesheet-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="glass-panel"
                    style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
                >
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Arbejdstimer ({getPeriodLabel()})</span>
                    <strong style={{ fontSize: '2.5rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)' }}>
                            <Clock size={28} color="#3b82f6" />
                        </div>
                        {totalHours.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                </div>
                <div className="glass-panel" 
                    style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
                >
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kørte Kilometer ({getPeriodLabel()})</span>
                    <strong style={{ fontSize: '2.5rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)' }}>
                            <TrendingUp size={28} color="#10b981" />
                        </div>
                        {totalKm} km
                    </strong>
                </div>
                <div className="glass-panel" 
                    style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
                >
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fravær / Internt ({getPeriodLabel()})</span>
                    <strong style={{ fontSize: '2.5rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)' }}>
                            <AlertTriangle size={28} color="#f59e0b" />
                        </div>
                        {absenceEntries.reduce((acc, curr) => acc + (curr.hours || 0), 0).toFixed(2).replace('.', ',')} t
                    </strong>
                </div>
                {vacationStats && (
                    <div className="glass-panel" 
                        style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
                    >
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{vacationStats.title}</span>
                        <strong style={{ fontSize: '2.5rem', color: vacationStats.remaining <= 0 ? '#ef4444' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '10px', borderRadius: '12px', background: vacationStats.remaining <= 0 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)' }}>
                                <Calendar size={28} color={vacationStats.remaining <= 0 ? '#ef4444' : '#3b82f6'} />
                            </div>
                            {vacationStats.remaining.toLocaleString('da-DK', { maximumFractionDigits: 1 })} dage
                        </strong>
                    </div>
                )}
            </div>

            {/* GRAF (Kun for specifik medarbejder) */}
            {selectedUser !== 'all' && chartData.length > 0 && (
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
                        <p style={{ margin: 0, fontSize: '1rem' }}>Prøv at ændre periode eller medarbejder.</p>
                    </div>
                ) : (
                    <div className="timesheet-table-container">
                        <table className="timesheet-table">
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <th style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dato</th>
                                    <th style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medarbejder</th>
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
                                    const member = teamMembers.find(m => m.id === entry.employeeId);
                                    const memberName = member?.owner_name || member?.company_name || 'Slettet';
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
                                            <td data-label="Medarbejder" style={{ padding: '20px 24px', color: '#334155', fontSize: '0.95rem', fontWeight: '500' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <UserAvatar name={memberName} avatarUrl={member?.avatar_url} size={28} ring={false} />
                                                    {memberName}
                                                </div>
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
                                                            style={{ background: '#fef2f2', border: 'none', padding: '8px', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                                            onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
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

            {/* UNIFIED LØNEKSPORT & KONTROL-CENTER MODAL */}
            {USE_UNIFIED_PAYROLL_MODAL && isExportModalOpen && (() => {
                const data = getExportData();
                const showWarning = data.rows.some(r => !r.lonnummer);
                
                return createPortal(
                    <div style={{ 
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        backgroundColor: 'rgba(15, 23, 42, 0.7)', 
                        backdropFilter: 'blur(8px)', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        zIndex: 100000, 
                        padding: '20px', 
                        animation: 'fadeIn 0.2s ease-out' 
                    }}>
                        <div style={{ 
                            width: '100%', 
                            maxWidth: '720px', 
                            maxHeight: '90vh',
                            background: '#fff', 
                            borderRadius: '20px', 
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            
                            {/* Modal Header */}
                            <div style={{ 
                                padding: '24px 28px', 
                                borderBottom: '1px solid #e2e8f0', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                background: '#f8fafc'
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <FileSpreadsheet size={24} color="#000" />
                                        Løneksport & Kontrol-center
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                                        Verificer timer og fravær for medarbejdere inden download af filer.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setIsExportModalOpen(false)} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'none'; }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Body (Scrollable) */}
                            <div style={{ padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                                {/* Period Range Indicator */}
                                <div style={{ 
                                    background: '#eff6ff', 
                                    border: '1px solid #bfdbfe', 
                                    borderRadius: '14px', 
                                    padding: '16px 20px', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ color: '#1d4ed8', background: '#dbeafe', padding: '10px', borderRadius: '10px' }}>
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Officiel lønperiode
                                            </div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e3a8a', marginTop: '2px' }}>
                                                {formatDa(data.start)} – {formatDa(data.end)}
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ 
                                        fontSize: '0.8rem', 
                                        fontWeight: 'bold', 
                                        color: '#1e40af', 
                                        background: '#dbeafe', 
                                        padding: '4px 10px', 
                                        borderRadius: '999px' 
                                    }}>
                                        {data.rows.length} {data.rows.length === 1 ? 'medarbejder' : 'medarbejdere'}
                                    </span>
                                </div>

                                {/* Warnings (if any) */}
                                {showWarning && (
                                    <div style={{ 
                                        backgroundColor: '#fffbeb', 
                                        border: '1px solid #fde68a', 
                                        borderRadius: '12px', 
                                        padding: '14px 16px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '12px', 
                                        color: '#b45309' 
                                    }}>
                                        <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                                        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                                            <strong>Advarsel:</strong> En eller flere medarbejdere mangler et <strong>lønnummer</strong>. Dette kan give problemer ved import i dit lønsystem. Gå til <em>Stamdata & Ferie</em> for at rette det.
                                        </div>
                                    </div>
                                )}

                                {/* Summary Stats Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div 
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.04)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                        }}
                                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}
                                    >
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Normale timer</span>
                                        <strong style={{ fontSize: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={16} color="#3b82f6" />
                                            {data.totalHours.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t
                                        </strong>
                                    </div>
                                    <div 
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.04)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                        }}
                                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}
                                    >
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Kørsel</span>
                                        <strong style={{ fontSize: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <TrendingUp size={16} color="#10b981" />
                                            {data.totalKm} km
                                        </strong>
                                    </div>
                                    <div 
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.04)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                        }}
                                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}
                                    >
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Samlet fravær</span>
                                        <strong style={{ fontSize: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertTriangle size={16} color="#f59e0b" />
                                            {data.totalAbsence.toLocaleString('da-DK', { maximumFractionDigits: 1 })} {data.absenceUnitText}
                                        </strong>
                                    </div>
                                </div>

                                {/* Employees Breakdown List */}
                                <div>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#475569', fontWeight: 'bold' }}>Specifikation pr. medarbejder</h4>
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 'bold' }}>
                                                    <th style={{ padding: '12px 16px' }}>Medarbejder</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Normaltimer</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Kørsel</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Fravær</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.rows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" style={{ padding: '24px', textTextAlign: 'center', color: '#64748b', textAlign: 'center' }}>
                                                            Ingen registrerede timer eller fravær i denne periode.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    data.rows.map((r, i) => {
                                                        const rowAvatar = teamMembers.find(t => String(t.id) === String(r.employeeId))?.avatar_url;
                                                        const absence = (r.vacation || 0) + (r.sick || 0) + (r.other || 0);
                                                        
                                                        return (
                                                            <tr 
                                                                key={i} 
                                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                style={{ borderBottom: i < data.rows.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background-color 0.15s ease' }}
                                                            >
                                                                <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <UserAvatar name={r.name} avatarUrl={rowAvatar} size={32} />

                                                                    <div>
                                                                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{r.name}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                                            {r.lonnummer ? `Lønnr: ${r.lonnummer}` : (
                                                                                <span style={{ color: '#b45309', fontWeight: 'bold', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                                                                    ⚠️ Mangler lønnummer
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                                                                    {r.normalHours > 0 ? `${r.normalHours.toLocaleString('da-DK', { minimumFractionDigits: 2 })} t` : '—'}
                                                                </td>
                                                                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>
                                                                    {r.mileage > 0 ? `${r.mileage} km` : '—'}
                                                                </td>
                                                                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>
                                                                    {absence > 0 ? `${absence.toLocaleString('da-DK')} ${data.absenceUnitText}` : '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer (Eksportfiler) */}
                            <div style={{ 
                                padding: '24px 28px', 
                                borderTop: '1px solid #e2e8f0', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '16px',
                                background: '#f8fafc' 
                            }}>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Hent eksportfiler:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    
                                    {/* 1. Primær lønfil */}
                                    <div 
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-3px)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(37,99,235,0.08)';
                                            e.currentTarget.style.borderColor = '#93c5fd';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                                            e.currentTarget.style.borderColor = '#bfdbfe';
                                        }}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            padding: '12px 16px', 
                                            backgroundColor: '#fff', 
                                            border: '1px solid #bfdbfe', 
                                            borderRadius: '12px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>1. Lønfil til Lønsystem (Zenegy / Dataløn)</strong>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '999px', textTransform: 'uppercase' }}>Anbefalet</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Transaktionsfil med lønarter klar til direkte import.</div>
                                        </div>
                                        <button 
                                            onClick={() => triggerDownload('lonart', data)}
                                            disabled={data.rows.length === 0}
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '6px', 
                                                padding: '8px 14px', 
                                                backgroundColor: data.rows.length === 0 ? '#cbd5e1' : '#000', 
                                                color: '#fff', 
                                                border: 'none', 
                                                borderRadius: '8px', 
                                                fontWeight: 'bold', 
                                                fontSize: '0.85rem', 
                                                cursor: data.rows.length === 0 ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                                            }}
                                            onMouseEnter={e => { if (data.rows.length > 0) { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)'; } }}
                                            onMouseLeave={e => { if (data.rows.length > 0) { e.currentTarget.style.backgroundColor = '#000'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
                                            onMouseDown={e => { if (data.rows.length > 0) e.currentTarget.style.transform = 'translateY(-1px) scale(0.95)'; }}
                                            onMouseUp={e => { if (data.rows.length > 0) e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; }}
                                        >
                                            <Download size={14} /> Hent lønfil
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {/* 2. Opsummering */}
                                        <div 
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-3px)';
                                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.04)';
                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'none';
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }}
                                            style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                justifyContent: 'space-between', 
                                                padding: '12px 16px', 
                                                backgroundColor: '#fff', 
                                                border: '1px solid #e2e8f0', 
                                                borderRadius: '12px',
                                                gap: '8px',
                                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            <div>
                                                <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>2. Opsummering (CSV)</strong>
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Overblik over timer, fravær og kørsel pr. medarbejder.</div>
                                            </div>
                                            <button 
                                                onClick={() => triggerDownload('summary', data)}
                                                disabled={data.rows.length === 0}
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    gap: '6px', 
                                                    padding: '8px 14px', 
                                                    backgroundColor: '#fff', 
                                                    color: data.rows.length === 0 ? '#cbd5e1' : '#0f172a', 
                                                    border: '1px solid #e2e8f0', 
                                                    borderRadius: '8px', 
                                                    fontWeight: 'bold', 
                                                    fontSize: '0.85rem', 
                                                    cursor: data.rows.length === 0 ? 'not-allowed' : 'pointer',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                                                }}
                                                onMouseEnter={e => { if (data.rows.length > 0) { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)'; } }}
                                                onMouseLeave={e => { if (data.rows.length > 0) { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
                                                onMouseDown={e => { if (data.rows.length > 0) e.currentTarget.style.transform = 'translateY(-1px) scale(0.95)'; }}
                                                onMouseUp={e => { if (data.rows.length > 0) e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; }}
                                            >
                                                <Download size={14} /> Hent rapport
                                            </button>
                                        </div>

                                        {/* 3. Kontrol-CSV */}
                                        <div 
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-3px)';
                                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.04)';
                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'none';
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }}
                                            style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                justifyContent: 'space-between', 
                                                padding: '12px 16px', 
                                                backgroundColor: '#fff', 
                                                border: '1px solid #e2e8f0', 
                                                borderRadius: '12px',
                                                gap: '8px',
                                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            <div>
                                                <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>3. Kontrol-CSV</strong>
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Alle rå tidsregistreringer til revision og bogføring.</div>
                                            </div>
                                            <button 
                                                onClick={() => triggerDownload('kontrol', data)}
                                                disabled={data.rows.length === 0}
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    gap: '6px', 
                                                    padding: '8px 14px', 
                                                    backgroundColor: '#fff', 
                                                    color: data.rows.length === 0 ? '#cbd5e1' : '#0f172a', 
                                                    border: '1px solid #e2e8f0', 
                                                    borderRadius: '8px', 
                                                    fontWeight: 'bold', 
                                                    fontSize: '0.85rem', 
                                                    cursor: data.rows.length === 0 ? 'not-allowed' : 'pointer',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                                                }}
                                                onMouseEnter={e => { if (data.rows.length > 0) { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)'; } }}
                                                onMouseLeave={e => { if (data.rows.length > 0) { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
                                                onMouseDown={e => { if (data.rows.length > 0) e.currentTarget.style.transform = 'translateY(-1px) scale(0.95)'; }}
                                                onMouseUp={e => { if (data.rows.length > 0) e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; }}
                                            >
                                                <Download size={14} /> Hent rå data
                                            </button>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>

                        </div>
                    </div>,
                    document.body
                );
            })()}

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
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Medarbejder</label>
                                    <CustomSelect 
                                        value={formData.employeeId}
                                        onChange={(val) => setFormData({...formData, employeeId: val})}
                                        options={[
                                            ...(isAdding && formData.regType === 'internal' ? [{ value: 'collective', label: '🏖️ Kollektiv Ferie (Alle medarbejdere)' }] : []),
                                            ...teamMembers.map(m => ({ value: m.id, label: m.owner_name || m.company_name }))
                                        ]}
                                        placeholder="-- Vælg medarbejder --"
                                    />
                                </div>
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
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {formData.regType === 'project' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Vælg Sag</label>
                                        <CustomSelect 
                                            value={formData.leadId}
                                            onChange={(val) => setFormData({...formData, leadId: val})}
                                            placeholder="-- Vælg Sag --"
                                            options={leadsData.filter(l => ['Bekræftet opgave', 'Historik', 'Afbrudt Sag'].includes(l.status)).map(l => ({ value: l.id, label: `Sag ${l.case_number || String(l.id).substring(0,6)} - ${l.customer_name}` }))}
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
                            </div>

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

            {/* Stamdata & Ferie Modal */}
            {createPortal(
                <>
                    {isStamdataModalOpen && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsStamdataModalOpen(false)}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            style={{ 
                                position: 'relative', 
                                width: '100%', 
                                maxWidth: '800px', 
                                maxHeight: '90vh', 
                                display: 'flex', 
                                flexDirection: 'column',
                                background: 'rgba(255, 255, 255, 0.85)', 
                                backdropFilter: 'blur(24px)', 
                                WebkitBackdropFilter: 'blur(24px)',
                                borderRadius: '24px', 
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.3) inset',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.5)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '14px', color: '#2563eb' }}>
                                        <IdCard size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Stamdata & Ferie</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Overblik over lønnumre og feriesaldi for alle medarbejdere.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsStamdataModalOpen(false)}
                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#64748b'; }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: '16px', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <div>Medarbejder</div>
                                    <div style={{ textAlign: 'center' }}>Lønnummer</div>
                                    <div style={{ textAlign: 'center' }}>Feriesaldo (Rest / Kvote)</div>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {teamMembers.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Ingen medarbejdere fundet.</div>
                                    ) : teamMembers.map(member => {
                                        const quota = member.raw_data?.vacation_quota ?? 30;
                                        const currentYear = new Date().getFullYear();
                                        const ferieEntries = allEntries.filter(e => {
                                            if (e.employeeId !== member.id) return false;
                                            if (e.absenceType !== 'Ferie') return false;
                                            if (new Date(e.date).getFullYear() !== currentYear) return false;
                                            if (isWeekendOrHoliday(e.date)) return false;
                                            return true;
                                        });
                                        const used = new Set(ferieEntries.map(e => e.date)).size;
                                        const remaining = quota - used;
                                        
                                        return (
                                            <div 
                                                key={member.id} 
                                                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '16px', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.6)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)'; }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <UserAvatar name={member.owner_name || member.company_name || ''} avatarUrl={member.avatar_url} size={36} />

                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.owner_name || 'Uden Navn'}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{getRoleLabel(member.role)}</div>
                                                    </div>
                                                </div>
                                                
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <input 
                                                        type="text" 
                                                        inputMode="numeric"
                                                        placeholder="Eks. 1001" 
                                                        value={member.raw_data?.lonnummer ?? ''} 
                                                        onChange={(e) => handleLonnummerInput(member.id, e.target.value)} 
                                                        onBlur={() => handleLonnummerBlur(member)}
                                                        style={{ width: '80px', padding: '8px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} 
                                                        onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                                    />
                                                </div>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: remaining < 5 ? '#ef4444' : '#10b981', lineHeight: 1 }}>{remaining}</span>
                                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>Rest</span>
                                                    </div>
                                                    <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)' }} />
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.03)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <button 
                                                            onClick={() => handleVacationQuotaUpdate(member.id, member.raw_data || {}, String(Math.max(0, quota - 1)))}
                                                            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#fff', borderRadius: '8px', cursor: 'pointer', color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s', fontWeight: 'bold', fontSize: '1rem' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                                                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                                                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        >
                                                            -
                                                        </button>
                                                        <input 
                                                            type="text" 
                                                            inputMode="numeric"
                                                            value={quota} 
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/\D/g, '');
                                                                handleVacationQuotaUpdate(member.id, member.raw_data || {}, val);
                                                            }}
                                                            style={{ width: '36px', padding: '0', border: 'none', background: 'transparent', fontSize: '0.9rem', textAlign: 'center', fontWeight: 700, color: '#334155', outline: 'none' }} 
                                                        />
                                                        <button 
                                                            onClick={() => handleVacationQuotaUpdate(member.id, member.raw_data || {}, String(quota + 1))}
                                                            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#fff', borderRadius: '8px', cursor: 'pointer', color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s', fontWeight: 'bold', fontSize: '1.1rem' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                                                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                                                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'none', '@media (min-width: 640px)': { display: 'inline' } }}>dage</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                        </div>
                    )}
                </>
            , document.body)}
        </div>
    );
}
