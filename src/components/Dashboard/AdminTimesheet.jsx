import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, ChevronDown, Check, FileText, User, Calendar, Plus, Clock, Search, TrendingUp, AlertTriangle, Edit2, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

export default function AdminTimesheet({ leadsData, profile }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('this_month');
    const [selectedUser, setSelectedUser] = useState('all');
    
    // CRUD States
    const [isAdding, setIsAdding] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().substring(0, 10), 
        employeeId: '', 
        leadId: '', 
        desc: '', 
        hours: '', 
        km: '', 
        startTime: '07:00', 
        endTime: '15:00' 
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
    }, [profile]);

    // Auto-beregn timer ud fra start og slut
    useEffect(() => {
        if (formData.startTime && formData.endTime) {
            const [sH, sM] = formData.startTime.split(':').map(Number);
            const [eH, eM] = formData.endTime.split(':').map(Number);
            let diffHours = (eH + eM/60) - (sH + sM/60);
            if (diffHours < 0) diffHours += 24; // If crossing midnight
            setFormData(prev => ({ ...prev, hours: (Math.round(diffHours * 4) / 4).toString() }));
        }
    }, [formData.startTime, formData.endTime]);

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
                dataMap[dateStr].absenceHours += (entry.hours || 0);
            } else {
                dataMap[dateStr].hours += (entry.hours || 0);
            }
        });
        return Object.values(dataMap);
    }, [filteredEntries, selectedUser]);

    // Aggregeringer
    const totalHours = filteredEntries.reduce((acc, curr) => acc + (curr.leadId !== 'internal' ? (curr.hours || 0) : 0), 0);
    const totalKm = filteredEntries.reduce((acc, curr) => acc + (curr.km || 0), 0);
    const absenceEntries = filteredEntries.filter(e => e.leadId === 'internal');
    
    const handleExportCSV = () => {
        let csvContent = "Dato,Medarbejder,Sag/Type,Beskrivelse,Starttid,Sluttid,Timer,Kilometer\n";
        filteredEntries.forEach(e => {
            const member = teamMembers.find(m => m.id === e.employeeId);
            const name = member?.company_name || member?.owner_name || 'Slettet/Ukendt';
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

    const handleDeleteEntry = async (entry) => {
        if (!window.confirm('Er du sikker på, at du vil slette denne registrering?')) return;
        
        if (entry.leadId === 'internal') {
            const member = teamMembers.find(m => m.id === entry.employeeId);
            if (!member) return toast.error('Medarbejder ikke fundet');
            const currentEntries = (member.raw_data?.time_entries || []).filter(t => t.id !== entry.id);
            const newRawData = { ...member.raw_data, time_entries: currentEntries };
            const { error } = await supabase.from('carpenters').update({ raw_data: newRawData }).eq('id', member.id);
            if (error) toast.error('Kunne ikke slette fravær/internt.');
            else { toast.success('Registrering slettet.'); setTimeout(() => window.location.reload(), 800); }
        } else {
            const lead = leadsData.find(l => l.id === entry.leadId);
            if (!lead) return toast.error('Sag ikke fundet');
            const currentEntries = (lead.raw_data?.time_entries || []).filter(t => t.id !== entry.id);
            const newRawData = { ...lead.raw_data, time_entries: currentEntries };
            const { error } = await supabase.from('leads').update({ raw_data: newRawData }).eq('id', lead.id);
            if (error) toast.error('Kunne ikke slette tiden.');
            else { toast.success('Tidsregistrering slettet.'); setTimeout(() => window.location.reload(), 800); }
        }
    };

    const handleSaveEntry = async (e) => {
        e.preventDefault();
        if (!formData.employeeId) return toast.error('Vælg en medarbejder');
        if (!formData.leadId) return toast.error('Vælg en sag eller internt fravær');
        if (!formData.date) return toast.error('Vælg en dato');
        
        const finalEntry = {
            id: isAdding ? `time-${Date.now()}` : editingEntry.id,
            startTime: formData.startTime || '',
            endTime: formData.endTime || '',
            hours: parseFloat(formData.hours) || 0,
            date: formData.date,
            desc: formData.desc || '',
            employeeId: formData.employeeId,
            employeeName: teamMembers.find(m => m.id === formData.employeeId)?.owner_name || '',
            km: formData.km ? parseFloat(formData.km) : 0
        };

        if (formData.leadId === 'internal') {
            finalEntry.absenceType = formData.desc || 'Internt';
            const member = teamMembers.find(m => m.id === formData.employeeId);
            if (!member) return toast.error('Medarbejder ikke fundet');
            
            let currentEntries = member.raw_data?.time_entries || [];
            if (!isAdding) currentEntries = currentEntries.filter(t => t.id !== finalEntry.id);
            currentEntries = [...currentEntries, finalEntry];
            
            const newRawData = { ...member.raw_data, time_entries: currentEntries };
            const { error } = await supabase.from('carpenters').update({ raw_data: newRawData }).eq('id', member.id);
            if (error) return toast.error('Fejl ved gem internt.');
        } else {
            const lead = leadsData.find(l => String(l.id) === String(formData.leadId));
            if (!lead) return toast.error('Sag ikke fundet');
            
            let currentEntries = lead.raw_data?.time_entries || [];
            if (!isAdding) currentEntries = currentEntries.filter(t => t.id !== finalEntry.id);
            currentEntries = [...currentEntries, finalEntry];
            
            const newRawData = { ...lead.raw_data, time_entries: currentEntries };
            const { error } = await supabase.from('leads').update({ raw_data: newRawData }).eq('id', lead.id);
            if (error) return toast.error('Fejl ved gem tid på sag.');
        }

        toast.success(isAdding ? 'Registrering tilføjet!' : 'Registrering opdateret!');
        setEditingEntry(null);
        setIsAdding(false);
        setTimeout(() => window.location.reload(), 800);
    };

    const openEdit = (entry) => {
        setFormData({
            date: entry.date || '',
            employeeId: entry.employeeId || '',
            leadId: entry.leadId || '',
            desc: entry.desc || '',
            hours: entry.hours || '',
            km: entry.km || '',
            startTime: entry.startTime || '',
            endTime: entry.endTime || ''
        });
        setEditingEntry(entry);
        setIsAdding(false);
    };

    const openAdd = () => {
        setFormData({ 
            date: new Date().toISOString().substring(0, 10), 
            employeeId: profile?.id || '', 
            leadId: '', 
            desc: '', 
            hours: '', 
            km: '', 
            startTime: '07:00', 
            endTime: '15:00' 
        });
        setIsAdding(true);
        setEditingEntry(null);
    };

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Henter medarbejderdata...</div>;
    }

    const showModal = isAdding || editingEntry;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out', maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 50, overflow: 'visible' }}>
                <div>
                    <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={28} color="#000" />
                        Løn & Timer
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Kontrol, redigering og eksport af medarbejdernes tids- og kørselsregistreringer.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <CustomSelect 
                        value={selectedUser}
                        onChange={setSelectedUser}
                        options={[
                            { value: 'all', label: 'Alle medarbejdere' },
                            ...teamMembers.map(m => ({ value: m.id, label: `${m.owner_name || m.company_name} (${m.role})` }))
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

                    <button 
                        onClick={openAdd}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                        <Plus size={18} /> Opret registrering
                    </button>

                    <button 
                        onClick={handleExportCSV}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                        <Download size={18} /> Eksportér (CSV)
                    </button>
                </div>
            </div>

            {/* STAT BOXES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Samlede Arbejdstimer</span>
                    <strong style={{ fontSize: '2.5rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)' }}>
                            <Clock size={28} color="#3b82f6" />
                        </div>
                        {totalHours.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                </div>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kørte Kilometer</span>
                    <strong style={{ fontSize: '2.5rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)' }}>
                            <TrendingUp size={28} color="#10b981" />
                        </div>
                        {totalKm} km
                    </strong>
                </div>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fravær / Internt</span>
                    <strong style={{ fontSize: '2.5rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)' }}>
                            <AlertTriangle size={28} color="#f59e0b" />
                        </div>
                        {absenceEntries.reduce((acc, curr) => acc + (curr.hours || 0), 0)} t
                    </strong>
                </div>
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
                {filteredEntries.length === 0 ? (
                    <div style={{ padding: '64px', textAlign: 'center', color: '#94a3b8' }}>
                        <Calendar size={64} style={{ opacity: 0.2, margin: '0 auto 16px auto' }} />
                        <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '1.2rem' }}>Ingen registreringer fundet</h4>
                        <p style={{ margin: 0, fontSize: '1rem' }}>Prøv at ændre periode eller medarbejder.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
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
                                {filteredEntries.map((entry, idx) => {
                                    const member = teamMembers.find(m => m.id === entry.employeeId);
                                    const memberName = member?.owner_name || member?.company_name || 'Slettet';
                                    const isInternal = entry.leadId === 'internal';

                                    return (
                                        <tr 
                                            key={entry.id} 
                                            onClick={() => openEdit(entry)}
                                            style={{ borderBottom: idx === filteredEntries.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.04)', transition: 'background 0.2s', cursor: 'pointer' }} 
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'} 
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '20px 24px', color: '#1e293b', fontWeight: '600', fontSize: '0.95rem' }}>
                                                {new Date(entry.date).toLocaleDateString('da-DK', { day: '2-digit', month: 'short' })}
                                            </td>
                                            <td style={{ padding: '20px 24px', color: '#334155', fontSize: '0.95rem', fontWeight: '500' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                        {memberName.charAt(0).toUpperCase()}
                                                    </div>
                                                    {memberName}
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 24px', fontSize: '0.95rem' }}>
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
                                            <td style={{ padding: '20px 24px', color: '#64748b', fontSize: '0.95rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.desc}>
                                                {entry.desc || '-'}
                                            </td>
                                            <td style={{ padding: '20px 24px', color: '#475569', fontSize: '0.95rem', fontWeight: '500' }}>
                                                {entry.startTime} - {entry.endTime || '?'}
                                            </td>
                                            <td style={{ padding: '20px 24px', color: '#1a1a1a', fontWeight: '800', fontSize: '1.1rem', textAlign: 'right' }}>
                                                {entry.hours || 0}
                                            </td>
                                            <td style={{ padding: '20px 24px', color: '#047857', fontWeight: '700', fontSize: '1rem', textAlign: 'right' }}>
                                                {entry.km > 0 ? `${entry.km} km` : '-'}
                                            </td>
                                            <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => openEdit(entry)}
                                                        style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '8px', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                                                        title="Rediger registrering"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry); }}
                                                        style={{ background: '#fef2f2', border: 'none', padding: '8px', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                                                        title="Slet registrering"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* MODAL TIL OPRET / REDIGER */}
            {showModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ width: '100%', maxWidth: '600px', background: '#fff', borderRadius: '16px', overflow: 'visible', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        
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
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Medarbejder</label>
                                    <CustomSelect 
                                        value={formData.employeeId}
                                        onChange={(val) => setFormData({...formData, employeeId: val})}
                                        options={teamMembers.map(m => ({ value: m.id, label: m.owner_name || m.company_name }))}
                                        placeholder="-- Vælg medarbejder --"
                                    />
                                </div>
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
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Sag / Projekt / Internt Fravær</label>
                                <CustomSelect 
                                    value={formData.leadId}
                                    onChange={(val) => setFormData({...formData, leadId: val})}
                                    placeholder="-- Vælg Sag --"
                                    options={[
                                        { 
                                            isGroup: true, 
                                            label: 'Aktive Byggeprojekter', 
                                            options: leadsData.filter(l => ['Sendt tilbud', 'Bekræftet opgave', 'Historik'].includes(l.status)).map(l => ({ value: l.id, label: `Sag ${l.case_number || String(l.id).substring(0,6)} - ${l.customer_name}` }))
                                        },
                                        {
                                            isGroup: true,
                                            label: 'Internt',
                                            options: [{ value: 'internal', label: 'Fravær, Sygdom, Ferie, Møder o.lign.' }]
                                        }
                                    ]}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Start tid (valgfri)</label>
                                    <input 
                                        type="time" 
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Slut tid (valgfri)</label>
                                    <input 
                                        type="time" 
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#1e293b' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Totale Timer *</label>
                                    <input 
                                        type="number" 
                                        required
                                        step="0.25"
                                        min="0"
                                        placeholder="F.eks. 7.5"
                                        value={formData.hours}
                                        onChange={(e) => setFormData({...formData, hours: e.target.value})}
                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #3b82f6', outline: 'none', fontSize: '0.95rem', fontWeight: 'bold', backgroundColor: '#eff6ff', color: '#1e293b' }}
                                    />
                                </div>
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Beskrivelse / Type Fravær</label>
                                <textarea 
                                    required
                                    rows="3"
                                    placeholder={formData.leadId === 'internal' ? "F.eks. 'Sygdom', 'Ferie', 'Værksted'" : "F.eks. 'Opsat gipslofter og spartlet'"}
                                    value={formData.desc}
                                    onChange={(e) => setFormData({...formData, desc: e.target.value})}
                                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', color: '#1e293b' }}
                                />
                            </div>

                            <div style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => { setIsAdding(false); setEditingEntry(null); }} style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Annuller</button>
                                <button type="submit" style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Save size={18} /> Gem registrering
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
