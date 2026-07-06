import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Wallet, TrendingUp, TrendingDown, Clock, Search,
    ArrowRight, PackageCheck, AlertCircle, CheckCircle2, FileText
} from 'lucide-react';
import InvoiceEditor from './InvoiceEditor';
import { computeCaseFinance } from '../../utils/caseFinance';
import SectionTour from './SectionTour';
import { shouldShowCoach } from './coachmarks';

// Rundtur for Økonomi & Faktura (kun desktop, første gang). Går IND i faktura-
// editoren på en demo-sag (mockup) og viser delfakturering + bilag.
const FINANCE_DEMO_ID = '__bison_tour_demo_invoice__';
const FINANCE_DEMO_LEAD = {
    id: FINANCE_DEMO_ID,
    case_number: '1042',
    project_category: 'Tagarbejde',
    customer_name: 'Bruns Byg ApS',
    customer_address: 'Byggevej 12, 8000 Aarhus C',
    customer_phone: '40 26 50 02',
    finance: { caseTotal: 54500, extraPrice: 4500, invoiced: 27250 },
    raw_data: {
        customerDetails: { customerType: 'erhverv', cvr: '12345678', fullName: 'Mads Bruns', email: 'kontakt@brunsbyg.dk', phone: '40 26 50 02', address: 'Byggevej 12', zip: '8000', city: 'Aarhus C' },
        supplier_invoices: [
            { id: 'demo-bilag-1', amount: 3200, description: 'Tagsten – Davidsen', category: 'Materialer', file_name: 'kvittering-davidsen.pdf', sent: false },
            { id: 'demo-bilag-2', amount: 850, description: 'Stillads-leje', category: 'Leje', file_name: 'stillads.pdf', sent: false },
        ],
        material_lists_meta: [],
        invoice_history: [],
        details: { phases: [] },
    },
};
// Trin 0-2 er på oversigten; trin 3+ åbner faktura-editoren på demo-sagen.
const FINANCE_TOUR_DETAIL_FROM = 3;
const FINANCE_TOUR_STEPS = [
    { sel: '[data-tour="finance-kpi"]', placement: 'bottom', eyebrow: 'Økonomi & Faktura', title: 'Dit cashflow på ét sted', body: 'Samlet værdi, hvad der er faktureret, hvad der mangler — og hvad der faktisk er bogført i regnskabet.' },
    { sel: '[data-tour="finance-pending"]', placement: 'bottom', eyebrow: 'Fakturering', title: 'Dine sager samles her', body: 'Her står dine sager. Fakturér dem for at få pengene i kassen — og når fakturaen er registreret og betalt i regnskabet, får sagen automatisk et flueben. De forsvinder ikke, så du beholder overblikket.' },
    { sel: '[data-tour="finance-demo-invoice"]', placement: 'top', eyebrow: 'Ét klik', title: 'Opret faktura', body: 'Tryk Opret Faktura — så åbner vi fakturaen og kigger indenfor.' },
    { sel: '[data-tour="invoice-billing"]', placement: 'right', eyebrow: 'Inde i fakturaen', title: 'Fakturér alt — eller delfakturér', body: 'Fakturér hele restbeløbet, eller vælg "Aconto (Delfakturering)" og send fx halvdelen nu — resten faktureres senere. Frame holder styr på hvad der mangler.' },
    { sel: '[data-tour="invoice-bilag"]', placement: 'top', eyebrow: 'Bilag', title: 'Alle bilag samlet', body: 'Kvitteringer og bilag på sagen (fx fra Davidsen) ligger her — send dem med over i regnskabet sammen med fakturaen.' },
    { sel: '[data-tour="invoice-send"]', placement: 'top', eyebrow: 'Afsend', title: 'Se og send', body: 'Se fakturaen visuelt, og send den direkte til dit regnskab (e-conomic/Dinero) med ét klik.' },
];

const FinanceOverview = ({ cases, onOpenCase, carpenterProfile, onSendToAccounting, onUpdateLead, targetInvoiceCaseId, clearTargetInvoiceCase, isMobile = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeInvoiceCase, setActiveInvoiceCase] = useState(null);
    const [financeTourActive, setFinanceTourActive] = useState(() => !isMobile && shouldShowCoach('finance_tour'));
    const [showFinanceEnd, setShowFinanceEnd] = useState(false);

    const financeData = useMemo(() => {
        let totalRevenue = 0;
        let totalInvoiced = 0;
        let totalMissingInvoice = 0;
        let totalPaid = 0;
        let totalBookedRevenue = 0;
        let pendingCases = [];
        let completedCases = [];

        cases.forEach(c => {
            // Konsistent moms-håndtering via fælles helper: total OG faktureret vises
            // inkl. moms, så en fuldt faktureret sag viser 0 i rest.
            const f = computeCaseFinance(c);

            const isCancelled = c.status === 'Afbrudt Sag' || c.status === 'Afvist' || c.status === 'Fortrudt';
            if (!isCancelled) {
                totalRevenue += f.caseTotalInclVat;
                totalMissingInvoice += f.remainingInclVat;
            }
            totalInvoiced += f.invoicedInclVat;
            totalPaid += f.paidExVat;
            totalBookedRevenue += f.bookedRevenueExVat;

            const caseData = {
                ...c,
                finance: {
                    caseTotal: f.caseTotalInclVat,
                    invoiced: f.invoicedInclVat,
                    remaining: f.remainingInclVat,
                    extraPrice: f.extraPriceInclVat,
                    casePaid: f.paidExVat,
                    bookedRevenue: f.bookedRevenueExVat,
                    isFullyInvoiced: f.isFullyInvoiced,
                }
            };

            if (f.remainingInclVat > 0 || c.status === 'Afbrudt Sag') {
                pendingCases.push(caseData);
            } else {
                completedCases.push(caseData);
            }
        });

        // Sorter så de med størst manglende fakturering ligger øverst
        pendingCases.sort((a, b) => b.finance.remaining - a.finance.remaining);

        return { totalRevenue, totalInvoiced, totalMissingInvoice, totalPaid, totalBookedRevenue, pendingCases, completedCases };
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

    // Fuldt fakturerede sager (inkl. manuelt registrerede) — vises med flueben nedenunder,
    // så en sag ikke bare "forsvinder" fra listen, når den er faktureret.
    const filteredCompleted = financeData.completedCases.filter(c =>
        c.finance.invoiced > 0 &&
        ((c.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
         (c.project_category || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const wasManuallyInvoiced = (c) => (c.raw_data?.invoice_history || []).some(inv => inv.system === 'manual' || inv.status === 'manual');

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
                    <div data-tour="finance-kpi" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '12px' : '24px' }}>
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

                        {/* Bogført omsætning: tæller kun fakturaer der er bogført/betalt/manuelt registreret (ekskl. moms) */}
                        <div style={{ backgroundColor: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', color: '#64748b' }}>
                                <div style={{ padding: isMobile ? '8px' : '10px', backgroundColor: '#eef2ff', borderRadius: '12px', color: '#4f46e5' }}>
                                    <PackageCheck size={isMobile ? 20 : 24} />
                                </div>
                                <span style={{ fontSize: isMobile ? '0.85rem' : '1.1rem', fontWeight: '600' }}>{isMobile ? 'Bogført' : 'Bogført omsætning'}</span>
                            </div>
                            <div style={{ fontSize: isMobile ? '1.4rem' : '2.5rem', fontWeight: '800', color: '#4f46e5' }}>
                                {financeData.totalBookedRevenue.toLocaleString('da-DK')} kr.
                            </div>
                            <span style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', color: '#94a3b8' }}>Faktisk bogført i regnskab (ekskl. moms)</span>
                        </div>
                    </div>

                    {/* TABEL: MANGLENDE FAKTURERING */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
                        <div data-tour="finance-pending" style={{ padding: isMobile ? '16px' : '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '14px' : '0' }}>
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

                        {/* Demo-faktura-række — vises kun under rundvisningen (mockup, ingen rigtig sag),
                            så nye brugere uden sager kan se "Opret Faktura"-flowet. */}
                        {financeTourActive && (
                            <div style={{ position: 'relative', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                <span style={{ position: 'absolute', top: -9, left: 22, background: '#0f172a', color: '#fff', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '20px' }}>Eksempel</span>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.05rem' }}>Sag 1042 - Tagarbejde</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><PackageCheck size={14} /> Bruns Byg ApS</div>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '18px', fontSize: '0.85rem', color: '#475569' }}>
                                        <span>Total: <strong>54.500 kr.</strong></span>
                                        <span>Faktureret: <strong>27.250 kr.</strong></span>
                                        <span style={{ color: '#e11d48' }}>Restbeløb: <strong>27.250 kr.</strong></span>
                                    </div>
                                </div>
                                <div data-tour="finance-demo-invoice" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 22px', background: '#0f172a', color: '#fff', borderRadius: '12px', fontWeight: 700, fontSize: '0.98rem', boxShadow: '0 8px 20px rgba(15,23,42,0.2)' }}>
                                    Opret Faktura <ArrowRight size={18} />
                                </div>
                            </div>
                        )}

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

                    {/* FULDT FAKTUREREDE SAGER — flueben-listen: her lander sagerne, når hele
                        beløbet er faktureret (via Dinero/e-conomic ELLER registreret manuelt). */}
                    {filteredCompleted.length > 0 && (
                        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                            <div style={{ padding: isMobile ? '18px 16px' : '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>Fuldt fakturerede sager</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Hele beløbet er faktureret — intet udestår</p>
                                </div>
                            </div>
                            <div style={{ padding: isMobile ? '12px 16px 16px' : '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {filteredCompleted.map(c => (
                                    <div key={c.id} onClick={() => { if (onOpenCase) onOpenCase(c.id); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '14px 16px', background: '#f8fffb', border: '1px solid #d1fae5', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6ee7b7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1fae5'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: '160px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span>Sag {c.case_number || String(c.id).substring(0, 8)} - {c.project_category}</span>
                                                {wasManuallyInvoiced(c) && (
                                                    <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 'bold' }}>Registreret manuelt (udenom)</span>
                                                )}
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>{c.customer_name}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#059669', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Faktureret</div>
                                            <div style={{ fontWeight: 800, color: '#047857' }}>{c.finance.invoiced.toLocaleString('da-DK')} kr.</div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveInvoiceCase(c); }}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '9px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                        >
                                            Se historik <ArrowRight size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Afslutning: forklarer flowet + at det er tomt nu (ingen bekræftede sager) */}
                    {showFinanceEnd && createPortal(
                        <div onClick={() => setShowFinanceEnd(false)} style={{ position: 'fixed', inset: 0, zIndex: 100130, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 470, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 26, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', padding: '26px 26px 22px', position: 'relative' }}>
                                <button onClick={() => setShowFinanceEnd(false)} style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}>✕</button>
                                {/* Faktura-mockup — viser hvordan en faktura ser ud, når du opretter den */}
                                <div style={{ margin: '4px auto 18px', width: 230, borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 16px 36px -14px rgba(15,23,42,0.35)', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#0f172a', color: '#fff' }}>
                                        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.04em' }}>FAKTURA</span>
                                        <FileText size={16} />
                                    </div>
                                    <div style={{ padding: 14 }}>
                                        {[['Tagarbejde', '32.000'], ['Materialer', '12.800'], ['Aftaleseddel #2', '4.500']].map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 8 }}><span>{k}</span><span style={{ fontWeight: 700, color: '#334155' }}>{v}</span></div>
                                        ))}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 2 }}><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>I alt</span><span style={{ fontSize: 13, fontWeight: 900, color: '#047857' }}>49.300 kr</span></div>
                                        <div style={{ marginTop: 12, textAlign: 'center', padding: '8px 0', borderRadius: 9, background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontSize: 10.5, fontWeight: 800 }}>Send til regnskab</div>
                                    </div>
                                </div>
                                <h3 style={{ margin: '0 0 8px', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Sådan kommer sagerne ind</h3>
                                <p style={{ margin: '0 0 12px', color: '#475569', lineHeight: 1.55, fontSize: '0.94rem' }}>
                                    Når en kunde <strong>bekræfter et tilbud</strong>, ryger sagen i ordrestyringen — og dukker automatisk op her, klar til faktura.
                                </p>
                                <p style={{ margin: '0 0 12px', color: '#475569', lineHeight: 1.55, fontSize: '0.94rem' }}>
                                    Tryk <strong>Opret Faktura</strong>, så samler Frame det hele: sagens linjer + de bilag og aftalesedler, du har lagt på sagen.
                                </p>
                                <p style={{ margin: '0 0 16px', color: '#475569', lineHeight: 1.55, fontSize: '0.94rem', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>Sagerne <strong>bliver liggende</strong> — når fakturaen er registreret og betalt i dit regnskab, får sagen automatisk et grønt flueben. Så har du altid det fulde overblik.</span>
                                </p>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', marginBottom: 18 }}>
                                    <div style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
                                        Du har ingen bekræftede sager endnu, så <strong>her er tomt lige nu</strong> — det fylder sig selv, så snart dine sager kommer i hus.
                                    </div>
                                </div>
                                <button onClick={() => setShowFinanceEnd(false)} style={{ width: '100%', padding: 13, borderRadius: 14, border: 'none', background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: '0.98rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(15,23,42,0.25)' }}>Forstået</button>
                            </div>
                        </div>,
                        document.body
                    )}
                </>
            )}

            {/* Rundtur lever UDEN FOR liste/editor-grenen, så den overlever, når
                demo-fakturaen åbnes i editoren (trin 3+). */}
            {financeTourActive && (
                <SectionTour
                    tourKey="finance_tour"
                    steps={FINANCE_TOUR_STEPS}
                    onStepChange={(i) => {
                        if (i >= FINANCE_TOUR_DETAIL_FROM) {
                            if (activeInvoiceCase?.id !== FINANCE_DEMO_ID) setActiveInvoiceCase(FINANCE_DEMO_LEAD);
                        } else if (activeInvoiceCase?.id === FINANCE_DEMO_ID) {
                            setActiveInvoiceCase(null);
                        }
                    }}
                    onDone={(skipped) => {
                        setFinanceTourActive(false);
                        if (activeInvoiceCase?.id === FINANCE_DEMO_ID) setActiveInvoiceCase(null);
                        if (!skipped) setShowFinanceEnd(true);
                    }}
                />
            )}
        </div>
    );
};

export default FinanceOverview;
