import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronDown, CheckCircle2, FileText, Building2, Send, Loader2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

const BilagManager = ({ lead, profile, onUpdateLead, isMobile = false }) => {
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [newSupplierInvoice, setNewSupplierInvoice] = useState({ amount: '', description: '', category: 'Materialer', file: null, file_name: '', material_list_id: '' });
    const [isMaterialListDropdownOpen, setIsMaterialListDropdownOpen] = useState(false);
    
    const materialListsMeta = lead?.raw_data?.material_lists_meta || [];
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [isSendingAll, setIsSendingAll] = useState(false);

    const rawSupplierInvoices = lead?.raw_data?.supplier_invoices || [];
    
    // Adgangskontrol: Admin/Bogholder/Mester ser alt. Projektleder ser kun sine egne.
    const supplierInvoices = rawSupplierInvoices.filter(inv => {
        if (profile?.role === 'admin' || profile?.role === 'master' || profile?.role === 'boss') {
            return true;
        }
        const currentUserName = profile?.owner_name || profile?.company_name || profile?.email || 'Ukendt';
        return inv.uploaded_by === currentUserName;
    });

    const unsentInvoices = supplierInvoices.filter(inv => !inv.is_sent_to_accounting);

    // Vælg regnskabssystem: Dinero hvis forbundet, ellers e-conomic.
    const useDinero = profile?.dinero_api_key && profile.dinero_api_key !== 'pending_authorization';
    const accountingFn = useDinero ? 'dinero-voucher' : 'economic-voucher';
    const accountingName = useDinero ? 'Dinero' : 'e-conomic';

    // Byg payload til voucher edge-funktionen for ét bilag.
    const buildVoucherBody = (inv) => ({
        companyId: lead.carpenter_id || profile?.company_id || profile?.id,
        amount: inv.amount,
        description: inv.description || inv.name,
        date: inv.date ? String(inv.date).substring(0, 10) : undefined,
        fileData: inv.file_data || null,   // gammelt base64-format
        filePath: inv.file_path || null,   // nyt storage-format
        fileName: inv.file_name || inv.name
    });

    // Marker de(t) lykkede bilag som sendt — læser nyeste raw_data først, så vi
    // ikke overskriver bilag der er uploadet imens.
    const markInvoicesSent = async (sentMap) => {
        const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
        const currentRawData = latestData?.raw_data || lead.raw_data || {};
        const latestInvoices = (currentRawData.supplier_invoices || []).map(i =>
            (i.id in sentMap) ? { ...i, is_sent_to_accounting: true, accounting_voucher_number: sentMap[i.id] } : i
        );
        const updatedCase = { ...lead, raw_data: { ...currentRawData, supplier_invoices: latestInvoices } };
        const { error } = await supabase.from('leads').update({ raw_data: updatedCase.raw_data }).eq('id', lead.id);
        if (error) throw error;
        if (onUpdateLead) onUpdateLead(updatedCase);
    };

    const handleSendAllToAccounting = async () => {
        if (unsentInvoices.length === 0) return;
        setIsSendingAll(true);
        const sentMap = {};
        let failed = 0;
        try {
            for (const inv of unsentInvoices) {
                const { data, error } = await supabase.functions.invoke(accountingFn, { body: buildVoucherBody(inv) });
                if (!error && data?.success) {
                    sentMap[inv.id] = data.voucherNumber || null;
                } else {
                    failed++;
                    console.error('Bilag fejlede:', inv.id, error?.message || data?.error);
                }
            }

            if (Object.keys(sentMap).length > 0) await markInvoicesSent(sentMap);

            const ok = Object.keys(sentMap).length;
            if (failed === 0) {
                toast.success(`${ok} bilag overført til ${accountingName}!`);
            } else if (ok > 0) {
                toast(`${ok} bilag overført, ${failed} fejlede. Prøv de resterende igen.`, { icon: '⚠️' });
            } else {
                toast.error(`Ingen bilag kunne overføres til ${accountingName}.`);
            }
        } catch (err) {
            console.error("Fejl ved afsendelse af alle:", err);
            toast.error("Kunne ikke gemme status efter overførsel.");
        } finally {
            setIsSendingAll(false);
        }
    };

    const handleSendToAccounting = async (invId, e) => {
        e.stopPropagation(); // Prevent opening the file preview
        const inv = rawSupplierInvoices.find(i => i.id === invId);
        if (!inv) return;
        setSendingId(invId);

        try {
            const { data, error } = await supabase.functions.invoke(accountingFn, { body: buildVoucherBody(inv) });
            if (error || !data?.success) {
                throw new Error(error?.message || data?.error || `Ukendt fejl fra ${accountingName}`);
            }
            await markInvoicesSent({ [invId]: data.voucherNumber || null });
            toast.success(data.message || `Bilag overført til ${accountingName}!`);
        } catch (err) {
            console.error("Fejl ved afsendelse:", err);
            toast.error(`Kunne ikke sende til ${accountingName}: ` + (err.message || ''));
        } finally {
            setSendingId(null);
        }
    };

    const handleDeleteInvoice = async (invId, e) => {
        e.stopPropagation();
        
        if (!window.confirm("Er du sikker på, at du vil slette dette bilag?")) {
            return;
        }

        const updatedInvoices = rawSupplierInvoices.filter(inv => inv.id !== invId);
        
        try {
            const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const currentRawData = latestData?.raw_data || lead.raw_data || {};

            const updatedCase = {
                ...lead,
                raw_data: {
                    ...currentRawData,
                    supplier_invoices: updatedInvoices
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
            
            toast.success("Bilag slettet!");
        } catch (err) {
            console.error("Fejl ved sletning af bilag:", err);
            toast.error("Kunne ikke slette bilag");
        }
    };

    const handleUploadSupplier = async (e) => {
        e.preventDefault();
        if (!newSupplierInvoice.description || !newSupplierInvoice.amount) {
            toast.error("Udfyld både beskrivelse og beløb");
            return;
        }

        let filePath = null;
        try {
            if (newSupplierInvoice.file) {
                const f = newSupplierInvoice.file;
                const ext = (f.name.split('.').pop() || 'pdf').toLowerCase();
                const fileName = `bilag_${lead.id}_${Date.now()}.${ext}`;
                // Privat bucket — bilag er finansielle dokumenter, ikke offentlige
                const { error: uploadError } = await supabase.storage
                    .from('bilag')
                    .upload(fileName, f, { cacheControl: '3600', upsert: false });
                if (uploadError) throw uploadError;
                filePath = fileName; // gemmer stien, ikke en offentlig URL
            }
        } catch (err) {
            console.error("Fejl ved upload af bilagsfil:", err);
            toast.error("Kunne ikke uploade filen. Prøv igen.");
            return;
        }

        const newInv = {
            id: `supp_${Date.now()}`,
            name: newSupplierInvoice.description,
            description: newSupplierInvoice.description,
            amount: parseFloat(String(newSupplierInvoice.amount).replace(/\./g, '').replace(',', '.')) || 0,
            date: new Date().toISOString(),
            uploaded_by: profile?.owner_name || profile?.email || 'Ukendt',
            status: 'Godkendt',
            category: newSupplierInvoice.category || 'Materialer',
            file_path: filePath,      // sti i privat 'bilag'-bucket (nyt)
            file_name: newSupplierInvoice.file_name,
            material_list_id: newSupplierInvoice.material_list_id || null
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
            setNewSupplierInvoice({ amount: '', description: '', category: 'Materialer', file: null, file_name: '', material_list_id: '' });
            setShowUploadForm(false);
        } catch (err) {
            console.error("Fejl ved gem bilag:", err);
            toast.error("Kunne ikke gemme bilag");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.includes('pdf') && !file.type.includes('image')) {
            toast.error("Kun PDF eller Billeder understøttes.");
            return;
        }

        // Gem selve filen (uploades til Storage ved gem) — ikke base64 i databasen
        setNewSupplierInvoice(prev => ({
            ...prev,
            file,
            file_name: file.name
        }));
        toast.success("Fil vedhæftet!");
    };

    return (
        <div className="glass-panel-tab" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={isMobile ? 22 : 18} color="#d97706" /> Fakturaer & Udgifter (Bilag)
                </h3>
                <div style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {supplierInvoices.length} bilag
                </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                {isMobile
                    ? 'Registrér udgifter og fakturaer på sagen — vælg den rigtige kategori.'
                    : 'Her registrerer du de udgifter og fakturaer du modtager på denne sag. Husk at vælge den rigtige kategori, så materialebudgettet stemmer.'}
            </p>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setShowUploadForm(true)}
                    className="hover-lift"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', padding: isMobile ? '18px' : '12px', borderRadius: isMobile ? '16px' : '10px', cursor: 'pointer', fontWeight: '600', fontSize: isMobile ? '1.05rem' : '0.95rem' }}
                >
                    <Upload size={isMobile ? 20 : 16} /> Upload & Registrer Ny
                </button>
            </div>

            {/* NYT BILAG — moderne glas-modal (fuldskærm på mobil, centreret på desktop) */}
            {createPortal(
                <AnimatePresence>
                    {showUploadForm && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => { setShowUploadForm(false); setIsCategoryDropdownOpen(false); }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 100000, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
                            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '100%', maxWidth: isMobile ? '100%' : '520px', height: isMobile ? '100dvh' : 'auto', maxHeight: isMobile ? '100dvh' : '90vh', overflowY: 'auto', background: '#fff', borderRadius: isMobile ? '0' : '24px', boxShadow: '0 24px 48px -12px rgba(15,23,42,0.3)', border: '1px solid #eef2f7' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', paddingTop: isMobile ? 'calc(env(safe-area-inset-top) + 16px)' : '20px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={22} /></div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>Nyt bilag</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Faktura eller udgift på sagen</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setShowUploadForm(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
                                </div>

                                {/* Body */}
                                <form onSubmit={handleUploadSupplier} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Fil-dropzone */}
                                    <div style={{ position: 'relative', width: '100%', height: isMobile ? '150px' : '130px', border: '2px dashed #cbd5e1', borderRadius: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.2s, background 0.2s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.background = '#fffbeb'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}>
                                        <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                                        {newSupplierInvoice.file ? (
                                            <>
                                                <div style={{ color: '#10b981', marginBottom: '6px' }}><CheckCircle2 size={30} /></div>
                                                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 'bold' }}>{newSupplierInvoice.file_name}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Tryk for at skifte fil</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ color: '#94a3b8', marginBottom: '8px' }}><Upload size={30} /></div>
                                                <div style={{ fontSize: '0.98rem', color: '#475569', fontWeight: '600' }}>Vælg PDF eller billede</div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Valgfrit – men anbefales</div>
                                            </>
                                        )}
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Beskrivelse (fx Bygma Faktura 1234)"
                                        value={newSupplierInvoice.description}
                                        onChange={(e) => setNewSupplierInvoice({...newSupplierInvoice, description: e.target.value})}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none' }}
                                    />

                                    {/* Kategori dropdown */}
                                    <div style={{ position: 'relative' }}>
                                        <div
                                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0f172a' }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {newSupplierInvoice.category === 'Materialer' && <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }} /> Materialer (Bygma, Stark, etc.)</>}
                                                {newSupplierInvoice.category === 'Underentreprenør' && <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9333ea' }} /> Underentreprenør (Elektriker, VVS, etc.)</>}
                                                {newSupplierInvoice.category === 'Diverse' && <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Diverse (Liftleje, Container, etc.)</>}
                                                {!newSupplierInvoice.category && 'Vælg kategori...'}
                                            </span>
                                            <ChevronDown size={18} style={{ color: '#94a3b8', transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                        </div>

                                        {isCategoryDropdownOpen && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', zIndex: 10, overflow: 'hidden', padding: '6px' }}>
                                                {['Materialer', 'Underentreprenør', 'Diverse'].map(cat => (
                                                    <div
                                                        key={cat}
                                                        onClick={() => { setNewSupplierInvoice({...newSupplierInvoice, category: cat}); setIsCategoryDropdownOpen(false); }}
                                                        style={{ padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#334155' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat === 'Materialer' ? '#0ea5e9' : cat === 'Underentreprenør' ? '#9333ea' : '#f59e0b' }} />
                                                        {cat === 'Materialer' ? 'Materialer (Bygma, Stark, etc.)' : cat === 'Underentreprenør' ? 'Underentreprenør (Elektriker, VVS, etc.)' : 'Diverse (Liftleje, Container, etc.)'}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Valg af Materialeliste (kun hvis kategori er Materialer) */}
                                    {(newSupplierInvoice.category === 'Materialer' && materialListsMeta.length > 0) && (
                                        <div style={{ position: 'relative' }}>
                                            <div
                                                onClick={() => setIsMaterialListDropdownOpen(!isMaterialListDropdownOpen)}
                                                style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', backgroundColor: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0f172a', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: newSupplierInvoice.material_list_id ? '#0f172a' : '#64748b' }}>
                                                    {newSupplierInvoice.material_list_id 
                                                        ? materialListsMeta.find(l => l.id === newSupplierInvoice.material_list_id)?.name || 'Ukendt liste'
                                                        : 'Tilknyt til materialeliste (Valgfrit)'}
                                                </span>
                                                <ChevronDown size={18} style={{ color: '#94a3b8', transform: isMaterialListDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                            </div>

                                            {isMaterialListDropdownOpen && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', zIndex: 10, overflow: 'hidden', padding: '6px' }}>
                                                    <div
                                                        onClick={() => { setNewSupplierInvoice({...newSupplierInvoice, material_list_id: ''}); setIsMaterialListDropdownOpen(false); }}
                                                        style={{ padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#64748b', fontStyle: 'italic' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        Ingen materialeliste valgt
                                                    </div>
                                                    <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />
                                                    {materialListsMeta.map(list => (
                                                        <div
                                                            key={list.id}
                                                            onClick={() => { setNewSupplierInvoice({...newSupplierInvoice, material_list_id: list.id}); setIsMaterialListDropdownOpen(false); }}
                                                            style={{ padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#334155', fontWeight: newSupplierInvoice.material_list_id === list.id ? 'bold' : 'normal' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f2fe'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }} />
                                                            {list.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Beløb */}
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Beløb ekskl. moms"
                                            value={newSupplierInvoice.amount}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/[^0-9,]/g, '');
                                                let parts = val.split(',');
                                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                let formatted = parts.join(',');
                                                setNewSupplierInvoice({...newSupplierInvoice, amount: formatted});
                                            }}
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '14px', paddingRight: '44px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none' }}
                                        />
                                        <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>kr.</span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                        <button type="button" onClick={() => setShowUploadForm(false)} style={{ flex: '0 0 auto', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>Annullér</button>
                                        <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 16px rgba(16,185,129,0.25)' }}>Gem bilag</button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {supplierInvoices.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8', fontSize: '0.9rem' }}>
                        Ingen bilag registreret endnu.
                    </div>
                ) : (
                    supplierInvoices.map(inv => {
                        let badgeColor = '#f1f5f9';
                        let badgeTextColor = '#475569';
                        if (inv.category === 'Materialer') {
                            badgeColor = '#e0f2fe';
                            badgeTextColor = '#0284c7';
                        } else if (inv.category === 'Underentreprenør') {
                            badgeColor = '#f3e8ff';
                            badgeTextColor = '#9333ea';
                        } else if (inv.category === 'Diverse') {
                            badgeColor = '#fef3c7';
                            badgeTextColor = '#d97706';
                        }
                        
                        return (
                            <div 
                                key={inv.id} 
                                className="log-card"
                                onClick={async () => {
                                    if (inv.file_path) {
                                        // Privat bucket — generér et tidsbegrænset signed URL
                                        const { data, error } = await supabase.storage.from('bilag').createSignedUrl(inv.file_path, 3600);
                                        if (error || !data?.signedUrl) { toast.error("Kunne ikke åbne bilaget."); return; }
                                        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
                                    } else if (inv.file_url || inv.file_data) {
                                        window.open(inv.file_url || inv.file_data, '_blank', 'noopener,noreferrer');
                                    } else {
                                        toast.error("Intet fysisk bilag vedhæftet.");
                                    }
                                }}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: (inv.file_path || inv.file_url || inv.file_data) ? 'pointer' : 'default', ...(isMobile ? { padding: '16px', background: '#fff', border: '1px solid #eef2f7', borderRadius: '16px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' } : {}) }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: 0 }}>
                                    <div style={{ color: (inv.file_path || inv.file_url || inv.file_data) ? '#10b981' : '#cbd5e1', marginTop: '4px' }}>
                                        <FileText size={isMobile ? 28 : 24} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: isMobile ? '1.15rem' : '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {inv.description || inv.name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', backgroundColor: badgeColor, color: badgeTextColor, padding: '4px 10px', borderRadius: '20px' }}>
                                                {inv.category || 'Materialer'}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>
                                                {inv.date && (inv.date.includes('T') ? new Date(inv.date).toLocaleDateString('da-DK') : inv.date)}
                                            </span>
                                            {inv.uploaded_by && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>• {inv.uploaded_by}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0, marginLeft: '16px' }}>
                                    <div style={{ fontWeight: '800', color: inv.amount ? '#ef4444' : '#94a3b8', fontSize: '1.15rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {inv.amount ? `- ${inv.amount.toLocaleString('da-DK')} kr.` : 'Beløb ukendt'}
                                        <button 
                                            onClick={(e) => handleDeleteInvoice(inv.id, e)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', transition: 'all 0.2s' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                            title="Slet bilag"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    {(profile?.role !== 'worker' && profile?.role !== 'apprentice' && inv.is_sent_to_accounting) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.8rem', fontWeight: '700', padding: '6px 12px', background: '#ecfdf5', borderRadius: '20px', border: '1px solid #a7f3d0' }} title="Ligger klar i e-conomic indbakken">
                                            <CheckCircle2 size={16} /> e-conomic
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {(unsentInvoices.length > 0 && profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                <button 
                    onClick={handleSendAllToAccounting}
                    disabled={isSendingAll}
                    style={{ width: '100%', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', background: '#0f172a', color: '#fff', border: 'none', padding: '16px 24px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold', cursor: isSendingAll ? 'not-allowed' : 'pointer', opacity: isSendingAll ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    onMouseEnter={(e) => { if (!isSendingAll) { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'; } }}
                    onMouseLeave={(e) => { if (!isSendingAll) { e.currentTarget.style.backgroundColor = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; } }}
                >
                    {isSendingAll ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
                    {isSendingAll ? 'Overfører bilag...' : `Overfør bilag (${unsentInvoices.length})`}
                </button>
            )}
        </div>
    );
};

export default BilagManager;
