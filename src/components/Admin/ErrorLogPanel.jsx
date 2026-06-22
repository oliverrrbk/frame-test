import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { diagnoseError } from '../../utils/errorDiagnosis';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, RefreshCw, Lightbulb, User, Globe, Clock } from 'lucide-react';

// Fejlfinder-panel — KUN synligt for superadmin (vises i AdminDashboard).
export default function ErrorLogPanel() {
    const [errors, setErrors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('unresolved'); // 'unresolved' | 'today' | 'all'
    const [expanded, setExpanded] = useState(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            let q = supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(200);
            if (filter === 'unresolved') q = q.eq('resolved', false);
            if (filter === 'today') {
                const start = new Date(); start.setHours(0, 0, 0, 0);
                q = q.gte('created_at', start.toISOString());
            }
            const { data, error } = await q;
            if (!error) setErrors(data || []);
        } catch { /* ignore */ }
        setIsLoading(false);
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const markResolved = async (id, resolved) => {
        setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved } : e));
        try { await supabase.from('error_logs').update({ resolved }).eq('id', id); } catch { /* ignore */ }
    };

    const todayCount = errors.filter(e => {
        const d = new Date(e.created_at); const t = new Date(); t.setHours(0, 0, 0, 0);
        return d >= t;
    }).length;
    const unresolvedCount = errors.filter(e => !e.resolved).length;
    const usersHit = new Set(errors.map(e => e.user_email).filter(Boolean)).size;

    const fmt = (ts) => {
        const d = new Date(ts); const diff = (Date.now() - d.getTime()) / 60000;
        if (diff < 1) return 'lige nu';
        if (diff < 60) return `${Math.floor(diff)} min siden`;
        if (diff < 1440) return `${Math.floor(diff / 60)} t siden`;
        return d.toLocaleDateString('da-DK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const FILTERS = [
        { id: 'unresolved', label: 'Kun uløste' },
        { id: 'today', label: 'I dag' },
        { id: 'all', label: 'Alle' },
    ];

    return (
        <div style={{ color: '#e2e8f0' }}>
            {/* Header / stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <Stat color="#ef4444" value={unresolvedCount} label="uløste" />
                    <Stat color="#f59e0b" value={todayCount} label="i dag" />
                    <Stat color="#60a5fa" value={usersHit} label="brugere ramt" />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {FILTERS.map(f => (
                        <button key={f.id} onClick={() => setFilter(f.id)}
                            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                background: filter === f.id ? '#3b82f6' : '#1e293b', color: '#fff' }}>
                            {f.label}
                        </button>
                    ))}
                    <button onClick={load} title="Genindlæs" style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#1e293b', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Henter fejl…</div>
            ) : errors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b' }}>
                    <CheckCircle size={40} color="#10b981" style={{ marginBottom: '12px' }} />
                    <h3 style={{ margin: 0, color: '#e2e8f0' }}>Ingen fejl 🎉</h3>
                    <p style={{ color: '#64748b', margin: '6px 0 0' }}>Alt kører som det skal.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {errors.map(e => {
                        const diag = diagnoseError(e.message);
                        const open = expanded === e.id;
                        return (
                            <div key={e.id} style={{ background: '#0f172a', border: `1px solid ${e.resolved ? '#1e293b' : '#7f1d1d'}`, borderRadius: '14px', overflow: 'hidden', opacity: e.resolved ? 0.6 : 1 }}>
                                <div onClick={() => setExpanded(open ? null : e.id)} style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <AlertTriangle size={18} color={e.resolved ? '#64748b' : '#ef4444'} style={{ marginTop: '2px', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: '#f1f5f9', wordBreak: 'break-word' }}>{e.message}</div>
                                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {e.user_email || 'ukendt'}</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Globe size={12} /> {e.source_url || '—'}</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {fmt(e.created_at)}</span>
                                        </div>
                                        {/* Fix-forslag */}
                                        <div style={{ marginTop: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', padding: '10px 12px', display: 'flex', gap: '8px' }}>
                                            <Lightbulb size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: '1px' }} />
                                            <div style={{ fontSize: '0.82rem' }}>
                                                <span style={{ color: '#cbd5e1' }}>{diag.cause}</span>
                                                <div style={{ color: '#93c5fd', marginTop: '3px' }}>💡 {diag.fix}</div>
                                            </div>
                                        </div>
                                    </div>
                                    {open ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
                                </div>
                                {open && (
                                    <div style={{ borderTop: '1px solid #1e293b', padding: '14px 18px' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teknisk stak</div>
                                        <pre style={{ margin: 0, background: '#020617', color: '#cbd5e1', padding: '12px', borderRadius: '8px', overflowX: 'auto', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '260px' }}>
                                            {e.stack || 'Ingen stak tilgængelig'}
                                        </pre>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '10px' }}>{e.user_agent}</div>
                                        <button onClick={() => markResolved(e.id, !e.resolved)}
                                            style={{ marginTop: '14px', padding: '9px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700,
                                                background: e.resolved ? '#1e293b' : '#10b981', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <CheckCircle size={15} /> {e.resolved ? 'Markér som uløst' : 'Markér som løst'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Stat({ color, value, label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{label}</span>
        </div>
    );
}
