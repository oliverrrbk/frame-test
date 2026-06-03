import React, { useState, useMemo } from 'react';
import { Clock, Briefcase, Calendar, MapPin, ArrowRight, ChevronDown, Phone } from 'lucide-react';
import { subDays, subMonths, isAfter, isSameDay } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

export default function WorkerOverview({ leadsData, myProfile, setActiveTab, setTargetCaseId, simulatedRole }) {
    const [timeframe, setTimeframe] = useState('7d'); // '1d' (i går), '3d', '7d', '30d', '60d'

    // Filtrer sager, som arbejderen er tilknyttet
    const activeWorkerCases = useMemo(() => {
        return leadsData.filter(lead => {
            const role = myProfile?.role;
            const workers = lead.raw_data?.assigned_workers || [];
            
            const pmData = lead.raw_data?.assigned_pm;
            const pms = Array.isArray(pmData) ? pmData : (pmData ? [pmData] : []);
            
            const isAssignedSales = pms.includes(myProfile?.id) || lead.assigned_to === myProfile?.id;
            const isAssignedWorker = workers.includes(myProfile?.id);
            
            let isAssigned = false;
            if (role === 'sales') {
                isAssigned = isAssignedSales || isAssignedWorker;
            } else {
                isAssigned = isAssignedWorker;
            }

            // Hvis det er en simulator for en svend/lærling ELLER projektleder, lader vi dem se relevante sager 
            // så de kan teste systemet uden at skulle assigne sig selv først.
            if (simulatedRole && ['worker', 'apprentice', 'sales'].includes(role)) {
                return ['Bekræftet opgave', 'Historik'].includes(lead.status);
            }

            // For produktion vis de sager man er assignet til
            return isAssigned && ['Bekræftet opgave', 'Historik'].includes(lead.status || '');
        });
    }, [leadsData, myProfile, simulatedRole]);

    const [selectedCheckInProject, setSelectedCheckInProject] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
        
        const entry = {
            id: `time-${Date.now()}`,
            startTime: new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }),
            endTime: null,
            hours: 0,
            date: new Date().toISOString().substring(0, 10),
            desc: 'Aktiv tjek-ind (auto)',
            employeeId: myProfile?.id,
            employeeName: myProfile?.owner_name || myProfile?.company_name || myProfile?.email || 'Ukendt medarbejder'
        };
        
        const currentEntries = leadToUpdate.raw_data?.time_entries || [];
        const updatedEntries = [entry, ...currentEntries];
        const newRawData = { ...leadToUpdate.raw_data, time_entries: updatedEntries };
        
        const { error } = await supabase.from('leads').update({ raw_data: newRawData }).eq('id', leadToUpdate.id);
        if (error) {
            toast.error('Fejl ved stempling.');
        } else {
            toast.success('Du er nu tjekket ind!');
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    const handleGlobalCheckOut = async () => {
        if (!activeCheckInInfo) return;
        
        const { lead, activeEntry } = activeCheckInInfo;
        const nowTime = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
        
        const currentEntries = [...(lead.raw_data?.time_entries || [])];
        const entryIndex = currentEntries.findIndex(t => t.id === activeEntry.id);
        if (entryIndex === -1) return;
        
        const entry = { ...currentEntries[entryIndex] };
        entry.endTime = nowTime;
        
        const start = new Date(`${entry.date}T${entry.startTime}`);
        const end = new Date(`${entry.date}T${entry.endTime}`);
        let diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours < 0) diffHours = 0;
        
        // Afrund til nærmeste kvarter
        entry.hours = Math.round(diffHours * 4) / 4;
        entry.desc = 'Arbejde udført (Tjek-ud)';
        
        currentEntries[entryIndex] = entry;
        const newRawData = { ...lead.raw_data, time_entries: currentEntries };
        
        const { error } = await supabase.from('leads').update({ raw_data: newRawData }).eq('id', lead.id);
        if (error) {
            toast.error('Fejl ved udstempling.');
        } else {
            toast.success('Tjekket ud! Timerne er nu gemt.');
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    // Beregn timeforbrug for den valgte periode
    const timeStats = useMemo(() => {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
            case '1d': startDate = subDays(now, 1); break;
            case '3d': startDate = subDays(now, 3); break;
            case '7d': startDate = subDays(now, 7); break;
            case '30d': startDate = subDays(now, 30); break;
            case '90d': startDate = subDays(now, 90); break;
            case '180d': startDate = subDays(now, 180); break;
            case '60d': startDate = subMonths(now, 2); break;
            default: startDate = subDays(now, 7);
        }

        let totalHours = 0;
        const projectHours = {};
        const dailyHours = {};
        const daysArray = [];
        
        const daysCount = timeframe === '1d' ? 0 : timeframe === '3d' ? 2 : timeframe === '7d' ? 6 : timeframe === '30d' ? 29 : timeframe === '90d' ? 89 : timeframe === '180d' ? 179 : 59;
        for (let i = 0; i <= daysCount; i++) {
            const d = subDays(now, i);
            const dateStr = d.toISOString().substring(0, 10);
            dailyHours[dateStr] = 0;
            daysArray.unshift(dateStr);
        }

        leadsData.forEach(lead => {
            const timeEntries = lead.raw_data?.time_entries || [];
            
            timeEntries.forEach(entry => {
                if (entry.employeeId === myProfile?.id) {
                    const entryDate = new Date(entry.date);
                    
                    if (isAfter(entryDate, startDate) || isSameDay(entryDate, startDate)) {
                        totalHours += Number(entry.hours || 0);
                        
                        const projectName = `Sag ${lead.case_number || String(lead.id).substring(0,8)} - ${lead.customer_name || 'Ukendt'}`;
                        if (!projectHours[projectName]) {
                            projectHours[projectName] = 0;
                        }
                        projectHours[projectName] += Number(entry.hours || 0);
                        
                        const dateStr = entryDate.toISOString().substring(0, 10);
                        if (dailyHours[dateStr] !== undefined) {
                            dailyHours[dateStr] += Number(entry.hours || 0);
                        }
                    }
                }
            });
        });

        const sortedProjects = Object.entries(projectHours)
            .map(([name, hours]) => ({ name, hours }))
            .sort((a, b) => b.hours - a.hours);
            
        const chartData = daysArray.map(dateStr => {
            const dateObj = new Date(dateStr);
            const dayName = dateObj.toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' });
            return {
                name: dayName,
                timer: dailyHours[dateStr] || 0
            };
        });

        return { totalHours, sortedProjects, chartData };
    }, [leadsData, myProfile, timeframe]);

    return (
        <div className="dashboard-workspace worker-overview" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease-out' }}>
            
            {/* Header */}
            <div style={{ padding: '0 8px' }}>
                <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.5rem' }}>
                    Hej {(myProfile?.owner_name || myProfile?.company_name || 'Mester').split(' ')[0]}!
                </h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem' }}>
                    Her er dit overblik over timer og projekter.
                </p>
            </div>

            {/* GLOBAL STEMPLING MODUL */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Stempling
                </h3>
                
                {activeCheckInInfo ? (
                    <>
                        <div style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
                            Du har været tjekket ind siden kl. <strong>{activeCheckInInfo.activeEntry.startTime}</strong> på sag: <em>{activeCheckInInfo.lead.customer_name}</em>
                            {activeCheckInInfo.lead.customer_address && (
                                <div style={{ marginTop: '8px' }}>
                                    <MapPin size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeCheckInInfo.lead.customer_address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#10b981', textDecoration: 'underline', fontWeight: '500' }}
                                    >
                                        {activeCheckInInfo.lead.customer_address}
                                    </a>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={handleGlobalCheckOut}
                            style={{ maxWidth: '400px', width: '100%', padding: '20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)', transition: 'transform 0.1s' }}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            ◼ STOP ARBEJDE
                        </button>
                    </>
                ) : (
                    <>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
                            Vælg et projekt og tryk start for at stemple ind.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '400px' }}>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                                <div 
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    style={{ 
                                        padding: '16px', 
                                        borderRadius: '12px', 
                                        border: '1px solid #e5e7eb', 
                                        background: '#ffffff', 
                                        fontSize: '1.05rem', 
                                        color: selectedCheckInProject ? '#111827' : '#6b7280', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: selectedCheckInProject ? '500' : 'normal' }}>
                                        {selectedCheckInProject 
                                            ? (() => {
                                                const p = activeWorkerCases.find(l => l.id === selectedCheckInProject);
                                                return p ? `Sag ${p.case_number || String(p.id).substring(0,6)} - ${p.customer_name} (${p.category || 'Ukendt kategori'}, ${p.customer_address || 'Adresse ikke angivet'})` : '-- Vælg projekt --';
                                            })()
                                            : '-- Vælg projekt --'}
                                    </span>
                                    <ChevronDown size={20} style={{ color: '#9ca3af', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                </div>
                                
                                {isDropdownOpen && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '100%', 
                                        left: 0, 
                                        right: 0, 
                                        marginTop: '8px', 
                                        background: '#ffffff', 
                                        borderRadius: '12px', 
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
                                        border: '1px solid #f3f4f6',
                                        overflow: 'hidden',
                                        zIndex: 50,
                                        maxHeight: '250px',
                                        overflowY: 'auto',
                                        animation: 'fadeIn 0.2s ease-out'
                                    }}>
                                        {activeWorkerCases.filter(l => l.status !== 'Historik').length === 0 ? (
                                            <div style={{ padding: '16px', color: '#6b7280', textAlign: 'center' }}>Ingen aktive projekter at stemple ind på.</div>
                                        ) : (
                                            activeWorkerCases.filter(l => l.status !== 'Historik').map(lead => (
                                                <div 
                                                    key={lead.id}
                                                    onClick={() => {
                                                        setSelectedCheckInProject(lead.id);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    style={{
                                                        padding: '14px 16px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid #f9fafb',
                                                        color: '#1f2937',
                                                        textAlign: 'left',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                                                >
                                                    <div style={{ fontWeight: '600' }}>Sag {lead.case_number || String(lead.id).substring(0,6)} - {lead.customer_name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>{lead.category || 'Ukendt kategori'}, {lead.customer_address || 'Adresse ikke angivet'}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={handleGlobalCheckIn}
                                style={{ width: '100%', padding: '20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)', transition: 'transform 0.1s' }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                ▶ START ARBEJDE
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                
                {/* TIMEREGISTRERING KORT */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ padding: '8px', background: '#ecfdf5', color: '#10b981', borderRadius: '8px' }}>
                                <Clock size={20} />
                            </div>
                            Dine Timer
                        </h3>
                        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                            {[
                                { id: '3d', label: '3 dg' },
                                { id: '7d', label: '7 dg' },
                                { id: '30d', label: '30 dg' },
                                { id: '90d', label: '3 mdr' },
                                { id: '180d', label: '6 mdr' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setTimeframe(filter.id)}
                                    style={{
                                        padding: '6px 12px',
                                        background: timeframe === filter.id ? 'white' : 'transparent',
                                        color: timeframe === filter.id ? '#0f172a' : '#64748b',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: timeframe === filter.id ? '600' : '500',
                                        cursor: 'pointer',
                                        boxShadow: timeframe === filter.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                        <span style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: '1' }}>
                            {timeStats.totalHours.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>
                            timer registreret
                        </span>
                    </div>

                    <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Udvikling (Timer pr. dag)</h4>
                        <div style={{ height: '220px', width: '100%', marginTop: '8px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeStats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTimer" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dx={-10} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                        formatter={(value) => [`${Number(value).toFixed(1)} t`, 'Timer']}
                                    />
                                    <Area type="monotone" dataKey="timer" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTimer)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fordelt på projekter</h4>
                        {timeStats.sortedProjects.length === 0 ? (
                            <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.95rem', fontStyle: 'italic' }}>
                                Ingen timer registreret i perioden.
                            </p>
                        ) : (
                            timeStats.sortedProjects.map((proj, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                                        {proj.name}
                                    </span>
                                    <span style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: 'bold' }}>
                                        {proj.hours.toFixed(1)} t
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* AKTIVE SAGER KORT */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '8px', background: '#fffbeb', color: '#f59e0b', borderRadius: '8px' }}>
                            <Briefcase size={20} />
                        </div>
                        Dine Projekter
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                        {activeWorkerCases.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', borderRadius: '12px', padding: '24px', border: '1px dashed var(--border-light)' }}>
                                <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.95rem', textAlign: 'center' }}>
                                    Du er ikke tilknyttet nogle projekter endnu.
                                </p>
                            </div>
                        ) : (
                            activeWorkerCases.map((lead, idx) => {
                                const title = `Sag ${lead.case_number || String(lead.id).substring(0,8)} - ${lead.customer_name || 'Ukendt'}`;
                                const address = lead.customer_address || 'Adresse ikke angivet';
                                
                                return (
                                    <div 
                                        key={lead.id || idx} 
                                        onClick={() => {
                                            if (setTargetCaseId) setTargetCaseId(lead.id);
                                            if (setActiveTab) setActiveTab('cases');
                                        }}
                                        style={{ 
                                            padding: '16px', 
                                            background: 'var(--bg-primary)', 
                                            borderRadius: '12px', 
                                            border: '1px solid var(--border-light)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '600' }}>{title}</h4>
                                                {lead.status === 'Historik' ? (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', border: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Afsluttet</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '12px', border: '1px solid #a7f3d0', textTransform: 'uppercase' }}>Aktiv</span>
                                                )}
                                            </div>
                                            <ArrowRight size={16} style={{ color: lead.status === 'Historik' ? '#94a3b8' : '#10b981' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> 
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'inherit', textDecoration: 'underline' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {address}
                                                </a>
                                            </div>
                                            {lead.customer_phone && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Phone size={14} style={{ flexShrink: 0 }} />
                                                    <a 
                                                        href={`tel:${lead.customer_phone}`} 
                                                        style={{ color: 'inherit', textDecoration: 'underline' }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {lead.customer_phone}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
