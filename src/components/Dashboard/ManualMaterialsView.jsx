import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Plus, Trash2, ExternalLink, Package, Loader2, Truck, X, Check, CheckCircle2, Receipt } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

// Indkøbs-/leveringsstatus pr. materiale — samme værdier som beregner-sagerne,
// så sags-overblikkets "Bestilt/Leveret" også virker på manuelle sager.
const MAT_STATUSES = ['Ikke bestilt', 'Bestilt', 'Leveret'];
const STATUS_STYLE = {
    'Ikke bestilt': { color: '#64748b', bg: '#f1f5f9', dot: '#cbd5e1' },
    'Bestilt': { color: '#2563eb', bg: '#eff6ff', dot: '#3b82f6' },
    'Leveret': { color: '#166534', bg: '#f0fdf4', dot: '#22c55e' }
};

// ============================================================================
// ManualMaterialsView — materialevisning for MANUELLE tilbud.
// Materialer = bilag med kategori "Materialer" (ÉN kilde til forbrug), så de
// tre tal (budget / forbrugt / rest) altid hænger sammen og den samme post
// vises både her og under Bilag-fanen. Hver post: navn + beløb + valgfri PDF
// (åbnes på pladsen) + indkøbs-/leveringsstatus.
// ============================================================================

const kr = (n) => (Number(n) || 0).toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Formatér beløb i input med tusind-separator (samme stil som Bilag).
const formatAmountInput = (raw) => {
    let val = String(raw).replace(/[^0-9,]/g, '');
    let parts = val.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
};
const parseAmount = (formatted) => parseFloat(String(formatted).replace(/\./g, '').replace(',', '.')) || 0;

export default function ManualMaterialsView({ lead, profile, onUpdate }) {
    const rd = lead.raw_data || {};

    const [items, setItems] = useState((rd.material_list || []).filter(m => m && m.item));
    const [legacyPdfs, setLegacyPdfs] = useState(rd.material_pdfs || []);
    const [newItem, setNewItem] = useState({ item: '', qty: '', unit: 'stk' });
    const [deliveryDate, setDeliveryDate] = useState(rd.delivery_info?.date || '');

    // Tilføj-materiale modal
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', amount: '', file: null, file_name: '' });
    const [saving, setSaving] = useState(false);
    const [bulkBusy, setBulkBusy] = useState(false);

    const budget = Number(rd.calc_data?.materialCostBase ?? rd.manual_quote?.materialCost ?? 0);

    // Materialeposter = bilag med kategori Materialer.
    const materialInvoices = (rd.supplier_invoices || []).filter(inv => inv.category === 'Materialer' || !inv.category);
    const totalSpent = materialInvoices.reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
    const remaining = budget - totalSpent;
    const overBudget = remaining < 0;

    const trackable = materialInvoices.filter(inv => inv.delivery_status);
    const allDelivered = trackable.length > 0 && trackable.every(inv => inv.delivery_status === 'Leveret');

    const persist = async (patch) => {
        try {
            const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const merged = { ...(latest?.raw_data || rd), ...patch };
            const { error } = await supabase.from('leads').update({ raw_data: merged }).eq('id', lead.id);
            if (error) throw error;
            onUpdate && onUpdate({ ...lead, raw_data: merged });
        } catch (e) {
            toast.error('Kunne ikke gemme: ' + (e.message || e));
        }
    };

    // ---- Materialeposter (bilag, kategori Materialer) ----
    const handleSaveMaterial = async () => {
        if (!form.name.trim()) { toast.error('Skriv hvad materialet hedder'); return; }
        setSaving(true);
        let filePath = null, fileName = null;
        try {
            if (form.file) {
                const ext = (form.file.name.split('.').pop() || 'pdf').toLowerCase();
                const fn = `bilag_${lead.id}_${Date.now()}.${ext}`;
                const { error } = await supabase.storage.from('bilag').upload(fn, form.file, { cacheControl: '3600', upsert: false });
                if (error) throw error;
                filePath = fn;
                fileName = form.file.name;
            }
            const newInv = {
                id: `supp_${Date.now()}`,
                name: form.name.trim(),
                description: form.name.trim(),
                amount: parseAmount(form.amount),
                date: new Date().toISOString(),
                uploaded_by: profile?.owner_name || profile?.email || 'Ukendt',
                status: 'Godkendt',
                category: 'Materialer',
                file_path: filePath,
                file_name: fileName,
                material_list_id: null,
                delivery_status: 'Ikke bestilt'
            };
            const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
            const cur = latest?.raw_data || rd;
            const next = [...(cur.supplier_invoices || []), newInv];
            await persist({ supplier_invoices: next });
            setForm({ name: '', amount: '', file: null, file_name: '' });
            setShowAdd(false);
            toast.success('Materiale tilføjet');
        } catch (e) {
            toast.error('Kunne ikke gemme: ' + (e.message || e));
        } finally {
            setSaving(false);
        }
    };

    const openInvoice = async (inv) => {
        if (inv.file_path) {
            const newWindow = window.open('', '_blank');
            const { data, error } = await supabase.storage.from('bilag').createSignedUrl(inv.file_path, 3600);
            if (error || !data?.signedUrl) { 
                if (newWindow) newWindow.close();
                toast.error('Kunne ikke åbne filen'); 
                return; 
            }
            if (newWindow) {
                newWindow.location.href = data.signedUrl;
            } else {
                window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
            }
        } else if (inv.file_url || inv.file_data) {
            window.open(inv.file_url || inv.file_data, '_blank', 'noopener,noreferrer');
        } else {
            toast('Ingen fil vedhæftet', { icon: '📄' });
        }
    };

    const cycleInvoiceStatus = async (inv) => {
        const cur = MAT_STATUSES.indexOf(inv.delivery_status || 'Ikke bestilt');
        const nextStatus = MAT_STATUSES[(cur + 1) % MAT_STATUSES.length];
        const next = (rd.supplier_invoices || []).map(i => i.id === inv.id ? { ...i, delivery_status: nextStatus } : i);
        await persist({ supplier_invoices: next });
    };

    const removeInvoice = async (inv) => {
        const next = (rd.supplier_invoices || []).filter(i => i.id !== inv.id);
        await persist({ supplier_invoices: next });
        toast.success('Materiale fjernet');
    };

    const markAll = async (status) => {
        setBulkBusy(true);
        const next = (rd.supplier_invoices || []).map(i => (i.category === 'Materialer' || !i.category) ? { ...i, delivery_status: status } : i);
        await persist({ supplier_invoices: next });
        setBulkBusy(false);
        toast.success(status === 'Leveret' ? 'Alle markeret som leveret' : 'Status nulstillet');
    };

    // ---- Legacy PDF'er (gamle uploads) — bevares så intet forsvinder ----
    const handleUploadLegacy = async (file) => {
        if (!file) return;
        try {
            const ext = file.name.split('.').pop() || 'pdf';
            const fn = `manual_${lead.id}_doc_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('uploads').upload(fn, file, { upsert: true, cacheControl: '0' });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fn);
            const next = [...legacyPdfs, { id: `id-${Date.now()}`, name: file.name, url: publicUrl, date: new Date().toISOString() }];
            setLegacyPdfs(next);
            await persist({ material_pdfs: next });
            toast.success('Bilag tilføjet');
        } catch (e) {
            toast.error('Upload fejlede: ' + (e.message || e));
        }
    };
    const removePdf = async (id) => {
        const next = legacyPdfs.filter(p => p.id !== id);
        setLegacyPdfs(next);
        await persist({ material_pdfs: next });
    };

    // ---- Hurtig-noter (navn + antal, ingen pris) ----
    const addItem = async () => {
        if (!newItem.item.trim()) return;
        const next = [...items, { ...newItem, status: 'Ikke bestilt', listId: 'manual' }];
        setItems(next);
        setNewItem({ item: '', qty: '', unit: 'stk' });
        await persist({ material_list: next });
    };
    const removeItem = async (idx) => {
        const next = items.filter((_, i) => i !== idx);
        setItems(next);
        await persist({ material_list: next });
    };
    const cycleItemStatus = async (idx) => {
        const next = items.map((m, i) => {
            if (i !== idx) return m;
            const cur = MAT_STATUSES.indexOf(m.status || 'Ikke bestilt');
            return { ...m, status: MAT_STATUSES[(cur + 1) % MAT_STATUSES.length] };
        });
        setItems(next);
        await persist({ material_list: next });
    };

    const saveDeliveryDate = async (val) => {
        setDeliveryDate(val);
        await persist({ delivery_info: { ...(rd.delivery_info || {}), date: val } });
    };

    const card = { background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e8e6e1' };

    const StatusPill = ({ status, onClick }) => {
        const st = status || 'Ikke bestilt';
        const s = STATUS_STYLE[st] || STATUS_STYLE['Ikke bestilt'];
        return (
            <button type="button" onClick={onClick} title="Skift status (Ikke bestilt → Bestilt → Leveret)"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: s.color, background: s.bg, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.97)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.dot }} />
                {st}
            </button>
        );
    };

    return (
        <div className="case-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Budget / Forbrugt / Rest — nu sammenhængende */}
            <div style={{ ...card, background: 'linear-gradient(135deg,#eff6ff,#fff)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={22} color="#2563eb" /></div>
                    <div>
                        <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>Materialebudget</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Forbrug = summen af dine materialer herunder</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {[
                        { label: 'Budget', value: `${kr(budget)} kr`, color: '#0f172a' },
                        { label: 'Forbrugt', value: `${kr(totalSpent)} kr`, color: '#0f172a' },
                        { label: 'Rest', value: `${remaining > 0 ? '+' : ''}${kr(remaining)} kr`, color: overBudget ? '#ef4444' : '#10b981' }
                    ].map((s, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>{s.label}</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: s.color, marginTop: '4px' }}>{s.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Leveringsdato */}
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={22} color="#10b981" /></div>
                    <div>
                        <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>Leveringsdato</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Hvornår skal materialerne være på pladsen?</div>
                    </div>
                </div>
                <input type="date" value={deliveryDate} onChange={(e) => saveDeliveryDate(e.target.value)}
                    style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#0f172a', fontWeight: 600 }} />
            </div>

            {/* Materialeliste & bilag — materialeposter */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} color="#3b82f6" /> Materialeliste & bilag</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {trackable.length > 0 && (
                            <button onClick={() => markAll(allDelivered ? 'Bestilt' : 'Leveret')} disabled={bulkBusy}
                                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 14px', borderRadius: '10px', border: '1px solid #bbf7d0', background: allDelivered ? '#f0fdf4' : '#fff', color: '#166534', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                                {bulkBusy ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} {allDelivered ? 'Alle leveret' : 'Marker alle leveret'}
                            </button>
                        )}
                        <button onClick={() => setShowAdd(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', background: '#0f172a', color: '#fff', fontWeight: 700, cursor: 'pointer', border: 'none', fontSize: '0.9rem' }}>
                            <Plus size={16} /> Tilføj materiale
                        </button>
                    </div>
                </div>

                {materialInvoices.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
                        Ingen materialer endnu. Tilføj fx din liste fra Davidsen — giv den et navn, et beløb og vedhæft PDF'en.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {materialInvoices.map(inv => (
                            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Receipt size={20} color="#2563eb" /></div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.name || inv.description || 'Materiale'}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{inv.amount ? `${kr(inv.amount)} kr` : 'Beløb ikke angivet'}</div>
                                </div>
                                <StatusPill status={inv.delivery_status} onClick={() => cycleInvoiceStatus(inv)} />
                                {(inv.file_path || inv.file_url || inv.file_data) && (
                                    <button onClick={() => openInvoice(inv)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>
                                        <ExternalLink size={15} /> Åbn
                                    </button>
                                )}
                                <button onClick={() => removeInvoice(inv)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tidligere uploads (gamle PDF'er uden beløb) */}
                {legacyPdfs.length > 0 && (
                    <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tidligere uploads</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {legacyPdfs.map(p => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <FileText size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Dokument'}</div>
                                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '9px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}><ExternalLink size={14} /> Åbn</a>
                                    <button onClick={() => removePdf(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px' }}><Trash2 size={15} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Hurtig-noter (navn + antal, ingen pris) */}
            <div style={card}>
                <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={20} color="#64748b" /> Ekstra materialer (valgfrit)</h4>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#94a3b8' }}>Hurtig huskeliste til småting — uden pris og bilag.</p>
                {items.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {items.map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', flexWrap: 'wrap' }}>
                                <span style={{ flex: 1, minWidth: '120px', color: '#0f172a', fontWeight: 600 }}>{m.item}</span>
                                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{m.qty} {m.unit}</span>
                                <StatusPill status={m.status} onClick={() => cycleItemStatus(i)} />
                                <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input value={newItem.item} onChange={(e) => setNewItem({ ...newItem, item: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addItem()} placeholder="Materiale" style={{ flex: 3, minWidth: '160px', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                    <input value={newItem.qty} onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })} placeholder="Antal" style={{ flex: 1, minWidth: '70px', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                    <input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder="stk" style={{ width: '70px', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                    <button onClick={addItem} style={{ padding: '11px 18px', borderRadius: '10px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Tilføj</button>
                </div>
            </div>

            {/* ---- MODAL: Tilføj materiale (Bison Frame-stil) ---- */}
            {createPortal(
                <AnimatePresence>
                    {showAdd && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => !saving && setShowAdd(false)}
                            style={{ position: 'fixed', inset: 0, zIndex: 100001, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <motion.div
                                onClick={e => e.stopPropagation()}
                                initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.97 }}
                                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                                style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 24px 60px -12px rgba(15,23,42,0.4)' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '24px 24px 0' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Receipt size={23} color="#2563eb" /></div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Tilføj materiale</h3>
                                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Navn, beløb og vedhæft listen/fakturaen</p>
                                    </div>
                                    <button onClick={() => !saving && setShowAdd(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}><X size={18} /></button>
                                </div>

                                <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Dropzone */}
                                    <label style={{ display: 'block', cursor: 'pointer' }}>
                                        <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }}
                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, file: f, file_name: f.name }); e.target.value = ''; }} />
                                        <div style={{ border: `2px dashed ${form.file ? '#86efac' : '#cbd5e1'}`, background: form.file ? '#f0fdf4' : '#f8fafc', borderRadius: '14px', padding: '22px', textAlign: 'center', transition: 'all 0.2s' }}>
                                            {form.file ? (
                                                <>
                                                    <CheckCircle2 size={28} color="#22c55e" style={{ margin: '0 auto' }} />
                                                    <div style={{ marginTop: '8px', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', wordBreak: 'break-all' }}>{form.file_name}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Tryk for at skifte fil</div>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={28} color="#94a3b8" style={{ margin: '0 auto' }} />
                                                    <div style={{ marginTop: '8px', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Vælg PDF eller billede</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>Valgfrit — fx listen fra Davidsen</div>
                                                </>
                                            )}
                                        </div>
                                    </label>

                                    {/* Navn */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Navn</label>
                                        <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="fx Tagsten – Davidsen"
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                                            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                                    </div>

                                    {/* Beløb */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Beløb <span style={{ textTransform: 'none', fontWeight: 500, color: '#94a3b8' }}>(valgfrit, ekskl. moms)</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <input inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: formatAmountInput(e.target.value) })} placeholder="0"
                                                style={{ width: '100%', boxSizing: 'border-box', padding: '13px 48px 13px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                                                onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                                            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 700 }}>kr.</span>
                                        </div>
                                    </div>

                                    {/* Knapper */}
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                        <button onClick={() => setShowAdd(false)} disabled={saving} style={{ flex: '0 0 auto', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Annullér</button>
                                        <button onClick={handleSaveMaterial} disabled={saving || !form.name.trim()}
                                            style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: form.name.trim() ? '#0f172a' : '#cbd5e1', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: form.name.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                                            {saving ? <Loader2 size={18} className="spin" /> : <Check size={18} />} Gem materiale
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
