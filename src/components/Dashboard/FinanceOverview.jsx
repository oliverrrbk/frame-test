import React, { useState, useMemo } from 'react';
import { 
    Wallet, TrendingUp, TrendingDown, Clock, Search, 
    ArrowRight, PackageCheck, AlertCircle, CheckCircle2 
} from 'lucide-react';
import InvoiceEditor from './InvoiceEditor';

const FinanceOverview = ({ cases, onOpenCase, carpenterProfile, onSendToAccounting, onUpdateLead, targetInvoiceCaseId, clearTargetInvoiceCase, isMobile = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeInvoiceCase, setActiveInvoiceCase] = useState(null);

    const financeData = useMemo(() => {
        let totalRevenue = 0;
        let totalInvoiced = 0;
        let totalMissingInvoice = 0;
        let totalPaid = 0;
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
            const logExtra = logsList.filter(l => l.isChangeOrder).reduce((sum, item) => sum + (item.extraPrice || 0), 0);
            
            const extraAgreements = c.raw_data?.extra_agreements || [];
            // Kun bekræftede aftalesedler tæller med ('bekraeftet' eller legacy 'Godkendt').
            // Fast pris bruger beløbet; "efter regning" bruger den registrerede endelige pris.
            const isAgrConfirmed = (a) => a.status === 'bekraeftet' || a.status === 'Godkendt';
            const agrExtra = extraAgreements
                .filter(isAgrConfirmed)
                .reduce((sum, item) => {
                    if (item.priceType === 'fast_pris') return sum + (Number(item.amount) || 0);
                    if (item.priceType === 'efter_regning') return sum + (Number(item.final_amount) || 0);
                    return sum;
                }, 0);

            const extraPrice = logExtra + agrExtra;
            
            const caseTotal = basePrice + extraPrice;
            const invoiced = c.raw_data?.invoiced_amount || 0;
            const remaining = caseTotal - invoiced;

            const history = c.raw_data?.invoice_history || [];
            const casePaid = history.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

            if (c.status !== 'Afbrudt Sag' && c.status !== 'Afvist' && c.status !== 'Fortrudt') {
                totalRevenue += caseTotal;
                if (remaining > 0) {
                    totalMissingInvoice += remaining;
                }
            }
            totalInvoiced += invoiced;
            totalPaid += casePaid;
            
            const caseData = {
                ...c,
                finance: { caseTotal, invoiced, remaining, extraPrice, casePaid }
            };

            if (remaining > 0 || c.status === 'Afbrudt Sag') {
                pendingCases.push(caseData);
            } else {
                completedCases.push(caseData);
            }
        });

        // Sorter så de med størst manglende fakturering ligger øverst
        pendingCases.sort((a, b) => b.finance.remaining - a.finance.remaining);

        return { totalRevenue, totalInvoiced, totalMissingInvoice, totalPaid, pendingCases, completedCases };
    }, [cases]);

    React.useEffect(() => {
        if (targetInvoiceCaseId) {
            const allFinanceCases = [...financeData.pendingCases, ...financeData.completedCases];
            const leadToInvoice = allFinanceCases.find(c => c.id === targetInvoiceCaseId);
            if (leadToInvoice) {
                setActiveInvoiceCase(leadToInvoice);
            }
            if (clearTargetInvoiceCase) clearTargetInvoiceCase();
        }
    }, [targetInvoiceCaseId, financeData, clearTargetInvoiceCase]);

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
                    onOpenCase={onOpenCase}
                    onUpdateLead={onUpdateLead}
                    isMobile={isMobile}
                />
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '800', margin: '0 0 8px 0', color: '#0f172a', letterSpacing: '-1px' }}>Økonomi & Faktura</h1>
                            <p style={{ margin: 0, color: '#64748b', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>Få overblik over dit cashflow og manglende faktureringer</p>
                        </div>
                    </div>

                    {/* KPI KORT */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '12px' : '24px' }}>
                        <div style={{ backgroundColor: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px', gridColumn: isMobile ? '1 / -1' : 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', color: '#64748b' }}>
                                <div style={{ padding: isMobile ? '8px' : '10px', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#3b82f6' }}>
                                    <Wallet size={isMobile ? 20 : 24} />
                                </div>
                                <span style={{ fontSize: isMobile ? '0.85rem' : '1.1rem', fontWeight: '600' }}>{isMobile ? 'Samlet værdi' : 'Samlet Værdi (Alle igangværende sager)'}</span>
                            </div>
                            <div style={{ fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: '800', color: '#0f172a' }}>
                                {financeData.totalRevenue.toLocaleString('da-DK')} kr.
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', color: '#64748b' }}>
                                <div style={{ padding: isMobile ? '8px' : '10px', backgroundColor: '#ecfdf5', borderRadius: '12px', color: '#10b981' }}>
                                    <TrendingUp size={isMobile ? 20 : 24} />
                                </div>
                                <span style={{ fontSize: isMobile ? '0.85rem' : '1.1rem', fontWeight: '600' }}>{isMobile ? 'Faktureret' : 'Allerede Faktureret'}</span>
                            </div>
                            <div style={{ fontSize: isMobile ? '1.4rem' : '2.5rem', fontWeight: '800', color: '#10b981' }}>
                                {financeData.totalInvoiced.toLocaleString('da-DK')} kr.
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff1f2', padding: isMobile ? '16px' : '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(225, 29, 72, 0.1)', border: '1px solid #fecdd3', display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', color: '#e11d48' }}>
                                <div style={{ padding: isMobile ? '8px' : '10px', backgroundColor: '#ffe4e6', borderRadius: '12px', color: '#e11d48' }}>
                                    <AlertCircle size={isMobile ? 20 : 24} />
                                </div>
                                <span style={{ fontSize: isMobile ? '0.85rem' : '1.1rem', fontWeight: '600' }}>{isMobile ? 'Mangler' : 'Mangler at blive faktureret'}</span>
                            </div>
                            <div style={{ fontSize: isMobile ? '1.4rem' : '2.5rem', fontWeight: '800', color: '#e11d48' }}>
                                {financeData.totalMissingInvoice.toLocaleString('da-DK')} kr.
                            </div>
                        </div>
                    </div>

                    {/* TABEL: MANGLENDE FAKTURERING */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
                        <div style={{ padding: isMobile ? '16px' : '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '14px' : '0' }}>
                            <div>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#0f172a' }}>Åbne Sager med Restbeløb</h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: isMobile ? '0.9rem' : '1rem' }}>Fakturér disse sager for at få penge i kassen</p>
                            </div>
                            <div style={{ position: 'relative', width: isMobile ? '100%' : 'auto' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Søg efter kunde eller opgave..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ padding: isMobile ? '14px 14px 14px 40px' : '10px 10px 10px 36px', border: '1px solid #cbd5e1', borderRadius: isMobile ? '12px' : '8px', fontSize: isMobile ? '16px' : '0.95rem', width: isMobile ? '100%' : '250px', boxSizing: 'border-box', outline: 'none' }}
                                />
                            </div>
                        </div>

                        {isMobile ? (
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {filteredPending.length === 0 ? (
                                    <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                                        <CheckCircle2 size={44} style={{ margin: '0 auto 12px', color: '#10b981', opacity: 0.5 }} />
                                        <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>Alt er faktureret!</h3>
                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Ingen igangværende sager mangler fakturering.</p>
                                    </div>
                                ) : (
                                    filteredPending.map(c => (
                                        <div key={c.id} onClick={() => { if (onOpenCase) onOpenCase(c.id); }}
                                            style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span>Sag {c.case_number || String(c.id).substring(0, 8)} - {c.project_category}</span>
                                                    {c.status === 'Afbrudt Sag' && (<span style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={11} /> Afbrudt</span>)}
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                    <PackageCheck size={14} /> {c.customer_name}
                                                    {c.finance.extraPrice > 0 && <span style={{ color: '#10b981', fontSize: '0.78rem', padding: '2px 6px', backgroundColor: '#ecfdf5', borderRadius: '4px' }}>+ Aftalesedler</span>}
                                                </div>
                                            </div>
                                            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.92rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Sagens total</span><span style={{ fontWeight: 600, color: '#334155' }}>{c.finance.caseTotal.toLocaleString('da-DK')} kr.</span></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Allerede faktureret</span><span style={{ fontWeight: 600, color: '#334155' }}>{c.finance.invoiced.toLocaleString('da-DK')} kr.</span></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}><span style={{ color: '#e11d48', fontWeight: 600 }}>Restbeløb</span><span style={{ fontWeight: 800, color: '#e11d48' }}>{c.finance.remaining.toLocaleString('da-DK')} kr.</span></div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); setActiveInvoiceCase(c); }}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                                                Opret Faktura <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Kunde & Sag</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Sagens Total</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Allerede Faktureret</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'right', color: '#e11d48', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Manglende Beløb</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'center', whiteSpace: 'nowrap' }}>Handling</th>
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
                                            <tr 
                                                key={c.id} 
                                                onClick={() => { if(onOpenCase) onOpenCase(c.id); }}
                                                style={{ borderBottom: idx < filteredPending.length - 1 ? '1px solid #e2e8f0' : 'none', transition: 'all 0.2s', cursor: 'pointer' }} 
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }} 
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.05rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>Sag {c.case_number || String(c.id).substring(0,8)} - {c.project_category}</span>
                                                        {c.status === 'Afbrudt Sag' && (
                                                            <span style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <AlertCircle size={12} /> Afbrudt / Konkurs
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <PackageCheck size={14} /> {c.customer_name} {c.finance.extraPrice > 0 && <span style={{ color: '#10b981', fontSize: '0.8rem', padding: '2px 6px', backgroundColor: '#ecfdf5', borderRadius: '4px' }}>+ Aftalesedler</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', color: '#334155', fontWeight: '500' }}>
                                                    {c.finance.caseTotal.toLocaleString('da-DK')} kr.
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', color: '#334155', fontWeight: '500' }}>
                                                    {c.finance.invoiced > 0 ? `${c.finance.invoiced.toLocaleString('da-DK')} kr.` : '0 kr.'}
                                                    {c.finance.casePaid > 0 && (
                                                        <div style={{ 
                                                            color: c.finance.casePaid >= c.finance.invoiced ? '#059669' : '#10b981', 
                                                            fontSize: '0.8rem', 
                                                            marginTop: '6px', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'flex-end', 
                                                            gap: '4px',
                                                            fontWeight: c.finance.casePaid >= c.finance.invoiced ? 'bold' : 'normal'
                                                        }}>
                                                            <CheckCircle2 size={12} /> 
                                                            {c.finance.casePaid >= c.finance.invoiced ? 'Fuldt betalt' : `Heraf betalt: ${c.finance.casePaid.toLocaleString('da-DK')} kr.`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right', color: '#e11d48', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                    {c.finance.remaining.toLocaleString('da-DK')} kr.
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setActiveInvoiceCase(c); }}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
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
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default FinanceOverview;
