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
    Calendar
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

export default function DashboardOverview({ leadsData, carpenterProfile }) {
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
            new_leads: { label: 'Nye Forespørgsler', value: newLeads, suffix: '', format: 'number', icon: Inbox, color: '#3b82f6' },
            est_value: { label: 'I Alt Estimeret Værdi', value: estValue, suffix: ' DKK', format: 'currency', icon: DollarSign, color: '#8b5cf6' },
            active_cases: { label: 'Aktive Sager', value: activeCases, suffix: '', format: 'number', icon: Briefcase, color: '#f59e0b' },
            won_revenue: { label: 'Vundet Omsætning', value: wonRevenue, suffix: ' DKK', format: 'currency', icon: CheckCircle, color: '#10b981' },
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
            if (selectedMetric === 'est_value') value = periodLeads.reduce((acc, l) => acc + calcLeadValue(l), 0);
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
        <div className="overview-container" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease-out' }}>
            
            {/* Header */}
            <div style={{ padding: '0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.5rem' }}>Velkommen tilbage, {(carpenterProfile?.company_name || 'Tømrer').split(' ')[0]}!</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem' }}>Her er dit data-drevne overblik.</p>
                </div>
            </div>

            {/* Main Layout: Sidebar & Graph */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
                
                {/* Left Sidebar - Metric Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', gridColumn: '1 / 2' }}>
                    {Object.entries(metrics).map(([key, m]) => {
                        const isSelected = selectedMetric === key;
                        const Icon = m.icon;
                        return (
                            <div 
                                key={key}
                                onClick={() => setSelectedMetric(key)}
                                className="glass-panel"
                                style={{
                                    padding: '16px 20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    border: isSelected ? `2px solid ${m.color}` : '2px solid transparent',
                                    transform: isSelected ? 'translateX(8px)' : 'none',
                                    boxShadow: isSelected ? `0 8px 24px ${m.color}20` : 'none',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '16px'
                                }}
                            >
                                {/* Active indicator background glow */}
                                {isSelected && (
                                    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: `linear-gradient(90deg, transparent 0%, ${m.color}05 100%)`, pointerEvents: 'none' }} />
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 2 }}>
                                    <div style={{ padding: '10px', borderRadius: '10px', background: `${m.color}15`, color: m.color }}>
                                        <Icon size={20} />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{m.label}</h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'right', position: 'relative', zIndex: 2 }}>
                                    {m.format === 'currency' ? m.value.toLocaleString('da-DK') : m.value}
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '4px', fontWeight: 500 }}>{m.suffix}</span>
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Right Area - Chart */}
                <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px', gridColumn: '2 / -1' }}>
                    <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '8px', borderRadius: '8px', background: `${activeColor}15`, color: activeColor }}>
                                    <ActiveIcon size={20} />
                                </div>
                                {metrics[selectedMetric].label} Over Tid
                            </h3>
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Viser udviklingen for {metrics[selectedMetric].label.toLowerCase()} i den valgte periode.</p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.4)', padding: '6px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
                            {[
                                { id: '7d', label: 'Seneste 7 dage' },
                                { id: '30d', label: 'Seneste 30 dage' },
                                { id: 'ytd', label: 'År til dato' },
                                { id: 'all', label: 'Altid' }
                            ].map(tf => (
                                <button
                                    key={tf.id}
                                    onClick={() => setTimeframe(tf.id)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: timeframe === tf.id ? '600' : '500',
                                        color: timeframe === tf.id ? 'white' : 'var(--text-secondary)',
                                        background: timeframe === tf.id ? '#1a1a1a' : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ flex: 1, width: '100%', minHeight: '400px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={activeColor} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}
                                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                                    dx={-10}
                                    domain={[0, dataMax => Math.max(dataMax, 5)]}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}
                                    itemStyle={{ color: activeColor, fontWeight: 'bold' }}
                                    formatter={(value) => [metrics[selectedMetric].format === 'currency' ? value.toLocaleString('da-DK') + ' DKK' : value + metrics[selectedMetric].suffix, metrics[selectedMetric].label]}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke={activeColor} 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorValue)" 
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
