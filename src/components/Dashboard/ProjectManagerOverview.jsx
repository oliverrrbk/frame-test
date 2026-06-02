import React, { useState, useMemo } from 'react';
import { Clock, Briefcase, Calendar, MapPin, ArrowRight, ChevronDown, Package, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

export default function ProjectManagerOverview({ leadsData, myProfile, setActiveTab, setTargetCaseId }) {
    // Filtrer sager, som projektlederen er tilknyttet
    const activeManagerCases = useMemo(() => {
        return leadsData.filter(lead => {
            const workers = lead.raw_data?.assigned_workers || [];
            return workers.includes(myProfile?.id) && ['Sendt tilbud', 'Bekræftet opgave', 'Historik'].includes(lead.status || '');
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                    {activeManagerCases.length === 0 ? (
                        <div style={{ flex: 1, gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyItems: 'center', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', padding: '32px', border: '1px dashed var(--border-light)' }}>
                            <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '1rem', textAlign: 'center', width: '100%' }}>
                                Ingen sager i drift.
                            </p>
                        </div>
                    ) : (
                        activeManagerCases.map((lead, idx) => {
                            const stats = calculateCaseStats(lead);
                            const isConfirmed = lead.status === 'Bekræftet opgave';
                            const title = `Sag ${lead.case_number || String(lead.id).substring(0,8)} - ${lead.customer_name || 'Ukendt'}`;
                            
                            return (
                                <div key={lead.id || idx} style={{ 
                                    padding: '24px', 
                                    background: 'rgba(255,255,255,0.6)', 
                                    borderRadius: '16px', 
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700' }}>{title}</h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                <MapPin size={14} /> <span>{lead.customer_address || 'Adresse ikke angivet'}</span>
                                            </div>
                                        </div>
                                        {isConfirmed ? (
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: '#ecfdf5', color: '#10b981', padding: '4px 10px', borderRadius: '12px', border: '1px solid #a7f3d0', textTransform: 'uppercase' }}>Aktiv</span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '12px', border: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Afsluttet</span>
                                        )}
                                    </div>

                                    {/* Budget Progress Bars */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Tidsforbrug */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Forbrugte Timer</span>
                                                <span style={{ color: stats.hoursPercent > 100 ? '#ef4444' : 'inherit' }}>
                                                    {stats.usedHours} / {stats.budgetHours} t
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ 
                                                    height: '100%', 
                                                    width: `${Math.min(100, stats.hoursPercent)}%`, 
                                                    background: stats.hoursPercent > 100 ? '#ef4444' : (stats.hoursPercent > 80 ? '#f59e0b' : '#3b82f6'),
                                                    transition: 'width 0.5s ease-out'
                                                }}></div>
                                            </div>
                                            {stats.hoursPercent > 100 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>
                                                    <AlertTriangle size={12} /> Budget overskredet
                                                </div>
                                            )}
                                        </div>

                                        {/* Materialeforbrug */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Package size={14} /> Materialer (Indkøb)</span>
                                                <span style={{ color: stats.materialsPercent > 100 ? '#ef4444' : 'inherit' }}>
                                                    {stats.usedMaterialsCost.toLocaleString('da-DK')} / {stats.budgetMaterialsCost.toLocaleString('da-DK')} kr
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ 
                                                    height: '100%', 
                                                    width: `${Math.min(100, stats.materialsPercent)}%`, 
                                                    background: stats.materialsPercent > 100 ? '#ef4444' : (stats.materialsPercent > 80 ? '#f59e0b' : '#10b981'),
                                                    transition: 'width 0.5s ease-out'
                                                }}></div>
                                            </div>
                                            {stats.materialsPercent > 100 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>
                                                    <AlertTriangle size={12} /> Budget overskredet
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '12px' }}>
                                        <button 
                                            onClick={() => {
                                                if (setTargetCaseId) setTargetCaseId(lead.id);
                                                if (setActiveTab) setActiveTab('cases');
                                            }}
                                            style={{ 
                                                flex: 1, padding: '10px', background: 'var(--text-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#000'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--text-primary)'}
                                        >
                                            Åbn Sag
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

        </div>
    );
}
