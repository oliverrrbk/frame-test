import React, { useState, useMemo } from 'react';
import { Clock, Briefcase, Calendar, MapPin, ArrowRight, ChevronDown, Package, Activity, AlertTriangle, Phone } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

export default function ProjectManagerOverview({ leadsData, myProfile, setActiveTab, setTargetCaseId }) {
    // Filtrer sager, som projektlederen er tilknyttet
    const activeManagerCases = useMemo(() => {
        return leadsData.filter(lead => {
            const workers = lead.raw_data?.assigned_workers || [];
            return workers.includes(myProfile?.id) && ['Sendt tilbud', 'Bekræftet opgave', 'Historik', 'Afbrudt Sag'].includes(lead.status || '');
        });
    }, [leadsData, myProfile]);

    const [selectedCheckInProject, setSelectedCheckInProject] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const activeCheckInInfo = useMemo(() => {
        for (const lead of activeManagerCases) {
            const entries = lead.raw_data?.time_entries || [];
            const activeEntry = entries.find(t => t.employeeId === myProfile?.id && t.endTime === null);
            if (activeEntry) return { lead, activeEntry };
        }
        return null;
    }, [activeManagerCases, myProfile]);

    const handleGlobalCheckIn = async () => {
        if (!selectedCheckInProject) {
            toast.error('Vælg venligst et projekt først!');
            return;
        }
        const leadToUpdate = activeManagerCases.find(l => String(l.id) === String(selectedCheckInProject));
        if (!leadToUpdate) return;
        
        const entry = {
            id: `time-${Date.now()}`,
            startTime: new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }),
            endTime: null,
            hours: 0,
            date: new Date().toISOString().substring(0, 10),
            desc: 'Aktiv tjek-ind (auto)',
            employeeId: myProfile?.id,
            employeeName: myProfile?.owner_name || myProfile?.company_name || 'Ukendt medarbejder'
        };
        
        const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', leadToUpdate.id).single();
        const currentRawData = latestData?.raw_data || leadToUpdate.raw_data || {};

        const currentEntries = currentRawData.time_entries || [];
        const updatedEntries = [entry, ...currentEntries];
        const newRawData = { ...currentRawData, time_entries: updatedEntries };
        
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
        
        const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
        const currentRawData = latestData?.raw_data || lead.raw_data || {};

        const currentEntries = [...(currentRawData.time_entries || [])];
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
        const newRawData = { ...currentRawData, time_entries: currentEntries };
        
        const { error } = await supabase.from('leads').update({ raw_data: newRawData }).eq('id', lead.id);
        if (error) {
            toast.error('Fejl ved udstempling.');
        } else {
            toast.success('Tjekket ud! Timerne er nu gemt.');
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    // Hjælpefunktion til at beregne budget-forbrug pr. sag
    const calculateCaseStats = (lead) => {
        const timeEntries = lead.raw_data?.time_entries || [];
        const materialEntries = lead.raw_data?.material_entries || [];
        const calcData = lead.raw_data?.calc_data || {};

        // Forbrugt timeantal
        const usedHours = timeEntries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
        // Budgetteret timeantal (fra lommeregner)
        const budgetHours = Number(calcData.laborHours || 0);

        // Forbrugte materialer (kostpris, dvs. uden markup)
        const usedMaterialsCost = materialEntries.reduce((acc, m) => acc + (Number(m.total_cost || m.price * m.quantity) || 0), 0);
        // Budgetterede materialer (fra lommeregner)
        const budgetMaterialsCost = Number(calcData.materialCost || 0);

        return {
            usedHours,
            budgetHours,
            hoursPercent: budgetHours > 0 ? Math.min(100, Math.round((usedHours / budgetHours) * 100)) : (usedHours > 0 ? 100 : 0),
            usedMaterialsCost,
            budgetMaterialsCost,
            materialsPercent: budgetMaterialsCost > 0 ? Math.min(100, Math.round((usedMaterialsCost / budgetMaterialsCost) * 100)) : (usedMaterialsCost > 0 ? 100 : 0)
        };
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease-out' }}>
            
            {/* Header */}
            <div style={{ padding: '0 8px' }}>
                <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '8px' }}>
                        <Activity size={24} />
                    </div>
                    Projektleder: {myProfile?.owner_name?.split(' ')[0] || 'Oversigt'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem' }}>
                    Dit drifts- og budgetoverblik for igangværende sager.
                </p>
            </div>

            {/* GLOBAL STEMPLING MODUL */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Stempling
                </h3>
                
                {activeCheckInInfo ? (
                    <>
                        <div style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
                            Du har været tjekket ind siden kl. <strong>{activeCheckInInfo.activeEntry.startTime}</strong> på sag: <em>{activeCheckInInfo.lead.customer_name}</em>
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
                                        border: '1px solid rgba(0,0,0,0.1)', 
                                        background: 'rgba(255,255,255,0.7)', 
                                        fontSize: '1.05rem', 
                                        color: selectedCheckInProject ? '#111827' : '#6b7280', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        backdropFilter: 'blur(8px)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: selectedCheckInProject ? '600' : 'normal' }}>
                                        {selectedCheckInProject 
                                            ? (() => {
                                                const p = activeManagerCases.find(l => l.id === selectedCheckInProject);
                                                return p ? `Sag ${p.case_number || String(p.id).substring(0,6)} - ${p.customer_name}` : '-- Vælg projekt --';
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
                                        overflowY: 'auto'
                                    }}>
                                        {activeManagerCases.filter(l => l.status !== 'Historik').length === 0 ? (
                                            <div style={{ padding: '16px', color: '#6b7280', textAlign: 'center' }}>Ingen aktive projekter.</div>
                                        ) : (
                                            activeManagerCases.filter(l => l.status !== 'Historik').map(lead => (
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
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                                                >
                                                    <div style={{ fontWeight: '600' }}>Sag {lead.case_number || String(lead.id).substring(0,6)} - {lead.customer_name}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={handleGlobalCheckIn}
                                style={{ width: '100%', padding: '20px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)', transition: 'transform 0.1s' }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                ▶ START ARBEJDE
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* SAGER I DRIFT MED BUDGET TRACKING */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '8px' }}>
                        <Briefcase size={20} />
                    </div>
                    Driftsstatus & Budget
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', width: '100%' }}>
                    {activeManagerCases.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', borderRadius: '12px', padding: '24px', border: '1px dashed var(--border-light)' }}>
                            <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.95rem', textAlign: 'center' }}>
                                Ingen sager i drift.
                            </p>
                        </div>
                    ) : (
                        activeManagerCases.map((lead, idx) => {
                            const title = lead.raw_data?.project_title || lead.project_category || 'Projekt';
                            const caseNo = lead.case_number || String(lead.id).substring(0,6);
                            const customerName = lead.customer_name || lead.raw_data?.customerDetails?.name || 'Ukendt kunde';
                            const address = lead.customer_address || lead.raw_data?.customerDetails?.address || 'Adresse ikke angivet';
                            const customerPhone = lead.customer_phone || lead.raw_data?.customerDetails?.phone || lead.raw_data?.customerDetails?.telephone || null;
                            const isArchived = lead.status === 'Historik';
                            const isAborted = lead.status === 'Afbrudt Sag';
                            
                            return (
                                <div key={lead.id || idx} className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', border: '1px solid var(--border-light)', overflow: 'hidden' }}
                                     onClick={() => { 
                                         if (setTargetCaseId) setTargetCaseId(lead.id);
                                         if (setActiveTab) setActiveTab('cases');
                                     }}
                                     onMouseOver={(e) => {
                                         e.currentTarget.style.transform = 'translateY(-4px)';
                                         e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
                                         e.currentTarget.style.borderColor = isAborted ? 'rgba(239, 68, 68, 0.3)' : (isArchived ? 'rgba(100, 116, 139, 0.3)' : 'rgba(16, 185, 129, 0.3)');
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
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isAborted ? '#ef4444' : (isArchived ? '#94a3b8' : '#10b981'), boxShadow: isAborted ? '0 0 0 4px rgba(239,68,68,0.1)' : (isArchived ? '0 0 0 4px rgba(148,163,184,0.1)' : '0 0 0 4px rgba(16,185,129,0.1)') }} title={isAborted ? "Afbrudt (Konkurs)" : (isArchived ? "Afsluttet" : "Aktiv")} />
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
    );
}
