const fs = require('fs');

// 1. Opret InvoiceEditor.jsx
const invoiceEditorCode = `
import React, { useState } from 'react';
import { ArrowLeft, Send, Upload, FileText, CheckCircle2, ChevronDown, Plus, Banknote, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';

const InvoiceEditor = ({ lead, onBack }) => {
    const [invoiceType, setInvoiceType] = useState('full'); // 'full' or 'aconto'
    const [acontoAmount, setAcontoAmount] = useState('');
    const [supplierInvoices, setSupplierInvoices] = useState(lead.finance?.supplier_invoices || []);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [newSupplierInvoice, setNewSupplierInvoice] = useState({ amount: '', description: '' });

    // Calculations
    const basePrice = parseFloat(lead.raw_data?.calc_data?.materialCost || 0) + parseFloat(lead.raw_data?.calc_data?.hourlyCost || 0) + parseFloat(lead.raw_data?.calc_data?.profit || 0) || (lead.finance?.caseTotal || 0);
    const extraPrice = lead.finance?.extraPrice || 0;
    const totalToBill = basePrice + extraPrice;
    
    const invoiced = lead.finance?.invoiced || 0;
    const remaining = totalToBill - invoiced;

    const handleSendToDinero = () => {
        const amountToSend = invoiceType === 'full' ? remaining : parseFloat(acontoAmount);
        if (invoiceType === 'aconto' && (isNaN(amountToSend) || amountToSend <= 0)) {
            toast.error('Indtast et gyldigt aconto beløb.');
            return;
        }
        if (amountToSend > remaining) {
            toast.error('Aconto beløb kan ikke overstige restbeløbet.');
            return;
        }
        
        toast.success(\`Faktura-kladde på \${amountToSend.toLocaleString('da-DK')} kr. er overført til regnskab!\`);
        setTimeout(() => {
            onBack();
        }, 1500);
    };

    const handleUploadSupplier = (e) => {
        e.preventDefault();
        if (!newSupplierInvoice.amount || !newSupplierInvoice.description) {
            toast.error('Udfyld både beløb og beskrivelse');
            return;
        }
        setSupplierInvoices([...supplierInvoices, { 
            id: Date.now(), 
            description: newSupplierInvoice.description, 
            amount: parseFloat(newSupplierInvoice.amount),
            date: new Date().toLocaleDateString('da-DK')
        }]);
        setNewSupplierInvoice({ amount: '', description: '' });
        setShowUploadForm(false);
        toast.success('Leverandørbilag registreret!');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                    <ArrowLeft size={20} color="#475569" />
                </button>
                <div>
                    <h2 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Faktura-kladde: {lead.customer_name}
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                        {lead.customer_address} &bull; {lead.project_category}
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
                {/* VENSTRE: FAKTURA BYGGER */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* FAKTURALINJER */}
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} color="#3b82f6" /> Fakturalinjer
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1rem' }}>Oprindeligt Tilbud</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Ifølge accepteret tilbud</div>
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                                    {basePrice.toLocaleString('da-DK')} kr.
                                </div>
                            </div>

                            {extraPrice > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1rem' }}>Ekstra Aftalesedler</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Samlet beløb for tillægsarbejde</div>
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#10b981' }}>
                                        + {extraPrice.toLocaleString('da-DK')} kr.
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '2px dashed #e2e8f0', marginTop: '8px' }}>
                                <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>Samlet Opgavesum ekskl. moms</div>
                                <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#0f172a' }}>
                                    {totalToBill.toLocaleString('da-DK')} kr.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* VALG AF FAKTURERING (FULDT / ACONTO) */}
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Banknote size={18} color="#10b981" /> Hvad skal der faktureres?
                        </h3>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                            <div 
                                onClick={() => setInvoiceType('full')}
                                style={{ flex: 1, padding: '16px', border: \`2px solid \${invoiceType === 'full' ? '#3b82f6' : '#e2e8f0'}\`, borderRadius: '12px', cursor: 'pointer', backgroundColor: invoiceType === 'full' ? '#eff6ff' : '#fff', transition: 'all 0.2s' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 'bold', color: invoiceType === 'full' ? '#1d4ed8' : '#475569' }}>Fakturér Alt (Afslut)</span>
                                    {invoiceType === 'full' && <CheckCircle2 size={18} color="#3b82f6" />}
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>{remaining.toLocaleString('da-DK')} kr.</div>
                            </div>
                            
                            <div 
                                onClick={() => setInvoiceType('aconto')}
                                style={{ flex: 1, padding: '16px', border: \`2px solid \${invoiceType === 'aconto' ? '#3b82f6' : '#e2e8f0'}\`, borderRadius: '12px', cursor: 'pointer', backgroundColor: invoiceType === 'aconto' ? '#eff6ff' : '#fff', transition: 'all 0.2s' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 'bold', color: invoiceType === 'aconto' ? '#1d4ed8' : '#475569' }}>Aconto (Delfakturering)</span>
                                    {invoiceType === 'aconto' && <CheckCircle2 size={18} color="#3b82f6" />}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Vælg et specifikt beløb</div>
                            </div>
                        </div>

                        {invoiceType === 'aconto' && (
                            <div style={{ animation: 'fadeIn 0.3s ease-out', marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold', marginBottom: '8px' }}>Indtast Aconto-beløb (ekskl. moms)</label>
                                <div style={{ position: 'relative', width: '50%' }}>
                                    <input 
                                        type="number" 
                                        value={acontoAmount}
                                        onChange={(e) => setAcontoAmount(e.target.value)}
                                        placeholder="fx 25000"
                                        style={{ width: '100%', padding: '12px 16px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem', outline: 'none' }}
                                    />
                                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 'bold' }}>kr.</span>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleSendToDinero}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#0f172a', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <Send size={20} /> Opret og Send til e-conomic / Dinero
                        </button>
                    </div>
                </div>

                {/* HØJRE: LEVERANDØRBILAG */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building2 size={18} color="#d97706" /> Leverandør-bilag
                            </h3>
                            <div style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {supplierInvoices.length} bilag
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                            Her registrerer du de fakturaer du modtager fra Bygma, Stark osv. på denne sag.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            {supplierInvoices.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8', fontSize: '0.9rem' }}>
                                    Ingen bilag registreret endnu.
                                </div>
                            ) : (
                                supplierInvoices.map(inv => (
                                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem' }}>{inv.description}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{inv.date}</div>
                                        </div>
                                        <div style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '0.95rem' }}>
                                            - {inv.amount.toLocaleString('da-DK')} kr.
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {!showUploadForm ? (
                            <button 
                                onClick={() => setShowUploadForm(true)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            >
                                <Upload size={16} /> Upload & Registrer Ny
                            </button>
                        ) : (
                            <form onSubmit={handleUploadSupplier} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', animation: 'fadeIn 0.3s ease-out' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#0f172a' }}>Nyt Bilag</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Beskrivelse (fx Bygma Faktura 1234)"
                                        value={newSupplierInvoice.description}
                                        onChange={(e) => setNewSupplierInvoice({...newSupplierInvoice, description: e.target.value})}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                                    />
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type="number" 
                                            placeholder="Beløb ekskl. moms"
                                            value={newSupplierInvoice.amount}
                                            onChange={(e) => setNewSupplierInvoice({...newSupplierInvoice, amount: e.target.value})}
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                                        />
                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem' }}>kr.</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button type="button" onClick={() => setShowUploadForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 'bold' }}>Annuller</button>
                                        <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Gem Bilag</button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceEditor;
`;

fs.writeFileSync('src/components/Dashboard/InvoiceEditor.jsx', invoiceEditorCode);

// 2. Opdatér FinanceOverview.jsx til at bruge InvoiceEditor
let financeContent = fs.readFileSync('src/components/Dashboard/FinanceOverview.jsx', 'utf8');

financeContent = financeContent.replace(
    /import \{ Search, ArrowRight, DollarSign, TrendingUp, AlertCircle, CheckCircle2, PackageCheck \} from 'lucide-react';/,
    "import { Search, ArrowRight, DollarSign, TrendingUp, AlertCircle, CheckCircle2, PackageCheck } from 'lucide-react';\nimport InvoiceEditor from './InvoiceEditor';"
);

const stateRegex = /const \[searchTerm, setSearchTerm\] = useState\(''\);/;
financeContent = financeContent.replace(stateRegex, "const [searchTerm, setSearchTerm] = useState('');\n    const [activeInvoiceCase, setActiveInvoiceCase] = useState(null);");

const buttonRegex = /onClick=\{\(\) => onOpenCase\(c\)\}/;
financeContent = financeContent.replace(buttonRegex, "onClick={() => setActiveInvoiceCase(c)}");
financeContent = financeContent.replace(
    />\n\s*Åbn Sag <ArrowRight size=\{16\} \/>/g,
    ">\n                                                Åbn Kladde <ArrowRight size={16} />"
);


const renderRegex = /return \(\n\s*<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0\.3s ease-in' \}\}>/;
financeContent = financeContent.replace(renderRegex, `return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in' }}>
            {activeInvoiceCase ? (
                <InvoiceEditor 
                    lead={activeInvoiceCase} 
                    onBack={() => setActiveInvoiceCase(null)} 
                />
            ) : (
                <>`);

const endRegex = /<\/div>\n    \);\n\};\n\nexport default FinanceOverview;/;
financeContent = financeContent.replace(endRegex, `
                </>
            )}
        </div>
    );
};

export default FinanceOverview;`);

fs.writeFileSync('src/components/Dashboard/FinanceOverview.jsx', financeContent);

