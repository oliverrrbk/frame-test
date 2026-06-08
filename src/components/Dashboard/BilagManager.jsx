import React, { useState } from 'react';
import { Upload, ChevronDown, CheckCircle2, FileText, Building2, Send, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

const BilagManager = ({ lead, profile, onUpdateLead }) => {
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [newSupplierInvoice, setNewSupplierInvoice] = useState({ amount: '', description: '', category: 'Materialer', file_data: null, file_name: '' });
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

    const handleSendAllToAccounting = async () => {
        if (unsentInvoices.length === 0) return;
        setIsSendingAll(true);
        try {
            await new Promise(r => setTimeout(r, 2000)); // Simulate slightly longer delay for multiple
            
            const updatedInvoices = rawSupplierInvoices.map(inv => {
                if (unsentInvoices.some(u => u.id === inv.id)) {
                    return { ...inv, is_sent_to_accounting: true };
                }
                return inv;
            });
            
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
            
            toast.success(`${unsentInvoices.length} bilag overført til e-conomic!`);
        } catch (err) {
            console.error("Fejl ved afsendelse af alle:", err);
            toast.error("Kunne ikke sende bilagene til regnskab");
        } finally {
            setIsSendingAll(false);
        }
    };

    const handleSendToAccounting = async (invId, e) => {
        e.stopPropagation(); // Prevent opening the file preview
        
        // This is only allowed for the boss/admin, but we show it in the UI if it's the "InvoiceEditor"
        // For now, we simulate the API request
        setSendingId(invId);
        
        try {
            // Simulate API Delay
            await new Promise(r => setTimeout(r, 1500));
            
            const updatedInvoices = rawSupplierInvoices.map(inv => 
                inv.id === invId ? { ...inv, is_sent_to_accounting: true } : inv
            );
            
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
            
            toast.success("Bilag overført til indbakken i e-conomic!");
        } catch (err) {
            console.error("Fejl ved afsendelse:", err);
            toast.error("Kunne ikke sende til regnskab");
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

        const newInv = {
            id: `supp_${Date.now()}`,
            name: newSupplierInvoice.description, 
            description: newSupplierInvoice.description,
            amount: parseFloat(String(newSupplierInvoice.amount).replace(/\./g, '').replace(',', '.')) || 0,
            date: new Date().toISOString(),
            uploaded_by: profile?.owner_name || profile?.email || 'Ukendt',
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

    return (
        <div className="glass-panel-tab" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={18} color="#d97706" /> Fakturaer & Udgifter (Bilag)
                </h3>
                <div style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {supplierInvoices.length} bilag
                </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Her registrerer du de udgifter og fakturaer du modtager på denne sag. Husk at vælge den rigtige kategori, så materialebudgettet stemmer.
            </p>

            <div style={{ marginBottom: '20px' }}>
                {!showUploadForm ? (
                    <button 
                        onClick={() => setShowUploadForm(true)}
                        className="hover-lift"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
                    >
                        <Upload size={16} /> Upload & Registrer Ny
                    </button>
                ) : (
                    <form onSubmit={handleUploadSupplier} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', animation: 'fadeIn 0.3s ease-out' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#0f172a' }}>Nyt Bilag</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            
                            {/* Fil Upload Dropzone */}
                            <div style={{ position: 'relative', width: '100%', height: '100px', border: '2px dashed #cbd5e1', borderRadius: '10px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                                <input 
                                    type="file" 
                                    accept="image/*,application/pdf"
                                    onChange={handleFileUpload}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                                />
                                {newSupplierInvoice.file_data ? (
                                    <>
                                        <div style={{ color: '#10b981', marginBottom: '4px' }}><CheckCircle2 size={24} /></div>
                                        <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 'bold' }}>{newSupplierInvoice.file_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tryk for at skifte fil</div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ color: '#94a3b8', marginBottom: '8px' }}><Upload size={24} /></div>
                                        <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Vælg PDF eller Billede</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>(Valgfrit - men anbefales)</div>
                                    </>
                                )}
                            </div>

                            <input 
                                type="text" 
                                placeholder="Beskrivelse (fx Bygma Faktura 1234)"
                                value={newSupplierInvoice.description}
                                onChange={(e) => setNewSupplierInvoice({...newSupplierInvoice, description: e.target.value})}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                            />
                            {/* Kategori Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <div 
                                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0f172a' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {newSupplierInvoice.category === 'Materialer' && <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }} /> Materialer (Bygma, Stark, etc.)</>}
                                        {newSupplierInvoice.category === 'Underentreprenør' && <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9333ea' }} /> Underentreprenør (Elektriker, VVS, etc.)</>}
                                        {newSupplierInvoice.category === 'Diverse' && <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Diverse (Liftleje, Container, etc.)</>}
                                        {!newSupplierInvoice.category && 'Vælg kategori...'}
                                    </span>
                                    <ChevronDown size={16} style={{ color: '#94a3b8', transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                </div>
                                
                                {isCategoryDropdownOpen && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
                                        {['Materialer', 'Underentreprenør', 'Diverse'].map(cat => (
                                            <div 
                                                key={cat}
                                                onClick={() => {
                                                    setNewSupplierInvoice({...newSupplierInvoice, category: cat});
                                                    setIsCategoryDropdownOpen(false);
                                                }}
                                                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#334155', borderBottom: '1px solid #f1f5f9' }}
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

                            {/* Beløb med Tusindtalsseparator */}
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="text" 
                                    placeholder="Beløb ekskl. moms"
                                    value={newSupplierInvoice.amount}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9,]/g, '');
                                        let parts = val.split(',');
                                        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                        let formatted = parts.join(',');
                                        setNewSupplierInvoice({...newSupplierInvoice, amount: formatted});
                                    }}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                                />
                                <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>kr.</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button type="button" onClick={() => setShowUploadForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 'bold' }}>Annuller</button>
                                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Gem Bilag</button>
                            </div>
                        </div>
                    </form>
                )}
            </div>

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
                                onClick={() => {
                                    if (inv.file_data) {
                                        const newWindow = window.open();
                                        newWindow.document.write(`<iframe src="${inv.file_data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                    } else {
                                        toast.error("Intet fysisk bilag vedhæftet.");
                                    }
                                }}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: inv.file_data ? 'pointer' : 'default' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: 0 }}>
                                    <div style={{ color: inv.file_data ? '#10b981' : '#cbd5e1', marginTop: '4px' }}>
                                        <FileText size={24} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
