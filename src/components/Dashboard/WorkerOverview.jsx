import React, { useState, useMemo } from 'react';
import { Clock, Briefcase, Calendar, MapPin, ArrowRight, ChevronDown, Phone } from 'lucide-react';
import { startOfWeek, startOfMonth, isAfter, isSameDay } from 'date-fns';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

export default function WorkerOverview({ leadsData, myProfile, setActiveTab, setTargetCaseId, simulatedRole }) {
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
                return ['Bekræftet opgave'].includes(lead.status);
            }

            // For produktion vis de sager man er assignet til
            return isAssigned && ['Bekræftet opgave'].includes(lead.status || '');
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
                        // Hvis den er inden for denne uge også
                        if (isAfter(entryDate, weekStart) || isSameDay(entryDate, weekStart)) {
                            hoursThisWeek += hours;
                        }
                    }
                }
            });
        });

        return { hoursThisWeek, hoursThisMonth };
    }, [leadsData, myProfile]);

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                        {/* Kort: Denne uge */}
                        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <div style={{ padding: '8px', background: '#ecfdf5', color: '#10b981', borderRadius: '8px', marginBottom: '4px' }}>
                                <Clock size={24} />
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timer denne uge</span>
                            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: '1' }}>{timeStats.hoursThisWeek.toFixed(1)}</span>
                        </div>
                        {/* Kort: Denne måned */}
                        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <div style={{ padding: '8px', background: '#eff6ff', color: '#3b82f6', borderRadius: '8px', marginBottom: '4px' }}>
                                <Calendar size={24} />
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timer denne måned</span>
                            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: '1' }}>{timeStats.hoursThisMonth.toFixed(1)}</span>
                        </div>
                    </div>
                    {/* Knap til fuld timeseddel */}
                    <button 
                        onClick={() => {
                            if (setActiveTab) setActiveTab('worker_timesheet');
                        }}
                        style={{ width: '100%', padding: '16px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-primary)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                    >
                        Gå til din timeregistrering <ArrowRight size={18} />
                    </button>
                </div>

                {/* AKTIVE SAGER KORT */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '8px', background: '#fffbeb', color: '#f59e0b', borderRadius: '8px' }}>
                            <Briefcase size={20} />
                        </div>
                        Dine Projekter
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', width: '100%' }}>
                        {activeWorkerCases.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', borderRadius: '12px', padding: '24px', border: '1px dashed var(--border-light)' }}>
                                <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.95rem', textAlign: 'center' }}>
                                    Du er ikke tilknyttet nogle projekter endnu.
                                </p>
                            </div>
                        ) : (
                            activeWorkerCases.map((lead, idx) => {
                                const title = lead.raw_data?.project_title || lead.project_category || 'Projekt';
                                const caseNo = lead.case_number || String(lead.id).substring(0,6);
                                const customerName = lead.customer_name || lead.raw_data?.customerDetails?.name || 'Ukendt kunde';
                                const address = lead.customer_address || lead.raw_data?.customerDetails?.address || 'Adresse ikke angivet';
                                const customerPhone = lead.customer_phone || lead.raw_data?.customerDetails?.phone || lead.raw_data?.customerDetails?.telephone || null;
                                const isArchived = lead.status === 'Historik';
                                
                                return (
                                    <div key={lead.id || idx} className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', border: '1px solid var(--border-light)', overflow: 'hidden' }}
                                         onClick={() => { 
                                             if (setTargetCaseId) setTargetCaseId(lead.id);
                                             if (setActiveTab) setActiveTab('cases');
                                         }}
                                         onMouseOver={(e) => {
                                             e.currentTarget.style.transform = 'translateY(-4px)';
                                             e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
                                             e.currentTarget.style.borderColor = isArchived ? 'rgba(100, 116, 139, 0.3)' : 'rgba(16, 185, 129, 0.3)';
                                         }}
                                         onMouseOut={(e) => {
                                             e.currentTarget.style.transform = 'translateY(0)';
                                             e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                                             e.currentTarget.style.borderColor = 'var(--border-light)';
                                         }}
                                    >
                                        {/* Card Header */}
                                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(248, 250, 252, 0.5)' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '4px' }}>SAG #{caseNo}</div>
                                                <h4 style={{ margin: '0', fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: '700', lineHeight: '1.2' }}>{title}</h4>
                                            </div>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isArchived ? '#94a3b8' : '#10b981', boxShadow: isArchived ? '0 0 0 4px rgba(148,163,184,0.1)' : '0 0 0 4px rgba(16,185,129,0.1)' }} title={isArchived ? "Afsluttet" : "Aktiv"} />
                                        </div>
                                        
                                        {/* Card Body */}
                                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Briefcase size={12} />
                                                    </div>
                                                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{customerName}</span>
                                                </div>
                                                
                                                {customerPhone && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <Phone size={12} />
                                                        </div>
                                                        <a 
                                                            href={`tel:${customerPhone}`} 
                                                            onClick={(e) => e.stopPropagation()} 
                                                            style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500' }}
                                                            onMouseOver={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.textDecoration = 'underline'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.textDecoration = 'none'; }}
                                                        >
                                                            {customerPhone}
                                                        </a>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                                                        <MapPin size={12} />
                                                    </div>
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500', lineHeight: '1.4' }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseOver={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.textDecoration = 'underline'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.textDecoration = 'none'; }}
                                                    >
                                                        {address}
                                                    </a>
                                                </div>
                                            </div>
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
