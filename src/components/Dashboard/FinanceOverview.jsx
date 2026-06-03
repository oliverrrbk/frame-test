import React, { useState, useMemo } from 'react';
import { 
    Wallet, TrendingUp, TrendingDown, Clock, Search, 
    ArrowRight, PackageCheck, AlertCircle, CheckCircle2 
} from 'lucide-react';
import InvoiceEditor from './InvoiceEditor';

const FinanceOverview = ({ cases, onOpenCase, carpenterProfile, onSendToAccounting }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeInvoiceCase, setActiveInvoiceCase] = useState(null);

    const financeData = useMemo(() => {
        let totalRevenue = 0;
        let totalInvoiced = 0;
        let totalMissingInvoice = 0;
        let pendingCases = [];
        let completedCases = [];

        cases.forEach(c => {
            // Hent basis pris
            let basePrice = 0;
            if (c.raw_data?.calc_data?.totalPrice) {
                basePrice = parseFloat(c.raw_data.calc_data.totalPrice) || 0;
            } else if (c.raw_data?.actual_quote_price) {
                basePrice = typeof c.raw_data.actual_quote_price === 'number' 
                    ? c.raw_data.actual_quote_price 
                    : parseInt(String(c.raw_data.actual_quote_price).replace(/[^0-9]/g, '')) || 0;
            } else {
                const priceStr = c.price_estimate || '0';
                const firstPricePart = priceStr.split('-')[0] || priceStr;
                basePrice = parseInt(firstPricePart.replace(/[^0-9]/g, '')) || 0;
            }

            // Aftalesedler (Merpris)
            const logsList = c.raw_data?.case_logs || [];
            const extraPrice = logsList.filter(l => l.isChangeOrder).reduce((sum, item) => sum + (item.extraPrice || 0), 0);
            
            const caseTotal = basePrice + extraPrice;
            const invoiced = c.raw_data?.invoiced_amount || 0;
            const remaining = caseTotal - invoiced;

            totalRevenue += caseTotal;
            totalInvoiced += invoiced;
            
            const caseData = {
                ...c,
                finance: { caseTotal, invoiced, remaining, extraPrice }
            };

            if (remaining > 0) {
                totalMissingInvoice += remaining;
                pendingCases.push(caseData);
            } else {
                completedCases.push(caseData);
            }
        });

        // Sorter så de med størst manglende fakturering ligger øverst
        pendingCases.sort((a, b) => b.finance.remaining - a.finance.remaining);

        return { totalRevenue, totalInvoiced, totalMissingInvoice, pendingCases, completedCases };
    }, [cases]);

    const filteredPending = financeData.pendingCases.filter(c => 
        (c.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.project_category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="dashboard-workspace finance-overview" style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
            {activeInvoiceCase ? (
                <InvoiceEditor 
                    lead={activeInvoiceCase} 
                    onBack={() => setActiveInvoiceCase(null)} 
                    carpenterProfile={carpenterProfile}
                    onSendToAccounting={onSendToAccounting}
                />
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 8px 0', color: '#0f172a', letterSpacing: '-1px' }}>Økonomi & Faktura</h1>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem' }}>Få overblik over dit cashflow og manglende faktureringer</p>
                        </div>
                    </div>

                    {/* KPI KORT */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>
                                <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#3b82f6' }}>
                                    <Wallet size={24} />
                                </div>
                                <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Samlet Værdi (Alle igangværende sager)</span>
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a' }}>
                                {financeData.totalRevenue.toLocaleString('da-DK')} kr.
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>
                                <div style={{ padding: '10px', backgroundColor: '#ecfdf5', borderRadius: '12px', color: '#10b981' }}>
                                    <TrendingUp size={24} />
                                </div>
                                <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Allerede Faktureret</span>
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#10b981' }}>
                                {financeData.totalInvoiced.toLocaleString('da-DK')} kr.
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff1f2', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(225, 29, 72, 0.1)', border: '1px solid #fecdd3', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#e11d48' }}>
                                <div style={{ padding: '10px', backgroundColor: '#ffe4e6', borderRadius: '12px', color: '#e11d48' }}>
                                    <AlertCircle size={24} />
                                </div>
                                <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Mangler at blive faktureret</span>
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#e11d48' }}>
                                {financeData.totalMissingInvoice.toLocaleString('da-DK')} kr.
                            </div>
                        </div>
                    </div>

                    {/* TABEL: MANGLENDE FAKTURERING */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', color: '#0f172a' }}>Åbne Sager med Restbeløb</h2>
                                <p style={{ margin: 0, color: '#64748b' }}>Fakturér disse sager for at få penge i kassen</p>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="text" 
                                    placeholder="Søg efter kunde eller opgave..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ padding: '10px 10px 10px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', width: '250px', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Kunde & Sag</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Sagens Total</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Allerede Faktureret</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'right', color: '#e11d48', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Manglende Beløb</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'center', width: '120px' }}>Handling</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPending.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                                                <CheckCircle2 size={48} style={{ margin: '0 auto 16px auto', color: '#10b981', opacity: 0.5 }} />
                                                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Alt er faktureret!</h3>
                                                <p style={{ margin: 0 }}>Der er ingen igangværende sager med manglende fakturering.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPending.map((c, idx) => (
                                            <tr key={c.id} style={{ borderBottom: idx < filteredPending.length - 1 ? '1px solid #e2e8f0' : 'none', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.05rem', marginBottom: '4px' }}>{c.customer_name}</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <PackageCheck size={14} /> {c.project_category} {c.finance.extraPrice > 0 && <span style={{ color: '#10b981', fontSize: '0.8rem', padding: '2px 6px', backgroundColor: '#ecfdf5', borderRadius: '4px' }}>+ Aftalesedler</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', color: '#334155', fontWeight: '500' }}>
                                                    {c.finance.caseTotal.toLocaleString('da-DK')} kr.
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', color: '#10b981', fontWeight: '500' }}>
                                                    {c.finance.invoiced > 0 ? `${c.finance.invoiced.toLocaleString('da-DK')} kr.` : '0 kr.'}
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', color: '#e11d48', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                    {c.finance.remaining.toLocaleString('da-DK')} kr.
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                    <button 
                                                        onClick={() => setActiveInvoiceCase(c)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f172a'}
                                                    >
                                                        Opret Faktura <ArrowRight size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FinanceOverview;
