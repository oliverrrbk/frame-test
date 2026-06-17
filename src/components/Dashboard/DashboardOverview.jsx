import React, { useState, useMemo } from 'react';
import { 
    Info, 
    TrendingUp, 
    TrendingDown, 
    Clock, 
    CheckCircle, 
    DollarSign, 
    Inbox, 
    Briefcase,
    Calendar,
    Link,
    Copy,
    ArrowRight,
    MapPin,
    Phone
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { 
    subDays, 
    isAfter, 
    startOfYear, 
    format, 
    eachDayOfInterval, 
    eachMonthOfInterval,
    startOfMonth,
    isSameDay,
    isSameMonth
} from 'date-fns';
import { da } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import CalculatorWorkflowSteps from './CalculatorWorkflowSteps';

export default function DashboardOverview({ leadsData, carpenterProfile, myProfile, setActiveTab, setSelectedLead, setTargetCaseId }) {
    const [timeframe, setTimeframe] = useState('30d'); // '7d', '30d', 'ytd', 'all'
    const [selectedMetric, setSelectedMetric] = useState('won_revenue'); 

    // Time filtering logic
    const startDate = useMemo(() => {
        const now = new Date();
        if (timeframe === '7d') return subDays(now, 7);
        if (timeframe === '30d') return subDays(now, 30);
        if (timeframe === 'ytd') return startOfYear(now);
        
        // For 'all', find the oldest lead's date
        if (leadsData.length === 0) return subDays(now, 30);
        const oldest = leadsData.reduce((old, l) => {
            if (!l.created_at) return old;
            const d = new Date(l.created_at);
            return d < old ? d : old;
        }, now);
        return startOfMonth(oldest);
    }, [timeframe, leadsData]);

    const filteredLeads = useMemo(() => {
        return leadsData.filter(lead => {
            if (!lead.created_at) return false;
            return isAfter(new Date(lead.created_at), startDate);
        });
    }, [leadsData, startDate]);

    // Helpers
    const calcLeadValue = (lead) => {
        const calc = lead.raw_data?.calc_data;
        if (!calc) return 0;
        const strictPrice = parseFloat(calc.strictPrice || 0);
        const marginFactor = 1.25;
        const priceTop = strictPrice * marginFactor;
        let minPrice = Math.floor(strictPrice / 1000) * 1000;
        let maxPrice = Math.ceil(priceTop / 1000) * 1000;
        minPrice = minPrice * 1.25;
        maxPrice = maxPrice * 1.25;
        return (minPrice + maxPrice) / 2;
    };

    const calcWonRevenue = (lead) => {
        if (lead.raw_data?.calc_data?.totalPrice) {
            return parseFloat(lead.raw_data.calc_data.totalPrice);
        }
        const mat = parseFloat(lead.raw_data?.calc_data?.materialCost || 0);
        const labor = parseFloat(lead.raw_data?.calc_data?.laborCost || (lead.raw_data?.calc_data?.laborHours * lead.raw_data?.calc_data?.hourlyRate) || 0);
        return mat + labor;
    };

    // Calculate Metric Totals
    const metrics = useMemo(() => {
        const newLeads = filteredLeads.filter(l => (l.status || 'Ny forespørgsel') === 'Ny forespørgsel').length;
        
        const estValue = filteredLeads.reduce((acc, l) => acc + calcLeadValue(l), 0);
        
        const activeCases = filteredLeads.filter(l => ['Sendt tilbud', 'Bekræftet opgave'].includes(l.status || '')).length;
        
        const wonLeads = filteredLeads.filter(l => ['Bekræftet opgave', 'Historik'].includes(l.status || ''));
        const wonRevenue = wonLeads.reduce((acc, l) => acc + calcWonRevenue(l), 0);
        
        const timeSaved = Math.round(filteredLeads.length * 1.5);
        
        const totalLeads = filteredLeads.length;
        const conversionRate = totalLeads > 0 ? Math.round((wonLeads.length / totalLeads) * 100) : 0;
        
        const responded = filteredLeads.filter(l => l.first_responded_at && l.created_at);
        let avgResponseHours = 0;
        if (responded.length > 0) {
            const totalMs = responded.reduce((acc, lead) => acc + (new Date(lead.first_responded_at).getTime() - new Date(lead.created_at).getTime()), 0);
            avgResponseHours = totalMs / responded.length / (1000 * 60 * 60);
        }

        return {
            new_leads: { label: 'Nye Forespørgsler', value: newLeads, suffix: '', format: 'number', icon: Inbox, color: '#3b82f6', tab: 'leads' },
            active_cases: { label: 'Aktive Sager', value: activeCases, suffix: '', format: 'number', icon: Briefcase, color: '#f59e0b', tab: 'cases' },
            won_revenue: { label: 'Omsætning', value: wonRevenue, suffix: ' DKK', format: 'currency', icon: CheckCircle, color: '#10b981' },
            time_saved: { label: 'Tid Besparet', value: timeSaved, suffix: ' timer', format: 'number', icon: Clock, color: '#f97316' },
            conversion_rate: { label: 'Konverteringsrate', value: conversionRate, suffix: '%', format: 'number', icon: TrendingUp, color: '#14b8a6' },
            avg_response: { label: 'Gns. Svartid', value: avgResponseHours.toFixed(1), suffix: ' timer', format: 'number', icon: Clock, color: '#6b7280' }
        };
    }, [filteredLeads]);

    // Chart Data Generation
    const chartData = useMemo(() => {
        if (!filteredLeads) return [];
        const now = new Date();
        
        let intervals = [];
        let isDaily = timeframe === '7d' || timeframe === '30d';

        // Safe interval generation
        try {
            if (isDaily) {
                intervals = eachDayOfInterval({ start: startDate, end: now });
            } else {
                intervals = eachMonthOfInterval({ start: startDate, end: now });
            }
        } catch (e) {
            console.error("Invalid interval", e);
            intervals = [];
        }

        return intervals.map(date => {
            const periodLeads = filteredLeads.filter(l => {
                const lDate = new Date(l.created_at);
                return isDaily ? isSameDay(lDate, date) : isSameMonth(lDate, date);
            });

            const wonPeriodLeads = periodLeads.filter(l => ['Bekræftet opgave', 'Historik'].includes(l.status || ''));

            let value = 0;
            if (selectedMetric === 'new_leads') value = periodLeads.filter(l => (l.status || 'Ny forespørgsel') === 'Ny forespørgsel').length;
            if (selectedMetric === 'active_cases') value = periodLeads.filter(l => ['Sendt tilbud', 'Bekræftet opgave'].includes(l.status || '')).length;
            if (selectedMetric === 'won_revenue') value = wonPeriodLeads.reduce((acc, l) => acc + calcWonRevenue(l), 0);
            if (selectedMetric === 'time_saved') value = periodLeads.length * 1.5;
            if (selectedMetric === 'conversion_rate') value = periodLeads.length > 0 ? Math.round((wonPeriodLeads.length / periodLeads.length) * 100) : 0;
            if (selectedMetric === 'avg_response') {
                const resp = periodLeads.filter(l => l.first_responded_at);
                if (resp.length > 0) {
                    const ms = resp.reduce((acc, l) => acc + (new Date(l.first_responded_at).getTime() - new Date(l.created_at).getTime()), 0);
                    value = ms / resp.length / (1000 * 60 * 60);
                }
            }

            return {
                date: isDaily ? format(date, 'd. MMM', { locale: da }) : format(date, 'MMM yyyy', { locale: da }),
                value: Number(value.toFixed(2))
            };
        });

    }, [filteredLeads, startDate, timeframe, selectedMetric]);

    const activeColor = metrics[selectedMetric].color;
    const ActiveIcon = metrics[selectedMetric].icon;

    return (
        <div className="overview-container" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.5s ease-out', paddingBottom: '40px' }}>
            
            {/* Header & Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div className="hide-on-mobile">
                    <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        Velkommen tilbage, {(myProfile?.owner_name || carpenterProfile?.company_name || 'Mester').split(' ')[0]}!
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.05rem' }}>
                        Her er dit visuelle overblik for forretningen lige nu.
                    </p>
                </div>
                <div className="mobile-only">
                    <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        Oversigt over din forretning
                    </h2>
                </div>
                
                {/* Thin, compact link banner */}
                <div className="copy-link-banner" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 12px 8px 16px', borderRadius: '999px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Link size={14} color="#10b981" /> Dit tilbudslink:
                    </span>
                    <span className="copy-link-text" style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.9rem', userSelect: 'all' }}>bisonframe.dk/{carpenterProfile?.slug || 't'}</span>
                    <button 
                        onClick={() => {
                            const baseUrl = window.location.origin.includes('localhost') ? window.location.origin : 'https://bisonframe.dk';
                            navigator.clipboard.writeText(`${baseUrl}/${carpenterProfile?.slug || 't'}`);
                            toast.success('Kopieret til udklipsholder!');
                        }}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <Copy size={12} /> Kopiér
                    </button>
                </div>
            </div>

            {/* NY SEKTION: Top-Level KPI Kort */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {[
                    metrics.won_revenue,
                    metrics.active_cases,
                    metrics.new_leads,
                    metrics.conversion_rate
                ].map((m, i) => (
                    <div 
                        key={i} 
                        className="glass-panel" 
                        style={{ 
                            padding: '24px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px', 
                            borderTop: `4px solid ${m.color}`, 
                            position: 'relative', 
                            overflow: 'hidden',
                            cursor: m.tab ? 'pointer' : 'default',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onClick={() => {
                            if (m.tab && setActiveTab) setActiveTab(m.tab);
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                        }}
                    >
                        {/* Baggrundsikon (subtilt) */}
                        <m.icon size={120} style={{ position: 'absolute', right: '-20px', bottom: '-20px', color: m.color, opacity: 0.04, transform: 'rotate(-15deg)' }} />
                        
                        <div className="kpi-label-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ padding: '6px', borderRadius: '8px', background: `${m.color}15`, color: m.color }}>
                                <m.icon size={18} />
                            </div>
                            <h3 className="kpi-label" style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {m.label}
                            </h3>
                        </div>
                        <div className="kpi-value" style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            {m.format === 'currency' ? m.value.toLocaleString('da-DK') : m.value}
                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>{m.suffix}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* NY SEKTION: SAGER I DRIFT (GRID LAYOUT) */}
            <div>
                <div className="cases-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', gap: '12px' }}>
                    <div className="cases-header-text">
                        <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                            Sager i drift <span className="hide-on-mobile">(Igangværende)</span>
                        </h3>
                        <p className="hide-on-mobile" style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Overblik over byggepladser med accepterede tilbud.</p>
                    </div>
                    {setActiveTab && (
                        <button 
                            className="se-alle-btn"
                            onClick={() => setActiveTab('cases')}
                            style={{ background: 'white', border: '1px solid var(--border-light)', padding: '8px 16px', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s', flexShrink: 0 }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            Se alle <ArrowRight size={14} />
                        </button>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {leadsData
                        .filter(l => l.status === 'Bekræftet opgave')
                        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                        .slice(0, 6)
                        .map((lead, idx) => {
                            const title = lead.raw_data?.project_title || lead.project_category || 'Projekt';
                            const caseNo = lead.case_number || String(lead.id).substring(0,6);
                            const customerName = lead.customer_name || lead.raw_data?.customerDetails?.name || 'Ukendt kunde';
                            const address = lead.customer_address || lead.raw_data?.customerDetails?.address || 'Ukendt adresse';
                            const customerPhone = lead.customer_phone || lead.raw_data?.customerDetails?.phone || lead.raw_data?.customerDetails?.telephone || null;
                            
                            // Ægte progress baseret på checklist
                            let progress = 0;
                            const savedTodo = lead.raw_data?.checklist || [];
                            if (savedTodo.length > 0) {
                                let completed = 0;
                                let total = 0;
                                if (savedTodo.some(t => !t.subTasks)) {
                                    // legacy flat
                                    total = savedTodo.length;
                                    completed = savedTodo.filter(t => t.done).length;
                                } else {
                                    // nested
                                    total = savedTodo.reduce((acc, step) => acc + (step.subTasks || []).length, 0);
                                    completed = savedTodo.reduce((acc, step) => acc + (step.subTasks || []).filter(s => s.done).length, 0);
                                }
                                progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                            }

                            return (
                                <div key={lead.id || idx} className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', border: '1px solid var(--border-light)', overflow: 'hidden' }}
                                     onClick={() => { 
                                         if (setTargetCaseId) setTargetCaseId(lead.id);
                                         if (setActiveTab) setActiveTab('cases');
                                     }}
                                     onMouseOver={(e) => {
                                         e.currentTarget.style.transform = 'translateY(-4px)';
                                         e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
                                         e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
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
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px rgba(16,185,129,0.1)' }} title="Aktiv på byggepladsen" />
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
                                                    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    onClick={(e) => e.stopPropagation()} 
                                                    style={{ color: 'var(--text-secondary)', textDecoration: 'none', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.textDecoration = 'underline'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.textDecoration = 'none'; }}
                                                >
                                                    {address}
                                                </a>
                                            </div>
                                        </div>

                                        {/* Progress Bar Mini */}
                                        <div style={{ marginTop: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
                                                <span>Færdiggørelse</span>
                                                <span style={{ color: 'var(--text-primary)' }}>{progress}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)', borderRadius: '3px' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                    })}
                    
                    {leadsData.filter(l => l.status === 'Bekræftet opgave').length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: 'var(--surface-bg)', borderRadius: '16px', border: '2px dashed var(--border-light)' }}>
                            <Briefcase size={48} color="var(--border-light)" style={{ marginBottom: '16px' }} />
                            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Ingen igangværende sager</h3>
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Når kunder accepterer dine tilbud, dukker sagerne op her.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* SEKTION: GRAF (Fuld bredde) */}
            <div className="glass-panel graph-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
                <div className="graph-header-container" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                    <div className="hide-on-mobile">
                        <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold' }}>
                            <div style={{ padding: '10px', borderRadius: '10px', background: `${activeColor}15`, color: activeColor }}>
                                <ActiveIcon size={22} />
                            </div>
                            {metrics[selectedMetric].label} Over Tid
                        </h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem' }}>Viser udviklingen for {metrics[selectedMetric].label.toLowerCase()} i den valgte periode.</p>
                    </div>

                    <div className="graph-filters" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end' }}>
                        {/* Selector for metrik */}
                        <div className="scrollable-buttons" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', maxWidth: '100%' }}>
                            {['won_revenue', 'new_leads'].map(key => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedMetric(key)}
                                    style={{
                                        padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: selectedMetric === key ? '600' : '500',
                                        color: selectedMetric === key ? metrics[key].color : 'var(--text-secondary)',
                                        background: selectedMetric === key ? 'white' : 'transparent', border: 'none', cursor: 'pointer',
                                        boxShadow: selectedMetric === key ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', whiteSpace: 'nowrap'
                                    }}
                                >
                                    {metrics[key].label}
                                </button>
                            ))}
                        </div>

                        {/* Selector for tidsramme */}
                        <div className="timeframe-filters scrollable-buttons" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', maxWidth: '100%' }}>
                            {[
                                { id: '7d', label: '7 dage' },
                                { id: '30d', label: '30 dage' },
                                { id: 'ytd', label: 'År til dato' },
                                { id: 'all', label: 'Altid' }
                            ].map(tf => (
                                <button
                                    key={tf.id}
                                    onClick={() => setTimeframe(tf.id)}
                                    style={{
                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: timeframe === tf.id ? '600' : '500',
                                        color: timeframe === tf.id ? 'white' : 'var(--text-secondary)',
                                        background: timeframe === tf.id ? '#1e293b' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ width: '100%', height: '350px', background: 'rgba(255,255,255,0.3)', borderRadius: '16px', padding: '16px 0 0 0' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={activeColor} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.06)" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
                                dy={15}
                                minTickGap={20}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
                                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                                dx={-10}
                                domain={[0, dataMax => Math.max(dataMax, 5)]}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', padding: '12px 16px' }}
                                itemStyle={{ color: activeColor, fontWeight: 'bold', fontSize: '1.1rem' }}
                                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}
                                formatter={(value) => [metrics[selectedMetric].format === 'currency' ? value.toLocaleString('da-DK') + ' DKK' : value + metrics[selectedMetric].suffix, metrics[selectedMetric].label]}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={activeColor} 
                                strokeWidth={4}
                                fillOpacity={1} 
                                fill="url(#colorValue)" 
                                animationDuration={1500}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <CalculatorWorkflowSteps />
        </div>
    );
}
