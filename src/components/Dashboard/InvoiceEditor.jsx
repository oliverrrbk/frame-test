import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Send, Upload, FileText, CheckCircle2, ChevronDown, Plus, Banknote, Building2, User, Phone, Mail, MapPin, AlertCircle, Edit2, Save, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import BilagManager from './BilagManager';

const InvoiceEditor = ({ lead, onBack, carpenterProfile, onSendToAccounting, onOpenCase, onUpdateLead, isMobile = false }) => {
    const [invoiceType, setInvoiceType] = useState('full'); // 'full' or 'aconto'
    const [acontoAmountRaw, setAcontoAmountRaw] = useState('');
    const [supplierInvoices, setSupplierInvoices] = useState(lead.raw_data?.supplier_invoices || []);
    
    // Editable customer details state
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [editableCustomer, setEditableCustomer] = useState({
        fullName: lead.raw_data?.customerDetails?.fullName || lead.customer_name || '',
        cvr: lead.raw_data?.customerDetails?.cvr || '',
        email: lead.raw_data?.customerDetails?.email || '',
        phone: lead.raw_data?.customerDetails?.phone || lead.customer_phone || '',
        address: lead.raw_data?.customerDetails?.address || lead.customer_address || '',
        zip: lead.raw_data?.customerDetails?.zip || '',
        city: lead.raw_data?.customerDetails?.city || ''
    });
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [newSupplierInvoice, setNewSupplierInvoice] = useState({ amount: '', description: '', category: 'Materialer', file_data: null, file_name: '' });
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    const isB2B = !!(lead.raw_data?.customerDetails?.cvr);
    const [isReverseCharge, setIsReverseCharge] = useState(isB2B); // Default til omvendt betalingspligt hvis B2B
    const [showPreview, setShowPreview] = useState(false);
    const [confirmVoidId, setConfirmVoidId] = useState(null);

    // Fakturalinjens tekst: manuelle sager har intet tilbud — brug en sigende tekst.
    const baseLineDescription = lead.raw_data?.is_manual_case
        ? (lead.raw_data?.billing_mode === 'hourly' ? 'Udført arbejde (timer)' : 'Aftalt fast pris')
        : 'Oprindeligt Tilbud';

    // Calculations
    const basePrice = (lead.finance?.caseTotal || 0) - (lead.finance?.extraPrice || 0);
    const extraPrice = lead.finance?.extraPrice || 0;
    const totalToBill = basePrice + extraPrice;
    
    const invoiced = lead.finance?.invoiced || 0;
    const remaining = totalToBill - invoiced;

    const getAmountToBill = () => invoiceType === 'full' ? remaining : parseFloat(acontoAmountRaw || 0);
    
    const currentAmountToBill = getAmountToBill() || 0;
    
    // Moms-matematik:
    // Hvis B2C (isReverseCharge = false), er 'currentAmountToBill' INKLUSIV moms.
    // Hvis B2B (isReverseCharge = true), er 'currentAmountToBill' EKSKLUSIV moms (eller rettere: der er 0% moms).
    const subtotalExVat = isReverseCharge ? currentAmountToBill : (currentAmountToBill / 1.25);
    const vatAmount = isReverseCharge ? 0 : (currentAmountToBill - subtotalExVat);
    const totalInclVat = subtotalExVat + vatAmount;

    const handleSendToDinero = () => {
        const amountToSend = getAmountToBill();
        if (invoiceType === 'aconto' && (isNaN(amountToSend) || amountToSend <= 0)) {
            toast.error('Indtast et gyldigt aconto beløb.');
            return;
        }
        if (amountToSend > remaining) {
            toast.error('Aconto beløb kan ikke overstige restbeløbet.');
            return;
        }
        const invoiceLines = [];
        if (invoiceType === 'aconto') {
            invoiceLines.push({ description: 'Aconto betaling', priceExVat: subtotalExVat });
        } else {
            invoiceLines.push({ description: baseLineDescription, priceExVat: (basePrice / (isReverseCharge ? 1 : 1.25)) });
            if (extraPrice > 0) invoiceLines.push({ description: 'Ekstra Aftalesedler', priceExVat: (extraPrice / (isReverseCharge ? 1 : 1.25)) });
            if (invoiced > 0) invoiceLines.push({ description: 'Tidligere Aconto betalt', priceExVat: -(invoiced / (isReverseCharge ? 1 : 1.25)) });
        }

        if (onSendToAccounting) {
            onSendToAccounting(lead, 'draft', invoiceLines, isReverseCharge, editableCustomer);
        } else {
            toast.success(`Faktura-kladde på ${amountToSend.toLocaleString('da-DK')} kr. ville blive sendt!`);
        }
        
        setTimeout(() => {
            onBack();
        }, 1500);
    };

    // Handle Upload Supplier Invoice (Simuleret)
    const handleUploadSupplier = async (e) => {
        e.preventDefault();
        
        if (!newSupplierInvoice.amount || !newSupplierInvoice.description) {
            toast.error("Udfyld venligst beskrivelse og beløb");
            return;
        }

        const newInv = {
            id: `supp_${Date.now()}`,
            name: newSupplierInvoice.description, 
            description: newSupplierInvoice.description,
            amount: parseFloat(String(newSupplierInvoice.amount).replace(/\./g, '').replace(',', '.')) || 0,
            date: new Date().toISOString(),
            uploaded_by: carpenterProfile?.owner_name || 'Ukendt',
            status: 'Godkendt',
            category: newSupplierInvoice.category || 'Materialer',
            file_data: newSupplierInvoice.file_data,
            file_name: newSupplierInvoice.file_name
        };

        try {
            const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const currentRawData = latestData?.raw_data || lead.raw_data || {};

            const updatedCase = {
                ...lead,
                raw_data: {
                    ...currentRawData,
                    supplier_invoices: [...(currentRawData.supplier_invoices || []), newInv]
                }
            };

            const { error } = await supabase
                .from('leads')
                .update({ raw_data: updatedCase.raw_data })
                .eq('id', lead.id);

            if (error) throw error;

            if (onUpdateLead) {
                onUpdateLead(updatedCase);
            }
            
            toast.success("Bilag gemt!");
            setNewSupplierInvoice({ amount: '', description: '', category: 'Materialer', file_data: null, file_name: '' });
            setShowUploadForm(false);
        } catch (err) {
            console.error("Fejl ved gem bilag:", err);
            toast.error("Kunne ikke gemme bilag");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Tjek filtype (kun pdf eller billede)
        if (!file.type.includes('pdf') && !file.type.includes('image')) {
            toast.error("Kun PDF eller Billeder understøttes.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setNewSupplierInvoice(prev => ({
                ...prev,
                file_data: reader.result,
                file_name: file.name
            }));
            toast.success("Fil vedhæftet!");
        };
        reader.readAsDataURL(file);
    };

    // Opdatér fakturahistorikken (markér betalt / annullér). Læser nyeste raw_data først,
    // så vi ikke overskriver andre felter, og persisterer derefter.
    const updateInvoiceHistory = async (transform) => {
        try {
            const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const currentRawData = latestData?.raw_data || lead.raw_data || {};
            const { history, invoicedDelta } = transform(currentRawData.invoice_history || []);
            currentRawData.invoice_history = history;
            if (invoicedDelta) {
                currentRawData.invoiced_amount = Math.max(0, (currentRawData.invoiced_amount || 0) + invoicedDelta);
            }
            const { error } = await supabase.from('leads').update({ raw_data: currentRawData }).eq('id', lead.id);
            if (error) throw error;
            if (onUpdateLead) onUpdateLead({ ...lead, raw_data: currentRawData });
            return true;
        } catch (err) {
            console.error('Fejl ved opdatering af fakturahistorik:', err);
            toast.error('Kunne ikke opdatere fakturaen.');
            return false;
        }
    };

    const handleMarkPaid = async (invId) => {
        const ok = await updateInvoiceHistory((history) => ({
            history: history.map(h => h.id === invId ? { ...h, status: 'paid', paid_date: new Date().toISOString() } : h),
            invoicedDelta: 0
        }));
        if (ok) toast.success('Faktura markeret som betalt.');
    };

    const handleVoidInvoice = async (invId) => {
        const entry = (lead.raw_data?.invoice_history || []).find(h => h.id === invId);
        const ok = await updateInvoiceHistory((history) => ({
            history: history.filter(h => h.id !== invId),
            invoicedDelta: -(entry?.amount || 0)
        }));
        setConfirmVoidId(null);
        if (ok) toast.success('Faktura annulleret og fjernet fra faktureret beløb.');
    };

    return (
        <div className="dashboard-workspace invoice-editor-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '14px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', flexShrink: 0, borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                        <ArrowLeft size={20} color="#475569" />
                    </button>
                    <div>
                        <h2 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: isMobile ? '1.2rem' : '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Faktura-kladde: {lead.customer_name}
                        </h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                            {lead.customer_address} &bull; {lead.project_category}
                        </p>
                    </div>
                </div>
                {onOpenCase && (
                    <button
                        onClick={() => onOpenCase(lead.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '14px 20px' : '10px 20px', width: isMobile ? '100%' : 'auto', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        Åbn sag i Ordrestyring <ArrowRight size={16} />
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', alignItems: 'start' }}>
                {/* VENSTRE: FAKTURA BYGGER */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* FAKTURAMODTAGER */}
                    <div style={{ background: '#fff', borderRadius: isMobile ? '20px' : '16px', border: '1px solid #e2e8f0', padding: isMobile ? '18px' : '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        {isMobile ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', minWidth: 0 }}>
                                {isB2B ? <Building2 size={18} color="#3b82f6" /> : <User size={18} color="#10b981" />}
                                Fakturamodtager
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <div style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 'bold', background: isB2B ? '#eff6ff' : '#ecfdf5', color: isB2B ? '#3b82f6' : '#10b981', border: `1px solid ${isB2B ? '#bfdbfe' : '#a7f3d0'}`, whiteSpace: 'nowrap' }}>
                                    {isB2B ? 'Erhverv' : 'Privat'}
                                </div>
                                <button
                                    onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                                    title={isEditingCustomer ? 'Gem ændringer' : 'Ret oplysninger'}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '12px', background: isEditingCustomer ? '#ecfdf5' : '#f8fafc', border: `1px solid ${isEditingCustomer ? '#a7f3d0' : '#e2e8f0'}`, cursor: 'pointer', color: isEditingCustomer ? '#10b981' : '#64748b', flexShrink: 0 }}
                                >
                                    {isEditingCustomer ? <Save size={16} /> : <Edit2 size={16} />}
                                </button>
                            </div>
                        </div>
                        ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isB2B ? <Building2 size={18} color="#3b82f6" /> : <User size={18} color="#10b981" />}
                                    Fakturamodtager
                                </h3>
                                <button
                                    onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: isEditingCustomer ? '#10b981' : '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}
                                >
                                    {isEditingCustomer ? <><Save size={14} /> Gem ændringer</> : <><Edit2 size={14} /> Ret Oplysninger</>}
                                </button>
                            </div>
                            <div style={{
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                background: isB2B ? '#eff6ff' : '#ecfdf5',
                                color: isB2B ? '#3b82f6' : '#10b981',
                                border: `1px solid ${isB2B ? '#bfdbfe' : '#a7f3d0'}`
                            }}>
                                {isB2B ? 'Erhvervskunde' : 'Privatkunde'}
                            </div>
                        </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            {isEditingCustomer ? (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Faktureres til:</div>
                                        <input type="text" value={editableCustomer.fullName} onChange={e => setEditableCustomer({...editableCustomer, fullName: e.target.value})} placeholder="Firmanavn / Navn" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                        {isB2B && (
                                            <input type="text" value={editableCustomer.cvr} onChange={e => setEditableCustomer({...editableCustomer, cvr: e.target.value})} placeholder="CVR Nummer" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Kontakt:</div>
                                        <input type="email" value={editableCustomer.email} onChange={e => setEditableCustomer({...editableCustomer, email: e.target.value})} placeholder="Fakturerings E-mail" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                        <input type="text" value={editableCustomer.phone} onChange={e => setEditableCustomer({...editableCustomer, phone: e.target.value})} placeholder="Telefonnummer" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Faktureringsadresse:</div>
                                        <input type="text" value={editableCustomer.address} onChange={e => setEditableCustomer({...editableCustomer, address: e.target.value})} placeholder="Adresse" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="text" value={editableCustomer.zip} onChange={e => setEditableCustomer({...editableCustomer, zip: e.target.value})} placeholder="Postnr" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', width: '30%' }} />
                                            <input type="text" value={editableCustomer.city} onChange={e => setEditableCustomer({...editableCustomer, city: e.target.value})} placeholder="By" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', flex: 1 }} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        {!isMobile && <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2px' }}>Faktureres til:</div>}
                                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.05rem' }}>{editableCustomer.fullName}</div>
                                        {isB2B && (
                                            <div style={{ color: '#475569', fontSize: '0.9rem', marginTop: '4px' }}>CVR: {editableCustomer.cvr}</div>
                                        )}
                                    </div>
                                    <div>
                                        {!isMobile && <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2px' }}>Kontakt:</div>}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem', marginBottom: '4px' }}>
                                            <Mail size={14} /> {editableCustomer.email || 'Ingen email indtastet'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem' }}>
                                            <Phone size={14} /> {editableCustomer.phone || 'Intet tlf indtastet'}
                                        </div>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                                        {!isMobile && <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Faktureringsadresse:</div>}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#475569', fontSize: '0.95rem' }}>
                                            <MapPin size={16} style={{ marginTop: '2px', color: '#94a3b8' }} />
                                            <div>
                                                {editableCustomer.address}<br/>
                                                {editableCustomer.zip} {editableCustomer.city}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Moms-vælger (kun B2B): omvendt betalingspligt vs. almindelig moms — ét klik.
                            Ikke alt B2B er byggeydelse (fx kontor), så man skal frit kunne skifte. */}
                        {isB2B && (
                            <div style={{ marginTop: '16px' }}>
                                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '14px' }}>
                                    {[
                                        { rc: true, label: 'Uden moms', sub: 'Omvendt betalingspligt', accent: '#1d4ed8' },
                                        { rc: false, label: 'Med moms', sub: '25%', accent: '#059669' },
                                    ].map(opt => {
                                        const on = isReverseCharge === opt.rc;
                                        return (
                                            <button key={String(opt.rc)} onClick={() => setIsReverseCharge(opt.rc)}
                                                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', padding: '9px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: on ? '#fff' : 'transparent', boxShadow: on ? '0 2px 6px rgba(15,23,42,0.10)' : 'none', transition: 'all 0.18s' }}
                                                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; }}
                                                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 800, fontSize: '0.9rem', color: on ? opt.accent : '#64748b' }}>
                                                    {on && <CheckCircle2 size={15} color={opt.accent} />}{opt.label}
                                                </span>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: on ? '#94a3b8' : '#cbd5e1' }}>{opt.sub}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p style={{ margin: '8px 4px 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.45 }}>
                                    {isReverseCharge
                                        ? 'Fakturaen oprettes uden moms — omvendt betalingspligt for bygge- og anlægsydelser.'
                                        : 'Fakturaen oprettes med 25% moms — som ved almindeligt B2B-salg (fx kontor eller andet end byggeydelser).'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* FAKTURALINJER */}
                    <div style={{ background: '#fff', borderRadius: isMobile ? '20px' : '16px', border: '1px solid #e2e8f0', padding: isMobile ? '18px' : '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: isMobile ? '1.05rem' : '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>Samlet Opgavesum {isReverseCharge ? 'ekskl.' : 'inkl.'} moms</div>
                                <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#0f172a' }}>
                                    {totalToBill.toLocaleString('da-DK')} kr.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* VALG AF FAKTURERING (FULDT / ACONTO) */}
                    <div data-tour="invoice-billing" style={{ background: '#fff', borderRadius: isMobile ? '20px' : '16px', border: '1px solid #e2e8f0', padding: isMobile ? '18px' : '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: isMobile ? '1.05rem' : '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Banknote size={18} color="#10b981" /> Hvad skal der faktureres?
                        </h3>

                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '16px', marginBottom: '20px' }}>
                            <div
                                onClick={() => setInvoiceType('full')}
                                style={{ flex: 1, padding: isMobile ? '18px' : '16px', border: `2px solid ${invoiceType === 'full' ? '#3b82f6' : '#e2e8f0'}`, borderRadius: isMobile ? '16px' : '12px', cursor: 'pointer', backgroundColor: invoiceType === 'full' ? '#eff6ff' : '#fff', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '0', justifyContent: isMobile ? 'flex-start' : 'normal' }}
                            >
                                {isMobile && (
                                    <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '14px', background: invoiceType === 'full' ? '#3b82f6' : '#f1f5f9', color: invoiceType === 'full' ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                        <CheckCircle2 size={22} />
                                    </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '2px' : '8px' }}>
                                        <span style={{ fontWeight: 'bold', color: invoiceType === 'full' ? '#1d4ed8' : '#475569' }}>Fakturér Alt (Afslut)</span>
                                        {!isMobile && invoiceType === 'full' && <CheckCircle2 size={18} color="#3b82f6" />}
                                    </div>
                                    <div style={{ fontSize: isMobile ? '1.35rem' : '1.2rem', fontWeight: '800', color: '#0f172a' }}>{remaining.toLocaleString('da-DK')} kr.</div>
                                </div>
                            </div>

                            <div
                                onClick={() => setInvoiceType('aconto')}
                                style={{ flex: 1, padding: isMobile ? '18px' : '16px', border: `2px solid ${invoiceType === 'aconto' ? '#3b82f6' : '#e2e8f0'}`, borderRadius: isMobile ? '16px' : '12px', cursor: 'pointer', backgroundColor: invoiceType === 'aconto' ? '#eff6ff' : '#fff', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '0', justifyContent: isMobile ? 'flex-start' : 'normal' }}
                            >
                                {isMobile && (
                                    <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '14px', background: invoiceType === 'aconto' ? '#3b82f6' : '#f1f5f9', color: invoiceType === 'aconto' ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                        <Banknote size={22} />
                                    </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '2px' : '8px' }}>
                                        <span style={{ fontWeight: 'bold', color: invoiceType === 'aconto' ? '#1d4ed8' : '#475569' }}>Aconto (Delfakturering)</span>
                                        {!isMobile && invoiceType === 'aconto' && <CheckCircle2 size={18} color="#3b82f6" />}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Vælg et specifikt beløb</div>
                                </div>
                            </div>
                        </div>

                        {invoiceType === 'aconto' && (
                            <div style={{ animation: 'fadeIn 0.3s ease-out', marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold', marginBottom: '8px' }}>Indtast Aconto-beløb (ekskl. moms)</label>
                                <div style={{ position: 'relative', width: isMobile ? '100%' : '50%', marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={acontoAmountRaw ? Number(acontoAmountRaw).toLocaleString('da-DK') : ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setAcontoAmountRaw(val);
                                        }}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '14px 40px 14px 16px', borderRadius: isMobile ? '12px' : '8px', border: '1px solid #cbd5e1', fontSize: isMobile ? '16px' : '1.05rem', fontWeight: '600', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                        onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                                    />
                                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 'bold' }}>kr.</span>
                                </div>
                                <div style={{
                                    padding: '12px 16px',
                                    background: (remaining - currentAmountToBill) < 0 ? '#fef2f2' : '#f8fafc',
                                    border: `1px dashed ${(remaining - currentAmountToBill) < 0 ? '#fecaca' : '#cbd5e1'}`,
                                    borderRadius: isMobile ? '12px' : '8px',
                                    display: isMobile ? 'flex' : 'inline-flex',
                                    width: isMobile ? '100%' : 'auto',
                                    boxSizing: 'border-box',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: isMobile ? 'space-between' : 'flex-start',
                                    gap: '8px',
                                    color: (remaining - currentAmountToBill) < 0 ? '#e11d48' : '#334155',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                        Mangler at blive faktureret bagefter:
                                    </div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: '800' }}>
                                        {Math.max(0, remaining - currentAmountToBill).toLocaleString('da-DK')} kr.
                                    </div>
                                    {(remaining - currentAmountToBill) < 0 && (
                                        <div style={{ fontSize: '0.8rem', marginLeft: '8px', fontWeight: 'bold' }}>(Advarsel: Overstiger restbeløb)</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Moms-valget styres af den lækre vælger ved Fakturamodtager (ovenfor). */}

                        <div data-tour="invoice-send" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                            <button
                                onClick={() => setShowPreview(true)}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '16px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            >
                                <FileText size={20} /> Se Faktura (Visuel)
                            </button>
                            
                            <button 
                                onClick={handleSendToDinero}
                                style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0f172a', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <Send size={20} /> 
                                {carpenterProfile?.dinero_api_key && carpenterProfile.dinero_api_key !== 'pending_authorization' ? 'Overfør som kladde til Dinero' : 
                                 carpenterProfile?.economic_api_key && carpenterProfile.economic_api_key !== 'pending_authorization' ? 'Overfør som kladde til e-conomic' : 
                                 'Overfør til Regnskab'}
                            </button>
                        </div>
                        
                        {/* FAKTURA HISTORIK */}
                        {lead.raw_data?.invoice_history && lead.raw_data.invoice_history.length > 0 && (
                            <div style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginTop: '24px' }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={18} color="#64748b" /> Tidligere Fakturaer & Historik
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {lead.raw_data.invoice_history.map((inv, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.95rem' }}>Faktura #{inv.id}</div>
                                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(inv.date).toLocaleDateString('da-DK', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#0f172a' }}>
                                                    {Number(inv.amount).toLocaleString('da-DK')} kr.
                                                </div>
                                                {inv.status === 'paid' ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                        <CheckCircle2 size={14} /> Betalt
                                                    </span>
                                                ) : inv.status === 'booked' ? (
                                                    <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                        Bogført
                                                    </span>
                                                ) : inv.status === 'manual' ? (
                                                    <span style={{ background: '#fffbeb', color: '#b45309', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                        Registreret manuelt
                                                    </span>
                                                ) : (
                                                    <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                        Kladde
                                                    </span>
                                                )}
                                                {inv.status !== 'paid' && (
                                                    <button onClick={() => handleMarkPaid(inv.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                                        <CheckCircle2 size={14} /> Markér betalt
                                                    </button>
                                                )}
                                                {confirmVoidId === inv.id ? (
                                                    <button onClick={() => handleVoidInvoice(inv.id)} style={{ background: '#e11d48', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                                        Bekræft annullér?
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setConfirmVoidId(inv.id)} title="Annullér faktura og fjern fra faktureret beløb" style={{ background: 'none', color: '#94a3b8', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                        Annullér
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* HØJRE: LEVERANDØRBILAG */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div data-tour="invoice-bilag">
                    <BilagManager lead={lead} profile={carpenterProfile} onUpdateLead={onUpdateLead} isMobile={isMobile} />
                    </div>
                </div>
            </div>

            {/* Faktura Preview Fullscreen Modal */}
            {/* Faktura Preview Fullscreen Modal */}
            {showPreview && createPortal(
                <div className="dashboard-modal-overlay invoice-preview-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isMobile ? '#f8fafc' : 'rgba(15, 23, 42, 0.7)', backdropFilter: isMobile ? 'none' : 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: isMobile ? 0 : '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div className="dashboard-modal-panel invoice-preview-panel" style={{ width: isMobile ? '100%' : '95%', maxWidth: '1200px', height: isMobile ? '100%' : '95vh', background: '#e2e8f0', borderRadius: isMobile ? 0 : '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        
                        {/* FULL SCREEN HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? 'calc(max(env(safe-area-inset-top), 20px)) 20px 16px 20px' : '20px 40px', borderBottom: '1px solid #cbd5e1', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 10, flexShrink: 0 }}>
                            <h2 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={20} color="#3b82f6" /> Godkend Faktura
                            </h2>
                            <button onClick={() => setShowPreview(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        {/* DISCLAIMER BANNER */}
                        {!isMobile && (
                            <div style={{ padding: '16px 40px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: '0.95rem', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', zIndex: 9, flexShrink: 0 }}>
                                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                                <div>
                                    <strong>Vigtig info:</strong> Dette er udelukkende en visuel kladde, så du kan kontrollere beløb og moms. Det endelige design genereres automatisk af dit regnskabsprogram.
                                </div>
                            </div>
                        )}
                    
                        {/* SCROLLABLE AREA */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '40px 20px', display: 'flex', justifyContent: 'center', background: isMobile ? '#f8fafc' : '#e2e8f0' }}>
                            
                            {isMobile ? (
                                /* COMPACT MOBILE RECEIPT VIEW */
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '4px' }}>FAKTURERES TIL:</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>{editableCustomer.fullName}</div>
                                        {isB2B && <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '2px' }}>CVR: {editableCustomer.cvr}</div>}
                                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0', fontSize: '0.9rem', color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Sagsnr:</span>
                                            <strong>{lead.id}</strong>
                                        </div>
                                    </div>

                                    <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '12px' }}>BELØB:</div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {invoiceType === 'aconto' ? (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                                    <span style={{ color: '#475569' }}>Aconto betaling</span>
                                                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{subtotalExVat.toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                                        <span style={{ color: '#475569' }}>Oprindeligt Tilbud</span>
                                                        <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{(basePrice / (isReverseCharge ? 1 : 1.25)).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                                    </div>
                                                    {extraPrice > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                                            <span style={{ color: '#475569' }}>Ekstra Aftalesedler</span>
                                                            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{(extraPrice / (isReverseCharge ? 1 : 1.25)).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                                        </div>
                                                    )}
                                                    {invoiced > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                                            <span style={{ color: '#475569' }}>Allerede faktureret</span>
                                                            <span style={{ fontWeight: 'bold', color: '#e11d48' }}>-{(invoiced / (isReverseCharge ? 1 : 1.25)).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#64748b', fontSize: '0.9rem' }}>
                                                <span>Subtotal ekskl. moms:</span>
                                                <span>{subtotalExVat.toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#64748b', fontSize: '0.9rem' }}>
                                                <span>Moms ({isReverseCharge ? '0%' : '25%'}):</span>
                                                <span>{vatAmount.toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '900', marginTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                                                <span>I alt til betaling:</span>
                                                <span>{totalInclVat.toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {isReverseCharge && (
                                        <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', fontSize: '0.85rem' }}>
                                            <strong>Omvendt betalingspligt.</strong> Uden moms (B2B).
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* DESKTOP A4 PAPER MOCKUP */
                                <div style={{ background: '#fff', width: '100%', maxWidth: '850px', minHeight: '1100px', padding: '60px', borderRadius: '4px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0', borderBottom: '2px solid #0f172a', paddingBottom: '32px', marginBottom: '40px' }}>
                                        <div>
                                            <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5rem', color: '#0f172a', letterSpacing: '2px', textTransform: 'uppercase' }}>Faktura</h1>
                                            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px' }}>Fakturanr: <strong style={{ color: '#0f172a' }}>KLADDE</strong></div>
                                            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Dato: {new Date().toLocaleDateString('da-DK')}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem', marginBottom: '4px' }}>{carpenterProfile?.company_name || 'Din Tømrervirksomhed ApS'}</div>
                                            <div style={{ color: '#475569', fontSize: '0.9rem' }}>{carpenterProfile?.address || 'Håndværkervej 12, 8000 Aarhus C'}</div>
                                            <div style={{ color: '#475569', fontSize: '0.9rem' }}>CVR: {carpenterProfile?.cvr || '12345678'}</div>
                                            <div style={{ color: '#475569', fontSize: '0.9rem' }}>{carpenterProfile?.email || 'kontakt@firma.dk'}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '50px', padding: '24px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                                        <div style={{ width: '400px' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '4px' }}>FAKTURERES TIL:</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>{editableCustomer.fullName}</div>
                                            <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                                {editableCustomer.address}<br/>
                                                {editableCustomer.zip} {editableCustomer.city}
                                            </div>
                                            {isB2B && <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '4px' }}>CVR: {editableCustomer.cvr}</div>}
                                        </div>
                                        <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#0f172a' }}><strong>Sagsnr:</strong> {lead.id} - {lead.project_category}</div>
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ textAlign: 'left', padding: '12px 0', color: '#0f172a', fontSize: '0.9rem' }}>Beskrivelse</th>
                                                <th style={{ textAlign: 'right', padding: '12px 0', color: '#0f172a', fontSize: '0.9rem' }}>Beløb</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceType === 'aconto' ? (
                                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '20px 0' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>Aconto betaling</div>
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Vedrørende: {lead.project_category}</div>
                                                    </td>
                                                    <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                                                        {subtotalExVat.toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.
                                                    </td>
                                                </tr>
                                            ) : (
                                                <>
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '20px 0' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>Oprindeligt Tilbud</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Ifølge accepteret tilbud</div>
                                                        </td>
                                                        <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                                                            {(basePrice / (isReverseCharge ? 1 : 1.25)).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.
                                                        </td>
                                                    </tr>
                                                    {extraPrice > 0 && (
                                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '20px 0' }}>
                                                                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>Ekstra Aftalesedler</div>
                                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Godkendt merarbejde</div>
                                                            </td>
                                                            <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                                                                {(extraPrice / (isReverseCharge ? 1 : 1.25)).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {invoiced > 0 && (
                                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '20px 0' }}>
                                                                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>Allerede faktureret (Aconto)</div>
                                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Fratrækkes totalen</div>
                                                            </td>
                                                            <td style={{ padding: '20px 0', textAlign: 'right', fontWeight: 'bold', color: '#e11d48' }}>
                                                                -{(invoiced / (isReverseCharge ? 1 : 1.25)).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            )}
                                        </tbody>
                                    </table>

                                    <div style={{ marginTop: 'auto' }}>
                                        <div style={{ width: '350px', marginLeft: 'auto' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#475569' }}>
                                                <span>Subtotal ekskl. moms:</span>
                                                <span>{subtotalExVat.toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#475569', borderBottom: '1px solid #e2e8f0', marginBottom: '12px' }}>
                                                <span>Moms ({isReverseCharge ? '0%' : '25%'}):</span>
                                                <span>{vatAmount.toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '900' }}>
                                                <span>I alt til betaling:</span>
                                                <span>{totalInclVat.toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.</span>
                                            </div>
                                        </div>

                                        {isReverseCharge && (
                                            <div style={{ marginTop: '40px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem' }}>
                                                <strong>Omvendt betalingspligt.</strong> Fakturaen er udstedt uden moms i henhold til reglerne om omvendt betalingspligt ved bygge- og anlægsydelser. Køber er ansvarlig for at afregne momsen.
                                            </div>
                                        )}

                                        <div style={{ marginTop: '60px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                                            Betalingsbetingelser: Netto 8 dage<br/>
                                            <span style={{ fontSize: '0.75rem', fontStyle: 'italic', opacity: 0.8, marginTop: '4px', display: 'inline-block' }}>
                                                *(Dine bankoplysninger og reg.nr tilføjes automatisk af dit valgte regnskabsprogram på den endelige faktura)*
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* FOOTER ACTION BAR */}
                        <div style={{ padding: isMobile ? '16px 16px calc(env(safe-area-inset-bottom, 16px) + 16px) 16px' : '20px 40px', background: '#fff', borderTop: '1px solid #cbd5e1', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '16px', boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)', zIndex: 10, flexShrink: 0 }}>
                            {!isMobile && (
                                <div style={{ color: '#64748b', fontSize: '0.95rem' }}>
                                    Tjek at beløb og moms stemmer overens med aftalen.
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                                <button onClick={() => setShowPreview(false)} style={{ flex: isMobile ? 1 : 'none', padding: '14px 28px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.05rem', transition: 'all 0.2s', display: 'flex', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                    Luk
                                </button>
                                <button onClick={() => { setShowPreview(false); handleSendToDinero(); }} style={{ flex: isMobile ? 1 : 'none', padding: '14px 28px', borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1.05rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)' }}>
                                    <Send size={18} /> 
                                    {carpenterProfile?.dinero_api_key && carpenterProfile.dinero_api_key !== 'pending_authorization' ? 'Overfør til Dinero' : 
                                     carpenterProfile?.economic_api_key && carpenterProfile.economic_api_key !== 'pending_authorization' ? 'Overfør til e-conomic' : 
                                     'Overfør'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default InvoiceEditor;
